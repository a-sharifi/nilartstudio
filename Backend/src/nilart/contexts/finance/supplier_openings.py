"""Explicit external opening balances; no cash, purchase or inventory mutation."""

import json
from datetime import date, datetime
from decimal import Decimal, localcontext
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.contexts.business.router import Strict
from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.contexts.identity.presentation.router import failure
from nilart.shared.database import session_dependency
from nilart.shared.outbox import enqueue

router = APIRouter(prefix="/api/v1/admin/finance/suppliers", tags=["supplier-opening-balances"])
Signed = Annotated[str, Field(pattern=r"^-?(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,6})?$")]


class Command(Strict):
    currency: Literal["IRT"]
    expected_version: int = Field(strict=True, ge=0, le=2147483646)
    amount: Signed
    as_of_date: date
    corrects_id: UUID | None = None
    source_reference: str = Field(min_length=3, max_length=500)
    excludes_recorded_activity: bool = Field(strict=True)
    reason: str = Field(min_length=5, max_length=1000)

    @model_validator(mode="after")
    def valid(self):
        if not self.excludes_recorded_activity or (self.expected_version == 0) != (
            self.corrects_id is None
        ):
            raise ValueError(
                "Explicit excluded-activity confirmation and current correction link required"
            )
        if Decimal(self.amount) == 0 and self.amount.startswith("-"):
            raise ValueError("Use unsigned zero to confirm no opening balance")
        return self


class Outcome(BaseModel):
    supplier_id: UUID
    version: int
    currency: Literal["IRT"] = "IRT"
    amount: str
    delta: str
    as_of_date: date
    corrects_id: UUID | None
    cash_moved: Literal[False] = False
    stock_moved: Literal[False] = False


class Receipt(BaseModel):
    id: UUID
    supplier_id: UUID
    actor_id: UUID
    version: int
    intent: Command
    result: Outcome
    created_at: datetime


class History(BaseModel):
    items: list[Receipt]
    next_before_version: int | None


class OpeningError(Exception):
    pass


def fail(code):
    raise OpeningError("supplier_opening_" + code)


@router.get("/{id}/opening", response_model=Receipt | None)
def current(
    id: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("finance.read")),
):
    if not db.scalar(text("SELECT 1 FROM procurement_suppliers WHERE id=:id"), {"id": id}):
        return failure(request, "supplier_opening_supplier_not_found", 404)
    row = (
        db.execute(
            text(
                "SELECT * FROM supplier_opening_events WHERE supplier_id=:id ORDER BY version DESC LIMIT 1"
            ),
            {"id": id},
        )
        .mappings()
        .first()
    )
    return dict(row) if row else None


@router.get("/{id}/opening/history", response_model=History)
def history(
    id: UUID,
    before: int | None = Query(None, ge=1),
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("finance.read")),
):
    rows = list(
        db.execute(
            text(
                "SELECT * FROM supplier_opening_events WHERE supplier_id=:id AND (CAST(:before AS int) IS NULL OR version<:before) ORDER BY version DESC LIMIT 21"
            ),
            {"id": id, "before": before},
        ).mappings()
    )
    return dict(
        items=[dict(r) for r in rows[:20]],
        next_before_version=rows[19]["version"] if len(rows) > 20 else None,
    )


@router.get("/{id}/opening/commands/{key}", response_model=Receipt)
def saved(
    id: UUID,
    key: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("finance.read")),
):
    row = (
        db.execute(
            text(
                "SELECT * FROM supplier_opening_events WHERE supplier_id=:id AND id=:key AND actor_id=:actor"
            ),
            {"id": id, "key": key, "actor": principal.account_id},
        )
        .mappings()
        .first()
    )
    return dict(row) if row else failure(request, "supplier_opening_command_not_found", 404)


def apply(db, actor, id, key, body):
    intent = body.model_dump(mode="json")
    old = (
        db.execute(text("SELECT * FROM supplier_opening_events WHERE id=:id"), {"id": key})
        .mappings()
        .first()
    )
    if old:
        if (
            old["supplier_id"] != id
            or str(old["actor_id"]) != str(actor)
            or old["intent"] != intent
        ):
            fail("command_conflict")
        return dict(old)
    if not db.scalar(
        text("SELECT 1 FROM procurement_suppliers WHERE id=:id FOR UPDATE"), {"id": id}
    ):
        fail("supplier_not_found")
    previous = (
        db.execute(
            text(
                "SELECT * FROM supplier_opening_events WHERE supplier_id=:id ORDER BY version DESC LIMIT 1"
            ),
            {"id": id},
        )
        .mappings()
        .first()
    )
    if body.expected_version != (previous["version"] if previous else 0):
        fail("version_conflict")
    if previous:
        if body.corrects_id != previous["id"] or body.as_of_date != previous["as_of_date"]:
            fail("correction_link_conflict")
    else:
        today = db.scalar(text("SELECT (clock_timestamp() AT TIME ZONE 'Asia/Tehran')::date"))
        earliest = db.scalar(
            text(
                "SELECT min(day) FROM (SELECT (e.created_at AT TIME ZONE 'Asia/Tehran')::date AS day FROM procurement_purchase_events e JOIN procurement_purchases p ON p.id=e.purchase_id WHERE p.supplier_id=:id AND e.action='post' UNION ALL SELECT (d.created_at AT TIME ZONE 'Asia/Tehran')::date FROM finance_allocations a JOIN finance_documents d ON d.id=a.document_id JOIN procurement_purchases p ON p.id=a.purchase_id WHERE p.supplier_id=:id) dates"
            ),
            {"id": id},
        )
        if body.as_of_date >= today or (earliest and body.as_of_date >= earliest):
            fail("date_overlaps_recorded_activity")
    with localcontext() as ctx:
        ctx.prec = 60
        amount = Decimal(body.amount)
        delta = amount - (previous["amount"] if previous else Decimal(0))
    version = body.expected_version + 1
    result = dict(
        supplier_id=str(id),
        version=version,
        currency="IRT",
        amount=body.amount,
        delta=format(delta, "f"),
        as_of_date=str(body.as_of_date),
        corrects_id=str(body.corrects_id) if body.corrects_id else None,
        cash_moved=False,
        stock_moved=False,
    )
    row = (
        db.execute(
            text(
                "INSERT INTO supplier_opening_events(id,supplier_id,actor_id,version,corrects_id,amount,delta,as_of_date,source_reference,intent,result) VALUES(:id,:supplier,:actor,:version,:corrects,:amount,:delta,:day,:reference,CAST(:intent AS jsonb),CAST(:result AS jsonb)) RETURNING *"
            ),
            dict(
                id=key,
                supplier=id,
                actor=actor,
                version=version,
                corrects=body.corrects_id,
                amount=amount,
                delta=delta,
                day=body.as_of_date,
                reference=body.source_reference,
                intent=json.dumps(intent),
                result=json.dumps(result),
            ),
        )
        .mappings()
        .one()
    )
    payload = dict(supplier_id=str(id), event_id=str(key), version=version)
    SqlAccountManagement(db).audit(
        str(actor),
        str(actor),
        "finance.supplier_opening_recorded",
        dict(
            **payload,
            before=previous["result"] if previous else None,
            after=result,
            source_reference=body.source_reference,
        ),
        body.reason,
    )
    enqueue(db, "finance.supplier_opening_recorded", payload)
    return dict(row)


@router.put("/{id}/opening/commands/{key}", response_model=Receipt)
def command(
    id: UUID,
    key: UUID,
    body: Command,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("finance.read")),
):
    actor, denied = write_access(request, db, principal, "finance.write")
    if denied is not None:
        return denied
    if not SqlIdentityRepository(db).principal(actor.id, lock=True).allows("finance.read"):
        return failure(request, "permission_denied", 403)
    db.execute(text("SELECT pg_advisory_xact_lock(78214,40)"))
    db.execute(text("SELECT pg_advisory_xact_lock(78214,38)"))
    try:
        result = apply(db, actor.id, id, key, body)
        db.commit()
        return result
    except OpeningError as exc:
        db.rollback()
        return failure(request, str(exc), 404 if str(exc).endswith("not_found") else 409)
    except Exception:
        db.rollback()
        raise
