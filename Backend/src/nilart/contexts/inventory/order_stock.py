"""Recorded order commitments, shortage queue and audited stock reacquisition."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.contexts.identity.presentation.router import failure
from nilart.contexts.inventory.reservations import allocation, availability, confirm, stock_lock
from nilart.contexts.orders.domain import StockComponent
from nilart.shared.database import session_dependency

router = APIRouter(prefix="/api/v1/admin/order-stock", tags=["order-stock"])
State = Literal["reserved", "committed", "released", "shortage"]


class Allocation(BaseModel):
    order_id: UUID
    components: list[StockComponent]
    state: State
    shipped: dict[str, int] = {}
    version: int
    settings_version: int
    reservation_minutes: int
    expires_at: datetime
    updated_at: datetime


class QueueItem(Allocation):
    reference: str
    payment: str


class Queue(BaseModel):
    items: list[QueueItem]
    next_cursor: UUID | None


class Availability(BaseModel):
    position_id: UUID
    required: int
    held: int = 0
    available: str
    issue: str | None


class Detail(BaseModel):
    order_id: UUID
    reference: str
    allocation: Allocation | None
    positions: list[Availability]
    issue: Literal["historical_stock_identity_missing"] | None


class Command(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    expected_version: int = Field(strict=True, ge=1)
    reason: str = Field(min_length=1, max_length=1000)


class Event(BaseModel):
    id: UUID
    order_id: UUID
    actor_id: UUID | None
    version: int
    action: str
    reason: str
    intent: dict
    result: Allocation
    changes: list[dict]
    created_at: datetime


class History(BaseModel):
    items: list[Event]
    next_before_version: int | None


@router.get("", response_model=Queue)
def queue(
    response: Response,
    state: State | None = None,
    cursor: UUID | None = None,
    q: str = Query("", max_length=200),
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("fulfillment.manage")),
):
    response.headers["Cache-Control"] = "no-store"
    rows = (
        db.execute(
            text(
                "SELECT a.*,o.snapshot->>'reference' AS reference,o.state->>'payment' AS payment "
                "FROM order_stock_allocations a JOIN customer_orders o ON o.id=a.order_id "
                "WHERE (CAST(:state AS text) IS NULL OR a.state=:state) "
                "AND (:q='' OR strpos(lower(o.snapshot->>'reference'),lower(CAST(:q AS text)))>0) "
                "AND (CAST(:cursor AS uuid) IS NULL OR a.order_id>:cursor) ORDER BY a.order_id LIMIT 26"
            ),
            {"state": state, "cursor": cursor, "q": q.strip()},
        )
        .mappings()
        .all()
    )
    return {
        "items": [
            {**allocation(row), "reference": row["reference"], "payment": row["payment"]}
            for row in rows[:25]
        ],
        "next_cursor": rows[24]["order_id"] if len(rows) > 25 else None,
    }


@router.get("/{id}", response_model=Detail)
def detail(
    id: UUID,
    request: Request,
    response: Response,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("fulfillment.manage")),
):
    response.headers["Cache-Control"] = "no-store"
    order = db.execute(
        text("SELECT snapshot FROM customer_orders WHERE id=:id"), {"id": id}
    ).scalar()
    if not order:
        return failure(request, "order_not_found", 404)
    row = (
        db.execute(text("SELECT * FROM order_stock_allocations WHERE order_id=:id"), {"id": id})
        .mappings()
        .first()
    )
    return dict(
        order_id=id,
        reference=order["reference"],
        allocation=allocation(row) if row else None,
        positions=[
            {
                **p,
                "held": max(0, p["required"] - row.get("shipped", {}).get(p["position_id"], 0))
                if row["state"] in {"reserved", "committed"}
                else 0,
                "issue": None if row["state"] in {"reserved", "committed"} else p["issue"],
            }
            for p in availability(db, row["components"])
        ]
        if row
        else [],
        issue=None if row else "historical_stock_identity_missing",
    )


@router.get("/{id}/events", response_model=History)
def events(
    id: UUID,
    response: Response,
    before: int | None = Query(None, ge=1),
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("fulfillment.manage")),
):
    response.headers["Cache-Control"] = "no-store"
    rows = (
        db.execute(
            text(
                "SELECT * FROM stock_reservation_events WHERE order_id=:id "
                "AND (CAST(:before AS integer) IS NULL OR version<:before) ORDER BY version DESC LIMIT 21"
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


@router.get("/{id}/commands/{key}", response_model=Event)
def saved(
    id: UUID,
    key: UUID,
    request: Request,
    response: Response,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("fulfillment.manage")),
):
    response.headers["Cache-Control"] = "no-store"
    row = (
        db.execute(
            text(
                "SELECT * FROM stock_reservation_events WHERE id=:key AND order_id=:id AND actor_id=:actor"
            ),
            {"key": key, "id": id, "actor": principal.account_id},
        )
        .mappings()
        .first()
    )
    return dict(row) if row else failure(request, "order_stock_command_not_found", 404)


@router.put("/{id}/commands/{key}", response_model=Event)
def reacquire(
    id: UUID,
    key: UUID,
    body: Command,
    request: Request,
    response: Response,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("fulfillment.manage")),
):
    response.headers["Cache-Control"] = "no-store"
    actor, denied = write_access(request, db, principal, "fulfillment.manage")
    if denied is not None:
        return denied
    db.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:key,43))"), {"key": str(key)})
    prior = (
        db.execute(text("SELECT * FROM stock_reservation_events WHERE id=:key"), {"key": key})
        .mappings()
        .first()
    )
    if prior:
        if (
            str(prior["order_id"]) != str(id)
            or str(prior["actor_id"]) != str(actor.id)
            or prior["intent"] != body.model_dump()
        ):
            return failure(request, "order_stock_command_conflict", 409)
        return dict(prior)
    # Same order as gateway reconciliation: payment row, order row, stock lock.
    payment = db.execute(
        text("SELECT status FROM sandbox_payments WHERE order_id=:id FOR UPDATE"), {"id": id}
    ).scalar()
    if payment != "paid":
        return failure(request, "order_stock_paid_required", 409)
    db.execute(text("SELECT id FROM customer_orders WHERE id=:id FOR UPDATE"), {"id": id})
    if db.scalar(text("SELECT 1 FROM customer_orders WHERE id=:id AND state->>'fulfillment'='cancelled'"), {"id": id}):
        return failure(request, "order_stock_cancelled", 409)
    if db.scalar(text("SELECT 1 FROM customer_order_requests WHERE order_id=:id AND kind='cancellation' AND status IN ('submitted','in_review','approved')"), {"id": id}):
        return failure(request, "order_stock_cancellation_pending", 409)
    stock_lock(db)
    row = (
        db.execute(
            text("SELECT * FROM order_stock_allocations WHERE order_id=:id FOR UPDATE"), {"id": id}
        )
        .mappings()
        .first()
    )
    if not row or row["version"] != body.expected_version or row["state"] != "shortage":
        return failure(request, "order_stock_version_conflict", 409)
    confirm(db, id, actor.id, key=key, intent=body.model_dump(), reason=body.reason)
    row = (
        db.execute(text("SELECT * FROM stock_reservation_events WHERE id=:key"), {"key": key})
        .mappings()
        .one()
    )
    db.commit()
    return dict(row)
