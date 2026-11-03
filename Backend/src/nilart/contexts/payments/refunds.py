"""Explicit local sandbox refunds; no provider/bank transfer is implied or performed."""

import hashlib
import json
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal, localcontext
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.bootstrap.settings import settings
from nilart.contexts.customer.notifications import notify
from nilart.contexts.fulfillment.returns import received
from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.contexts.identity.presentation.router import failure
from nilart.contexts.orders.domain import Amount, OrderSnapshot, OrderState, validate_state
from nilart.shared.database import session_dependency
from nilart.shared.outbox import enqueue

router = APIRouter(prefix="/api/v1/admin/refunds", tags=["sandbox-refunds"])
customer_router = APIRouter(prefix="/api/v1/account/orders", tags=["refund-tracking"])


class RefundError(Exception):
    pass


def fail(code):
    raise RefundError("refund_" + code)


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Item(Strict):
    line_id: UUID
    component: int = Field(ge=0, strict=True)
    quantity: int = Field(gt=0, le=1000000, strict=True)


class Selection(Strict):
    request_id: UUID
    items: list[Item] = Field(default_factory=list, max_length=100)
    include_shipping: bool = Field(default=False, strict=True)
    include_tax: bool = Field(default=False, strict=True)
    close_request: bool = Field(default=False, strict=True)

    @model_validator(mode="after")
    def unique(self):
        if not self.items and not (self.include_shipping or self.include_tax or self.close_request):
            raise ValueError("refund selection required")
        if len({(i.line_id, i.component) for i in self.items}) != len(self.items):
            raise ValueError("duplicate refund component")
        return self


class Command(Selection):
    expected_version: int = Field(ge=0, strict=True)
    request_version: int = Field(ge=0, strict=True)
    quote_fingerprint: str = Field(pattern=r"^[a-f0-9]{64}$")
    expected_amount: Amount
    sandbox_confirmed: Literal[True]
    reason: str = Field(min_length=5, max_length=1000)


class Allocation(Item):
    title_fa: str
    title_en: str
    amount: Amount


class Quote(BaseModel):
    selection: Selection
    expected_version: int
    request_version: int
    currency: Literal["IRT", "IRR"]
    items: list[Allocation]
    shipping_amount: Amount
    tax_amount: Amount
    amount: Amount
    quote_fingerprint: str


class Outcome(BaseModel):
    simulation: Literal["local_sandbox"]
    reference: str
    original_payment_reference: str
    order_reference: str
    currency: Literal["IRT", "IRR"]
    items: list[Allocation]
    shipping_amount: Amount
    tax_amount: Amount
    amount: Amount
    refunded_amount: Amount
    payment_status: Literal["paid", "partially_refunded", "refunded"]
    order_version: int
    request_version: int
    request_completed: bool


class Receipt(BaseModel):
    id: UUID
    order_id: UUID
    request_id: UUID
    payment_id: UUID
    actor_id: UUID
    intent: Command
    result: Outcome
    created_at: datetime


class Page(BaseModel):
    items: list[Receipt]
    next_cursor: UUID | None


def money(value):
    return format(value, ".2f")


def anchor(db, id):
    row = (
        db.execute(text("SELECT * FROM customer_order_requests WHERE id=:id"), {"id": id})
        .mappings()
        .first()
    )
    if not row:
        fail("request_not_found")
    return row


def context(db, id, lock=False):
    r = anchor(db, id)
    # Fulfillment uses this same lock before payment/order. Payment callbacks lock payment first.
    payment = (
        db.execute(
            text(
                "SELECT * FROM sandbox_payments WHERE order_id=:id"
                + (" FOR UPDATE" if lock else "")
            ),
            {"id": r["order_id"]},
        )
        .mappings()
        .first()
    )
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
    snapshot = OrderSnapshot.model_validate(order["snapshot"])
    if (
        settings.payment_mode not in {"zarinpal_sandbox", "zibal_sandbox"}
        or (settings.payment_mode == "zarinpal_sandbox" and settings.environment != "development")
        or not order["sandbox"]
    ):
        fail("sandbox_unavailable")
    if r["kind"] not in {"return", "cancellation"} or r["status"] != "approved":
        fail("approved_return_required")
    if r["kind"] == "cancellation" and (
        order["state"]["fulfillment"] != "cancelled"
        or not db.scalar(
            text("SELECT 1 FROM order_cancellations WHERE request_id=:id AND order_id=:order"),
            {"id": r["id"], "order": order["id"]},
        )
    ):
        fail("cancellation_not_processed")
    lines = {str(line.id): line for line in snapshot.items}
    requested = requested_quantities(r, snapshot)
    if not requested or any(
        id not in lines or type(qty) is not int or not 0 < qty <= lines[id].quantity
        for id, qty in requested.items()
    ):
        fail("historical_request_incomplete")
    if (
        not payment
        or payment["status"] != "paid"
        or not snapshot.receipt
        or order["state"]["payment"] not in {"paid", "partially_refunded", "refunded"}
    ):
        fail("confirmed_payment_required")
    conversion = Decimal(10) if snapshot.currency == "IRT" else Decimal(1)
    if Decimal(snapshot.receipt.paid_amount) * conversion != payment["amount_rial"]:
        fail("payment_amount_mismatch")
    history = list(
        db.execute(
            text("SELECT * FROM order_refunds WHERE order_id=:id ORDER BY created_at,id"),
            {"id": order["id"]},
        ).mappings()
    )
    if sum((Decimal(x["result"]["amount"]) for x in history), Decimal(0)) != Decimal(
        order["state"]["refunded_amount"]
    ):
        fail("historical_refunds_incomplete")
    # Reject incomplete legacy allocation rather than inventing paid component shares.
    if any(
        not line.stock_components or any(c.paid_amount is None for c in line.stock_components)
        for line in snapshot.items
    ):
        fail("historical_allocations_incomplete")
    return r, order, payment, snapshot, history


def requested_quantities(r, snapshot):
    return (
        {str(line.id): line.quantity for line in snapshot.items}
        if r["kind"] == "cancellation"
        else r["payload"].get("quantities", {})
    )


def availability(db, r, snapshot, history):
    inspected = (
        {
            (str(line.id), c.component): c.quantity
            for line in snapshot.items
            for c in line.stock_components or []
        }
        if r["kind"] == "cancellation"
        else received(db, request=r["id"])
    )
    used, used_request = {}, {}
    shipping = tax = Decimal(0)
    for refund in history:
        shipping += Decimal(refund["result"]["shipping_amount"])
        tax += Decimal(refund["result"]["tax_amount"])
        for c in refund["result"]["items"]:
            pair = (c["line_id"], c["component"])
            used[pair] = used.get(pair, 0) + c["quantity"]
            if refund["request_id"] == r["id"]:
                used_request[pair] = used_request.get(pair, 0) + c["quantity"]
    available, components = {}, {}
    for line in snapshot.items:
        for c in line.stock_components or []:
            pair = (str(line.id), c.component)
            components[pair] = c
            approved = requested_quantities(r, snapshot).get(str(line.id), 0) * c.per_unit
            remaining = min(
                inspected.get(pair, 0) - used_request.get(pair, 0),
                approved - used_request.get(pair, 0),
                c.quantity - used.get(pair, 0),
            )
            if remaining > 0:
                available[pair] = remaining
    return (
        available,
        components,
        used,
        used_request,
        Decimal(snapshot.shipping_amount) - shipping,
        Decimal(snapshot.tax_amount) - tax,
    )


def component_amount(c, before, quantity):
    with localcontext() as ctx:
        ctx.prec = 60
        paid = Decimal(c.paid_amount)

        def share(q):
            return (paid * q / c.quantity).quantize(Decimal(".01"), rounding=ROUND_HALF_UP)

        return share(before + quantity) - share(before)


def quote(db, selection, ctx=None):
    r, order, payment, snapshot, history = ctx or context(db, selection.request_id)
    available, components, used, _, shipping, tax = availability(db, r, snapshot, history)
    allocations = []
    for item in selection.items:
        pair = (str(item.line_id), item.component)
        if item.quantity > available.get(pair, 0):
            fail("quantity_exceeded")
        c = components[pair]
        allocations.append(
            {
                **item.model_dump(mode="json"),
                "title_fa": c.title_fa,
                "title_en": c.title_en,
                "amount": money(component_amount(c, used.get(pair, 0), item.quantity)),
            }
        )
    if snapshot.checkout_terms:
        policy = snapshot.checkout_terms["policy"]
        if policy["refund_policy"] != "items_and_proportional_tax_shipping_if_unshipped":
            fail("policy_configuration_missing")
        if selection.include_shipping:
            allocation = db.scalar(
                text("SELECT shipped FROM order_stock_allocations WHERE order_id=:id"),
                {"id": order["id"]},
            )
            if r["kind"] != "cancellation" or any(int(q) > 0 for q in (allocation or {}).values()):
                fail("shipping_not_refundable")
        paid_items = sum(
            (
                Decimal(line.unit_amount) * line.quantity - Decimal(line.discount_amount)
                for line in snapshot.items
            ),
            Decimal(0),
        )
        returned_items = sum(
            (Decimal(item["amount"]) for h in history for item in h["result"]["items"]), Decimal(0)
        ) + sum((Decimal(item["amount"]) for item in allocations), Decimal(0))
        previously_tax = sum((Decimal(h["result"]["tax_amount"]) for h in history), Decimal(0))
        tax_base = paid_items + (
            Decimal(snapshot.shipping_amount)
            if policy["tax_basis"] == "items_and_shipping"
            else Decimal(0)
        )
        refunded_shipping = sum(
            (Decimal(h["result"]["shipping_amount"]) for h in history), Decimal(0)
        )
        eligible_base = returned_items + (
            (refunded_shipping + (shipping if selection.include_shipping else Decimal(0)))
            if policy["tax_basis"] == "items_and_shipping"
            else Decimal(0)
        )
        proportional = (
            (Decimal(snapshot.tax_amount) * eligible_base / tax_base).quantize(
                Decimal(".01"), rounding=ROUND_HALF_UP
            )
            if tax_base
            else Decimal(0)
        )
        tax = max(Decimal(0), min(tax, proportional - previously_tax))
    shipping = shipping if selection.include_shipping else Decimal(0)
    tax = tax if selection.include_tax else Decimal(0)
    amount = sum((Decimal(x["amount"]) for x in allocations), shipping + tax)
    if min(shipping, tax, amount) < 0 or amount + Decimal(
        order["state"]["refunded_amount"]
    ) > Decimal(snapshot.receipt.paid_amount):
        fail("amount_exceeded")
    result = {
        "selection": selection.model_dump(mode="json"),
        "expected_version": order["version"],
        "request_version": r["version"],
        "currency": snapshot.currency,
        "items": allocations,
        "shipping_amount": money(shipping),
        "tax_amount": money(tax),
        "amount": money(amount),
    }
    result["quote_fingerprint"] = hashlib.sha256(
        json.dumps(result, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    return result


def apply(db, actor, key, body):
    previous = (
        db.execute(text("SELECT * FROM order_refunds WHERE id=:id"), {"id": key}).mappings().first()
    )
    intent = body.model_dump(mode="json")
    if previous:
        if str(previous["actor_id"]) != str(actor) or previous["intent"] != intent:
            fail("command_conflict")
        return dict(previous)
    ctx = context(db, body.request_id, lock=True)
    r, order, payment, snapshot, history = ctx
    if body.expected_version != order["version"] or body.request_version != r["version"]:
        fail("version_conflict")
    selection = Selection.model_validate({k: intent[k] for k in Selection.model_fields})
    q = quote(db, selection, ctx)
    if body.quote_fingerprint != q["quote_fingerprint"] or Decimal(body.expected_amount) != Decimal(
        q["amount"]
    ):
        fail("quote_changed")
    state = OrderState.model_validate(order["state"])
    total = Decimal(state.refunded_amount) + Decimal(q["amount"])
    state.refunded_amount = money(total)
    if total > 0:
        state.payment = (
            "refunded" if total == Decimal(snapshot.receipt.paid_amount) else "partially_refunded"
        )
    validate_state(snapshot, state)
    _, components, _, used_request, _, _ = availability(db, r, snapshot, history)
    after = dict(used_request)
    for item in body.items:
        pair = (str(item.line_id), item.component)
        after[pair] = after.get(pair, 0) + item.quantity
    all_received_refunded = all(
        after.get(pair, 0) == requested_quantities(r, snapshot).get(pair[0], 0) * c.per_unit
        for pair, c in components.items()
        if pair[0] in requested_quantities(r, snapshot)
        and (
            r["kind"] == "cancellation" or (c.delivery == "physical" and c.returnable is not False)
        )
    )
    if body.close_request and not all_received_refunded:
        fail("completion_not_ready")
    completed = body.close_request
    result = {
        "simulation": "local_sandbox",
        "reference": "SIMULATED-REFUND-" + str(key),
        "original_payment_reference": payment["reference"] or "",
        "order_reference": snapshot.reference,
        "currency": snapshot.currency,
        "items": q["items"],
        "shipping_amount": q["shipping_amount"],
        "tax_amount": q["tax_amount"],
        "amount": q["amount"],
        "refunded_amount": money(total),
        "payment_status": state.payment,
        "order_version": order["version"] + 1,
        "request_version": r["version"] + 1,
        "request_completed": completed,
    }
    saved = (
        db.execute(
            text(
                "INSERT INTO order_refunds(id,order_id,request_id,payment_id,actor_id,intent,result) VALUES(:id,:order,:request,:payment,:actor,CAST(:intent AS jsonb),CAST(:result AS jsonb)) RETURNING *"
            ),
            {
                "id": key,
                "order": order["id"],
                "request": r["id"],
                "payment": payment["id"],
                "actor": actor,
                "intent": json.dumps(intent),
                "result": json.dumps(result),
            },
        )
        .mappings()
        .one()
    )
    db.execute(
        text(
            "UPDATE customer_orders SET state=CAST(:state AS jsonb),version=version+1,updated_at=clock_timestamp() WHERE id=:id"
        ),
        {"id": order["id"], "state": json.dumps(state.model_dump(mode="json"))},
    )
    db.execute(
        text(
            "UPDATE customer_order_requests SET version=version+1,status=:status,updated_at=clock_timestamp() WHERE id=:id"
        ),
        {"id": r["id"], "status": "completed" if completed else "approved"},
    )
    SqlAccountManagement(db).audit(
        str(actor),
        str(order["account_id"]),
        "payments.refund_simulated",
        {
            "refund_id": str(key),
            "request_id": str(r["id"]),
            "before": {
                "payment": order["state"]["payment"],
                "refunded_amount": order["state"]["refunded_amount"],
            },
            "after": result,
        },
        body.reason,
    )
    notify(
        db,
        order["account_id"],
        event=f"refund:{key}",
        category="order",
        title_fa="بازپرداخت آزمایشی سفارش ثبت شد",
        title_en="Simulated sandbox order refund recorded",
        reference="order_id",
        id=order["id"],
    )
    enqueue(
        db,
        "payments.refund_simulated",
        {
            "refund_id": str(key),
            "order_id": str(order["id"]),
            "request_id": str(r["id"]),
            "amount": q["amount"],
            "currency": snapshot.currency,
            "simulation": "local_sandbox",
        },
    )
    return dict(saved)


class Choice(BaseModel):
    id: UUID
    order_id: UUID
    reference: str


class Choices(BaseModel):
    items: list[Choice]
    next_cursor: UUID | None


@router.get("/requests", response_model=Choices)
def choices(
    q: str = Query("", max_length=200),
    cursor: UUID | None = None,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("payments.read")),
):
    rows = (
        db.execute(
            text(
                "SELECT r.id,r.order_id,o.snapshot->>'reference' AS reference FROM customer_order_requests r JOIN customer_orders o ON o.id=r.order_id WHERE r.status='approved' AND EXISTS(SELECT 1 FROM sandbox_payments p WHERE p.order_id=o.id AND p.status='paid') AND ((r.kind='return' AND EXISTS(SELECT 1 FROM order_return_inspections i WHERE i.request_id=r.id)) OR (r.kind='cancellation' AND EXISTS(SELECT 1 FROM order_cancellations c WHERE c.request_id=r.id))) AND (:q='' OR strpos(lower(o.snapshot->>'reference'),lower(CAST(:q AS text)))>0) AND (CAST(:cursor AS uuid) IS NULL OR r.id>:cursor) ORDER BY r.id LIMIT 26"
            ),
            {"q": q.strip(), "cursor": cursor},
        )
        .mappings()
        .all()
    )
    return {
        "items": [dict(x) for x in rows[:25]],
        "next_cursor": rows[24]["id"] if len(rows) > 25 else None,
    }


class Available(BaseModel):
    line_id: UUID
    component: int
    title_fa: str
    title_en: str
    remaining: int
    remaining_amount: Amount


class Plan(BaseModel):
    kind: Literal["return", "cancellation"]
    request_id: UUID
    order_id: UUID
    reference: str
    version: int
    request_version: int
    currency: Literal["IRT", "IRR"]
    shipping_remaining: Amount
    tax_remaining: Amount
    items: list[Available]


@router.get("/requests/{id}", response_model=Plan)
def plan(
    id: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("payments.read")),
):
    try:
        r, order, _, snapshot, history = context(db, id)
        available, components, used, _, shipping, tax = availability(db, r, snapshot, history)
        return {
            "request_id": id,
            "order_id": order["id"],
            "reference": snapshot.reference,
            "kind": r["kind"],
            "version": order["version"],
            "request_version": r["version"],
            "currency": snapshot.currency,
            "shipping_remaining": money(shipping),
            "tax_remaining": money(tax),
            "items": [
                {
                    "line_id": pair[0],
                    "component": pair[1],
                    "title_fa": components[pair].title_fa,
                    "title_en": components[pair].title_en,
                    "remaining": qty,
                    "remaining_amount": money(
                        component_amount(components[pair], used.get(pair, 0), qty)
                    ),
                }
                for pair, qty in available.items()
            ],
        }
    except RefundError as exc:
        return failure(request, str(exc), 404 if str(exc).endswith("not_found") else 409)


@router.post("/quotes", response_model=Quote)
def preview(
    body: Selection,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("payments.read")),
):
    try:
        return quote(db, body)
    except RefundError as exc:
        return failure(request, str(exc), 404 if str(exc).endswith("not_found") else 409)


@router.get("", response_model=Page)
def history(
    order_id: UUID | None = None,
    request_id: UUID | None = None,
    cursor: UUID | None = None,
    q: str = Query("", max_length=200),
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("payments.read")),
):
    rows = (
        db.execute(
            text(
                "SELECT * FROM order_refunds WHERE (CAST(:order AS uuid) IS NULL OR order_id=:order) AND (CAST(:request AS uuid) IS NULL OR request_id=:request) AND (:q='' OR strpos(lower(result->>'order_reference'),lower(CAST(:q AS text)))>0 OR strpos(lower(result->>'reference'),lower(CAST(:q AS text)))>0) AND (CAST(:cursor AS uuid) IS NULL OR (created_at,id)<(SELECT created_at,id FROM order_refunds WHERE id=:cursor)) ORDER BY created_at DESC,id DESC LIMIT 26"
            ),
            {"order": order_id, "request": request_id, "q": q.strip(), "cursor": cursor},
        )
        .mappings()
        .all()
    )
    return {
        "items": [dict(x) for x in rows[:25]],
        "next_cursor": rows[24]["id"] if len(rows) > 25 else None,
    }


@router.get("/commands/{key}", response_model=Receipt)
def saved(
    key: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("payments.read")),
):
    row = (
        db.execute(
            text("SELECT * FROM order_refunds WHERE id=:id AND actor_id=:actor"),
            {"id": key, "actor": principal.account_id},
        )
        .mappings()
        .first()
    )
    return dict(row) if row else failure(request, "refund_command_not_found", 404)


@router.put("/commands/{key}", response_model=Receipt)
def command(
    key: UUID,
    body: Command,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("payments.refund")),
):
    actor, denied = write_access(request, db, principal, "payments.refund")
    if denied is not None:
        return denied
    if not SqlIdentityRepository(db).principal(actor.id, lock=True).allows("payments.read"):
        return failure(request, "permission_denied", 403)
    db.execute(text("SELECT pg_advisory_xact_lock(78214,44)"))
    try:
        result = apply(db, actor.id, key, body)
        db.commit()
        return result
    except RefundError as exc:
        db.rollback()
        return failure(request, str(exc), 404 if str(exc).endswith("not_found") else 409)
    except Exception:
        db.rollback()
        raise


class CustomerRefund(BaseModel):
    id: UUID
    request_id: UUID
    reference: str
    simulation: Literal["local_sandbox"]
    currency: Literal["IRT", "IRR"]
    items: list[Allocation]
    shipping_amount: Amount
    tax_amount: Amount
    amount: Amount
    created_at: datetime


class CustomerPage(BaseModel):
    order_id: UUID
    items: list[CustomerRefund]
    next_cursor: UUID | None


@customer_router.get("/{id}/refunds", response_model=CustomerPage)
def tracking(
    id: UUID,
    request: Request,
    cursor: UUID | None = None,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("orders.read_self")),
):
    if not db.scalar(
        text("SELECT 1 FROM customer_orders WHERE id=:id AND account_id=:owner"),
        {"id": id, "owner": principal.account_id},
    ):
        return failure(request, "order_not_found", 404)
    rows = (
        db.execute(
            text(
                "SELECT * FROM order_refunds WHERE order_id=:id AND (CAST(:cursor AS uuid) IS NULL OR id>:cursor) ORDER BY id LIMIT 21"
            ),
            {"id": id, "cursor": cursor},
        )
        .mappings()
        .all()
    )
    return {
        "order_id": id,
        "items": [
            {
                "id": x["id"],
                "request_id": x["request_id"],
                "created_at": x["created_at"],
                **{
                    k: x["result"][k]
                    for k in [
                        "reference",
                        "simulation",
                        "currency",
                        "items",
                        "shipping_amount",
                        "tax_amount",
                        "amount",
                    ]
                },
            }
            for x in rows[:20]
        ],
        "next_cursor": rows[19]["id"] if len(rows) > 20 else None,
    }
