import json
from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import text

from nilart.contexts.catalog.domain.entities import SKU
from nilart.shared.money import Money


class PriceError(ValueError):
    pass


class SqlSKUPriceRepository:
    def __init__(self, session):
        self.session = session

    def read(self, sku_id, lock=False):
        if lock:
            if self.session.scalar(text("SELECT id FROM catalog_skus WHERE id=:id FOR UPDATE"),
                                   {"id": sku_id}) is None:
                raise PriceError("sku_not_found")
        # Price and version share a single read snapshot; writers lock the SKU first.
        row = self.session.execute(text("SELECT s.id,s.product_id,s.code,s.price_amount,s.currency,"
            "COALESCE(v.version,0) AS version FROM catalog_skus s "
            "LEFT JOIN catalog_sku_price_versions v ON v.sku_id=s.id WHERE s.id=:id"),
            {"id": sku_id}).mappings().first()
        if not row:
            raise PriceError("sku_not_found")
        version = row["version"]
        price = None if row["price_amount"] is None else {
            "amount": str(row["price_amount"]), "currency": row["currency"]}
        return {"sku_id": str(row["id"]), "product_id": str(row["product_id"]),
                "code": row["code"], "version": version, "price": price}

    def save(self, sku_id, actor_id, version, price):
        before = self.read(sku_id, lock=True)
        if price is not None:
            SKU(sku_id, UUID(before["product_id"]), before["code"], True,
                Money(price["amount"], price["currency"]))
        if before["version"] != version:
            raise PriceError("sku_price_version_conflict")
        self.session.execute(text("UPDATE catalog_skus SET price_amount=:amount,currency=:currency "
            "WHERE id=:id"), {"id": sku_id, "amount": None if price is None else price["amount"],
                              "currency": None if price is None else price["currency"]})
        self.session.execute(text("INSERT INTO catalog_sku_price_versions (sku_id,version) "
            "VALUES (:id,:version) ON CONFLICT (sku_id) DO UPDATE SET version=EXCLUDED.version"),
            {"id": sku_id, "version": version + 1})
        after = self.read(sku_id)
        self.session.execute(text('INSERT INTO catalog_sku_price_audits '
            '(id,sku_id,product_id,actor_id,previous_version,version,created_at,"before","after") '
            'VALUES (:audit,:sku,:product,:actor,:previous,:version,:now,CAST(:before AS jsonb),CAST(:after AS jsonb))'),
            {"audit": uuid4(), "sku": sku_id, "product": before["product_id"], "actor": actor_id,
             "previous": version, "version": version + 1, "now": datetime.now(UTC),
             "before": json.dumps({"price": before["price"]}),
             "after": json.dumps({"price": after["price"]})})
        return after
