"""Resolve owned order lines to currently public catalog entries, without changing snapshots."""
from sqlalchemy import text

from nilart.contexts.catalog.infrastructure.bundles import VISIBLE


def catalog_items(db, snapshots):
    keys = list({line["sku"] for snapshot in snapshots for line in snapshot["items"] if not line.get("commission_id")})
    if not keys:
        return {}
    rows = db.execute(text("""
        SELECT s.code AS key, 'products' AS kind, p.slug, NULL::text AS image_url
        FROM catalog_skus s JOIN catalog_products p ON p.id=s.product_id
        WHERE p.published AND s.code=ANY(:keys)
        UNION ALL
        SELECT s.id::text, 'products', p.slug, NULL::text
        FROM catalog_skus s JOIN catalog_products p ON p.id=s.product_id
        WHERE p.published AND s.id::text=ANY(:keys)
        UNION ALL
        SELECT p.id::text, 'products', p.slug, NULL::text FROM catalog_products p
        WHERE p.published AND p.id::text=ANY(:keys)
        UNION ALL
        SELECT a.id::text, 'artworks', a.slug, d.document->>'image_url'
        FROM catalog_artworks a LEFT JOIN catalog_artwork_details d ON d.artwork_id=a.id
        WHERE a.published AND a.id::text=ANY(:keys)
        UNION ALL
        SELECT b.id::text, 'bundles', b.slug, NULL::text FROM catalog_bundles b
        WHERE b.id::text=ANY(:keys) AND """ + VISIBLE), {"keys": keys}).mappings()
    matches = {}
    for row in rows:
        value = {key: row[key] for key in ("kind", "slug", "image_url")}
        matches.setdefault(row["key"], []).append(value)
    return {key: values[0] for key, values in matches.items() if len(values) == 1}


def attach_catalog(order, matches):
    return {**order, "catalog_items": {str(line["id"]): matches[line["sku"]]
            for line in order["snapshot"]["items"]
            if not line.get("commission_id") and line["sku"] in matches}}
