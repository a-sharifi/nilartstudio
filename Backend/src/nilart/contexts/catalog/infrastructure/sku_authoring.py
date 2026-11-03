import json
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import text


class SKUAuthoringError(ValueError):
    pass


class SqlSKUAuthoringRepository:
    def __init__(self, session):
        self.session = session

    def audits(self, sku_id, before_version, limit):
        self.read(sku_id)
        rows = self.session.execute(text('SELECT id,sku_id,product_id,actor_id,previous_version,version,'
            'created_at,"before","after" FROM catalog_sku_authoring_audits WHERE sku_id=:sku '
            'AND (CAST(:cursor AS integer) IS NULL OR version < :cursor) ORDER BY version DESC LIMIT :limit'),
            {"sku": sku_id, "cursor": before_version, "limit": limit + 1}).mappings().all()
        items = [dict(row) for row in rows[:limit]]
        return {"items": items, "next_before_version": items[-1]["version"] if len(rows) > limit else None}

    def read(self, sku_id, lock=False):
        if lock and self.session.scalar(text("SELECT id FROM catalog_skus WHERE id=:id FOR UPDATE"),
                                        {"id": sku_id}) is None:
            raise SKUAuthoringError("sku_not_found")
        row = self.session.execute(text("SELECT s.id AS sku_id,s.product_id,s.code,s.published,"
            "COALESCE(v.version,0) AS version FROM catalog_skus s "
            "LEFT JOIN catalog_sku_authoring_versions v ON v.sku_id=s.id WHERE s.id=:id"),
            {"id": sku_id}).mappings().first()
        if not row:
            raise SKUAuthoringError("sku_not_found")
        return dict(row)

    def _audit(self, after, actor_id, previous_version, before):
        self.session.execute(text("INSERT INTO catalog_sku_authoring_versions (sku_id,version) "
            "VALUES (:id,:version) ON CONFLICT (sku_id) DO UPDATE SET version=EXCLUDED.version"),
            {"id": after["sku_id"], "version": after["version"]})
        self.session.execute(text('INSERT INTO catalog_sku_authoring_audits '
            '(id,sku_id,product_id,actor_id,previous_version,version,created_at,"before","after") '
            'VALUES (:audit,:sku,:product,:actor,:previous,:version,:now,CAST(:before AS jsonb),CAST(:after AS jsonb))'),
            {"audit": uuid4(), "sku": after["sku_id"], "product": after["product_id"],
             "actor": actor_id, "previous": previous_version, "version": after["version"],
             "now": datetime.now(UTC), "before": json.dumps(before, default=str),
             "after": json.dumps(after, default=str)})

    def create(self, product_id, actor_id, code):
        if self.session.scalar(text("SELECT id FROM catalog_products WHERE id=:id FOR UPDATE"),
                               {"id": product_id}) is None:
            raise SKUAuthoringError("product_not_found")
        sku_id = uuid4()
        inserted = self.session.scalar(text("INSERT INTO catalog_skus "
            "(id,product_id,code,published,price_amount,currency) VALUES (:id,:product,:code,false,NULL,NULL) "
            "ON CONFLICT (code) DO NOTHING RETURNING id"),
            {"id": sku_id, "product": product_id, "code": code})
        if inserted is None:
            raise SKUAuthoringError("sku_code_conflict")
        after = {**self.read(sku_id), "version": 1}
        self._audit(after, actor_id, 0, None)
        return after

    def update(self, sku_id, actor_id, version, code):
        before = self.read(sku_id, lock=True)
        if before["published"]:
            raise SKUAuthoringError("published_sku_immutable")
        if before["version"] != version:
            raise SKUAuthoringError("sku_authoring_version_conflict")
        self.session.execute(text("UPDATE catalog_skus SET code=:code WHERE id=:id"),
                             {"id": sku_id, "code": code})
        after = {**before, "code": code, "version": version + 1}
        self._audit(after, actor_id, version, before)
        return after

    def publication(self, sku_id, actor_id, version, published, reason):
        product = self.session.scalar(text("SELECT product_id FROM catalog_skus WHERE id=:id"), {"id": sku_id})
        if product is None:
            raise SKUAuthoringError("sku_not_found")
        product_published = self.session.scalar(text("SELECT published FROM catalog_products WHERE id=:id FOR UPDATE"), {"id": product})
        before = self.read(sku_id, lock=True)
        if before["version"] != version:
            raise SKUAuthoringError("sku_authoring_version_conflict")
        if before["published"] == published:
            raise SKUAuthoringError("sku_publication_unchanged")
        if published:
            if not product_published:
                raise SKUAuthoringError("product_unpublished")
            current = self.session.scalar(text("SELECT m.configuration_version=d.version AND m.combination_code=s.code "
                "FROM catalog_sku_option_mappings m JOIN catalog_option_drafts d ON d.id=m.configuration_id "
                "AND d.product_id=:product JOIN catalog_skus s ON s.id=m.sku_id WHERE m.sku_id=:sku"),
                {"sku": sku_id, "product": product})
            if not current:
                raise SKUAuthoringError("sku_mapping_review_required")
        self.session.execute(text("UPDATE catalog_skus SET published=:published WHERE id=:id"),
                             {"id": sku_id, "published": published})
        after = {**before, "published": published, "version": version + 1}
        # Existing mapping snapshots are immutable while published, independent of draft edits.
        self._audit({**after, "action": "published" if published else "unpublished", "reason": reason},
                    actor_id, version, before)
        return after
