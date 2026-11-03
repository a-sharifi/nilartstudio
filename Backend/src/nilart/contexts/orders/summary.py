"""Read-only aggregate of persisted orders and customer requests."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.presentation.access import require_permission
from nilart.shared.database import session_dependency

router = APIRouter(prefix="/api/v1/admin/order-summary", tags=["admin-orders"])


class OrderSummary(BaseModel):
    total_orders: int
    payment: dict[str, int]
    fulfillment: dict[str, int]
    pending_requests: dict[str, int]


@router.get("", response_model=OrderSummary)
def summary(db: Session = Depends(session_dependency),
            principal: Principal = Depends(require_permission("orders.read_all"))):
    # One statement gives a consistent snapshot of all aggregates.
    row = db.execute(text("SELECT (SELECT count(*) FROM customer_orders) AS total_orders, "
        "COALESCE((SELECT jsonb_object_agg(status,n) FROM (SELECT state->>'payment' AS status,count(*) AS n FROM customer_orders GROUP BY state->>'payment') p),'{}'::jsonb) AS payment, "
        "COALESCE((SELECT jsonb_object_agg(status,n) FROM (SELECT state->>'fulfillment' AS status,count(*) AS n FROM customer_orders GROUP BY state->>'fulfillment') f),'{}'::jsonb) AS fulfillment, "
        "COALESCE((SELECT jsonb_object_agg(kind,n) FROM (SELECT kind,count(*) AS n FROM customer_order_requests WHERE status IN ('submitted','in_review') GROUP BY kind) r),'{}'::jsonb) AS pending_requests")).mappings().one()
    return dict(row)
