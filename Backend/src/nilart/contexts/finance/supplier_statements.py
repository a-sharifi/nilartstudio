"""Read-only supplier history projected from posted purchase and cash evidence."""

import hashlib
import json
from datetime import date, datetime
from decimal import Decimal, localcontext
from typing import Literal
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.router import failure
from nilart.shared.database import session_dependency
from nilart.shared.tabular_export import table_response

router = APIRouter(prefix="/api/v1/admin/finance/suppliers", tags=["supplier-financial-statements"])

# All monetary inputs and completeness checks share a single PostgreSQL snapshot.
PROJECTION = """
WITH purchases AS (SELECT * FROM procurement_purchases WHERE supplier_id=:supplier),
history AS (
 SELECT e.*,coalesce(lag((e.result->'state'->>'liability')::numeric) OVER (PARTITION BY e.purchase_id ORDER BY e.version),0) AS previous
 FROM procurement_purchase_events e JOIN purchases p ON p.id=e.purchase_id
),
incomplete AS (
 SELECT p.id FROM purchases p LEFT JOIN history h ON h.purchase_id=p.id
 GROUP BY p.id,p.version,p.state
 HAVING count(h.id)<>p.version OR min(h.version)<>1 OR max(h.version)<>p.version
 OR (array_agg(h.result->'state'->>'liability' ORDER BY h.version DESC))[1] IS DISTINCT FROM p.state->>'liability'
),
entries AS (
 SELECT h.id,'purchase'::text AS source,h.action AS kind,h.purchase_id AS document_id,h.purchase_id,
 h.result->'content'->>'document_number' AS document_number,h.result->'content'->>'document_date' AS document_date,
 h.created_at AS recorded_at,h.version AS source_version,
 ((h.result->'state'->>'liability')::numeric-h.previous)::text AS delta,
 h.intent->>'receipt_id' AS corrects_id
 FROM history h WHERE (h.result->'state'->>'liability')::numeric<>h.previous
 UNION ALL
 SELECT d.id,'finance',d.kind,d.id,a.purchase_id,d.document_number,d.document_date::text,d.created_at,0,
 (-a.amount)::text,d.reverses_id::text
 FROM finance_allocations a JOIN finance_documents d ON d.id=a.document_id JOIN purchases p ON p.id=a.purchase_id
 WHERE a.amount<>0
 UNION ALL
 SELECT d.id,'finance',d.kind,d.id,NULL::uuid,d.document_number,d.document_date::text,d.created_at,a.version,(-a.amount)::text,d.reverses_id::text
 FROM finance_opening_allocations a JOIN finance_documents d ON d.id=a.document_id WHERE a.supplier_id=:supplier
 UNION ALL
 SELECT o.id,'opening',CASE WHEN o.version=1 THEN 'supplier_opening' ELSE 'supplier_opening_correction' END,
 o.id,NULL::uuid,'OPENING-'||o.version,o.as_of_date::text,o.created_at,o.version,o.delta::text,o.corrects_id::text
 FROM supplier_opening_events o WHERE o.supplier_id=:supplier
), bounded AS (SELECT * FROM entries ORDER BY recorded_at,source DESC,source_version,id LIMIT 10001)
SELECT coalesce((SELECT jsonb_agg(to_jsonb(b) ORDER BY recorded_at,source DESC,source_version,id) FROM bounded b),'[]'::jsonb) AS entries,
 EXISTS(SELECT 1 FROM incomplete) AS incomplete,
 EXISTS(SELECT 1 FROM supplier_opening_events WHERE supplier_id=:supplier AND (created_at AT TIME ZONE 'Asia/Tehran')::date<=CAST(:through AS date)) AS opening_configured
"""


class Entry(BaseModel):
    id: UUID
    source: Literal["purchase", "finance", "opening"]
    kind: str
    document_id: UUID
    purchase_id: UUID | None
    document_number: str
    document_date: date
    recorded_at: datetime
    source_version: int
    delta: str
    corrects_id: UUID | None
    balance: str


class Statement(BaseModel):
    supplier_id: UUID
    supplier_code: str
    title_fa: str
    title_en: str
    currency: Literal["IRT"] = "IRT"
    from_date: date
    to_date: date
    opening_balance_configured: bool = False
    opening_change: str = "0"
    opening_recorded_balance: str
    liability_change: str
    paid_net: str
    closing_recorded_balance: str
    fingerprint: str
    items: list[Entry]
    next_offset: int | None
    total_entries: int


class StatementError(Exception):
    pass


def number(value):
    return format(value, "f")


def projection(db, id, start, end):
    if start > end:
        raise StatementError("supplier_statement_date_range_invalid")
    supplier = db.scalar(text("SELECT content FROM procurement_suppliers WHERE id=:id"), {"id": id})
    if not supplier:
        raise StatementError("supplier_statement_not_found")
    result = db.execute(text(PROJECTION), {"supplier": id, "through": end}).mappings().one()
    if result["incomplete"]:
        raise StatementError("supplier_statement_history_incomplete")
    if len(result["entries"]) > 10000:
        raise StatementError("supplier_statement_history_limit")
    raw = result["entries"]
    fingerprint = hashlib.sha256(
        json.dumps(
            [
                str(id),
                str(start),
                str(end),
                supplier["code"],
                supplier["title_fa"],
                supplier["title_en"],
                raw,
            ],
            sort_keys=True,
            separators=(",", ":"),
        ).encode()
    ).hexdigest()
    items = []
    with localcontext() as ctx:
        ctx.prec = 60
        opening = balance = liability = paid = opening_change = Decimal(0)
        for entry in raw:
            day = (
                datetime.fromisoformat(entry["recorded_at"])
                .astimezone(ZoneInfo("Asia/Tehran"))
                .date()
            )
            delta = Decimal(entry["delta"])
            if day < start:
                opening += delta
                balance += delta
            elif day <= end:
                balance += delta
                if entry["source"] == "purchase":
                    liability += delta
                elif entry["source"] == "opening":
                    opening_change += delta
                else:
                    paid -= delta
                items.append({**entry, "balance": number(balance)})
    summary = dict(
        supplier_id=id,
        supplier_code=supplier["code"],
        title_fa=supplier["title_fa"],
        title_en=supplier["title_en"],
        currency="IRT",
        from_date=start,
        to_date=end,
        opening_balance_configured=result["opening_configured"],
        opening_change=number(opening_change),
        opening_recorded_balance=number(opening),
        liability_change=number(liability),
        paid_net=number(paid),
        closing_recorded_balance=number(balance),
        fingerprint=fingerprint,
        total_entries=len(items),
    )
    return summary, items


def error(request, exc):
    return failure(request, str(exc), 404 if str(exc).endswith("not_found") else 409)


@router.get("/{id}/statement", response_model=Statement)
def statement(
    id: UUID,
    from_date: date,
    to_date: date,
    request: Request,
    offset: int = Query(0, ge=0, le=10000),
    limit: int = Query(25, ge=1, le=100),
    fingerprint: str | None = Query(None, pattern="^[0-9a-f]{64}$"),
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("finance.read")),
):
    try:
        summary, items = projection(db, id, from_date, to_date)
        if (offset and not fingerprint) or (fingerprint and fingerprint != summary["fingerprint"]):
            raise StatementError("supplier_statement_changed")
        return {
            **summary,
            "items": items[offset : offset + limit],
            "next_offset": offset + limit if len(items) > offset + limit else None,
        }
    except StatementError as exc:
        return error(request, exc)


@router.get("/{id}/statement/export")
def export(
    id: UUID,
    from_date: date,
    to_date: date,
    fingerprint: str,
    request: Request,
    format: Literal["csv", "xlsx"] = "csv",
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("finance.export")),
):
    if not SqlIdentityRepository(db).principal(principal.account_id).allows("finance.read"):
        return failure(request, "permission_denied", 403)
    try:
        summary, entries = projection(db, id, from_date, to_date)
        if fingerprint != summary["fingerprint"]:
            raise StatementError("supplier_statement_changed")
        columns = [
            "supplier_id",
            "supplier_code",
            "currency",
            "source",
            "event_id",
            "document_id",
            "purchase_id",
            "document_number",
            "document_date",
            "recorded_at",
            "source_version",
            "delta",
            "recorded_balance",
            "corrects_id",
            "filter_recorded_from",
            "filter_recorded_to",
            "opening_balance_configured",
            "opening_recorded_balance",
            "closing_recorded_balance",
            "fingerprint",
            "opening_change_in_range",
            "entry_kind",
        ]
        rows = [
            [
                id,
                summary["supplier_code"],
                "IRT",
                e["source"],
                e["id"],
                e["document_id"],
                e["purchase_id"],
                e["document_number"],
                e["document_date"],
                e["recorded_at"],
                e["source_version"],
                e["delta"],
                e["balance"],
                e["corrects_id"],
                from_date,
                to_date,
                summary["opening_balance_configured"],
                summary["opening_recorded_balance"],
                summary["closing_recorded_balance"],
                fingerprint,
                summary["opening_change"],
                e["kind"],
            ]
            for e in entries
        ]
        if not rows:
            rows = [
                [
                    id,
                    summary["supplier_code"],
                    "IRT",
                    *([""] * 11),
                    from_date,
                    to_date,
                    summary["opening_balance_configured"],
                    summary["opening_recorded_balance"],
                    summary["closing_recorded_balance"],
                    fingerprint,
                    summary["opening_change"],
                    "",
                ]
            ]
        return table_response(
            columns,
            rows,
            f"supplier-{id}-statement",
            format,
            numeric_columns=(10, 11, 12, 17, 18, 20),
        )
    except StatementError as exc:
        return error(request, exc)
