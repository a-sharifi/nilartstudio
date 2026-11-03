"""Current supplier balances from one recorded database snapshot."""

import hashlib
import json
from datetime import date, datetime, timezone
from decimal import Decimal, localcontext
from typing import Literal
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.contexts.finance.router import fmt
from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.router import failure
from nilart.shared.database import session_dependency
from nilart.shared.tabular_export import table_response

router = APIRouter(prefix="/api/v1/admin/finance/supplier-balances", tags=["supplier-balances"])
Status = Literal["all", "debt", "credit", "settled", "unconfigured"]
SQL = """
WITH checked AS (
 SELECT p.id,p.supplier_id,p.state,
 count(e.id)<>p.version OR min(e.version)<>1 OR max(e.version)<>p.version
 OR (array_agg(e.result->'state'->>'liability' ORDER BY e.version DESC))[1]
 IS DISTINCT FROM p.state->>'liability' AS incomplete
 FROM procurement_purchases p LEFT JOIN procurement_purchase_events e ON e.purchase_id=p.id
 GROUP BY p.id
), history AS (
 SELECT e.*,p.supplier_id,coalesce(lag((e.result->'state'->>'liability')::numeric)
 OVER (PARTITION BY e.purchase_id ORDER BY e.version),0) AS previous
 FROM procurement_purchase_events e JOIN procurement_purchases p ON p.id=e.purchase_id
), purchases AS (
 SELECT supplier_id,sum((result->'state'->>'liability')::numeric-previous) AS liability
 FROM history
 WHERE CAST(:as_of_date AS date) IS NULL OR created_at < ((CAST(:as_of_date AS date)+1)::timestamp AT TIME ZONE 'Asia/Tehran')
 GROUP BY supplier_id
), integrity AS (
 SELECT supplier_id,bool_or(incomplete) AS incomplete FROM checked GROUP BY supplier_id
), purchase_cash AS (
 SELECT p.supplier_id,sum(a.amount) AS paid FROM finance_allocations a
 JOIN finance_documents d ON d.id=a.document_id
 JOIN procurement_purchases p ON p.id=a.purchase_id
 WHERE CAST(:as_of_date AS date) IS NULL OR d.created_at < ((CAST(:as_of_date AS date)+1)::timestamp AT TIME ZONE 'Asia/Tehran')
 GROUP BY p.supplier_id
), opening_cash AS (
 SELECT a.supplier_id,sum(a.amount) AS paid FROM finance_opening_allocations a
 JOIN finance_documents d ON d.id=a.document_id
 WHERE CAST(:as_of_date AS date) IS NULL OR d.created_at < ((CAST(:as_of_date AS date)+1)::timestamp AT TIME ZONE 'Asia/Tehran')
 GROUP BY a.supplier_id
), latest AS (
 SELECT DISTINCT ON (supplier_id) supplier_id,id,version,
 sum(delta) OVER (PARTITION BY supplier_id) AS amount FROM supplier_opening_events
 WHERE CAST(:as_of_date AS date) IS NULL OR created_at < ((CAST(:as_of_date AS date)+1)::timestamp AT TIME ZONE 'Asia/Tehran')
 ORDER BY supplier_id,version DESC
)
SELECT s.id,s.content,o.id AS opening_id,o.version AS opening_version,o.amount AS opening_amount,
coalesce(p.liability,0) AS liability,coalesce(pc.paid,0) AS purchase_paid,
coalesce(oc.paid,0) AS opening_paid,coalesce(i.incomplete,false) AS incomplete
FROM procurement_suppliers s LEFT JOIN purchases p ON p.supplier_id=s.id
LEFT JOIN purchase_cash pc ON pc.supplier_id=s.id LEFT JOIN opening_cash oc ON oc.supplier_id=s.id
LEFT JOIN latest o ON o.supplier_id=s.id
LEFT JOIN integrity i ON i.supplier_id=s.id
ORDER BY s.content->>'code',s.id LIMIT 1001
"""


class Row(BaseModel):
    supplier_id: UUID
    supplier_code: str
    title_fa: str
    title_en: str
    active: bool
    currency: Literal["IRT"] = "IRT"
    opening_configured: bool
    opening_event_id: UUID | None
    opening_version: int | None
    opening_amount: str | None
    purchase_liability: str
    purchase_paid: str
    opening_paid: str
    recorded_balance: str
    balance: str | None
    status: Literal["debt", "credit", "settled", "unconfigured"]


class Report(BaseModel):
    q: str
    as_of_date: date | None
    status: Status
    currency: Literal["IRT"] = "IRT"
    fingerprint: str
    total_suppliers: int
    unconfigured_suppliers: int
    payable: str
    receivable: str
    recorded_net: str
    items: list[Row]
    next_offset: int | None


class BalanceError(Exception):
    pass


def project(db, q, status, as_of_date=None):
    if as_of_date and as_of_date > datetime.now(ZoneInfo("Asia/Tehran")).date():
        raise BalanceError("supplier_balances_date_in_future")
    raw = list(db.execute(text(SQL), {"as_of_date": as_of_date}).mappings())
    if len(raw) > 1000:
        raise BalanceError("supplier_balances_limit")
    rows = []
    with localcontext() as ctx:
        ctx.prec = 60
        payable = receivable = recorded = Decimal(0)
        missing = 0
        for r in raw:
            c = r["content"]
            if q.casefold() not in " ".join([c["code"], c["title_fa"], c["title_en"]]).casefold():
                continue
            if r["incomplete"]:
                raise BalanceError("supplier_balances_history_incomplete")
            configured = r["opening_id"] is not None
            balance = (
                (r["opening_amount"] or Decimal(0))
                + r["liability"]
                - r["purchase_paid"]
                - r["opening_paid"]
            )
            state = (
                "unconfigured"
                if not configured
                else "debt"
                if balance > 0
                else "credit"
                if balance < 0
                else "settled"
            )
            if status != "all" and state != status:
                continue
            recorded += balance
            if not configured:
                missing += 1
            elif balance > 0:
                payable += balance
            elif balance < 0:
                receivable -= balance
            rows.append(
                dict(
                    supplier_id=str(r["id"]),
                    supplier_code=c["code"],
                    title_fa=c["title_fa"],
                    title_en=c["title_en"],
                    active=c["active"],
                    currency="IRT",
                    opening_configured=configured,
                    opening_event_id=str(r["opening_id"]) if configured else None,
                    opening_version=r["opening_version"],
                    opening_amount=fmt(r["opening_amount"]) if configured else None,
                    purchase_liability=fmt(r["liability"]),
                    purchase_paid=fmt(r["purchase_paid"]),
                    opening_paid=fmt(r["opening_paid"]),
                    recorded_balance=fmt(balance),
                    balance=fmt(balance) if configured else None,
                    status=state,
                )
            )
    fingerprint = hashlib.sha256(
        json.dumps(
            [q, status, str(as_of_date), rows], sort_keys=True, separators=(",", ":")
        ).encode()
    ).hexdigest()
    return dict(
        q=q,
        as_of_date=as_of_date,
        status=status,
        currency="IRT",
        fingerprint=fingerprint,
        total_suppliers=len(rows),
        unconfigured_suppliers=missing,
        payable=fmt(payable),
        receivable=fmt(receivable),
        recorded_net=fmt(recorded),
    ), rows


def checked(db, q, status, fingerprint, offset=0, as_of_date=None):
    summary, rows = project(db, q.strip(), status, as_of_date)
    if (offset and not fingerprint) or (fingerprint and fingerprint != summary["fingerprint"]):
        raise BalanceError("supplier_balances_changed")
    return summary, rows


@router.get("", response_model=Report)
def report(
    request: Request,
    q: str = Query("", max_length=150),
    status: Status = "all",
    as_of_date: date | None = None,
    offset: int = Query(0, ge=0, le=1000),
    limit: int = Query(25, ge=1, le=100),
    fingerprint: str | None = Query(None, pattern="^[0-9a-f]{64}$"),
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("finance.read")),
):
    try:
        summary, rows = checked(db, q, status, fingerprint, offset, as_of_date)
        return dict(
            **summary,
            items=rows[offset : offset + limit],
            next_offset=offset + limit if len(rows) > offset + limit else None,
        )
    except BalanceError as exc:
        return failure(request, str(exc), 409)


@router.get("/export")
def export(
    request: Request,
    fingerprint: str = Query(pattern="^[0-9a-f]{64}$"),
    q: str = Query("", max_length=150),
    status: Status = "all",
    as_of_date: date | None = None,
    format: Literal["csv", "xlsx"] = "csv",
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("finance.export")),
):
    if not SqlIdentityRepository(db).principal(principal.account_id).allows("finance.read"):
        return failure(request, "permission_denied", 403)
    try:
        summary, rows = checked(db, q, status, fingerprint, as_of_date=as_of_date)
        exported_at = datetime.now(timezone.utc).isoformat()
        columns = list(Row.model_fields)
        columns += [
            "filter_q",
            "filter_status",
            "snapshot_fingerprint",
            "payable_configured_only",
            "receivable_configured_only",
            "unconfigured_suppliers",
            "exported_at_utc",
            "recorded_through_tehran",
        ]
        values = [
            [r[k] for k in Row.model_fields]
            + [
                summary["q"],
                status,
                fingerprint,
                summary["payable"],
                summary["receivable"],
                summary["unconfigured_suppliers"],
                exported_at,
                as_of_date,
            ]
            for r in rows
        ]
        if not values:
            values = [
                [""] * len(Row.model_fields)
                + [
                    summary["q"],
                    status,
                    fingerprint,
                    summary["payable"],
                    summary["receivable"],
                    summary["unconfigured_suppliers"],
                    exported_at,
                    as_of_date,
                ]
            ]
        return table_response(
            columns,
            values,
            "supplier-balances",
            format,
            numeric_columns=(9, 10, 11, 12, 13, 14, 19, 20, 21),
        )
    except BalanceError as exc:
        return failure(request, str(exc), 409)
