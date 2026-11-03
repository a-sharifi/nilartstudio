"""Read-only commerce/media baseline. Run inside an API container; outputs hashes only."""

import hashlib
import json

from nilart.shared.database import engine
from sqlalchemy import text
from sqlalchemy.orm import Session


def digest(value):
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, default=str, ensure_ascii=False).encode()
    ).hexdigest()


with Session(engine) as db:
    db.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY"))
    available = set(
        db.scalars(
            text("SELECT tablename FROM pg_tables WHERE schemaname=current_schema()")
        )
    )
    tables = [
        "catalog_products",
        "catalog_skus",
        "catalog_sku_option_mappings",
        "business_settings",
        "simple_variant_costs",
    ]
    tables += sorted(
        t for t in available if t.startswith("inventory_") and "audit" not in t
    )
    result = {"commerce": {}, "media": {}}
    for table in tables:
        if table in available:
            rows = [
                dict(r) for r in db.execute(text(f'SELECT * FROM "{table}"')).mappings()
            ]
            rows.sort(key=lambda r: json.dumps(r, sort_keys=True, default=str))
            result["commerce"][table] = dict(count=len(rows), sha256=digest(rows))
    if "catalog_profiles" in available:
        rows = []
        for r in db.execute(
            text("SELECT kind,entity_id,content FROM catalog_profiles")
        ).mappings():
            c = r["content"] or {}
            values = {
                k: c.get(k)
                for k in [
                    "delivery",
                    "weight_grams",
                    "returnable",
                    "length_cm",
                    "width_cm",
                    "height_cm",
                    "weight_estimated",
                ]
            }
            if any(v is not None and v is not False for v in values.values()):
                rows.append(dict(kind=r["kind"], id=str(r["entity_id"]), **values))
        result["commerce"]["physical_profiles"] = dict(
            count=len(rows),
            sha256=digest(sorted(rows, key=lambda r: r["kind"] + r["id"])),
        )
    for table in ["media_assets", "catalog_profiles"]:
        if table in available:
            rows = [
                dict(r)
                for r in db.execute(
                    text(f'SELECT * FROM "{table}" ORDER BY 1')
                ).mappings()
            ]
            result["media"][table] = dict(count=len(rows), sha256=digest(rows))
    print(json.dumps(result, ensure_ascii=False))
