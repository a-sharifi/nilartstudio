"""Read owned historical orders. Checkout remains a separate upstream boundary."""
import json
from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.contexts.files.access import ELIGIBLE, JOIN
from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.contexts.identity.presentation.router import failure
from nilart.contexts.orders.catalog import attach_catalog, catalog_items
from nilart.contexts.orders.domain import (
    OrderSnapshot,
    OrderState,
    Receipt,
    RequestSubmission,
    cancellation_allowed,
    return_allowed,
)
from nilart.contexts.orders.repository import SqlOrderRepository
from nilart.shared.database import session_dependency
from nilart.shared.outbox import enqueue

router = APIRouter(prefix="/api/v1/account/orders", tags=["customer-orders"])


class CatalogItem(BaseModel):
    kind: Literal["products", "bundles", "artworks"]
    slug: str
    image_url: str | None = None


class Order(BaseModel):
    catalog_items: dict[UUID, CatalogItem] = Field(default_factory=dict)
    id: UUID
    snapshot: OrderSnapshot
    state: OrderState
    version: int
    created_at: str
    updated_at: str


class OrderDetail(Order):
    return_available: dict[UUID, int]
    active_request_id: UUID | None


def reserved_returns(db, order_id):
    reserved: dict[str, int] = {}
    for earlier in db.execute(text("SELECT payload FROM customer_order_requests WHERE order_id=:id "
                                  "AND kind='return' AND status!='rejected'"), {"id": order_id}).scalars():
        for line, quantity in earlier.get("quantities", {}).items():
            reserved[line] = reserved.get(line, 0) + quantity
    return reserved


class Page(BaseModel):
    items: list[Order]
    next_cursor: UUID | None


def output(row):
    return {key: row[key].isoformat() if key.endswith("_at") else row[key]
            for key in ("id", "snapshot", "state", "version", "created_at", "updated_at")}


@router.get("", response_model=Page)
def history(request: Request, cursor: UUID | None = None,
            q: str = Query("", max_length=200),
            payment: Literal["pending", "verification", "paid", "failed", "partially_refunded", "refunded"] | None = None,
            fulfillment: Literal["unshipped", "partial", "shipped", "delivered", "cancelled", "on_hold"] | None = None,
            limit: int = Query(50, ge=1, le=100),
            db: Session = Depends(session_dependency),
            principal: Principal = Depends(require_permission("orders.read_self"))):
    anchor = SqlOrderRepository(db).owned(principal.account_id, cursor) if cursor else None
    if cursor and not anchor:
        return failure(request, "order_not_found", 404)
    rows = db.execute(text(
        "SELECT * FROM customer_orders WHERE account_id=:owner "
        "AND (CAST(:payment AS text) IS NULL OR state->>'payment'=:payment) "
        "AND (CAST(:fulfillment AS text) IS NULL OR state->>'fulfillment'=:fulfillment) "
        "AND (CAST(:query AS text)='' OR position(lower(CAST(:query AS text)) in lower(snapshot->>'reference'))>0 "
        "OR EXISTS (SELECT 1 FROM jsonb_array_elements(snapshot->'items') line WHERE "
        "position(lower(CAST(:query AS text)) in lower(concat_ws(' ',line->>'title_fa',line->>'title_en',line->>'sku')))>0)) "
        "AND (CAST(:cursor AS uuid) IS NULL OR (created_at,id)<(:time,CAST(:cursor AS uuid))) "
        "ORDER BY created_at DESC,id DESC LIMIT :limit"),
        {"owner": principal.account_id, "cursor": cursor, "payment": payment, "fulfillment": fulfillment, "query": q.strip(),
         "time": anchor["created_at"] if anchor else None, "limit": limit + 1}).mappings().all()
    matches = catalog_items(db, [row["snapshot"] for row in rows[:limit]])
    return {"items": [attach_catalog(output(row), matches) for row in rows[:limit]],
            "next_cursor": rows[limit - 1]["id"] if len(rows) > limit else None}


class OrderSummary(BaseModel):
    orders: int
    awaiting_delivery: int
    active_requests: int
    available_files: int


@router.get("/summary", response_model=OrderSummary)
def order_summary(db: Session = Depends(session_dependency),
                  principal: Principal = Depends(require_permission("orders.read_self"))):
    return dict(db.execute(text(
        "SELECT (SELECT count(*) FROM customer_orders WHERE account_id=:owner) AS orders, "
        "(SELECT count(*) FROM customer_orders WHERE account_id=:owner AND state->>'payment'='paid' "
        "AND state->>'fulfillment' IN ('unshipped','partial','shipped','on_hold')) AS awaiting_delivery, "
        "(SELECT count(*) FROM customer_order_requests WHERE account_id=:owner "
        "AND status IN ('submitted','in_review','approved')) AS active_requests, "
        "(SELECT count(*)" + JOIN + "WHERE o.account_id=:owner AND " + ELIGIBLE + ") AS available_files"),
        {"owner": principal.account_id}).mappings().one())


@router.get("/{id}", response_model=OrderDetail)
def detail(id: UUID, request: Request, db: Session = Depends(session_dependency),
           principal: Principal = Depends(require_permission("orders.read_self"))):
    row = SqlOrderRepository(db).owned(principal.account_id, id)
    if not row:
        return failure(request, "order_not_found", 404)
    snapshot, state = OrderSnapshot.model_validate(row["snapshot"]), OrderState.model_validate(row["state"])
    reserved = reserved_returns(db, id)
    active = db.execute(text("SELECT id FROM customer_order_requests WHERE order_id=:id AND account_id=:owner "
                             "AND status IN ('submitted','in_review','approved') ORDER BY created_at,id LIMIT 1"), {"id": id, "owner": principal.account_id}).scalar()
    available = {line.id: max(0, state.delivered.get(line.id, 0) - reserved.get(str(line.id), 0))
                 for line in snapshot.items if line.delivery == "physical" and line.returnable}
    return {**attach_catalog(output(row), catalog_items(db, [row["snapshot"]])), "return_available": available, "active_request_id": active}


@router.get("/{id}/receipt", response_model=Receipt)
def receipt(id: UUID, request: Request, db: Session = Depends(session_dependency),
            principal: Principal = Depends(require_permission("orders.read_self"))):
    row = SqlOrderRepository(db).owned(principal.account_id, id)
    if not row:
        return failure(request, "order_not_found", 404)
    saved = OrderSnapshot.model_validate(row["snapshot"]).receipt
    return saved if saved else failure(request, "receipt_not_available", 404)


class OwnedRequest(BaseModel):
    initiated_by_staff: bool = False
    version: int = 0
    public_reply: str = ""
    id: UUID
    order_id: UUID
    kind: str
    status: str
    payload: dict
    created_at: str
    updated_at: str


class RequestsPage(BaseModel):
    items: list[OwnedRequest]
    next_cursor: UUID | None


requests_router = APIRouter(prefix="/api/v1/account/requests", tags=["customer-orders"])


def request_output(row):
    return {"initiated_by_staff": row.get("initiated_by") is not None, "version": row.get("version", 0), "public_reply": row.get("public_reply", ""), **{key: row[key].isoformat() if key.endswith("_at") else row[key]
            for key in ("id", "order_id", "kind", "status", "payload", "created_at", "updated_at")}}


@requests_router.get("", response_model=RequestsPage)
def requests(request: Request, cursor: UUID | None = None, limit: int = Query(50, ge=1, le=100),
             q: str = Query("", max_length=200), kind: Literal["cancellation", "return"] | None = None,
             status: Literal["submitted", "in_review", "approved", "rejected", "completed"] | None = None,
             db: Session = Depends(session_dependency),
             principal: Principal = Depends(require_permission("orders.read_self"))):
    anchor = db.execute(text("SELECT created_at FROM customer_order_requests WHERE account_id=:owner AND id=:id"),
                        {"owner": principal.account_id, "id": cursor}).scalar() if cursor else None
    if cursor and anchor is None:
        return failure(request, "request_not_found", 404)
    rows = db.execute(text("SELECT r.* FROM customer_order_requests r JOIN customer_orders o ON o.id=r.order_id "
                           "WHERE r.account_id=:owner AND o.account_id=:owner "
                           "AND (CAST(:kind AS text) IS NULL OR r.kind=:kind) "
                           "AND (CAST(:status AS text) IS NULL OR r.status=:status) "
                           "AND (CAST(:query AS text)='' OR position(lower(CAST(:query AS text)) in lower(r.payload->>'reason'))>0 "
                           "OR position(lower(CAST(:query AS text)) in lower(o.snapshot->>'reference'))>0) "
                           "AND (CAST(:cursor AS uuid) IS NULL OR (r.created_at,r.id)<(:time,CAST(:cursor AS uuid))) "
                           "ORDER BY r.created_at DESC,r.id DESC LIMIT :limit"),
                      {"owner": principal.account_id, "cursor": cursor, "time": anchor, "limit": limit + 1,
                       "query": q.strip(), "kind": kind, "status": status}).mappings().all()
    return {"items": [request_output(row) for row in rows[:limit]],
            "next_cursor": rows[limit - 1]["id"] if len(rows) > limit else None}



class RequestedItem(BaseModel):
    id: UUID
    title_fa: str
    title_en: str
    options_fa: str
    options_en: str
    quantity: int


class ReviewEvent(BaseModel):
    status: str
    reply: str
    created_at: str
    version: int


class RequestTracking(BaseModel):
    request_id: UUID
    order_reference: str
    items: list[RequestedItem]
    history: list[ReviewEvent]


@requests_router.get("/{id}/tracking", response_model=RequestTracking)
def request_tracking(id: UUID, request: Request, db: Session = Depends(session_dependency),
                     principal: Principal = Depends(require_permission("orders.read_self"))):
    row = db.execute(text("SELECT r.*,o.snapshot FROM customer_order_requests r "
                          "JOIN customer_orders o ON o.id=r.order_id "
                          "WHERE r.account_id=:owner AND o.account_id=:owner AND r.id=:id"),
                     {"owner": principal.account_id, "id": id}).mappings().first()
    if not row:
        return failure(request, "request_not_found", 404)
    snapshot = OrderSnapshot.model_validate(row["snapshot"])
    quantities = row["payload"].get("quantities", {})
    items = [{"id": line.id, "title_fa": line.title_fa, "title_en": line.title_en,
              "options_fa": line.options_fa, "options_en": line.options_en,
              "quantity": quantities[str(line.id)] if row["kind"] == "return" else line.quantity}
             for line in snapshot.items if row["kind"] == "cancellation" or str(line.id) in quantities]
    reviews = db.execute(text("SELECT status,reply,created_at,expected_version+1 AS version "
                              "FROM order_request_reviews WHERE request_id=:id ORDER BY expected_version,id"),
                         {"id": id}).mappings().all()
    history = [{"status": "submitted", "reply": "آغاز بررسی توسط کارکنان / Staff initiated review" if row.get("initiated_by") else "", "created_at": row["created_at"].isoformat(), "version": 0}]
    history.extend({**dict(review), "created_at": review["created_at"].isoformat()} for review in reviews)
    return {"request_id": id, "order_reference": snapshot.reference, "items": items, "history": history}


@requests_router.get("/{id}", response_model=OwnedRequest)
def request_detail(id: UUID, request: Request, db: Session = Depends(session_dependency),
                   principal: Principal = Depends(require_permission("orders.read_self"))):
    row = db.execute(text("SELECT * FROM customer_order_requests WHERE account_id=:owner AND id=:id"),
                     {"owner": principal.account_id, "id": id}).mappings().first()
    return request_output(row) if row else failure(request, "request_not_found", 404)


@router.put("/{order_id}/requests/{id}", response_model=OwnedRequest)
def submit_request(order_id: UUID, id: UUID, body: RequestSubmission, request: Request,
                   db: Session = Depends(session_dependency),
                   principal: Principal = Depends(require_permission("account.write_self"))):
    actor, denied = write_access(request, db, principal, "account.write_self")
    if denied is not None:
        return denied
    current = SqlIdentityRepository(db).principal(actor.id, lock=True)
    if not current.allows("orders.read_self"):
        return failure(request, "permission_denied", 403)
    order = SqlOrderRepository(db).owned(actor.id, order_id, True)
    if not order:
        return failure(request, "order_not_found", 404)
    payload = body.model_dump(mode="json", exclude={"version", "kind"})
    previous = db.execute(text("SELECT * FROM customer_order_requests WHERE id=:id"),
                          {"id": id}).mappings().first()
    if previous:
        if previous["account_id"] == UUID(actor.id) and previous["order_id"] == order_id and previous["kind"] == body.kind and previous["payload"] == payload:
            return request_output(previous)
        return failure(request, "request_conflict", 409)
    if order["version"] != body.version:
        return failure(request, "order_version_conflict", 409)
    active = db.execute(text("SELECT 1 FROM customer_order_requests WHERE order_id=:id "
                             "AND status IN ('submitted','in_review','approved')"), {"id": order_id}).first()
    if active:
        return failure(request, "active_request_exists", 409)
    snapshot, state = OrderSnapshot.model_validate(order["snapshot"]), OrderState.model_validate(order["state"])
    if body.kind == "cancellation":
        if not cancellation_allowed(state):
            return failure(request, "request_not_eligible", 409)
    else:
        if not return_allowed(snapshot, state, datetime.now(timezone.utc)):
            return failure(request, "request_not_eligible", 409)
        reserved = reserved_returns(db, order_id)
        lines = {line.id: line for line in snapshot.items}
        if any(line not in lines or lines[line].delivery != "physical" or not lines[line].returnable
               or quantity + reserved.get(str(line), 0) > state.delivered.get(line, 0)
               for line, quantity in body.quantities.items()):
            return failure(request, "request_not_eligible", 409)
    saved = db.execute(text("INSERT INTO customer_order_requests(id,account_id,order_id,kind,payload) "
                            "VALUES(:id,:owner,:order,:kind,CAST(:payload AS jsonb)) RETURNING *"),
                       {"id": id, "owner": actor.id, "order": order_id, "kind": body.kind,
                        "payload": json.dumps(payload)}).mappings().one()
    db.execute(text("UPDATE customer_orders SET version=version+1,updated_at=now() WHERE id=:id"), {"id": order_id})
    SqlAccountManagement(db).audit(actor.id, actor.id, "orders.request_submitted",
                                   {"order_id": str(order_id), "request_id": str(id), "kind": body.kind},
                                   "Customer submitted an order review request")
    enqueue(db, "orders.request_submitted", {"order_id": str(order_id), "request_id": str(id), "account_id": actor.id})
    db.commit()
    return request_output(saved)


admin_router = APIRouter(prefix="/api/v1/admin/orders", tags=["order-administration"])


@admin_router.get("", response_model=Page)
def admin_orders(request: Request, cursor: UUID | None = None,
                 q: str = Query("", max_length=200),
                 payment: Literal["pending", "verification", "paid", "failed", "partially_refunded", "refunded"] | None = None,
                 fulfillment: Literal["unshipped", "partial", "shipped", "delivered", "cancelled", "on_hold"] | None = None,
                 limit: int = Query(50, ge=1, le=100),
                 db: Session = Depends(session_dependency),
                 principal: Principal = Depends(require_permission("orders.read_all"))):
    anchor = db.execute(text("SELECT created_at FROM customer_orders WHERE id=:id"), {"id": cursor}).mappings().first() if cursor else None
    if cursor and not anchor:
        return failure(request, "order_not_found", 404)
    rows = db.execute(text(
        "SELECT * FROM customer_orders WHERE (CAST(:payment AS text) IS NULL OR state->>'payment'=:payment) "
        "AND (CAST(:fulfillment AS text) IS NULL OR state->>'fulfillment'=:fulfillment) "
        "AND (CAST(:query AS text)='' OR position(lower(CAST(:query AS text)) in lower(snapshot->>'reference'))>0 "
        "OR EXISTS (SELECT 1 FROM jsonb_array_elements(snapshot->'items') line WHERE "
        "position(lower(CAST(:query AS text)) in lower(concat_ws(' ',line->>'title_fa',line->>'title_en',line->>'sku')))>0)) "
        "AND (CAST(:cursor AS uuid) IS NULL OR (created_at,id)<(:time,CAST(:cursor AS uuid))) "
        "ORDER BY created_at DESC,id DESC LIMIT :limit"),
        {"cursor": cursor, "payment": payment, "fulfillment": fulfillment, "query": q.strip(),
         "time": anchor["created_at"] if anchor else None, "limit": limit + 1}).mappings().all()
    matches = catalog_items(db, [row["snapshot"] for row in rows[:limit]])
    return {"items": [attach_catalog(output(row), matches) for row in rows[:limit]],
            "next_cursor": rows[limit - 1]["id"] if len(rows) > limit else None}


@admin_router.get("/{id}", response_model=Order)
def admin_order(id: UUID, request: Request, db: Session = Depends(session_dependency),
                principal: Principal = Depends(require_permission("orders.read_all"))):
    row = db.execute(text("SELECT * FROM customer_orders WHERE id=:id"), {"id": id}).mappings().first()
    return output(row) if row else failure(request, "order_not_found", 404)


class CustomerStock(BaseModel):
    fulfillment: str
    order_id: UUID
    state: str | None
    expires_at: datetime | None
    issue: str | None


@router.get("/{id}/stock", response_model=CustomerStock)
def customer_stock(id: UUID, request: Request, db: Session=Depends(session_dependency),
                   principal: Principal=Depends(require_permission("orders.read_self"))):
    owned=SqlOrderRepository(db).owned(principal.account_id,id)
    if not owned:
        return failure(request,"order_not_found",404)
    row=db.execute(text("SELECT state,expires_at FROM order_stock_allocations WHERE order_id=:id"),{'id':id}).mappings().first()
    return dict(order_id=id,fulfillment=owned["state"]["fulfillment"],state=row['state'] if row else None,expires_at=row['expires_at'] if row else None,
                issue=None if row else 'historical_stock_identity_missing')
