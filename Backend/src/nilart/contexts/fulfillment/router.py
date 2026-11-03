"""Permission-controlled shipment planning/commands and owned customer tracking."""

from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.contexts.fulfillment.domain import Command, Event, Shipment, Status
from nilart.contexts.fulfillment.service import (
    FulfillmentError,
    apply,
    eligibility,
    load_order,
    output,
    planned,
)
from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.contexts.identity.presentation.router import failure
from nilart.contexts.inventory.document_stock import DocumentStockError
from nilart.shared.database import session_dependency

router = APIRouter(prefix="/api/v1/admin/fulfillment", tags=["fulfillment"])
customer_router = APIRouter(prefix="/api/v1/account/orders", tags=["shipment-tracking"])


class Shipments(BaseModel):
    items: list[Shipment]
    next_cursor: UUID | None


class History(BaseModel):
    items: list[Event]
    next_before_version: int | None


class Planning(BaseModel):
    order_id: UUID
    reference: str
    recipient: str
    address: str
    lines: list[dict]
    issue: str | None
    sandbox: bool


class OrderChoice(BaseModel):
    id: UUID
    reference: str


class OrderChoices(BaseModel):
    items: list[OrderChoice]
    next_cursor: UUID | None


@router.get("/orders", response_model=OrderChoices)
def order_choices(
    q: str = Query("", max_length=200),
    cursor: UUID | None = None,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("fulfillment.manage")),
):
    rows = (
        db.execute(
            text(
                "SELECT o.id,o.snapshot->>'reference' AS reference FROM customer_orders o JOIN order_stock_allocations a ON a.order_id=o.id WHERE o.sandbox=true AND a.state='committed' AND o.state->>'payment' IN ('paid','partially_refunded') AND o.state->>'fulfillment' NOT IN ('cancelled','delivered') AND NOT EXISTS (SELECT 1 FROM customer_order_requests r WHERE r.order_id=o.id AND r.kind='cancellation' AND r.status IN ('submitted','in_review','approved')) AND EXISTS (SELECT 1 FROM jsonb_array_elements(o.snapshot->'items') line WHERE line->>'delivery'='physical' AND line->>'commission_id' IS NULL AND jsonb_array_length(COALESCE(NULLIF(line->'stock_components','null'::jsonb),'[]'::jsonb))>0 AND (line->>'quantity')::int>COALESCE((SELECT sum((s.content->'quantities'->>(line->>'id'))::int) FROM fulfillment_shipments s WHERE s.order_id=o.id AND s.status<>'cancelled'),0)) AND (:q='' OR strpos(lower(o.snapshot->>'reference'),lower(CAST(:q AS text)))>0) AND (CAST(:cursor AS uuid) IS NULL OR o.id>:cursor) ORDER BY o.id LIMIT 26"
            ),
            {"q": q.strip(), "cursor": cursor},
        )
        .mappings()
        .all()
    )
    return {
        "items": [dict(r) for r in rows[:25]],
        "next_cursor": rows[24]["id"] if len(rows) > 25 else None,
    }


@router.get("/orders/{id}", response_model=Planning)
def order_plan(
    id: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("fulfillment.manage")),
):
    try:
        row = load_order(db, id)
    except FulfillmentError:
        return failure(request, "fulfillment_order_not_found", 404)
    try:
        eligibility(db, row)
        issue = None
    except FulfillmentError as exc:
        issue = str(exc)
    counts = planned(db, id)
    lines = [
        {**line, "planned": counts[line["id"]], "remaining": line["quantity"] - counts[line["id"]]}
        for line in row["snapshot"]["items"]
        if line["delivery"] == "physical"
    ]
    return dict(
        order_id=id,
        reference=row["snapshot"]["reference"],
        recipient=row["snapshot"]["recipient"],
        address=row["snapshot"]["address"],
        lines=lines,
        issue=issue,
        sandbox=row["sandbox"],
    )


@router.get("/shipments", response_model=Shipments)
def listing(
    order_id: UUID | None = None,
    status: Status | None = None,
    cursor: UUID | None = None,
    q: str = Query("", max_length=200),
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("fulfillment.manage")),
):
    rows = (
        db.execute(
            text(
                "SELECT s.* FROM fulfillment_shipments s JOIN customer_orders o ON o.id=s.order_id WHERE (CAST(:order AS uuid) IS NULL OR s.order_id=:order) "
                "AND (CAST(:status AS text) IS NULL OR s.status=:status) AND (:q='' OR strpos(lower(o.snapshot->>'reference'),lower(CAST(:q AS text)))>0 OR strpos(lower(s.state->'dispatch'->>'tracking'),lower(CAST(:q AS text)))>0) "
                "AND (CAST(:cursor AS uuid) IS NULL OR s.id>:cursor) ORDER BY s.id LIMIT 26"
            ),
            {"order": order_id, "status": status, "q": q.strip(), "cursor": cursor},
        )
        .mappings()
        .all()
    )
    return {
        "items": [output(row) for row in rows[:25]],
        "next_cursor": rows[24]["id"] if len(rows) > 25 else None,
    }


@router.get("/shipments/{id}", response_model=Shipment)
def detail(
    id: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("fulfillment.manage")),
):
    row = (
        db.execute(text("SELECT * FROM fulfillment_shipments WHERE id=:id"), {"id": id})
        .mappings()
        .first()
    )
    return output(row) if row else failure(request, "fulfillment_not_found", 404)


@router.get("/shipments/{id}/events", response_model=History)
def history(
    id: UUID,
    before: int | None = Query(None, ge=1),
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("fulfillment.manage")),
):
    rows = (
        db.execute(
            text(
                "SELECT * FROM fulfillment_events WHERE shipment_id=:id AND (CAST(:before AS integer) IS NULL OR version<:before) ORDER BY version DESC LIMIT 21"
            ),
            {"id": id, "before": before},
        )
        .mappings()
        .all()
    )
    return {
        "items": [dict(row) for row in rows[:20]],
        "next_before_version": rows[19]["version"] if len(rows) > 20 else None,
    }


@router.get("/shipments/{id}/commands/{key}", response_model=Event)
def saved(
    id: UUID,
    key: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("fulfillment.manage")),
):
    row = (
        db.execute(
            text(
                "SELECT * FROM fulfillment_events WHERE id=:key AND shipment_id=:id AND actor_id=:actor"
            ),
            {"key": key, "id": id, "actor": principal.account_id},
        )
        .mappings()
        .first()
    )
    return dict(row) if row else failure(request, "fulfillment_command_not_found", 404)


@router.put("/shipments/{id}/commands/{key}", response_model=Event)
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


class Parcel(BaseModel):
    id: UUID
    status: Literal["dispatched", "delivered"]
    quantities: dict[UUID, int]
    carrier: str
    tracking: str
    dispatched_at: str
    delivered_at: str | None
    return_until: str | None


class Tracking(BaseModel):
    order_id: UUID
    items: list[Parcel]
    next_cursor: UUID | None


@customer_router.get("/{id}/shipments", response_model=Tracking)
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
                "SELECT * FROM fulfillment_shipments WHERE order_id=:id AND status IN ('dispatched','delivered') AND (CAST(:cursor AS uuid) IS NULL OR id>:cursor) ORDER BY id LIMIT 21"
            ),
            {"id": id, "cursor": cursor},
        )
        .mappings()
        .all()
    )
    return dict(
        order_id=id,
        items=[
            dict(
                id=r["id"],
                status=r["status"],
                quantities=r["content"]["quantities"],
                carrier=r["state"]["dispatch"]["carrier"],
                tracking=r["state"]["dispatch"]["tracking"],
                dispatched_at=r["state"]["dispatched_at"],
                delivered_at=r["state"].get("delivered_at"),
                return_until=r["state"].get("return_until"),
            )
            for r in rows[:20]
        ],
        next_cursor=rows[19]["id"] if len(rows) > 20 else None,
    )
