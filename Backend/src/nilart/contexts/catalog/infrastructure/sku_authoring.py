import json
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import text


class SKUAuthoringError(ValueError):
    pass


class SqlSKUAuthoringRepository:
    def __init__(self, session):
        self.session = session

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
