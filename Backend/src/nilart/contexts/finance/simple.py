"""Owner-facing cost, stock and purchase entry. Existing historical movements survive."""

import json
from datetime import date
from decimal import Decimal
from typing import Literal
from uuid import UUID, uuid5

from fastapi import APIRouter, Depends, Query, Request, Response
from fastapi.responses import JSONResponse
from pydantic import Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.contexts.business.router import Strict
from nilart.contexts.catalog.infrastructure.prices import SqlSKUPriceRepository
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.contexts.identity.presentation.router import failure
from nilart.contexts.inventory.router import NAMESPACE, RecordedCommand
from nilart.contexts.inventory.service import apply_adjustment
from nilart.shared.database import session_dependency
from nilart.shared.outbox import enqueue

router = APIRouter(prefix="/api/v1/admin/simple", tags=["simple-commerce"])


class Edit(Strict):
    sku_id: UUID
    kind: Literal["variant", "purchase"]
    cost_version: int = Field(ge=0, strict=True)
    stock_version: int = Field(ge=0, strict=True)
    price_version: int = Field(ge=0, strict=True)
    unit_cost: str = Field(pattern=r"^(?:0|[1-9][0-9]{0,9})(?:\.[0-9]{1,6})?$")
    sale_price: str | None = Field(
        default=None, pattern=r"^(?:0|[1-9][0-9]{0,9})(?:\.[0-9]{1,6})?$"
    )
    quantity: int = Field(ge=0, le=1000000, strict=True)
    supplier: str = Field(default="", max_length=200)
    document_date: date
    reason: str = Field(min_length=1, max_length=1000)


def rows(db, q="", page=1, sku_id=None):
    params = dict(q=q.strip(), offset=(page - 1) * 25)
    clause = "WHERE (:q='' OR strpos(lower(concat_ws(' ',s.code,p.title_fa,p.title_en)),lower(CAST(:q AS text)))>0)"
    if sku_id is not None:
        clause += " AND s.id=:sku_id"
        params["sku_id"] = sku_id
    query = """SELECT s.id,s.product_id,s.code,p.title_fa,p.title_en,s.price_amount::text AS sale_price,s.currency,
    m.snapshot AS option_snapshot,coalesce(pv.version,0) AS price_version,c.unit_cost::text AS unit_cost,coalesce(c.version,0) AS cost_version,
    coalesce(i.quantity,0)::text AS quantity,coalesce(i.reserved,0)::text AS reserved,
    coalesce(i.quantity-i.reserved,0)::text AS available,coalesce(i.version,0) AS stock_version,
    CASE WHEN i.quantity>0 THEN round(i.value/i.quantity,6)::text END AS average_cost
    FROM catalog_skus s JOIN catalog_products p ON p.id=s.product_id
    LEFT JOIN catalog_sku_option_mappings m ON m.sku_id=s.id
    LEFT JOIN simple_variant_costs c ON c.sku_id=s.id
    LEFT JOIN catalog_sku_price_versions pv ON pv.sku_id=s.id
    LEFT JOIN inventory_positions i ON i.kind='sku' AND i.reference_id=s.id """
    result = list(
        db.execute(
            text(query + clause + " ORDER BY p.title_fa,s.code LIMIT 25 OFFSET :offset"), params
        ).mappings()
    )
    total = db.scalar(
        text(
            "SELECT count(*) FROM catalog_skus s JOIN catalog_products p ON p.id=s.product_id "
            + clause
        ),
        params,
    )
    items = []
    for row in result:
        item = dict(row)
        snapshot = item.pop("option_snapshot") or {}
        selections = {
            s["option_id"]: s["value_id"]
            for s in snapshot.get("combination", {}).get("selections", [])
        }
        for lang in ("fa", "en"):
            item["options_" + lang] = " · ".join(
                v["title_" + lang]
                for o in sorted(snapshot.get("options", []), key=lambda o: o["order"])
                for v in o["values"]
                if selections.get(o["id"]) == v["id"]
            )
        items.append(item)
    return dict(items=items, total=total, page=page)


@router.get("/variants")
def listing(
    q: str = Query("", max_length=200),
    page: int = Query(1, ge=1),
    db: Session = Depends(session_dependency),
    principal=Depends(require_permission("inventory.manage")),
):
    return rows(db, q, page)


@router.get("/variants/{sku_id}")
def variant_detail(
    sku_id: UUID,
    request: Request,
    response: Response,
    db: Session = Depends(session_dependency),
    principal=Depends(require_permission("inventory.manage")),
):
    response.headers["Cache-Control"] = "no-store"
    result = rows(db, sku_id=sku_id)
    if not result["items"]:
        return failure(request, "variant_not_found", 404)
    return result["items"][0]


@router.get("/commands/{key}")
def receipt(
    key: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal=Depends(require_permission("inventory.manage")),
):
    value = db.execute(
        text("SELECT result FROM simple_commerce_commands WHERE id=:id"), dict(id=key)
    ).scalar()
    return value if value else failure(request, "command_not_found", 404)


@router.put("/commands/{key}")
def save(
    key: UUID,
    body: Edit,
    request: Request,
    db: Session = Depends(session_dependency),
    principal=Depends(require_permission("inventory.manage")),
):
    actor, denied = write_access(request, db, principal, "inventory.manage")
    if denied is not None:
        return denied
    # Consistent with stock adjustments and checkout, then SKU price locking.
    db.execute(text("SELECT pg_advisory_xact_lock(78214,35)"))
    intent = body.model_dump(mode="json")
    prior = (
        db.execute(text("SELECT * FROM simple_commerce_commands WHERE id=:id"), dict(id=key))
        .mappings()
        .first()
    )
    if prior:
        return (
            prior["result"]
            if prior["intent"] == intent and str(prior["actor_id"]) == str(actor.id)
            else failure(request, "command_conflict", 409)
        )
    price = SqlSKUPriceRepository(db)
    if not db.scalar(
        text("SELECT id FROM catalog_skus WHERE id=:id FOR UPDATE"), dict(id=body.sku_id)
    ):
        return failure(request, "sku_not_found", 404)
    current_price = price.read(body.sku_id)
    c = (
        db.execute(
            text("SELECT * FROM simple_variant_costs WHERE sku_id=:id"), dict(id=body.sku_id)
        )
        .mappings()
        .first()
    )
    pid = uuid5(NAMESPACE, f"sku:{body.sku_id}")
    pos = (
        db.execute(text("SELECT * FROM inventory_positions WHERE id=:id FOR UPDATE"), dict(id=pid))
        .mappings()
        .first()
    )
    if (
        body.cost_version != (c["version"] if c else 0)
        or body.stock_version != (pos["version"] if pos else 0)
        or body.price_version != current_price["version"]
    ):
        return failure(request, "version_conflict", 409)
    if current_price["price"] and current_price["price"]["currency"] != "IRT":
        return failure(request, "currency_requires_review", 409)
    if body.kind == "variant" and body.quantity < (pos["reserved"] if pos else 0):
        return failure(request, "stock_reserved", 409)
    if body.kind == "purchase" and body.quantity == 0:
        return failure(request, "positive_purchase_quantity_required", 422)
    changes_price = (Decimal(body.sale_price) if body.sale_price is not None else None) != (
        Decimal(current_price["price"]["amount"]) if current_price["price"] else None
    )
    if changes_price:
        from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository

        if not SqlIdentityRepository(db).principal(actor.id).allows("pricing.publish"):
            return failure(request, "permission_denied", 403)
    version = body.stock_version
    cost = Decimal(body.unit_cost)

    def move(action, quantity=0, value=None):
        nonlocal version
        result = apply_adjustment(
            db,
            actor,
            request,
            uuid5(key, action),
            RecordedCommand(
                kind="sku",
                reference_id=body.sku_id,
                expected_version=version,
                action=action,
                quantity=str(quantity),
                value=None if value is None else format(value, "f"),
                reason=body.reason,
            ),
            commit=False,
        )
        if isinstance(result, JSONResponse):
            db.rollback()
            return result
        version = result["version"]

    oldqty = pos["quantity"] if pos else Decimal(0)
    if not pos:
        error = move("threshold")
        if error:
            return error
    if body.kind == "purchase":
        error = move("increase", body.quantity, cost * body.quantity)
    elif Decimal(body.quantity) > oldqty:
        error = move(
            "increase", Decimal(body.quantity) - oldqty, cost * (Decimal(body.quantity) - oldqty)
        )
    elif Decimal(body.quantity) < oldqty:
        error = move("decrease", oldqty - body.quantity)
    else:
        error = None
    if error:
        return error
    if body.kind == "variant" and body.quantity:
        error = move("revalue", value=cost * body.quantity)
        if error:
            return error
    db.execute(
        text(
            "INSERT INTO simple_variant_costs(sku_id,unit_cost,version) VALUES(:id,:cost,:v) ON CONFLICT(sku_id) DO UPDATE SET unit_cost=EXCLUDED.unit_cost,version=EXCLUDED.version"
        ),
        dict(id=body.sku_id, cost=cost, v=body.cost_version + 1),
    )
    if changes_price:
        price.save(
            body.sku_id,
            actor.id,
            body.price_version,
            None
            if body.sale_price is None
            else dict(amount=Decimal(body.sale_price), currency="IRT"),
        )
    result = dict(
        id=str(key),
        sku_id=str(body.sku_id),
        kind=body.kind,
        quantity=body.quantity,
        total_cost=format(cost * body.quantity, "f"),
        intent=intent,
    )
    db.execute(
        text(
            "INSERT INTO simple_commerce_commands(id,actor_id,sku_id,kind,intent,result) VALUES(:id,:actor,:sku,:kind,CAST(:intent AS jsonb),CAST(:result AS jsonb))"
        ),
        dict(
            id=key,
            actor=actor.id,
            sku=body.sku_id,
            kind=body.kind,
            intent=json.dumps(intent),
            result=json.dumps(result),
        ),
    )
    SqlAccountManagement(db).audit(actor.id, actor.id, "simple." + body.kind, result, body.reason)
    enqueue(db, "simple." + body.kind, result)
    db.commit()
    return result


@router.get("/purchases")
def purchases(
    page: int = Query(1, ge=1),
    db: Session = Depends(session_dependency),
    principal=Depends(require_permission("inventory.manage")),
):
    records = (
        db.execute(
            text(
                "SELECT c.id,c.intent,c.result,c.created_at,s.code,p.title_fa,p.title_en FROM simple_commerce_commands c JOIN catalog_skus s ON s.id=c.sku_id JOIN catalog_products p ON p.id=s.product_id WHERE c.kind='purchase' ORDER BY c.created_at DESC,c.id LIMIT 25 OFFSET :offset"
            ),
            dict(offset=(page - 1) * 25),
        )
        .mappings()
        .all()
    )
    return dict(
        items=[dict(r) for r in records],
        total=db.scalar(
            text("SELECT count(*) FROM simple_commerce_commands WHERE kind='purchase'")
        ),
        page=page,
    )


@router.get("/profit")
def profit(
    db: Session = Depends(session_dependency), principal=Depends(require_permission("finance.read"))
):
    # Paid sales use immutable order allocations, never today's catalogue prices.
    sales = Decimal(0)
    refunded = Decimal(0)
    missing = 0
    orders = 0
    for order in db.execute(
        text(
            "SELECT id,snapshot,state FROM customer_orders WHERE state->>'payment' IN ('paid','partially_refunded','refunded')"
        )
    ).mappings():
        snapshot = order["snapshot"]
        conversion = Decimal(10) if snapshot.get("currency") == "IRR" else Decimal(1)
        shipments = list(
            db.execute(
                text(
                    "SELECT content,state FROM fulfillment_shipments WHERE order_id=:id AND status IN ('dispatched','delivered')"
                ),
                dict(id=order["id"]),
            ).mappings()
        )
        orders += 1
        returns = list(
            db.execute(
                text("SELECT result FROM order_refunds WHERE order_id=:id"), dict(id=order["id"])
            ).scalars()
        )
        for line in snapshot.get("items", []):
            net = Decimal(line["unit_amount"]) * line["quantity"] - Decimal(
                line.get("discount_amount", "0")
            )
            line_refunded = sum(
                (
                    Decimal(i["amount"])
                    for r in returns
                    for i in r.get("items", [])
                    if i["line_id"] == line["id"]
                ),
                Decimal(0),
            )
            sales += net / conversion
            refunded += line_refunded / conversion
            sent = sum(
                int(s["content"].get("quantities", {}).get(line["id"], 0)) for s in shipments
            )
            # Fully refunded, unshipped cancellations incur no stock issue cost.
            if sent < line["quantity"] and line_refunded < net:
                missing += 1
            if any(
                not s["state"].get("costs")
                for s in shipments
                if s["content"].get("quantities", {}).get(line["id"])
            ):
                missing += 1
    # Positive healthy returns reduce the original fulfilled cost; damaged returns do not.
    cogs = -db.scalar(
        text(
            "SELECT coalesce(sum(value_delta),0) FROM inventory_movements WHERE kind IN ('fulfillment_dispatch','fulfillment_return')"
        )
    )
    expenses = db.scalar(
        text(
            "SELECT coalesce(sum(CASE WHEN kind='reversal' THEN -amount ELSE amount END),0) FROM finance_documents WHERE effect_kind='expense'"
        )
    )
    purchased = db.scalar(
        text(
            "SELECT coalesce(sum((result->>'total_cost')::numeric),0) FROM simple_commerce_commands WHERE kind='purchase'"
        )
    )

    def amount(v):
        return format(v.quantize(Decimal(".01")), "f")

    return dict(
        currency="IRT",
        sales=amount(sales),
        refunds=amount(refunded),
        net_sales=amount(sales - refunded),
        cost_of_sales=amount(cogs),
        expenses=amount(expenses),
        profit=None if missing else amount(sales - refunded - cogs - expenses),
        incomplete_lines=missing,
        orders=orders,
        purchases=amount(purchased),
    )
