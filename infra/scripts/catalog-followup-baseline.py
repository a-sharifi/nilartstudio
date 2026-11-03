"""Read-only hashes proving a new-product import preserved existing commerce rows."""

import hashlib
import json

from nilart.shared.database import engine
from sqlalchemy import text
from sqlalchemy.orm import Session


def digest(value):
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, default=str).encode()
    ).hexdigest()


with Session(engine) as db:
    db.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY"))
    tables = [
        "catalog_products",
        "catalog_categories",
        "catalog_skus",
        "catalog_sku_option_mappings",
        "simple_variant_costs",
        "catalog_sku_price_versions",
        "inventory_positions",
        "inventory_movements",
        "business_settings",
        "catalog_artworks",
        "catalog_artwork_details",
        "catalog_bundle_components",
        "catalog_bundle_documents",
    ]
    result = {}
    for table in tables:
        rows = [dict(r) for r in db.execute(text(f"SELECT * FROM {table}")).mappings()]
        if table == "catalog_bundle_documents":
            # Only component/financial content; the image project intentionally
            # advanced bundle gallery revision pointers before this checkpoint.
            rows = [
                dict(
                    id=r["id"],
                    content={k: v for k, v in r["content"].items() if k != "gallery"},
                )
                for r in rows
            ]
        result[table] = {
            json.dumps(
                {
                    k: r[k]
                    for k in ["id", "sku_id", "artwork_id", "bundle_id"]
                    if k in r
                },
                sort_keys=True,
                default=str,
            ): digest(r)
            for r in rows
        }
    print(json.dumps(result))
