"""Read-only reports from recorded immutable events, never current replacement prices."""

from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal, localcontext
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import AwareDatetime, BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.router import failure
from nilart.shared.database import session_dependency
from nilart.shared.tabular_export import table_response

router = APIRouter(prefix="/api/v1/admin/reports", tags=["operational-reports"])
Report = Literal["inventory", "movements", "production", "waste"]


class Filters(BaseModel):
    as_of: AwareDatetime
    from_time: AwareDatetime | None = None
    q: str = ""
    kind: Literal["material", "sku", "artwork"] | None = None
    low: bool = False


class InventoryRow(BaseModel):
    id: UUID
    kind: str
    reference_id: UUID
    code: str
    title_fa: str
    title_en: str
    unit: str
    quantity: str
    value: str
    average_cost: str | None
    threshold: str | None
    low: bool
    movement_id: UUID
    recorded_at: AwareDatetime


class MovementRow(BaseModel):
    id: UUID
    position_id: UUID
    code: str
    title_fa: str
    title_en: str
    kind: str
    unit: str
    action: str
    quantity_delta: str
    value_delta: str
    quantity_after: str
    value_after: str
    reverses_id: UUID | None
    reversed_by: UUID | None
    source_document_kind: str | None
    source_document_id: UUID | None
    source_event_id: UUID | None
    reason: str
    recorded_at: AwareDatetime


class ProductionRow(BaseModel):
    id: UUID
    event_id: UUID
    batch_number: str
    sku_code: str
    title_fa: str
    title_en: str
    status: str
    recipe_version: int
    target_output: int
    cost_complete: bool
    wip: str
    transferred_value: str
    abnormal_loss: str
    actual_recorded_total: str
    estimated_total: str | None
    variance: str | None
    unit_cost: str | None
    healthy_output: int | None
    normal_waste: int | None
    abnormal_damage: int | None
    recorded_at: AwareDatetime


class Group(BaseModel):
    kind: str
    unit: str
    count: int
    quantity: str
    value: str


class Totals(BaseModel):
    count: int
    value: str
    groups: list[Group] = []
    wip: str | None = None
    abnormal_loss: str | None = None
    incomplete_batches: int | None = None


class Page(BaseModel):
    report: Report
    filters: Filters
    currency: Literal["IRT"] = "IRT"
    items: list[InventoryRow] | list[MovementRow] | list[ProductionRow]
    totals: Totals
    next_cursor: UUID | None
    reservation_history_available: Literal[False] = False


def filters(
    as_of: AwareDatetime,
    from_time: AwareDatetime | None = None,
    q: str = Query("", max_length=200),
    kind: Literal["material", "sku", "artwork"] | None = None,
    low: bool = False,
):
    return Filters(as_of=as_of, from_time=from_time, q=q.strip(), kind=kind, low=low)


STOCK = """
WITH latest AS (
 SELECT DISTINCT ON (position_id) * FROM inventory_movements
 WHERE created_at<=:as_of ORDER BY position_id,version DESC
), data AS (
 SELECT p.id,p.kind,p.reference_id,p.code,p.title_fa,p.title_en,p.unit,
 m.quantity_after::text AS quantity,m.value_after::text AS value,
 CASE WHEN m.quantity_after>0 THEN round(m.value_after/m.quantity_after,6)::text END AS average_cost,
 m.threshold_after::text AS threshold,
 coalesce(m.quantity_after<=m.threshold_after,false) AS low,
 m.id AS movement_id,m.created_at AS recorded_at
 FROM latest m JOIN inventory_positions p ON p.id=m.position_id
 WHERE (:q='' OR strpos(lower(concat_ws(' ',p.code,p.title_fa,p.title_en)),lower(CAST(:q AS text)))>0)
 AND (CAST(:kind AS text) IS NULL OR p.kind=:kind)
 AND (NOT :low OR m.quantity_after<=m.threshold_after)
)
"""
MOVEMENTS = """
WITH data AS (
 SELECT m.id,p.id AS position_id,p.code,p.title_fa,p.title_en,p.kind,p.unit,m.kind AS action,
 m.quantity_delta::text,m.value_delta::text,m.quantity_after::text,m.value_after::text,
 m.reverses_id,r.id AS reversed_by,m.source_document_id,m.source_event_id,
 CASE WHEN m.source_document_id IS NOT NULL THEN coalesce(m.source_document_kind,'purchase') END AS source_document_kind,
 m.reason,m.created_at AS recorded_at
 FROM inventory_movements m JOIN inventory_positions p ON p.id=m.position_id
 LEFT JOIN inventory_movements r ON r.reverses_id=m.id AND r.created_at<=:as_of
 LEFT JOIN inventory_movements original ON original.id=m.reverses_id
 WHERE m.created_at<=:as_of AND m.created_at>=:from_time
 AND (:q='' OR strpos(lower(concat_ws(' ',p.code,p.title_fa,p.title_en,m.reason)),lower(CAST(:q AS text)))>0)
 AND (CAST(:kind AS text) IS NULL OR p.kind=:kind)
 AND (NOT :waste OR m.kind='waste' OR original.kind='waste')
)
"""
PRODUCTION = """
WITH latest AS (
 SELECT DISTINCT ON (batch_id) * FROM production_events WHERE created_at<=:as_of ORDER BY batch_id,version DESC
), data AS (
 SELECT e.batch_id AS id,e.id AS event_id,e.result,e.created_at AS recorded_at,
 e.result->'state'->>'wip' AS wip,e.result->'state'->>'abnormal_loss' AS abnormal_loss
 FROM latest e WHERE (:q='' OR strpos(lower(concat_ws(' ',e.result->'content'->>'batch_number',e.result->'content'->>'sku_code',e.result->'content'->>'title_fa',e.result->'content'->>'title_en')),lower(CAST(:q AS text)))>0)
)
"""


def query(db, report, f, cursor, limit):
    """One SQL snapshot covers filtered totals and page, including empty later pages."""
    params = f.model_dump()
    params.update(cursor=cursor, limit=limit + 1, waste=report == "waste")
    if report == "inventory":
        prefix = STOCK
        grouped = "SELECT kind,unit,count(*) AS count,sum(quantity::numeric)::text AS quantity,sum(value::numeric)::text AS value FROM data GROUP BY kind,unit ORDER BY kind,unit"
        total = (
            "jsonb_build_object('count',count(*),'value',coalesce(sum(value::numeric),0)::text,'groups',(SELECT coalesce(jsonb_agg(g),'[]'::jsonb) FROM ("
            + grouped
            + ") g))"
        )
    elif report in {"movements", "waste"}:
        prefix = MOVEMENTS
        grouped = "SELECT kind,unit,count(*) AS count,sum(quantity_delta::numeric)::text AS quantity,sum(value_delta::numeric)::text AS value FROM data GROUP BY kind,unit ORDER BY kind,unit"
        total = (
            "jsonb_build_object('count',count(*),'value',coalesce(sum(value_delta::numeric),0)::text,'groups',(SELECT coalesce(jsonb_agg(g),'[]'::jsonb) FROM ("
            + grouped
            + ") g))"
        )
    else:
        prefix = PRODUCTION
        total = "jsonb_build_object('count',count(*),'value',coalesce(sum((result->'state'->>'transferred_value')::numeric),0)::text,'groups','[]'::jsonb,'wip',coalesce(sum(wip::numeric),0)::text,'abnormal_loss',coalesce(sum(abnormal_loss::numeric),0)::text,'incomplete_batches',count(*) FILTER(WHERE NOT (result->'state'->>'cost_complete')::boolean))"
    sql = (
        prefix
        + " SELECT (SELECT coalesce(jsonb_agg(p ORDER BY id),'[]'::jsonb) FROM (SELECT * FROM data WHERE (CAST(:cursor AS uuid) IS NULL OR id>:cursor) ORDER BY id LIMIT :limit) p) AS items,(SELECT "
        + total
        + " FROM data) AS totals"
    )
    result = db.execute(text(sql), params).mappings().one()
    rows = result["items"]
    next_cursor = rows[limit - 1]["id"] if len(rows) > limit else None
    if report == "production":
        rows = production_rows(db, rows[:limit])
    else:
        rows = rows[:limit]
    return dict(
        report=report, filters=f, items=rows, totals=result["totals"], next_cursor=next_cursor
    )


def production_rows(db, rows):
    # Immutable pinned resource snapshots: never read today's replacement rates.
    revisions = {r["result"]["content"]["revision_id"] for r in rows}
    snapshots = (
        {
            str(r["revision_id"]): r["snapshots"]
            for r in db.execute(
                text(
                    "SELECT revision_id,snapshots FROM cost_recipe_versions WHERE revision_id=ANY(CAST(:ids AS uuid[]))"
                ),
                dict(ids=list(revisions)),
            ).mappings()
        }
        if revisions
        else {}
    )
    result = []
    with localcontext() as ctx:
        ctx.prec = 60
        for r in rows:
            batch = r["result"]
            c = batch["content"]
            s = batch["state"]
            quality = s["quality"] or {}
            resources = {
                snap["revision_id"]: snap["content"] for snap in snapshots.get(c["revision_id"], [])
            }
            estimate = Decimal(0)
            for line in c["lines"]:
                resource = resources.get(line["resource_revision_id"], {})
                rate = resource.get("rate")
                valid = resource.get("valid_from")
                if (
                    not rate
                    or rate["currency"] != "IRT"
                    or not valid
                    or valid > c["production_date"]
                    or (resource.get("valid_to") and resource["valid_to"] < c["production_date"])
                ):
                    estimate = None
                    break
                estimate += Decimal(line["planned_quantity"]) * Decimal(rate["amount"])
            actual = sum(
                (Decimal(s[k]) for k in ("wip", "transferred_value", "abnormal_loss")), Decimal(0)
            )
            healthy = quality.get("healthy_output")

            def fmt(v):
                return (
                    None
                    if v is None
                    else format(v.quantize(Decimal(".000001"), rounding=ROUND_HALF_UP), "f")
                )

            result.append(
                dict(
                    id=r["id"],
                    event_id=r["event_id"],
                    batch_number=c["batch_number"],
                    sku_code=c["sku_code"],
                    title_fa=c["title_fa"],
                    title_en=c["title_en"],
                    status=batch["status"],
                    recipe_version=c["recipe_version"],
                    target_output=c["target_output"],
                    cost_complete=s["cost_complete"],
                    wip=s["wip"],
                    transferred_value=s["transferred_value"],
                    abnormal_loss=s["abnormal_loss"],
                    actual_recorded_total=fmt(actual),
                    estimated_total=fmt(estimate),
                    variance=fmt(actual - estimate)
                    if estimate is not None
                    and s["cost_complete"]
                    and batch["status"] == "completed"
                    else None,
                    unit_cost=fmt(Decimal(s["transferred_value"]) / healthy)
                    if healthy and s["cost_complete"]
                    else None,
                    healthy_output=healthy,
                    normal_waste=quality.get("normal_waste"),
                    abnormal_damage=quality.get("abnormal_damage"),
                    recorded_at=r["recorded_at"],
                )
            )
    return result


def invalid(report, f):
    return (
        f.as_of > datetime.now(timezone.utc)
        or (f.from_time and f.from_time > f.as_of)
        or (report in {"movements", "waste"} and f.from_time is None)
        or (report != "inventory" and f.low)
        or (report == "production" and (f.kind is not None or f.from_time is not None))
        or (report == "inventory" and f.from_time is not None)
    )


@router.get("/{report}", response_model=Page)
def read(
    report: Report,
    request: Request,
    f: Annotated[Filters, Depends(filters)],
    cursor: UUID | None = None,
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("finance.read")),
):
    if invalid(report, f):
        return failure(request, "report_filters_invalid", 422)
    return query(db, report, f, cursor, limit)


@router.get("/{report}/export")
def export(
    report: Report,
    request: Request,
    f: Annotated[Filters, Depends(filters)],
    format: Literal["csv", "xlsx"] = "csv",
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("finance.export")),
):
    if invalid(report, f):
        return failure(request, "report_filters_invalid", 422)
    page = query(db, report, f, None, 10000)
    if page["next_cursor"]:
        return failure(request, "report_export_narrow_range", 409)
    models = {
        "inventory": InventoryRow,
        "movements": MovementRow,
        "waste": MovementRow,
        "production": ProductionRow,
    }
    columns = list(models[report].model_fields)
    metadata = ["currency", "filter_as_of", "filter_from", "filter_q", "filter_kind", "filter_low"]
    rows = [
        [row.get(k) for k in columns]
        + [
            "IRT",
            f.as_of.isoformat(),
            f.from_time.isoformat() if f.from_time else "",
            f.q,
            f.kind or "",
            str(f.low),
        ]
        for row in page["items"]
    ]
    return table_response(
        columns + metadata,
        rows,
        f"{report}-{f.as_of.date()}",
        format,
        numeric_columns=tuple(
            i
            for i, k in enumerate(columns)
            if k
            in {
                "quantity",
                "value",
                "average_cost",
                "threshold",
                "quantity_delta",
                "value_delta",
                "quantity_after",
                "value_after",
                "wip",
                "transferred_value",
                "abnormal_loss",
                "actual_recorded_total",
                "estimated_total",
                "variance",
                "unit_cost",
            }
        ),
    )
