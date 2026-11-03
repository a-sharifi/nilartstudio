"""Approved return inspections. Receipt, stock recovery and refunds are distinct events."""

import json
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal, localcontext
from typing import Literal
from uuid import UUID, uuid5

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.contexts.customer.notifications import notify
from nilart.contexts.fulfillment.service import FulfillmentError, load_order
from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.contexts.identity.presentation.router import failure
from nilart.contexts.inventory.document_stock import DocumentStockError, move_stock
from nilart.shared.database import session_dependency
from nilart.shared.outbox import enqueue

router = APIRouter(prefix="/api/v1/admin/order-requests", tags=["return-inspections"])


class Item(BaseModel):
    model_config = ConfigDict(extra="forbid")
    line_id: UUID
    component: int = Field(ge=0, strict=True)
    healthy: int = Field(ge=0, le=1000000, strict=True)
    damaged: int = Field(ge=0, le=1000000, strict=True)

    @model_validator(mode="after")
    def nonempty(self):
        if self.healthy + self.damaged == 0:
            raise ValueError("inspection quantity required")
        return self


class Inspection(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    expected_version: int = Field(ge=0, strict=True)
    shipment_id: UUID
    reason: str = Field(min_length=5, max_length=1000)
    items: list[Item] = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def unique(self):
        if len({(i.line_id, i.component) for i in self.items}) != len(self.items):
            raise ValueError("duplicate inspection component")
        return self


class InspectedItem(Item):
    title_fa: str | None = None
    title_en: str | None = None
    source_movement_id: UUID
    position_id: UUID
    recovered_cost: str = Field(pattern=r"^\d+\.\d{6}$")
    damaged_cost: str = Field(pattern=r"^\d+\.\d{6}$")
    movement: dict | None


class Outcome(BaseModel):
    request_version: int = Field(ge=1)
    order_id: UUID
    reason: str
    items: list[InspectedItem]
    refund_status: Literal["not_issued"]


class Receipt(BaseModel):
    id: UUID
    request_id: UUID
    shipment_id: UUID
    actor_id: UUID
    expected_version: int
    intent: Inspection
    result: Outcome
    created_at: datetime


class Receipts(BaseModel):
    items: list[Receipt]
    next_cursor: UUID | None


def fail(code):
    raise FulfillmentError("return_" + code)


def anchor(db, id):
    row = (
        db.execute(text("SELECT * FROM customer_order_requests WHERE id=:id"), {"id": id})
        .mappings()
        .first()
    )
    if not row:
        fail("request_not_found")
    return row


def received(db, *, shipment=None, request=None):
    totals = {}
    for result in db.execute(
        text(
            "SELECT result FROM order_return_inspections WHERE (CAST(:shipment AS uuid) IS NULL OR shipment_id=:shipment) AND (CAST(:request AS uuid) IS NULL OR request_id=:request)"
        ),
        {"shipment": shipment, "request": request},
    ).scalars():
        for item in result["items"]:
            key = (item["line_id"], item["component"])
            totals[key] = totals.get(key, 0) + item["healthy"] + item["damaged"]
    return totals


def apply(db, actor, id, key, body):
    request = anchor(db, id)
    order = load_order(db, request["order_id"], lock=True)
    request = (
        db.execute(
            text("SELECT * FROM customer_order_requests WHERE id=:id FOR UPDATE"), {"id": id}
        )
        .mappings()
        .one()
    )
    intent = body.model_dump(mode="json")
    previous = (
        db.execute(text("SELECT * FROM order_return_inspections WHERE id=:key"), {"key": key})
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
    if request["kind"] != "return" or request["status"] != "approved":
        fail("approval_required")
    if request["version"] != body.expected_version:
        fail("version_conflict")
    shipment = (
        db.execute(
            text("SELECT * FROM fulfillment_shipments WHERE id=:id AND order_id=:order"),
            {"id": body.shipment_id, "order": order["id"]},
        )
        .mappings()
        .first()
    )
    if not shipment or shipment["status"] != "delivered":
        fail("delivered_shipment_required")
    costs = {(c["line_id"], c["component"]): c for c in shipment["state"].get("costs", [])}
    lines = {line["id"]: line for line in order["snapshot"]["items"]}
    shipped = received(db, shipment=body.shipment_id)
    requested = received(db, request=id)
    results = []
    # Serialize all stock writers before checking unique-original capacity.
    db.execute(text("SELECT pg_advisory_xact_lock(78214,35)"))
    for item in body.items:
        pair = (str(item.line_id), item.component)
        line = lines.get(pair[0])
        cost = costs.get(pair)
        components = line.get("stock_components") if line else None
        component = next((c for c in components or [] if c["component"] == item.component), None)
        if (
            not component
            or not cost
            or component.get("delivery", "physical") != "physical"
            or component.get("returnable") is False
        ):
            fail("historical_component_missing")
        quantity = item.healthy + item.damaged
        approved = request["payload"]["quantities"].get(pair[0], 0) * component["per_unit"]
        before = shipped.get(pair, 0)
        if before + quantity > cost["quantity"] or requested.get(pair, 0) + quantity > approved:
            fail("quantity_exceeded")
        # Cumulative six-decimal allocation exhausts the original cost exactly.
        with localcontext() as ctx:
            ctx.prec = 60
            original = -Decimal(cost["value_delta"])

            def share(q):
                return (original * q / cost["quantity"]).quantize(
                    Decimal(".000001"), rounding=ROUND_HALF_UP
                )

            recovered = share(before + item.healthy) - share(before)
            damage = share(before + quantity) - share(before + item.healthy)
        movement = None
        if item.healthy:
            if component["kind"] == "artwork":
                on_hand = db.scalar(
                    text("SELECT quantity FROM inventory_positions WHERE id=:id FOR UPDATE"),
                    {"id": component["position_id"]},
                ) or Decimal(0)
                if on_hand + item.healthy > 1:
                    fail("unique_original_capacity")
            movement = move_stock(
                db,
                actor,
                body.shipment_id,
                key,
                {
                    "id": uuid5(item.line_id, str(item.component)),
                    "kind": component["kind"],
                    "reference_id": component["reference_id"],
                    "unit": "piece",
                },
                Decimal(item.healthy),
                recovered,
                body.reason,
                domain="fulfillment",
                action_override="fulfillment_return",
            )
        results.append(
            {
                **item.model_dump(mode="json"),
                "title_fa": component["title_fa"],
                "title_en": component["title_en"],
                "source_movement_id": cost["movement_id"],
                "position_id": cost["position_id"],
                "recovered_cost": format(recovered, ".6f"),
                "damaged_cost": format(damage, ".6f"),
                "movement": movement,
            }
        )
    result = {
        "request_version": request["version"] + 1,
        "order_id": str(order["id"]),
        "reason": body.reason,
        "items": results,
        "refund_status": "not_issued",
    }
    saved = (
        db.execute(
            text(
                "INSERT INTO order_return_inspections(id,request_id,shipment_id,actor_id,expected_version,intent,result) VALUES(:id,:request,:shipment,:actor,:version,CAST(:intent AS jsonb),CAST(:result AS jsonb)) RETURNING *"
            ),
            {
                "id": key,
                "request": id,
                "shipment": body.shipment_id,
                "actor": actor,
                "version": body.expected_version,
                "intent": json.dumps(intent),
                "result": json.dumps(result),
            },
        )
        .mappings()
        .one()
    )
    db.execute(
        text(
            "UPDATE customer_order_requests SET version=version+1,updated_at=clock_timestamp() WHERE id=:id"
        ),
        {"id": id},
    )
    SqlAccountManagement(db).audit(
        str(actor),
        str(order["account_id"]),
        "orders.return_inspected",
        {
            "request_id": str(id),
            "inspection_id": str(key),
            "before": {"version": request["version"]},
            "after": result,
        },
        body.reason,
    )
    notify(
        db,
        order["account_id"],
        event=f"return_inspection:{key}",
        category="order",
        title_fa="دریافت و بررسی کالای مرجوعی ثبت شد",
        title_en="Returned items received and inspected",
        reference="request_id",
        id=id,
    )
    enqueue(
        db,
        "fulfillment.return_inspected",
        {"request_id": str(id), "inspection_id": str(key), "order_id": str(order["id"])},
    )
    return dict(saved)


@router.get("/{id}/return-plan")
def plan(
    id: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("fulfillment.manage")),
):
    try:
        r = anchor(db, id)
        order = load_order(db, r["order_id"])
        totals = received(db, request=id)
        lines = {line["id"]: line for line in order["snapshot"]["items"]}
        candidates = []
        for s in db.execute(
            text(
                "SELECT * FROM fulfillment_shipments WHERE order_id=:order AND status='delivered' ORDER BY id"
            ),
            {"order": r["order_id"]},
        ).mappings():
            already = received(db, shipment=s["id"])
            for c in s["state"].get("costs", []):
                line = lines[c["line_id"]]
                component = next(
                    x for x in line["stock_components"] if x["component"] == c["component"]
                )
                pair = (c["line_id"], c["component"])
                remaining = min(
                    c["quantity"] - already.get(pair, 0),
                    r["payload"]["quantities"].get(c["line_id"], 0) * component["per_unit"]
                    - totals.get(pair, 0),
                )
                if remaining > 0:
                    candidates.append(
                        {
                            "shipment_id": str(s["id"]),
                            "line_id": c["line_id"],
                            "component": c["component"],
                            "title_fa": component["title_fa"],
                            "title_en": component["title_en"],
                            "remaining": remaining,
                        }
                    )
        return {
            "request_id": str(id),
            "version": r["version"],
            "approved": r["kind"] == "return" and r["status"] == "approved",
            "items": candidates,
        }
    except FulfillmentError as exc:
        return failure(request, str(exc), 404)


@router.get("/{id}/inspections", response_model=Receipts)
def history(
    id: UUID,
    cursor: UUID | None = None,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("fulfillment.manage")),
):
    rows = (
        db.execute(
            text(
                "SELECT * FROM order_return_inspections WHERE request_id=:id AND (CAST(:cursor AS uuid) IS NULL OR id>:cursor) ORDER BY id LIMIT 21"
            ),
            {"id": id, "cursor": cursor},
        )
        .mappings()
        .all()
    )
    return {
        "items": [dict(r) for r in rows[:20]],
        "next_cursor": rows[19]["id"] if len(rows) > 20 else None,
    }


@router.get("/{id}/inspections/{key}", response_model=Receipt)
def receipt(
    id: UUID,
    key: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("fulfillment.manage")),
):
    row = (
        db.execute(
            text("SELECT * FROM order_return_inspections WHERE request_id=:id AND id=:key"),
            {"id": id, "key": key},
        )
        .mappings()
        .first()
    )
    return dict(row) if row else failure(request, "return_inspection_not_found", 404)


@router.put("/{id}/inspections/{key}", response_model=Receipt)
def inspect(
    id: UUID,
    key: UUID,
    body: Inspection,
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
    except (FulfillmentError, DocumentStockError) as exc:
        db.rollback()
        return failure(request, str(exc), 404 if str(exc).endswith("not_found") else 409)
    except Exception:
        db.rollback()
        raise


customer_router = APIRouter(prefix="/api/v1/account/requests", tags=["return-tracking"])


class CustomerItem(BaseModel):
    line_id: UUID
    component: int
    title_fa: str
    title_en: str
    healthy: int
    damaged: int


class CustomerReceipt(BaseModel):
    id: UUID
    created_at: datetime
    items: list[CustomerItem]


class CustomerReceipts(BaseModel):
    request_id: UUID
    items: list[CustomerReceipt]
    next_cursor: UUID | None


@customer_router.get("/{id}/inspections", response_model=CustomerReceipts)
def customer_history(
    id: UUID,
    request: Request,
    cursor: UUID | None = None,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("orders.read_self")),
):
    owned = db.execute(
        text(
            "SELECT o.snapshot FROM customer_order_requests r JOIN customer_orders o ON o.id=r.order_id WHERE r.id=:id AND r.account_id=:owner AND o.account_id=:owner"
        ),
        {"id": id, "owner": principal.account_id},
    ).scalar()
    if owned is None:
        return failure(request, "request_not_found", 404)
    components = {
        (line["id"], c["component"]): c
        for line in owned["items"]
        for c in line.get("stock_components") or []
        if c.get("delivery", "physical") == "physical" and c.get("returnable") is not False
    }
    rows = (
        db.execute(
            text(
                "SELECT * FROM order_return_inspections WHERE request_id=:id AND (CAST(:cursor AS uuid) IS NULL OR id>:cursor) ORDER BY id LIMIT 21"
            ),
            {"id": id, "cursor": cursor},
        )
        .mappings()
        .all()
    )
    return {
        "request_id": id,
        "items": [
            {
                "id": r["id"],
                "created_at": r["created_at"],
                "items": [
                    {
                        **{k: x[k] for k in ["line_id", "component", "healthy", "damaged"]},
                        "title_fa": components[(x["line_id"], x["component"])]["title_fa"],
                        "title_en": components[(x["line_id"], x["component"])]["title_en"],
                    }
                    for x in r["result"]["items"]
                ],
            }
            for r in rows[:20]
        ],
        "next_cursor": rows[19]["id"] if len(rows) > 20 else None,
    }
