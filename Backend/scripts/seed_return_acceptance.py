"""Synthetic approved legacy-return fixture, isolated demo only; never modifies order terms."""

import json
import sys
from uuid import UUID, uuid4

from sqlalchemy import create_engine, text

from nilart.bootstrap.settings import settings

if "--demo-only" not in sys.argv:
    raise SystemExit("Explicit --demo-only required")
customer, sku = UUID(sys.argv[-2]), UUID(sys.argv[-1])
with create_engine(settings.database_url).begin() as db:
    assert db.scalar(text("SELECT current_database()")) == "nilart_demo"
    assert db.scalar(
        text(
            "SELECT 1 FROM catalog_skus s JOIN catalog_products p ON p.id=s.product_id WHERE s.id=:sku AND p.slug LIKE 'stock-live-%'"
        ),
        {"sku": sku},
    )
    rows = (
        db.execute(
            text(
                "SELECT * FROM customer_orders WHERE account_id=:customer AND state->>'fulfillment'='delivered' AND EXISTS(SELECT 1 FROM jsonb_array_elements(snapshot->'items') i WHERE i->>'sku'=:sku) ORDER BY created_at DESC"
            ),
            {"customer": customer, "sku": str(sku)},
        )
        .mappings()
        .all()
    )
    assert rows, "Synthetic delivered order required"
    order = rows[0]
    assert not db.scalar(
        text("SELECT 1 FROM customer_order_requests WHERE order_id=:id"), {"id": order["id"]}
    ), "Use a fresh synthetic order"
    quantities = {line["id"]: line["quantity"] for line in order["snapshot"]["items"]}
    request = uuid4()
    db.execute(
        text(
            "INSERT INTO customer_order_requests(id,account_id,order_id,kind,status,payload,version,public_reply) VALUES(:id,:customer,:order,'return','approved',CAST(:payload AS jsonb),2,'Synthetic approved legacy return for isolated inspection acceptance')"
        ),
        {
            "id": request,
            "customer": customer,
            "order": order["id"],
            "payload": json.dumps(
                {
                    "reason": "Synthetic approved legacy return fixture; original terms retained",
                    "quantities": quantities,
                }
            ),
        },
    )
    print(
        json.dumps(
            {
                "request": str(request),
                "order": str(order["id"]),
                "line": next(iter(quantities)),
                "customer": str(customer),
                "sku": str(sku),
            }
        )
    )
