"""Read models for opening-only cash allocations; posting uses the shared ledger."""

from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.contexts.finance.router import Document, document, fmt
from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.router import failure
from nilart.shared.database import session_dependency

router = APIRouter(prefix="/api/v1/admin/finance/suppliers", tags=["supplier-opening-settlements"])


class Plan(BaseModel):
    supplier_id: UUID
    supplier_code: str
    title_fa: str
    title_en: str
    currency: Literal["IRT"] = "IRT"
    configured: bool
    opening_event_id: UUID | None
    opening_version: int | None
    opening_amount: str | None
    paid_net: str
    outstanding: str | None
    settlement_version: int


@router.get("/{id}/opening/settlement", response_model=Plan)
def plan(
    id: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("finance.read")),
):
    row = (
        db.execute(
            text("""SELECT p.content,o.id AS opening_id,o.version,o.amount,
      coalesce(a.paid,0) AS paid,coalesce(a.version,0) AS settlement_version
      FROM procurement_suppliers p LEFT JOIN LATERAL
      (SELECT * FROM supplier_opening_events WHERE supplier_id=p.id ORDER BY version DESC LIMIT 1) o ON true
      LEFT JOIN LATERAL (SELECT sum(amount) AS paid,max(version) AS version FROM finance_opening_allocations WHERE supplier_id=p.id) a ON true
      WHERE p.id=:id"""),
            {"id": id},
        )
        .mappings()
        .first()
    )
    if not row:
        return failure(request, "finance_opening_supplier_not_found", 404)
    return dict(
        supplier_id=id,
        supplier_code=row["content"]["code"],
        title_fa=row["content"]["title_fa"],
        title_en=row["content"]["title_en"],
        currency="IRT",
        configured=row["opening_id"] is not None,
        opening_event_id=row["opening_id"],
        opening_version=row["version"],
        opening_amount=fmt(row["amount"]) if row["amount"] is not None else None,
        paid_net=fmt(row["paid"]),
        outstanding=fmt(row["amount"] - row["paid"]) if row["amount"] is not None else None,
        settlement_version=row["settlement_version"],
    )


class History(BaseModel):
    items: list[Document]
    next_cursor: UUID | None


@router.get("/{id}/opening/settlements", response_model=History)
def history(
    id: UUID,
    request: Request,
    cursor: UUID | None = None,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("finance.read")),
):
    before = None
    if cursor:
        before = db.scalar(
            text(
                "SELECT version FROM finance_opening_allocations WHERE supplier_id=:id AND document_id=:cursor"
            ),
            {"id": id, "cursor": cursor},
        )
        if before is None:
            return failure(request, "finance_opening_cursor_invalid", 409)
    rows = list(
        db.execute(
            text(
                "SELECT document_id FROM finance_opening_allocations WHERE supplier_id=:id AND (CAST(:before AS int) IS NULL OR version<:before) ORDER BY version DESC LIMIT 21"
            ),
            {"id": id, "before": before},
        ).mappings()
    )
    return dict(
        items=[document(db, r["document_id"]) for r in rows[:20]],
        next_cursor=rows[19]["document_id"] if len(rows) > 20 else None,
    )
