"""Staff can open a shortage cancellation review; approval, stock and money stay separate."""

import json
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Request
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
from nilart.shared.database import session_dependency
from nilart.shared.outbox import enqueue

router = APIRouter(prefix="/api/v1/admin/order-stock", tags=["stock-resolution-reviews"])


class Command(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    expected_version: int = Field(ge=1, le=2147483646, strict=True)
    order_version: int = Field(ge=0, le=2147483646, strict=True)
    reason: str = Field(min_length=5, max_length=1000)


class Outcome(BaseModel):
    order_version: int
    request_version: int = 0
    status: str = "submitted"
    initiated_by_staff: bool = True


class Receipt(BaseModel):
    id: UUID
    order_id: UUID
    request_id: UUID
    actor_id: UUID
    intent: Command
    result: Outcome
    created_at: datetime


class Plan(BaseModel):
    order_id: UUID
    order_version: int
    stock_version: int | None
    active_request_id: UUID | None
    eligible: bool
    issue: str | None


class ResolutionError(Exception):
    pass


def fail(code):
    raise ResolutionError("resolution_" + code)


def load(db, id, lock=False):
    payment = db.execute(
        text(
            "SELECT status FROM sandbox_payments WHERE order_id=:id"
            + (" FOR UPDATE" if lock else "")
        ),
        {"id": id},
    ).scalar()
    order = (
        db.execute(
            text("SELECT * FROM customer_orders WHERE id=:id" + (" FOR UPDATE" if lock else "")),
            {"id": id},
        )
        .mappings()
        .first()
    )
    if not order:
        fail("order_not_found")
    if lock:
        db.execute(text("SELECT pg_advisory_xact_lock(78214,35)"))
    stock = (
        db.execute(
            text(
                "SELECT * FROM order_stock_allocations WHERE order_id=:id"
                + (" FOR UPDATE" if lock else "")
            ),
            {"id": id},
        )
        .mappings()
        .first()
    )
    active = db.scalar(
        text(
            "SELECT id FROM customer_order_requests WHERE order_id=:id AND status IN ('submitted','in_review','approved')"
        ),
        {"id": id},
    )
    issue = (
        "active_request_exists"
        if active
        else "sandbox_required"
        if not order["sandbox"]
        else "paid_shortage_required"
        if payment != "paid"
        or order["state"]["payment"] != "paid"
        or not stock
        or stock["state"] != "shortage"
        else "already_fulfilled"
        if not cancellation_allowed(OrderState.model_validate(order["state"]))
        or any(int(q) > 0 for q in stock["shipped"].values())
        or db.scalar(
            text(
                "SELECT 1 FROM fulfillment_shipments WHERE order_id=:id AND status IN ('dispatched','delivered') LIMIT 1"
            ),
            {"id": id},
        )
        else None
    )
    return order, stock, active, issue


def apply(db, actor, id, key, body):
    previous = (
        db.execute(text("SELECT * FROM stock_resolution_reviews WHERE id=:id"), {"id": key})
        .mappings()
        .first()
    )
    intent = body.model_dump(mode="json")
    if previous:
        if (
            previous["order_id"] != id
            or str(previous["actor_id"]) != str(actor)
            or previous["intent"] != intent
        ):
            fail("command_conflict")
        return dict(previous)
    if db.scalar(text("SELECT 1 FROM customer_order_requests WHERE id=:key"), {"key": key}):
        fail("command_conflict")
    order, stock, _, issue = load(db, id, True)
    if issue:
        fail(issue)
    if stock["version"] != body.expected_version or order["version"] != body.order_version:
        fail("version_conflict")
    reply = "بررسی لغو به دلیل کمبود موجودی توسط کارکنان آغاز شد. / Staff opened cancellation review due to stock shortage."
    db.execute(
        text(
            "INSERT INTO customer_order_requests(id,account_id,order_id,kind,status,payload,version,public_reply,initiated_by) VALUES(:request,:owner,:order,'cancellation','submitted',CAST(:payload AS jsonb),0,:reply,:actor)"
        ),
        {
            "request": key,
            "owner": order["account_id"],
            "order": id,
            "payload": json.dumps(dict(reason=body.reason, quantities={})),
            "reply": reply,
            "actor": actor,
        },
    )
    result = dict(
        order_version=order["version"] + 1,
        request_version=0,
        status="submitted",
        initiated_by_staff=True,
    )
    db.execute(
        text(
            "UPDATE customer_orders SET version=version+1,updated_at=clock_timestamp() WHERE id=:id"
        ),
        {"id": id},
    )
    row = (
        db.execute(
            text(
                "INSERT INTO stock_resolution_reviews(id,order_id,request_id,actor_id,intent,result) VALUES(:key,:order,:key,:actor,CAST(:intent AS jsonb),CAST(:result AS jsonb)) RETURNING *"
            ),
            {
                "key": key,
                "order": id,
                "actor": actor,
                "intent": json.dumps(intent),
                "result": json.dumps(result),
            },
        )
        .mappings()
        .one()
    )
    SqlAccountManagement(db).audit(
        str(actor),
        str(order["account_id"]),
        "orders.stock_resolution_opened",
        {
            "order_id": str(id),
            "request_id": str(key),
            "before": {"version": order["version"]},
            "after": result,
        },
        body.reason,
    )
    notify(
        db,
        order["account_id"],
        event=f"stock_resolution:{key}",
        category="order",
        title_fa="بررسی لغو سفارش به دلیل کمبود موجودی توسط کارکنان آغاز شد",
        title_en="Staff opened an order cancellation review due to stock shortage",
        reference="request_id",
        id=key,
    )
    enqueue(
        db,
        "orders.stock_resolution_opened",
        {"order_id": str(id), "request_id": str(key), "actor_id": str(actor)},
    )
    return dict(row)


@router.get("/{id}/resolution-plan", response_model=Plan)
def plan(
    id: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("fulfillment.manage")),
):
    try:
        order, stock, active, issue = load(db, id)
        return dict(
            order_id=id,
            order_version=order["version"],
            stock_version=stock["version"] if stock else None,
            active_request_id=active,
            eligible=issue is None,
            issue=issue,
        )
    except ResolutionError as exc:
        return failure(request, str(exc), 404)


@router.get("/{id}/resolution-reviews/{key}", response_model=Receipt)
def saved(
    id: UUID,
    key: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("orders.read_all")),
):
    row = (
        db.execute(
            text(
                "SELECT * FROM stock_resolution_reviews WHERE order_id=:order AND id=:key AND actor_id=:actor"
            ),
            {"order": id, "key": key, "actor": principal.account_id},
        )
        .mappings()
        .first()
    )
    return dict(row) if row else failure(request, "resolution_command_not_found", 404)


@router.put("/{id}/resolution-reviews/{key}", response_model=Receipt)
def command(
    id: UUID,
    key: UUID,
    body: Command,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("fulfillment.manage")),
):
    actor, denied = write_access(request, db, principal, "fulfillment.manage")
    if denied is not None:
        return denied
    if not SqlIdentityRepository(db).principal(actor.id, lock=True).allows("orders.read_all"):
        return failure(request, "permission_denied", 403)
    db.execute(text("SELECT pg_advisory_xact_lock(78214,44)"))
    try:
        result = apply(db, actor.id, id, key, body)
        db.commit()
        return result
    except ResolutionError as exc:
        db.rollback()
        return failure(request, str(exc), 404 if str(exc).endswith("not_found") else 409)
    except Exception:
        db.rollback()
        raise
