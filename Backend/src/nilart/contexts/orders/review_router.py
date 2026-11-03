"""Staff review of customer requests without financial or fulfillment side effects."""
from datetime import datetime
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.contexts.customer.notifications import notify
from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.contexts.identity.presentation.router import failure
from nilart.contexts.orders.domain import OrderState, cancellation_allowed
from nilart.contexts.orders.router import OwnedRequest, RequestsPage, request_output
from nilart.shared.database import session_dependency
from nilart.shared.outbox import enqueue

router = APIRouter(prefix="/api/v1/admin/order-requests", tags=["order-request-review"])


class Review(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    version: int = Field(ge=0, strict=True)
    status: Literal["in_review", "approved", "rejected"]
    reply: str = Field(min_length=5, max_length=4000)


class Decision(BaseModel):
    id: UUID
    request_id: UUID
    actor_id: UUID
    status: Literal["in_review", "approved", "rejected"]
    reply: str
    expected_version: int
    created_at: datetime


class DecisionsPage(BaseModel):
    items: list[Decision]
    next_cursor: UUID | None


@router.get("/{id}/reviews", response_model=DecisionsPage)
def history(id: UUID, request: Request, cursor: UUID | None = None,
            limit: int = Query(20, ge=1, le=100), db: Session = Depends(session_dependency),
            principal: Principal = Depends(require_permission("orders.read_all"))):
    if not db.execute(text("SELECT id FROM customer_order_requests WHERE id=:id"), {"id": id}).scalar():
        return failure(request, "request_not_found", 404)
    before = None
    if cursor:
        before = db.execute(text("SELECT expected_version FROM order_request_reviews WHERE request_id=:id AND id=:cursor"), {"id": id, "cursor": cursor}).scalar()
        if before is None:
            return failure(request, "review_cursor_not_found", 404)
    rows = db.execute(text("SELECT * FROM order_request_reviews WHERE request_id=:id "
                           "AND (CAST(:before AS integer) IS NULL OR expected_version<:before) "
                           "ORDER BY expected_version DESC LIMIT :limit"),
                      {"id": id, "before": before, "limit": limit + 1}).mappings().all()
    return {"items": [dict(row) for row in rows[:limit]],
            "next_cursor": rows[limit - 1]["id"] if len(rows) > limit else None}


@router.get("", response_model=RequestsPage)
def queue(cursor: UUID | None = None, limit: int = Query(50, ge=1, le=100),
          q: str = Query("", max_length=200), order_id: UUID | None = None, kind: Literal["cancellation", "return"] | None = None,
          status: Literal["submitted", "in_review", "approved", "rejected", "completed"] | None = None,
          db: Session = Depends(session_dependency),
          principal: Principal = Depends(require_permission("orders.read_all"))):
    rows = db.execute(text("SELECT * FROM customer_order_requests WHERE "
                           "(CAST(:order AS uuid) IS NULL OR order_id=CAST(:order AS uuid)) AND (CAST(:kind AS text) IS NULL OR kind=:kind) AND (CAST(:status AS text) IS NULL OR status=:status) "
                           "AND (:q='' OR strpos(lower(concat_ws(' ',id::text,order_id::text,payload->>'reason')),lower(CAST(:q AS text)))>0 "
                           "OR EXISTS (SELECT 1 FROM customer_orders o WHERE o.id=order_id AND strpos(lower(o.snapshot->>'reference'),lower(CAST(:q AS text)))>0)) "
                           "AND (CAST(:cursor AS uuid) IS NULL OR id>CAST(:cursor AS uuid)) "
                           "ORDER BY id LIMIT :limit"), {"order": order_id, "q": q.strip(), "kind": kind, "status": status, "cursor": cursor, "limit": limit + 1}).mappings().all()
    return {"items": [request_output(row) for row in rows[:limit]],
            "next_cursor": rows[limit - 1]["id"] if len(rows) > limit else None}


@router.get("/{id}", response_model=OwnedRequest)
def detail(id: UUID, request: Request, db: Session = Depends(session_dependency),
           principal: Principal = Depends(require_permission("orders.read_all"))):
    row = db.execute(text("SELECT * FROM customer_order_requests WHERE id=:id"), {"id": id}).mappings().first()
    return request_output(row) if row else failure(request, "request_not_found", 404)


@router.put("/{id}/reviews/{review_id}", response_model=OwnedRequest)
def review(id: UUID, review_id: UUID, body: Review, request: Request,
           db: Session = Depends(session_dependency),
           principal: Principal = Depends(require_permission("fulfillment.manage"))):
    actor, denied = write_access(request, db, principal, "fulfillment.manage")
    if denied is not None:
        return denied
    if not SqlIdentityRepository(db).principal(actor.id, lock=True).allows("orders.read_all"):
        return failure(request, "permission_denied", 403)
    anchor = db.execute(text("SELECT order_id FROM customer_order_requests WHERE id=:id"), {"id": id}).scalar()
    if anchor is None:
        return failure(request, "request_not_found", 404)
    order = db.execute(text("SELECT * FROM customer_orders WHERE id=:id FOR UPDATE"), {"id": anchor}).mappings().one()
    row = db.execute(text("SELECT * FROM customer_order_requests WHERE id=:id FOR UPDATE"), {"id": id}).mappings().one()
    previous = db.execute(text("SELECT * FROM order_request_reviews WHERE id=:id"), {"id": review_id}).mappings().first()
    if previous:
        if (previous["request_id"], previous["actor_id"], previous["status"], previous["reply"], previous["expected_version"]) == (id, UUID(actor.id), body.status, body.reply, body.version):
            return request_output(row)
        return failure(request, "review_conflict", 409)
    if row["version"] != body.version:
        return failure(request, "request_version_conflict", 409)
    allowed = {"submitted": {"in_review", "rejected"}, "in_review": {"approved", "rejected"}}
    if body.status not in allowed.get(row["status"], set()):
        return failure(request, "review_transition_not_allowed", 409)
    if body.status == "approved" and row["kind"] == "cancellation" and not cancellation_allowed(OrderState.model_validate(order["state"])):
        return failure(request, "request_not_eligible", 409)
    # Return eligibility was accepted at submission; staff review does not extend its quantities.
    inserted = db.execute(text("INSERT INTO order_request_reviews(id,request_id,actor_id,status,reply,expected_version) "
                    "VALUES(:id,:request,:actor,:status,:reply,:version) ON CONFLICT (id) DO NOTHING RETURNING id"),
               {"id": review_id, "request": id, "actor": actor.id, **body.model_dump()}).scalar()
    if inserted is None:
        return failure(request, "review_conflict", 409)
    saved = db.execute(text("UPDATE customer_order_requests SET status=:status,public_reply=:reply,"
                            "version=version+1,updated_at=now() WHERE id=:id RETURNING *"),
                       {"id": id, "status": body.status, "reply": body.reply}).mappings().one()
    SqlAccountManagement(db).audit(actor.id, str(row["account_id"]), "orders.request_reviewed",
                                   {"request_id": str(id), "review_id": str(review_id), "status": body.status},
                                   "Staff recorded an order request decision")
    titles = {"in_review": ("بررسی درخواست سفارش شروع شد", "Order request review started"),
              "approved": ("درخواست سفارش برای پردازش تأیید شد", "Order request approved for processing"),
              "rejected": ("درخواست سفارش رد شد", "Order request rejected")}
    notify(db, row["account_id"], event=f"request_review:{review_id}", category="order",
           title_fa=titles[body.status][0], title_en=titles[body.status][1], reference="request_id", id=id)
    enqueue(db, "orders.request_reviewed", {"request_id": str(id), "account_id": str(row["account_id"]), "status": body.status})
    db.commit()
    return request_output(saved)
