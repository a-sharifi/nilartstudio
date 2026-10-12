import json

from sqlalchemy import text

from nilart.contexts.catalog.domain.options import OptionDocument
from nilart.contexts.catalog.infrastructure.sku_authoring import (
    SKUAuthoringError,
    SqlSKUAuthoringRepository,
)


class SqlSKUMappingRepository:
    def __init__(self, session):
        self.session = session

    def read(self, sku_id):
        # One statement keeps metadata, mapping and current draft version consistent.
        row = self.session.execute(text("SELECT s.id AS sku_id,s.product_id,s.code,s.published,"
            "COALESCE(v.version,0) AS version,m.configuration_id,m.configuration_version,"
            "m.combination_code,m.snapshot,d.version AS draft_version "
            "FROM catalog_skus s LEFT JOIN catalog_sku_authoring_versions v ON v.sku_id=s.id "
            "LEFT JOIN catalog_sku_option_mappings m ON m.sku_id=s.id "
            "LEFT JOIN catalog_option_drafts d ON d.id=m.configuration_id WHERE s.id=:sku"),
            {"sku": sku_id}).mappings().first()
        if not row:
            raise SKUAuthoringError("sku_not_found")
        mapping = None if row["configuration_id"] is None else {
            "configuration_id": row["configuration_id"],
            "configuration_version": row["configuration_version"],
            "combination_code": row["combination_code"], "snapshot": row["snapshot"],
            "current": row["configuration_version"] == row["draft_version"] and row["code"] == row["combination_code"]}
        return {key: row[key] for key in ["sku_id", "product_id", "code", "published", "version"]} | {"mapping": mapping}

    def save(self, sku_id, actor_id, version, mapping):
        product = self.session.scalar(text("SELECT product_id FROM catalog_skus WHERE id=:sku"), {"sku": sku_id})
        if product is None:
            raise SKUAuthoringError("sku_not_found")
        # Match option editing's product lock, then lock the SKU. Never reverse this order.
        self.session.execute(text("SELECT id FROM catalog_products WHERE id=:id FOR UPDATE"), {"id": product})
        authoring = SqlSKUAuthoringRepository(self.session)
        metadata = authoring.read(sku_id, lock=True)
        if metadata["published"]:
            raise SKUAuthoringError("published_sku_immutable")
        if metadata["version"] != version:
            raise SKUAuthoringError("sku_authoring_version_conflict")
        before = self.read(sku_id)
        if mapping is None:
            self.session.execute(text("DELETE FROM catalog_sku_option_mappings WHERE sku_id=:sku"), {"sku": sku_id})
        else:
            draft = self.session.execute(text("SELECT id,version,document FROM catalog_option_drafts "
                                              "WHERE product_id=:product"), {"product": product}).mappings().first()
            if not draft or draft["id"] != mapping["configuration_id"]:
                raise SKUAuthoringError("option_configuration_mismatch")
            if draft["version"] != mapping["configuration_version"]:
                raise SKUAuthoringError("option_version_conflict")
            document = OptionDocument.model_validate(draft["document"]).snapshot()
            combination = next((c for c in document["combinations"] if c["code"] == mapping["combination_code"]), None)
            if combination is None or metadata["code"] != mapping["combination_code"]:
                raise SKUAuthoringError("option_combination_mismatch")
            self.session.execute(text("INSERT INTO catalog_sku_option_mappings "
                "(sku_id,configuration_id,configuration_version,combination_code,snapshot) "
                "VALUES (:sku,:configuration,:version,:code,CAST(:snapshot AS jsonb)) "
                "ON CONFLICT (sku_id) DO UPDATE SET configuration_id=EXCLUDED.configuration_id,"
                "configuration_version=EXCLUDED.configuration_version,combination_code=EXCLUDED.combination_code,"
                "snapshot=EXCLUDED.snapshot"),
                {"sku": sku_id, "configuration": draft["id"], "version": draft["version"],
                 "code": combination["code"], "snapshot": json.dumps({"options": document["options"], "combination": combination})})
        after = {**self.read(sku_id), "version": version + 1}
        authoring._audit(after, actor_id, version, before)
        return after
