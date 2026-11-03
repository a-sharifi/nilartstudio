"""Approved sandbox-order cancellation: atomically stop parcels and release holds, never money."""

import json
from datetime import datetime
from uuid import UUID, uuid5

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.contexts.customer.notifications import notify
from nilart.contexts.fulfillment.domain import Command as ShipmentCommand
from nilart.contexts.fulfillment.service import FulfillmentError
from nilart.contexts.fulfillment.service import apply as ship
from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.contexts.identity.presentation.router import failure
from nilart.contexts.inventory import reservations as stock
from nilart.contexts.orders.domain import (
    OrderSnapshot,
    OrderState,
    cancellation_allowed,
    validate_state,
)
from nilart.shared.database import session_dependency
from nilart.shared.outbox import enqueue

router = APIRouter(prefix="/api/v1/admin/order-requests", tags=["paid-order-cancellations"])


class Command(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    expected_version: int = Field(ge=0, le=2147483646, strict=True)
    request_version: int = Field(ge=0, le=2147483646, strict=True)
    reason: str = Field(min_length=5, max_length=1000)


class Outcome(BaseModel):
    order_id: UUID
    order_version: int
    request_version: int
    stock_version: int
    previous_stock_state: str
    cancelled_shipments: list[UUID]
    reservation_event_id: UUID
    refund_issued: bool = False


class Receipt(BaseModel):
    id: UUID
    request_id: UUID
    order_id: UUID
    actor_id: UUID
    intent: Command
    result: Outcome
    created_at: datetime


class CancellationError(Exception):
    pass


def fail(code):
    raise CancellationError("cancellation_" + code)


def load(db, id, lock=False):
    r = (
        db.execute(text("SELECT * FROM customer_order_requests WHERE id=:id"), {"id": id})
        .mappings()
        .first()
    )
    if not r:
        fail("request_not_found")
    payment = db.execute(
        text(
            "SELECT status FROM sandbox_payments WHERE order_id=:id"
            + (" FOR UPDATE" if lock else "")
        ),
        {"id": r["order_id"]},
    ).scalar()
    order = (
        db.execute(
            text("SELECT * FROM customer_orders WHERE id=:id" + (" FOR UPDATE" if lock else "")),
            {"id": r["order_id"]},
        )
        .mappings()
        .one()
    )
    if lock:
        r = (
            db.execute(
                text("SELECT * FROM customer_order_requests WHERE id=:id FOR UPDATE"), {"id": id}
            )
            .mappings()
            .one()
        )
    return r, order, payment


def apply(db, actor, id, key, body):
    previous = (
        db.execute(text("SELECT * FROM order_cancellations WHERE id=:id"), {"id": key})
        .mappings()
        .first()
    )
    intent = body.model_dump(mode="json")
    if previous:
        if (
            str(previous["actor_id"]) != str(actor)
            or previous["request_id"] != id
            or previous["intent"] != intent
        ):
            fail("command_conflict")
        return dict(previous)
    r, order, payment = load(db, id, True)
    if r["kind"] != "cancellation" or r["status"] != "approved":
        fail("approval_required")
    if order["version"] != body.expected_version or r["version"] != body.request_version:
        fail("version_conflict")
    if not order["sandbox"]:
        fail("sandbox_only")
    state = OrderState.model_validate(order["state"])
    snapshot = OrderSnapshot.model_validate(order["snapshot"])
    # Cancellation stops fulfillment independently of payment reconciliation.
    # Contradictory historical payment evidence still requires manual review.
    confirmed = (
        payment == "paid" and state.payment in {"paid", "partially_refunded"} and snapshot.receipt
    )
    unpaid = (
        payment in {"requesting", "pending", "unknown", "failed", "cancelled"}
        and state.payment in {"pending", "verification", "failed"}
        and not snapshot.receipt
    )
    if not confirmed and not unpaid:
        fail("confirmed_payment_required")
    if not cancellation_allowed(state):
        fail("already_fulfilled")
    if db.scalar(text("SELECT 1 FROM order_cancellations WHERE order_id=:id"), {"id": order["id"]}):
        fail("already_processed")
    parcels = list(
        db.execute(
            text("SELECT * FROM fulfillment_shipments WHERE order_id=:id ORDER BY id FOR UPDATE"),
            {"id": order["id"]},
        ).mappings()
    )
    if any(p["status"] in {"dispatched", "delivered"} for p in parcels):
        fail("already_fulfilled")
    stock.stock_lock(db)
    allocation = (
        db.execute(
            text("SELECT * FROM order_stock_allocations WHERE order_id=:id FOR UPDATE"),
            {"id": order["id"]},
        )
        .mappings()
        .first()
    )
    if not allocation or not all(line.stock_components for line in snapshot.items):
        fail("historical_stock_incomplete")
    if any(int(q) > 0 for q in allocation["shipped"].values()):
        fail("already_fulfilled")
    if allocation["state"] not in {"reserved", "committed", "shortage", "released"}:
        fail("stock_state_conflict")
    cancelled = []
    for parcel in parcels:
        if parcel["status"] == "cancelled":
            continue
        event = ship(
            db,
            actor,
            parcel["id"],
            uuid5(key, str(parcel["id"])),
            ShipmentCommand(
                expected_version=parcel["version"],
                action="cancel",
                order_id=order["id"],
                reason=body.reason,
            ),
        )
        cancelled.append(str(event["shipment_id"]))
    changes = (
        stock.change_reserved(db, allocation["components"], -1)
        if allocation["state"] in {"reserved", "committed"}
        else []
    )
    db.execute(
        text(
            "UPDATE discount_usage SET state='released' WHERE state='reserved' AND payment_id IN (SELECT id FROM sandbox_payments WHERE order_id=:id)"
        ),
        {"id": order["id"]},
    )
    saved = stock.transition(db, allocation, "released")
    event_key = uuid5(key, "cancellation-stock-release")
    stock.record(db, saved, actor, "cancel", body.reason, changes, key=event_key)
    state.fulfillment = "cancelled"
    validate_state(snapshot, state)
    result = dict(
        order_id=str(order["id"]),
        order_version=order["version"] + 1,
        request_version=r["version"] + 1,
        stock_version=saved["version"],
        previous_stock_state=allocation["state"],
        cancelled_shipments=cancelled,
        reservation_event_id=str(event_key),
        refund_issued=False,
    )
    db.execute(
        text(
            "UPDATE customer_orders SET state=CAST(:state AS jsonb),version=:version,updated_at=clock_timestamp() WHERE id=:id"
        ),
        {"id": order["id"], "state": state.model_dump_json(), "version": body.expected_version + 1},
    )
    db.execute(
        text(
            "UPDATE customer_order_requests SET version=version+1,updated_at=clock_timestamp() WHERE id=:id"
        ),
        {"id": id},
    )
    receipt = (
        db.execute(
            text(
                "INSERT INTO order_cancellations(id,request_id,order_id,actor_id,intent,result) VALUES(:id,:request,:order,:actor,CAST(:intent AS jsonb),CAST(:result AS jsonb)) RETURNING *"
            ),
            {
                "id": key,
                "request": id,
                "order": order["id"],
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
        "orders.cancelled",
        {
            "request_id": str(id),
            "cancellation_id": str(key),
            "before": {
                "fulfillment": order["state"]["fulfillment"],
                "stock_state": allocation["state"],
            },
            "after": result,
        },
        body.reason,
    )
    notify(
        db,
        order["account_id"],
        event=f"cancellation:{key}",
        category="order",
        title_fa="لغو سفارش و آزادسازی موجودی ثبت شد؛ بازپرداخت جدا بررسی می‌شود",
        title_en="Order cancelled and stock released; refund is reviewed separately",
        reference="order_id",
        id=order["id"],
    )
    enqueue(
        db,
        "orders.cancelled",
        {"cancellation_id": str(key), "order_id": str(order["id"]), "request_id": str(id)},
    )
    return dict(receipt)


class Plan(BaseModel):
    request_id: UUID
    order_id: UUID
    expected_version: int
    request_version: int
    approved: bool
    payment_confirmed: bool
    financial_closed: bool = False
    cancellable: bool
    processed: bool
    issue: str | None = None


@router.get("/{id}/cancellation-plan", response_model=Plan)
def plan(
    id: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("orders.read_all")),
):
    try:
        r, order, payment = load(db, id)
        snapshot = OrderSnapshot.model_validate(order["snapshot"])
        has_stock = db.scalar(
            text("SELECT 1 FROM order_stock_allocations WHERE order_id=:id"), {"id": order["id"]}
        )
        posted = db.scalar(
            text(
                "SELECT 1 FROM fulfillment_shipments WHERE order_id=:id AND status IN ('dispatched','delivered') LIMIT 1"
            ),
            {"id": order["id"]},
        )
        return dict(
            request_id=id,
            order_id=order["id"],
            expected_version=order["version"],
            request_version=r["version"],
            approved=r["kind"] == "cancellation" and r["status"] == "approved",
            payment_confirmed=payment == "paid",
            financial_closed=r["status"] == "completed"
            and bool(order["state"].get("unpaid_cancellation_closure")),
            cancellable=cancellation_allowed(OrderState.model_validate(order["state"]))
            and not posted,
            issue="historical_stock_incomplete"
            if not has_stock or not all(line.stock_components for line in snapshot.items)
            else None,
            processed=bool(
                db.scalar(
                    text("SELECT 1 FROM order_cancellations WHERE request_id=:id"), {"id": id}
                )
            ),
        )
    except CancellationError as exc:
        return failure(request, str(exc), 404)


@router.get("/{id}/cancellations", response_model=list[Receipt])
def history(
    id: UUID,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("orders.read_all")),
):
    return [
        dict(r)
        for r in db.execute(
            text("SELECT * FROM order_cancellations WHERE request_id=:id"), {"id": id}
        ).mappings()
    ]


@router.get("/{id}/cancellations/{key}", response_model=Receipt)
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
                "SELECT * FROM order_cancellations WHERE request_id=:id AND id=:key AND actor_id=:actor"
            ),
            {"id": id, "key": key, "actor": principal.account_id},
        )
        .mappings()
        .first()
    )
    return dict(row) if row else failure(request, "cancellation_command_not_found", 404)


@router.put("/{id}/cancellations/{key}", response_model=Receipt)
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
    except (CancellationError, FulfillmentError) as exc:
        db.rollback()
        return failure(request, str(exc), 404 if str(exc).endswith("not_found") else 409)
    except Exception:
        db.rollback()
        raise
