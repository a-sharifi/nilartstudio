import json
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import text


class DraftError(ValueError):
    pass


class SqlOptionDraftRepository:
    def __init__(self, session):
        self.session = session

    def read(self, product_id):
        if self.session.scalar(text("SELECT id FROM catalog_products WHERE id=:id"), {"id": product_id}) is None:
            raise DraftError("product_not_found")
        row = self.session.execute(text("SELECT id,version,document FROM catalog_option_drafts WHERE product_id=:id"),
                                   {"id": product_id}).mappings().first()
        return {"configuration_id": str(row["id"]) if row else None, "product_id": str(product_id),
                "version": row["version"] if row else 0,
                **(row["document"] if row else {"options": [], "combinations": []})}

    def save(self, product_id, actor_id, version, document):
        # Product lock serializes initial creation as well as subsequent updates.
        if self.session.scalar(text("SELECT id FROM catalog_products WHERE id=:id FOR UPDATE"), {"id": product_id}) is None:
            raise DraftError("product_not_found")
        previous = self.read(product_id)
        if previous["version"] != version:
            raise DraftError("option_version_conflict")
        configuration_id = previous["configuration_id"] or str(uuid4())
        before = {"options": previous["options"], "combinations": previous["combinations"]}
        parameters = {"id": configuration_id, "product": product_id, "version": version + 1,
                      "document": json.dumps(document)}
        self.session.execute(text("INSERT INTO catalog_option_drafts (id,product_id,version,document) "
            "VALUES (:id,:product,:version,CAST(:document AS jsonb)) ON CONFLICT (product_id) "
            "DO UPDATE SET version=EXCLUDED.version,document=EXCLUDED.document"), parameters)
        self.session.execute(text('INSERT INTO catalog_option_audits '
            '(id,configuration_id,product_id,actor_id,previous_version,version,created_at,"before","after") '
            'VALUES (:audit,:id,:product,:actor,:previous,:version,:now,CAST(:before AS jsonb),CAST(:document AS jsonb))'),
            {**parameters, "audit": str(uuid4()), "actor": actor_id, "previous": version,
             "now": datetime.now(UTC), "before": json.dumps(before)})
        return {"configuration_id": configuration_id, "product_id": str(product_id), "version": version + 1, **document}


    def audits(self, product_id, before_version, limit):
        if self.session.scalar(text("SELECT id FROM catalog_products WHERE id=:id"), {"id": product_id}) is None:
            raise DraftError("product_not_found")
        rows = self.session.execute(text('SELECT id,configuration_id,product_id,actor_id,previous_version,version,'
            'created_at,"before","after" FROM catalog_option_audits WHERE product_id=:product '
            'AND (CAST(:cursor AS integer) IS NULL OR version < :cursor) ORDER BY version DESC LIMIT :limit'),
            {"product": product_id, "cursor": before_version, "limit": limit + 1}).mappings().all()
        items = [dict(row) for row in rows[:limit]]
        return {"items": items, "next_before_version": items[-1]["version"] if len(rows) > limit else None}
