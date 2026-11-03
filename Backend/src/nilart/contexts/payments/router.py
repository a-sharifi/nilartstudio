import hmac
import json
from datetime import UTC, datetime
from decimal import Decimal
from typing import Literal, NoReturn
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.bootstrap.settings import settings
from nilart.contexts.basket.router import identity, output, owned
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.infrastructure.secrets import token_digest
from nilart.contexts.inventory import reservations as stock
from nilart.contexts.orders.domain import OrderSnapshot, StockComponent
from nilart.contexts.payments.checkout_review import (
    Review,
    ReviewError,
    Selection,
    line_terms,
)
from nilart.contexts.payments.checkout_review import (
    build as build_checkout_review,
)
from nilart.contexts.payments.gateway import (
    GatewayRejected,
    GatewayUnknown,
    ZarinpalSandbox,
    ZibalSandbox,
    payment_provider,
    rial,
    start_url,
)
from nilart.shared.database import session_dependency
from nilart.shared.outbox import enqueue

router = APIRouter(prefix="/api/v1/payments", tags=["sandbox-payments"])


def fail(code, status=400) -> NoReturn:
    raise HTTPException(status, detail={"code": code}, headers={"Cache-Control": "no-store"})


def gateway(row=None):
    if settings.payment_mode == "disabled":
        fail("sandbox_unavailable", 503)
    mode = payment_provider(row) if row is not None else settings.payment_mode
    if mode == "zibal_sandbox":
        if settings.payment_mode == "disabled":
            fail("sandbox_unavailable", 503)
        return ZibalSandbox(settings.zibal_merchant_id, str(row["id"]) if row is not None else None)
    if mode != "zarinpal_sandbox" or settings.environment != "development":
        fail("sandbox_unavailable", 503)
    return ZarinpalSandbox(settings.zarinpal_merchant_id)


def actor(request, db):
    if request.headers.get("origin") != settings.public_origin:
        fail("origin_invalid", 403)
    account = identity(request, db, True)
    if not account:
        fail("unauthenticated", 401)
    if not SqlIdentityRepository(db).principal(account.id, lock=True).allows("account.write_self"):
        fail("permission_denied", 403)
    csrf = request.headers.get("x-csrf-token", "")
    if (
        not csrf
        or len(csrf) > 128
        or not hmac.compare_digest(token_digest(csrf), account.csrf_hash)
    ):
        fail("csrf_invalid", 403)
    return account


def event(db, row, name):
    if name == "paid":
        from nilart.contexts.messaging.service import paid

        paid(db, row)
    enqueue(
        db,
        "sandbox.payment." + name,
        {
            "payment_id": str(row["id"]),
            "order_id": str(row["order_id"]),
            "sandbox": True,
            "account_id": str(row["account_id"]),
            "amount_rial": str(row["amount_rial"]),
            "status": name,
        },
    )


def result(row):
    return {
        "id": str(row["id"]),
        "provider": payment_provider(row),
        "order_id": str(row["order_id"]),
        "status": row["status"],
        "reference": row["reference"],
        "amount_rial": str(row["amount_rial"]),
        "sandbox": True,
        "stock_managed": bool(
            row.get("intent")
            and row["intent"].get("stock_fingerprint")
            and (
                row["intent"].get("address_id") is not None
                or not row["intent"].get("checkout_fingerprint")
            )
        ),
        "gateway_url": start_url(row)
        if row["authority"] and row["status"] in ("pending", "cancelled", "failed")
        else None,
    }


class PaymentOutput(BaseModel):
    provider: str
    id: UUID
    order_id: UUID
    status: Literal["requesting", "pending", "paid", "cancelled", "failed", "unknown"]
    reference: str | None
    amount_rial: str
    sandbox: Literal[True]
    stock_managed: bool
    gateway_url: str | None


class PaymentConfig(BaseModel):
    provider: str
    enabled: bool
    sandbox: Literal[True]


class PaymentStart(BaseModel):
    command_id: UUID
    basket_version: int = Field(ge=0)
    address_id: UUID | None = None
    shipping_method_id: UUID | None = None
    checkout_fingerprint: str | None = Field(default=None, pattern=r"^[a-f0-9]{64}$")
    language: Literal["fa", "en"] = "fa"
    sandbox_confirmed: Literal[True]
    discount_code: str | None = Field(default=None, pattern=r"^[A-Z0-9][A-Z0-9_-]{0,79}$")
    discount_version: int | None = Field(default=None, strict=True, ge=1)
    stock_fingerprint: str | None = Field(default=None, pattern=r"^[a-f0-9]{64}$")
    expected_total: str = Field(pattern=r"^\d{1,12}(?:\.\d{1,7})?$")


@router.get("/config", response_model=PaymentConfig)
def config(response: Response):
    response.headers["Cache-Control"] = "no-store"
    return {
        "enabled": settings.payment_mode == "zibal_sandbox"
        or (settings.environment == "development" and settings.payment_mode == "zarinpal_sandbox"),
        "sandbox": True,
        "provider": settings.payment_mode,
    }


class ReviewedPosition(BaseModel):
    position_id: UUID
    required: int
    available: str
    issue: Literal["stock_opening_required", "stock_insufficient"] | None


class StockReview(BaseModel):
    basket_version: int
    fingerprint: str
    settings_version: int
    reservation_minutes: int
    components: list[StockComponent]
    positions: list[ReviewedPosition]
    ready: bool


@router.get("/stock-review", response_model=StockReview)
def stock_review(
    request: Request,
    response: Response,
    basket_version: int,
    db: Session = Depends(session_dependency),
):
    account = identity(request, db)
    if not account:
        fail("unauthenticated", 401)
    basket = owned(request, db, account)
    if not basket or basket["version"] != basket_version:
        fail("stale_basket", 409)
    stock.catalogue_lock(db)
    current = output(request, db, basket, account)
    if not current["lines"] or any(row["issue"] for row in current["lines"]):
        fail("basket_requires_review", 409)
    try:
        reviewed = stock.review(
            db, basket, current, terms=[line_terms(db, line) for line in current["lines"]]
        )
    except (stock.ReservationError, ReviewError) as error:
        fail(str(error), 409)

    response.headers["Cache-Control"] = "no-store"
    return reviewed


@router.post("/checkout-review", response_model=Review)
def checkout_review(
    body: Selection, request: Request, response: Response, db: Session = Depends(session_dependency)
):
    account = actor(request, db)
    basket = owned(request, db, account)
    if not basket or basket["version"] != body.basket_version:
        fail("stale_basket", 409)
    stock.catalogue_lock(db)
    current = output(request, db, basket, account)
    if not current["lines"] or any(row["issue"] for row in current["lines"]):
        fail("basket_requires_review", 409)
    try:
        reviewed, _, _ = build_checkout_review(db, basket, current, account, body)
    except ReviewError as error:
        fail(str(error), 409)
    db.commit()  # Persist the bounded carrier quote for accepted-checkout replay.
    response.headers["Cache-Control"] = "no-store"
    return reviewed


@router.post("/shipping-quote")
def shipping_quote(
    body: Selection, request: Request, response: Response, db: Session = Depends(session_dependency)
):
    account = actor(request, db)
    basket = owned(request, db, account)
    if not basket or basket["version"] != body.basket_version:
        fail("stale_basket", 409)
    stock.catalogue_lock(db)
    current = output(request, db, basket, account)
    if not current["lines"] or any(row["issue"] for row in current["lines"]):
        fail("basket_requires_review", 409)
    try:
        reviewed, address, discount = build_checkout_review(db, basket, current, account, body)
        from nilart.contexts.business.router import current_settings
        from nilart.contexts.shipping.checkout import quote_shipping

        _, config, _ = current_settings(db)
        method = next(
            (
                m
                for m in config.shipping_methods
                if m.id == body.shipping_method_id and m.active and m.carrier == "tapin"
            ),
            None,
        )
        if (
            method is None
            or not address
            or (method.provinces and address["province"] not in method.provinces)
        ):
            fail("shipping_method_required", 409)
        owner = account.id
        # No account, basket, catalogue, stock or settings locks are held over carrier I/O.
        # A later review only accepts the cache when every captured input still matches.
        db.commit()
        quote, issue = quote_shipping(
            db, owner, current, reviewed["lines"], address, method, fetch=True, discount=discount
        )
        db.commit()
    except ReviewError as error:
        fail(str(error), 409)
    response.headers["Cache-Control"] = "no-store"
    return dict(quote=quote, issue=issue)


@router.post("/sandbox/checkout", response_model=PaymentOutput)
def checkout(
    body: PaymentStart,
    request: Request,
    response: Response,
    db: Session = Depends(session_dependency),
):
    provider = gateway()
    account = actor(request, db)
    previous = (
        db.execute(
            text("SELECT * FROM sandbox_payments WHERE account_id=:owner AND command_id=:command"),
            {"owner": account.id, "command": body.command_id},
        )
        .mappings()
        .first()
    )
    if previous:
        if (
            previous["intent"] is not None
            and PaymentStart.model_validate(previous["intent"]).model_dump(mode="json")
            != body.model_dump(mode="json")
        ) or (previous["intent"] is None and body.discount_code):
            fail("payment_command_conflict", 409)
        response.headers["Cache-Control"] = "no-store"
        return result(previous)
    basket = owned(request, db, account, True)
    if not basket or basket["version"] != body.basket_version:
        fail("stale_basket", 409)
    existing = (
        db.execute(
            text("SELECT * FROM sandbox_payments WHERE basket_id=:id AND basket_version=:version"),
            {"id": basket["id"], "version": basket["version"]},
        )
        .mappings()
        .first()
    )
    if existing:
        intent = body.model_dump(mode="json")
        if existing["intent"] is not None:
            old = {
                key: value
                for key, value in PaymentStart.model_validate(existing["intent"])
                .model_dump(mode="json")
                .items()
                if key != "command_id"
            }
            if old != {key: value for key, value in intent.items() if key != "command_id"}:
                fail("checkout_in_progress", 409)
        elif body.discount_code:
            fail("checkout_in_progress", 409)
        return result(existing)
    stock.catalogue_lock(db)
    db.execute(text("SELECT pg_advisory_xact_lock_shared(78214,34)"))
    current = output(request, db, basket, account)
    if not current["lines"] or any(row["issue"] for row in current["lines"]):
        fail("basket_requires_review", 409)
    discount, discount_rule = None, None
    if body.discount_code:
        from nilart.contexts.discounts.engine import DiscountError, evaluate, rule_by_code

        db.execute(text("SELECT pg_advisory_xact_lock(78214,33)"))
        try:
            discount_rule = rule_by_code(db, body.discount_code)
            if discount_rule["version"] != body.discount_version:
                fail("discount_changed", 409)
            phone = db.scalar(
                text("SELECT phone FROM identity_accounts WHERE id=:id"), {"id": account.id}
            )
            discount = evaluate(db, discount_rule, current, account.id, phone)
        except DiscountError as error:
            fail(str(error), 409)
    elif body.discount_version is not None:
        fail("discount_invalid", 422)
    try:
        accepted, address, _ = build_checkout_review(
            db,
            basket,
            current,
            account,
            Selection.model_validate({k: getattr(body, k) for k in Selection.model_fields}),
        )
    except ReviewError as error:
        fail(str(error), 409)
    if (
        not body.checkout_fingerprint
        or body.checkout_fingerprint != accepted["fingerprint"]
        or not accepted["ready"]
    ):
        fail("checkout_review_required", 409)
    payable = accepted["total"]
    if Decimal(payable) != Decimal(body.expected_total):
        fail("price_changed", 409)
    try:
        amount = 0 if Decimal(payable) == 0 else rial(payable)
        if amount > getattr(provider, "maximum_amount", 1_000_000_000_000):
            raise ValueError("unsupported_gateway_amount")
    except ValueError:
        fail("unsupported_gateway_amount")
    try:
        reviewed = stock.review(
            db, basket, current, terms=[line_terms(db, line) for line in current["lines"]]
        )
        if body.stock_fingerprint != reviewed["fingerprint"]:
            fail("stock_review_required", 409)
        stock.expire(db)
    except (stock.ReservationError, ReviewError) as error:
        fail(str(error), 409)
    try:
        payment_id, order_id = uuid4(), uuid4()
        items, line_ids = [], {}
        for line in current["lines"]:
            q, item = line["quote"], line["item"]
            line_ids[line["id"]] = str(uuid4())
            items.append(
                {
                    "id": line_ids[line["id"]],
                    "title_fa": q["name"][0],
                    "title_en": q["name"][1],
                    "sku": str(item["item_id"]),
                    "options_fa": " · ".join(pair[0] for pair in q.get("options", []))
                    + (" · " + str(q["frame"][0]) if q.get("frame") else ""),
                    "options_en": " · ".join(pair[1] for pair in q.get("options", []))
                    + (" · " + str(q["frame"][1]) if q.get("frame") else ""),
                    "quantity": item["quantity"],
                    "unit_amount": q["unit"],
                    "discount_amount": format(
                        Decimal(discount["allocations"][line["id"]]) / 100, "f"
                    )
                    if discount
                    else "0",
                    "delivery": next(
                        t["delivery"]
                        for t in accepted["lines"]
                        if t["basket_line_id"] == line["id"]
                    ),
                    "returnable": next(
                        t["returnable"]
                        for t in accepted["lines"]
                        if t["basket_line_id"] == line["id"]
                    ),
                }
            )
        components = stock.freeze_components(
            db, current["lines"], line_ids, terms=accepted["lines"]
        )
        for line in items:
            line["stock_components"] = [
                part for part in components if part["line_id"] == line["id"]
            ]
        snapshot = {
            "reference": "SANDBOX-" + str(payment_id)[:8].upper(),
            "currency": "IRT",
            "items": items,
            "shipping_amount": accepted["shipping_amount"],
            "tax_amount": accepted["tax_amount"],
            "checkout_terms": {
                **accepted,
                "address_id": str(body.address_id) if body.address_id else None,
                "shipping_method_id": str(body.shipping_method_id)
                if body.shipping_method_id
                else None,
            },
            "total_amount": payable,
            "recipient": address["name"] if address else "",
            "address": "، ".join(address[k] for k in ("province", "city", "street", "postal"))
            if address
            else "",
            "receipt": None,
        }
        try:
            OrderSnapshot.model_validate(snapshot)
            stock.allocate_paid(components, items)
            OrderSnapshot.model_validate(snapshot)
        except (stock.ReservationError, ReviewError) as error:
            fail(str(error), 409)
        except ValidationError:
            fail("order_snapshot_invalid", 409)
        state: dict[str, object] = {
            "payment": "pending",
            "fulfillment": "on_hold",
            "delivered": {},
            "return_until": None,
            "refunded_amount": "0",
        }
        db.execute(
            text(
                "INSERT INTO customer_orders(id,account_id,source_id,snapshot,state,sandbox) VALUES(:id,:owner,:source,CAST(:snapshot AS jsonb),CAST(:state AS jsonb),true)"
            ),
            {
                "id": order_id,
                "owner": account.id,
                "source": payment_id,
                "snapshot": json.dumps(snapshot),
                "state": json.dumps(state),
            },
        )
        db.execute(
            text(
                "INSERT INTO sandbox_payments(id,account_id,basket_id,basket_version,command_id,order_id,amount_rial,status,language,intent) VALUES(:id,:owner,:basket,:version,:command,:order,:amount,'requesting',:language,CAST(:intent AS jsonb))"
            ),
            {
                "id": payment_id,
                "owner": account.id,
                "basket": basket["id"],
                "version": basket["version"],
                "command": body.command_id,
                "order": order_id,
                "amount": amount,
                "language": body.language,
                "intent": json.dumps(
                    {**body.model_dump(mode="json"), "_gateway_provider": settings.payment_mode}
                ),
            },
        )
        try:
            stock.reserve_checkout(db, order_id, account.id, reviewed, components)
        except (stock.ReservationError, ReviewError) as error:
            fail(str(error), 409)
        if discount and discount_rule:
            db.execute(
                text(
                    "INSERT INTO discount_usage(payment_id,discount_id,account_id,version,snapshot,amount,state) VALUES(:payment,:discount,:owner,:version,CAST(:snapshot AS jsonb),:amount,'reserved')"
                ),
                {
                    "payment": payment_id,
                    "discount": discount_rule["id"],
                    "owner": account.id,
                    "version": discount_rule["version"],
                    "snapshot": json.dumps(
                        {
                            **discount_rule["content"],
                            "calculation": {
                                **discount,
                                "allocations": {
                                    key: str(value)
                                    for key, value in discount["allocations"].items()
                                },
                                "basket_lines": current["lines"],
                            },
                        }
                    ),
                    "amount": discount["amount"],
                },
            )
        row = (
            db.execute(text("SELECT * FROM sandbox_payments WHERE id=:id"), {"id": payment_id})
            .mappings()
            .one()
        )
        if amount == 0:
            stock.confirm(db, order_id, account.id, reason="Zero-payment checkout completed")
            reference = "ZERO-" + str(payment_id)
            row = (
                db.execute(
                    text(
                        "UPDATE sandbox_payments SET status='paid',reference=:reference WHERE id=:id RETURNING *"
                    ),
                    {"id": payment_id, "reference": reference},
                )
                .mappings()
                .one()
            )
            receipt = {
                "number": "SANDBOX-" + reference,
                "issued_at": datetime.now(UTC).isoformat(),
                "paid_amount": payable,
            }
            db.execute(
                text(
                    "UPDATE customer_orders SET state=jsonb_set(state,'{payment}','\"paid\"'::jsonb),snapshot=jsonb_set(snapshot,'{receipt}',CAST(:receipt AS jsonb)),version=version+1 WHERE id=:id"
                ),
                {"id": order_id, "receipt": json.dumps(receipt)},
            )
            db.execute(
                text(
                    "UPDATE discount_usage SET state='redeemed' WHERE payment_id=:id AND state IN ('reserved','released')"
                ),
                {"id": payment_id},
            )
            db.execute(
                text(
                    "UPDATE shopping_baskets SET lines='[]'::jsonb,version=version+1,updated_at=now() WHERE id=:id AND version=:version"
                ),
                {"id": basket["id"], "version": basket["version"]},
            )
        event(db, row, "created")
        if amount == 0:
            event(db, row, "paid")
        db.commit()
    except Exception:
        db.rollback()
        raise
    if amount == 0:
        response.headers["Cache-Control"] = "no-store"
        return result(row)
    try:
        authority = provider.request(
            amount, f"{settings.public_origin}/api/v1/payments/sandbox/callback/{payment_id}"
        )
        status = "pending"
    except GatewayRejected:
        authority, status = None, "failed"
    except GatewayUnknown:
        authority, status = None, "unknown"
    row = (
        db.execute(
            text(
                "UPDATE sandbox_payments SET authority=:authority,status=:status,updated_at=now() WHERE id=:id RETURNING *"
            ),
            {"id": payment_id, "authority": authority, "status": status},
        )
        .mappings()
        .one()
    )
    if status == "failed":
        stock.release(db, order_id, account.id, "release", "Gateway rejected payment initiation")
        db.execute(
            text(
                "UPDATE discount_usage SET state='released' WHERE payment_id=:id AND state='reserved'"
            ),
            {"id": payment_id},
        )
    if status != "pending":
        db.execute(
            text(
                "UPDATE customer_orders SET state=jsonb_set(state,'{payment}',to_jsonb(CAST(:state AS text))) WHERE id=:id"
            ),
            {"state": "failed" if status == "failed" else "verification", "id": order_id},
        )
    event(db, row, status)
    db.commit()
    response.headers["Cache-Control"] = "no-store"
    return result(row)


def reconcile(db, row, provider):
    if row["status"] == "paid":
        return row
    try:
        reference = provider.verify(row["amount_rial"], row["authority"])
        status = "paid"
    except GatewayRejected:
        reference, status = None, "failed"
    except GatewayUnknown:
        reference, status = None, "unknown"
    db.execute(text("SELECT pg_advisory_xact_lock(78214,33)"))
    row = (
        db.execute(
            text(
                "UPDATE sandbox_payments SET status=:status,reference=:reference,updated_at=now() WHERE id=:id RETURNING *"
            ),
            {"id": row["id"], "status": status, "reference": reference},
        )
        .mappings()
        .one()
    )
    db.execute(
        text(
            "UPDATE customer_orders SET state=jsonb_set(state,'{payment}',to_jsonb(CAST(:state AS text))),version=version+1,updated_at=now() WHERE id=:id"
        ),
        {
            "id": row["order_id"],
            "state": "paid"
            if status == "paid"
            else "verification"
            if status == "unknown"
            else "failed",
        },
    )
    closure = db.scalar(
        text("SELECT state->>'unpaid_cancellation_closure' FROM customer_orders WHERE id=:id"),
        {"id": row["order_id"]},
    )
    if closure and status in {"paid", "unknown"}:
        from nilart.contexts.orders.financial_closures import reopen

        reopen(db, row, status, closure)
    # Shipping/QC/policy remain separate from payment and stock commitment.
    if status == "failed":
        stock.release(
            db, row["order_id"], row["account_id"], "release", "Gateway explicitly rejected payment"
        )
        db.execute(
            text(
                "UPDATE discount_usage SET state='released' WHERE payment_id=:id AND state='reserved'"
            ),
            {"id": row["id"]},
        )
    if status == "paid":
        # The order update above holds its row lock through this transaction.
        # A late payment creates a refund obligation, never renewed fulfillment.
        cancelled = (
            db.scalar(
                text("SELECT state->>'fulfillment' FROM customer_orders WHERE id=:id"),
                {"id": row["order_id"]},
            )
            == "cancelled"
        )
        if not cancelled:
            stock.confirm(db, row["order_id"], row["account_id"])
        db.execute(
            text(
                "UPDATE discount_usage SET state='redeemed' WHERE payment_id=:id AND state IN ('reserved','released')"
            ),
            {"id": row["id"]},
        )
        snapshot = db.execute(
            text("SELECT snapshot FROM customer_orders WHERE id=:id"), {"id": row["order_id"]}
        ).scalar_one()
        receipt = {
            "number": "SANDBOX-ZP-" + reference,
            "issued_at": datetime.now(UTC).isoformat(),
            "paid_amount": snapshot["total_amount"],
        }
        db.execute(
            text(
                "UPDATE customer_orders SET snapshot=jsonb_set(snapshot,'{receipt}',CAST(:receipt AS jsonb)) WHERE id=:id"
            ),
            {"id": row["order_id"], "receipt": json.dumps(receipt)},
        )
        # Only remove purchased contents when the basket has not changed during payment.
        db.execute(
            text(
                "UPDATE shopping_baskets SET lines='[]'::jsonb,version=version+1,updated_at=now() WHERE id=:id AND version=:version"
            ),
            {"id": row["basket_id"], "version": row["basket_version"]},
        )
    event(db, row, status)
    return row


@router.get("/sandbox/callback/{id}")
def callback(id: UUID, request: Request, db: Session = Depends(session_dependency)):
    row = (
        db.execute(text("SELECT * FROM sandbox_payments WHERE id=:id FOR UPDATE"), {"id": id})
        .mappings()
        .first()
    )
    if not row or not row["authority"]:
        fail("invalid_callback", 400)
    zibal = payment_provider(row) == "zibal_sandbox"
    token = request.query_params.get("trackId" if zibal else "Authority", "")
    if not hmac.compare_digest(token, row["authority"]):
        fail("invalid_callback", 400)
    provider = gateway(row)
    if row["status"] != "paid":
        if zibal or request.query_params.get("Status") == "OK" or row["status"] == "unknown":
            row = reconcile(db, row, provider)
        else:
            db.execute(text("SELECT pg_advisory_xact_lock(78214,33)"))
            stock.release(
                db,
                row["order_id"],
                row["account_id"],
                "release",
                "Sandbox callback recorded cancellation",
            )
            db.execute(
                text(
                    "UPDATE discount_usage SET state='released' WHERE payment_id=:id AND state='reserved'"
                ),
                {"id": id},
            )
            db.execute(
                text(
                    "UPDATE sandbox_payments SET status='cancelled',updated_at=now() WHERE id=:id"
                ),
                {"id": id},
            )
            db.execute(
                text(
                    "UPDATE customer_orders SET state=jsonb_set(state,'{payment}','\"failed\"'::jsonb),version=version+1,updated_at=now() WHERE id=:id"
                ),
                {"id": row["order_id"]},
            )
            event(db, row, "cancelled")
    db.commit()
    return RedirectResponse(
        f"/{row['language']}/payment/result?id={id}",
        status_code=303,
        headers={"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"},
    )


@router.get("/sandbox/{id}", response_model=PaymentOutput)
def status(
    id: UUID, request: Request, response: Response, db: Session = Depends(session_dependency)
):
    account = identity(request, db)
    if not account:
        fail("unauthenticated", 401)
    row = (
        db.execute(
            text("SELECT * FROM sandbox_payments WHERE id=:id AND account_id=:owner"),
            {"id": id, "owner": account.id},
        )
        .mappings()
        .first()
    )
    if not row:
        fail("payment_not_found", 404)
    response.headers["Cache-Control"] = "no-store"
    return result(row)


@router.post("/sandbox/{id}/verify", response_model=PaymentOutput)
def verify(
    id: UUID, request: Request, response: Response, db: Session = Depends(session_dependency)
):
    account = actor(request, db)
    row = (
        db.execute(
            text("SELECT * FROM sandbox_payments WHERE id=:id AND account_id=:owner FOR UPDATE"),
            {"id": id, "owner": account.id},
        )
        .mappings()
        .first()
    )
    if not row or not row["authority"]:
        fail("payment_not_found", 404)
    row = reconcile(db, row, gateway(row))
    db.commit()
    response.headers["Cache-Control"] = "no-store"
    return result(row)
