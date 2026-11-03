"""No-payment financial closure, distinct from operational cancellation and refunds."""

import json
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.contexts.customer.notifications import notify
from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.contexts.identity.presentation.router import failure
from nilart.contexts.orders.cancellations import CancellationError, load
from nilart.contexts.orders.cancellations import Command as CancellationCommand
from nilart.shared.database import session_dependency
from nilart.shared.outbox import enqueue

router = APIRouter(prefix="/api/v1/admin/order-requests", tags=["cancellation-financial-closure"])


class Command(CancellationCommand):
    payment_version: int = Field(ge=0, le=2147483646, strict=True)
    inquiry_id: UUID


class Outcome(BaseModel):
    order_id: UUID
    order_version: int
    request_version: int
    payment_version: int
    payment_status: str
    refund_issued: bool = False


class Receipt(BaseModel):
    id: UUID
    request_id: UUID
    order_id: UUID
    inquiry_id: UUID
    actor_id: UUID
    intent: Command
    result: Outcome
    created_at: datetime


class Plan(BaseModel):
    order_id: UUID
    request_id: UUID
    expected_version: int
    request_version: int
    payment_id: UUID | None
    payment_version: int | None
    inquiry_id: UUID | None
    eligible: bool
    closed: bool
    issue: str | None


def fail(code):
    raise CancellationError("financial_closure_" + code)


def context(db, id, lock=False):
    r, order, _ = load(db, id, lock)
    payment = (
        db.execute(text("SELECT * FROM sandbox_payments WHERE order_id=:id"), {"id": order["id"]})
        .mappings()
        .first()
    )
    inquiry = (
        None
        if not payment
        else db.execute(
            text(
                "SELECT * FROM payment_inquiries WHERE payment_id=:id AND result->>'version'=CAST(:version AS text) ORDER BY created_at DESC,id DESC LIMIT 1"
            ),
            {"id": payment["id"], "version": payment["version"]},
        )
        .mappings()
        .first()
    )
    closed = r["status"] == "completed" and bool(order["state"].get("unpaid_cancellation_closure"))
    processed = db.scalar(
        text("SELECT 1 FROM order_cancellations WHERE request_id=:id"), {"id": id}
    )
    issue = None
    if closed:
        issue = "already_closed"
    elif payment and payment["status"] == "paid":
        issue = "paid_payment_requires_refund"
    elif (
        not order["sandbox"]
        or r["kind"] != "cancellation"
        or r["status"] != "approved"
        or order["state"]["fulfillment"] != "cancelled"
        or not processed
    ):
        issue = "processed_cancellation_required"
    elif (
        not payment
        or payment["status"] != "failed"
        or order["state"]["payment"] != "failed"
        or order["snapshot"].get("receipt")
        or Decimal(str(order["state"].get("refunded_amount", "0"))) != 0
    ):
        issue = "confirmed_rejection_required"
    elif (
        not inquiry
        or inquiry["result"].get("status") != "failed"
        or inquiry["result"].get("version") != payment["version"]
    ):
        issue = "fresh_rejected_inquiry_required"
    return r, order, payment, inquiry, bool(closed), issue


def access(db, principal):
    return SqlIdentityRepository(db).principal(principal.account_id).allows("orders.read_all")


@router.get("/{id}/financial-closure-plan", response_model=Plan)
def plan(
    id: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("payments.read")),
):
    if not access(db, principal):
        return failure(request, "permission_denied", 403)
    try:
        r, order, payment, inquiry, closed, issue = context(db, id)
        return dict(
            order_id=order["id"],
            request_id=id,
            expected_version=order["version"],
            request_version=r["version"],
            payment_id=payment["id"] if payment else None,
            payment_version=payment["version"] if payment else None,
            inquiry_id=inquiry["id"] if inquiry else None,
            eligible=issue is None,
            closed=closed,
            issue=issue,
        )
    except CancellationError as exc:
        return failure(request, str(exc), 404)


@router.get("/{id}/financial-closures", response_model=list[Receipt])
def history(
    id: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("payments.read")),
):
    if not access(db, principal):
        return failure(request, "permission_denied", 403)
    return list(
        db.execute(
            text(
                "SELECT * FROM unpaid_cancellation_closures WHERE request_id=:id ORDER BY created_at,id"
            ),
            {"id": id},
        ).mappings()
    )


@router.get("/{id}/financial-closures/{key}", response_model=Receipt)
def saved(
    id: UUID,
    key: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("payments.read")),
):
    if not access(db, principal):
        return failure(request, "permission_denied", 403)
    row = (
        db.execute(
            text(
                "SELECT * FROM unpaid_cancellation_closures WHERE request_id=:id AND id=:key AND actor_id=:actor"
            ),
            {"id": id, "key": key, "actor": principal.account_id},
        )
        .mappings()
        .first()
    )
    return dict(row) if row else failure(request, "financial_closure_not_found", 404)


def apply(db, actor, id, key, body):
    intent = body.model_dump(mode="json")
    previous = (
        db.execute(text("SELECT * FROM unpaid_cancellation_closures WHERE id=:id"), {"id": key})
        .mappings()
        .first()
    )
    if previous:
        if (
            previous["request_id"] != id
            or str(previous["actor_id"]) != str(actor)
            or previous["intent"] != intent
        ):
            fail("command_conflict")
        return dict(previous)
    r, order, payment, inquiry, _, issue = context(db, id, True)
    if (
        order["version"] != body.expected_version
        or r["version"] != body.request_version
        or not payment
        or payment["version"] != body.payment_version
    ):
        fail("version_conflict")
    if issue:
        fail(issue)
    if inquiry["id"] != body.inquiry_id:
        fail("inquiry_conflict")
    result = dict(
        order_id=str(order["id"]),
        order_version=order["version"] + 1,
        request_version=r["version"] + 1,
        payment_version=payment["version"],
        payment_status="failed",
        refund_issued=False,
    )
    db.execute(
        text(
            "UPDATE customer_orders SET state=jsonb_set(state,'{unpaid_cancellation_closure}',to_jsonb(CAST(:key AS text))),version=version+1,updated_at=clock_timestamp() WHERE id=:id"
        ),
        {"id": order["id"], "key": str(key)},
    )
    db.execute(
        text(
            "UPDATE customer_order_requests SET status='completed',version=version+1,updated_at=clock_timestamp() WHERE id=:id"
        ),
        {"id": id},
    )
    row = (
        db.execute(
            text(
                "INSERT INTO unpaid_cancellation_closures(id,request_id,order_id,inquiry_id,actor_id,intent,result) VALUES(:id,:request,:order,:inquiry,:actor,CAST(:intent AS jsonb),CAST(:result AS jsonb)) RETURNING *"
            ),
            {
                "id": key,
                "request": id,
                "order": order["id"],
                "inquiry": body.inquiry_id,
                "actor": actor,
                "intent": json.dumps(intent),
                "result": json.dumps(result),
            },
        )
        .mappings()
        .one()
    )
    announce(db, order, id, key, "closed", actor, body.reason)
    return dict(row)


def announce(db, order, request_id, key, phase, actor, reason, confirmed=True):
    SqlAccountManagement(db).audit(
        actor,
        str(order["account_id"]),
        "orders.cancellation_finance_" + phase,
        dict(
            closure_id=str(key), request_id=str(request_id), order_id=str(order["id"]), phase=phase
        ),
        reason,
    )
    notify(
        db,
        order["account_id"],
        event=f"cancellation-finance:{key}:{phase}",
        category="order",
        title_fa="بررسی مالی لغو بدون پرداخت بسته شد؛ بازپرداختی انجام نشد"
        if phase == "closed"
        else (
            "پرداخت دیرهنگام تأیید شد؛ بررسی بازپرداخت سفارش لغوشده باز شد"
            if confirmed
            else "نتیجه پرداخت نامشخص شد؛ بررسی مالی سفارش لغوشده باز شد"
        ),
        title_en="Cancelled order financial review closed without payment; no refund issued"
        if phase == "closed"
        else (
            "Late payment confirmed; cancelled order refund review reopened"
            if confirmed
            else "Payment result uncertain; cancelled order financial review reopened"
        ),
        reference="order_id",
        id=order["id"],
    )
    enqueue(
        db,
        "orders.cancellation_finance_changed",
        dict(
            closure_id=str(key), request_id=str(request_id), order_id=str(order["id"]), phase=phase
        ),
    )


@router.put("/{id}/financial-closures/{key}", response_model=Receipt)
def command(
    id: UUID,
    key: UUID,
    body: Command,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("payments.read")),
):
    actor, denied = write_access(request, db, principal, "finance.write")
    if denied is not None:
        return denied
    current = SqlIdentityRepository(db).principal(actor.id, lock=True)
    if not current.allows("orders.read_all") or not current.allows("payments.read"):
        return failure(request, "permission_denied", 403)
    db.execute(text("SELECT pg_advisory_xact_lock(78214,44)"))
    try:
        result = apply(db, actor.id, id, key, body)
        db.commit()
        return result
    except CancellationError as exc:
        db.rollback()
        return failure(request, str(exc), 404 if str(exc).endswith("not_found") else 409)
    except Exception:
        db.rollback()
        raise


def reopen(db, payment, status, closure):
    """Caller holds payment/order locks. Preserve the old receipt, reopen review."""
    closed = (
        db.execute(
            text("SELECT * FROM unpaid_cancellation_closures WHERE id=:id AND order_id=:order"),
            {"id": UUID(closure), "order": payment["order_id"]},
        )
        .mappings()
        .one()
    )
    reopened = db.execute(
        text(
            "UPDATE customer_order_requests SET status='approved',version=version+1,updated_at=clock_timestamp() WHERE id=:id AND status='completed' RETURNING id"
        ),
        {"id": closed["request_id"]},
    ).scalar()
    db.execute(
        text("UPDATE customer_orders SET state=state-'unpaid_cancellation_closure' WHERE id=:id"),
        {"id": payment["order_id"]},
    )
    if reopened:
        order = (
            db.execute(
                text("SELECT * FROM customer_orders WHERE id=:id"), {"id": payment["order_id"]}
            )
            .mappings()
            .one()
        )
        announce(
            db,
            order,
            reopened,
            closed["id"],
            "reopened",
            None,
            "Gateway verification changed the rejected result after no-payment closure: " + status,
            confirmed=status == "paid",
        )
