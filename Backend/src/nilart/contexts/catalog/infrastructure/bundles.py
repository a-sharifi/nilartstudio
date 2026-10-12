from sqlalchemy import text

VISIBLE = """b.published=true AND EXISTS (SELECT 1 FROM catalog_bundle_components c WHERE c.bundle_id=b.id)
AND NOT EXISTS (SELECT 1 FROM catalog_bundle_components c JOIN catalog_skus s ON s.id=c.sku_id
JOIN catalog_products p ON p.id=s.product_id WHERE c.bundle_id=b.id AND (NOT s.published OR NOT p.published))"""


class SqlBundleRepository:
    def __init__(self, session):
        self.session = session

    def components(self, items):
        if not items:
            return []
        result = {item["id"]: {**item, "components": []} for item in items}
        rows = self.session.execute(text("SELECT c.bundle_id,c.sku_id,c.quantity,s.code,p.title_fa,p.title_en "
            "FROM catalog_bundle_components c JOIN catalog_skus s ON s.id=c.sku_id JOIN catalog_products p ON p.id=s.product_id "
            "WHERE c.bundle_id=ANY(:ids) ORDER BY s.code,s.id"), {"ids": list(result)}).mappings()
        for row in rows:
            result[row["bundle_id"]]["components"].append({key: row[key] for key in ["sku_id", "quantity", "code", "title_fa", "title_en"]})
        return list(result.values())

    def page(self, page, page_size):
        total = self.session.scalar(text("SELECT count(*) FROM catalog_bundles b WHERE " + VISIBLE))
        rows = self.session.execute(text("SELECT b.id,b.slug,b.title_fa,b.title_en,b.description_fa,b.description_en "
            "FROM catalog_bundles b WHERE " + VISIBLE + " ORDER BY b.slug,b.id LIMIT :limit OFFSET :offset"),
            {"limit": page_size, "offset": (page - 1) * page_size}).mappings().all()
        return {"items": self.components(rows), "total": total, "page": page, "page_size": page_size}

    def detail(self, slug):
        rows = self.session.execute(text("SELECT b.id,b.slug,b.title_fa,b.title_en,b.description_fa,b.description_en "
            "FROM catalog_bundles b WHERE " + VISIBLE + " AND b.slug=:slug"), {"slug": slug}).mappings().all()
        return self.components(rows)[0] if rows else None
