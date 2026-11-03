"""Permission-scoped, immutable-order shop monitoring; no inferred profit or live writes."""

from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal
from typing import Literal
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.presentation.access import authenticated_principal
from nilart.shared.database import session_dependency

router = APIRouter(prefix="/api/v1/admin", tags=["shop-monitoring"])
TEHRAN = ZoneInfo("Asia/Tehran")
Scope = Literal["live", "sandbox", "all"]


def amount(value):
    return format(Decimal(str(value or 0)).quantize(Decimal("0.01")), "f")


def bounds(from_date=None, to_date=None):
    end_day = to_date or datetime.now(TEHRAN).date()
    try:
        start_day = from_date or end_day - timedelta(days=29)
    except OverflowError:
        raise HTTPException(
            422,
            detail={"code": "dashboard_date_range_invalid"},
            headers={"Cache-Control": "no-store"},
        ) from None
    days = (end_day - start_day).days + 1
    if not 1 <= days <= 93:
        raise HTTPException(
            422,
            detail={"code": "dashboard_date_range_invalid"},
            headers={"Cache-Control": "no-store"},
        )

    def beginning(value):
        return datetime.combine(value, time.min, tzinfo=TEHRAN)

    try:
        return (
            start_day,
            end_day,
            beginning(start_day),
            beginning(end_day + timedelta(days=1)),
            beginning(start_day - timedelta(days=days)),
        )
    except OverflowError:
        raise HTTPException(
            422,
            detail={"code": "dashboard_date_range_invalid"},
            headers={"Cache-Control": "no-store"},
        ) from None


# A malformed/naive legacy receipt is not evidence of a known payment date.
# PostgreSQL 17 is the project's database; pg_input_is_valid avoids cast failures.
ORDER_DATA = """
WITH scoped AS (
 SELECT o.id,o.snapshot,o.state,o.created_at,
 CASE WHEN (snapshot#>>'{receipt,issued_at}') ~ '(Z|[+-][0-9]{2}:[0-9]{2})$'
  AND pg_input_is_valid(snapshot#>>'{receipt,issued_at}','timestamp with time zone')
  THEN (snapshot#>>'{receipt,issued_at}')::timestamptz END AS paid_at,
 CASE WHEN snapshot->>'currency'='IRR' THEN 10::numeric ELSE 1::numeric END AS conversion
 FROM customer_orders o
 WHERE (:scope='all' OR o.sandbox=(:scope='sandbox'))
), candidates AS (
 SELECT * FROM scoped WHERE (created_at>=:previous_start AND created_at<:end)
  OR (paid_at>=:previous_start AND paid_at<:end AND state->>'payment' IN ('paid','partially_refunded','refunded'))
), data AS (
 SELECT o.*,items.sales/o.conversion AS sales,items.units
 FROM candidates o CROSS JOIN LATERAL (
  SELECT coalesce(sum((l->>'unit_amount')::numeric*(l->>'quantity')::numeric-coalesce((l->>'discount_amount')::numeric,0)),0) AS sales,
   coalesce(sum((l->>'quantity')::int),0)::int AS units
  FROM jsonb_array_elements(o.snapshot->'items') l
 ) items
), periods AS (
 SELECT 'current' AS name,CAST(:start AS timestamptz) AS starts,CAST(:end AS timestamptz) AS ends
 UNION ALL SELECT 'previous',CAST(:previous_start AS timestamptz),CAST(:start AS timestamptz)
), summaries AS (
 SELECT name,jsonb_build_object(
  'orders',count(*) FILTER(WHERE created_at>=starts AND created_at<ends),
  'paid_orders',count(*) FILTER(WHERE paid_at>=starts AND paid_at<ends AND state->>'payment' IN ('paid','partially_refunded','refunded')),
  'sales_amount',coalesce(sum(sales) FILTER(WHERE paid_at>=starts AND paid_at<ends AND state->>'payment' IN ('paid','partially_refunded','refunded')),0)::text,
  'units',coalesce(sum(units) FILTER(WHERE paid_at>=starts AND paid_at<ends AND state->>'payment' IN ('paid','partially_refunded','refunded')),0)::int
 ) AS metrics FROM periods LEFT JOIN data ON true GROUP BY name,starts,ends
), days AS (
 SELECT generate_series(CAST(:from_date AS date),CAST(:to_date AS date),'1 day'::interval)::date AS date
), created_daily AS (
 SELECT timezone('Asia/Tehran',created_at)::date AS date,count(*) AS orders FROM data
 WHERE created_at>=:start AND created_at<:end GROUP BY 1
), paid_daily AS (
 SELECT timezone('Asia/Tehran',paid_at)::date AS date,count(*) AS paid_orders,sum(sales) AS sales_amount FROM data
 WHERE paid_at>=:start AND paid_at<:end AND state->>'payment' IN ('paid','partially_refunded','refunded') GROUP BY 1
), top_lines AS (
 SELECT l->>'sku' AS sku,(array_agg(l->>'title_fa' ORDER BY o.paid_at DESC,o.id))[1] AS title_fa,
  (array_agg(l->>'title_en' ORDER BY o.paid_at DESC,o.id))[1] AS title_en,
  sum((l->>'quantity')::int)::int AS quantity,
  sum(((l->>'unit_amount')::numeric*(l->>'quantity')::numeric-coalesce((l->>'discount_amount')::numeric,0))/o.conversion)::text AS sales_amount
 FROM data o CROSS JOIN LATERAL jsonb_array_elements(o.snapshot->'items') l
 WHERE o.paid_at>=:start AND o.paid_at<:end AND o.state->>'payment' IN ('paid','partially_refunded','refunded')
 GROUP BY l->>'sku'
)
SELECT
 (SELECT metrics FROM summaries WHERE name='current') AS summary,
 (SELECT metrics FROM summaries WHERE name='previous') AS previous,
 (SELECT coalesce(jsonb_agg(t ORDER BY t.date),'[]'::jsonb) FROM (
  SELECT d.date::text,coalesce(c.orders,0)::int AS orders,coalesce(p.paid_orders,0)::int AS paid_orders,
   coalesce(p.sales_amount,0)::text AS sales_amount FROM days d LEFT JOIN created_daily c USING(date) LEFT JOIN paid_daily p USING(date)
 ) t) AS trend,
 (SELECT coalesce(jsonb_agg(t ORDER BY t.key),'[]'::jsonb) FROM (
  SELECT coalesce(state->>'payment','unknown') AS key,count(*)::int AS count FROM data WHERE created_at>=:start AND created_at<:end GROUP BY 1
 ) t) AS status,
 (SELECT coalesce(jsonb_agg(t ORDER BY t.quantity DESC,t.sku),'[]'::jsonb) FROM (
  SELECT * FROM top_lines ORDER BY quantity DESC,sku LIMIT 6
 ) t) AS top_products,
 (SELECT coalesce(jsonb_agg(t ORDER BY t.created_at DESC,t.id DESC),'[]'::jsonb) FROM (
  SELECT id,snapshot->>'reference' AS reference,created_at,state->>'payment' AS payment,state->>'fulfillment' AS fulfillment,
   ((snapshot->>'total_amount')::numeric/conversion)::text AS total_amount FROM data
  WHERE :recent AND created_at>=:start AND created_at<:end ORDER BY created_at DESC,id DESC LIMIT 6
 ) t) AS recent_orders
"""

INVENTORY = """
WITH stock AS (
 SELECT s.id AS sku_id,s.product_id,s.code,p.title_fa,p.title_en,
 coalesce(i.quantity,0)-coalesce(i.reserved,0) AS available,coalesce(i.reserved,0) AS reserved
 FROM catalog_skus s JOIN catalog_products p ON p.id=s.product_id
 LEFT JOIN inventory_positions i ON i.kind='sku' AND i.reference_id=s.id
 WHERE s.published AND p.published
)
SELECT count(*)::int AS published_variants,
 count(*) FILTER(WHERE available>0 AND available<=:low_stock)::int AS low_stock_count,
 count(*) FILTER(WHERE available<=0)::int AS out_of_stock_count,
 coalesce(sum(reserved),0)::text AS reserved_quantity,
 (SELECT coalesce(jsonb_agg(t ORDER BY t.available::numeric,t.title_fa,t.sku_id),'[]'::jsonb) FROM (
  SELECT sku_id,product_id,code,title_fa,title_en,available::text,reserved::text FROM stock
  WHERE available<=:low_stock ORDER BY available,title_fa,sku_id LIMIT 8
 ) t) AS items FROM stock
"""

CATALOG = """
WITH variants AS (
 SELECT s.price_amount,r.intent->'content' AS profile,cp.published_revision
 FROM catalog_skus s JOIN catalog_products p ON p.id=s.product_id
 LEFT JOIN catalog_profiles cp ON cp.kind='skus' AND cp.entity_id=s.id
 LEFT JOIN catalog_profile_revisions r ON r.id=cp.published_revision AND r.kind=cp.kind AND r.entity_id=cp.entity_id
 WHERE s.published AND p.published
)
SELECT (SELECT count(*) FROM catalog_products WHERE published)::int AS published_products,
 (SELECT count(*) FROM catalog_products WHERE NOT published)::int AS draft_products,
 count(*) FILTER(WHERE price_amount IS NULL OR price_amount<=0)::int AS missing_prices,
 count(*) FILTER(WHERE published_revision IS NULL OR profile->>'delivery' IS NULL OR profile->>'returnable' IS NULL
  OR (profile->>'delivery'='physical' AND (coalesce((profile->>'weight_grams')::numeric,0)<=0
   OR coalesce((profile->>'length_cm')::numeric,0)<=0 OR coalesce((profile->>'width_cm')::numeric,0)<=0
   OR coalesce((profile->>'height_cm')::numeric,0)<=0)))::int AS missing_shipping
 FROM variants
"""

WORK = """
SELECT (SELECT count(*) FROM customer_orders o
 WHERE (:scope='all' OR o.sandbox=(:scope='sandbox'))
 AND o.state->>'payment' IN ('paid','partially_refunded')
 AND o.state->>'fulfillment' IN ('unshipped','partial','on_hold'))::int AS paid_unshipped,
 (SELECT count(*) FROM customer_order_requests r JOIN customer_orders o ON o.id=r.order_id
 WHERE (:scope='all' OR o.sandbox=(:scope='sandbox')) AND r.status IN ('submitted','in_review','approved'))::int AS open_requests
"""


def project(db, principal, from_date=None, to_date=None, scope="live", low_stock=2):
    start_day, end_day, start, end, previous_start = bounds(from_date, to_date)
    result = dict(
        generated_at=datetime.now(UTC).isoformat(),
        timezone="Asia/Tehran",
        filters=dict(
            from_date=start_day.isoformat(),
            to_date=end_day.isoformat(),
            scope=scope,
            low_stock=low_stock,
        ),
        summary=None,
        previous=None,
        trend=[],
        status=[],
        top_products=[],
        recent_orders=[],
        inventory=None,
        catalog=None,
        work=None,
    )
    if not any(
        principal.allows(p)
        for p in ("orders.read_all", "finance.read", "inventory.manage", "catalog.manage")
    ):
        raise HTTPException(
            403, detail={"code": "permission_denied"}, headers={"Cache-Control": "no-store"}
        )
    params = dict(
        scope=scope,
        start=start,
        end=end,
        previous_start=previous_start,
        from_date=start_day,
        to_date=end_day,
        recent=principal.allows("orders.read_all"),
        low_stock=low_stock,
    )
    if principal.allows("orders.read_all") or principal.allows("finance.read"):
        row = dict(db.execute(text(ORDER_DATA), params).mappings().one())
        for key in ("summary", "previous"):
            metric = row[key]
            metric["sales_amount"] = amount(metric["sales_amount"])
            metric["average_order"] = amount(
                Decimal(metric["sales_amount"]) / metric["paid_orders"]
                if metric["paid_orders"]
                else 0
            )
        for key in ("trend", "top_products"):
            for metric in row[key]:
                metric["sales_amount"] = amount(metric["sales_amount"])
        for recent in row["recent_orders"]:
            recent["total_amount"] = amount(recent["total_amount"])
        result.update(row)
    if principal.allows("inventory.manage"):
        result["inventory"] = dict(db.execute(text(INVENTORY), params).mappings().one())
    if principal.allows("catalog.manage"):
        result["catalog"] = dict(db.execute(text(CATALOG), params).mappings().one())
    if principal.allows("orders.read_all"):
        result["work"] = dict(db.execute(text(WORK), params).mappings().one())
    return result


@router.get("/shop-dashboard")
def dashboard(
    response: Response,
    from_date: date | None = None,
    to_date: date | None = None,
    scope: Scope = "live",
    low_stock: int = Query(2, ge=0, le=1000),
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(authenticated_principal),
):
    response.headers["Cache-Control"] = "no-store"
    return project(db, principal, from_date, to_date, scope, low_stock)
