import json
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import text

from nilart.contexts.catalog.domain.authoring import CatalogAuthoringError, EntryContent, EntryKind
from nilart.shared.outbox import enqueue

TABLES = {EntryKind.COLLECTIONS: "catalog_collections", EntryKind.CATEGORIES: "catalog_categories",
          EntryKind.PRODUCTS: "catalog_products"}


class SqlCatalogAuthoringRepository:
    def __init__(self, session):
        self.session = session

    def _serialize(self):
        # One catalog-content writer at a time also coordinates dependency publication.
        # SKU/mapping writers keep their existing product-before-SKU row lock order.
        self.session.execute(text("SELECT pg_advisory_xact_lock(78214, 21)"))

    def read(self, kind, entry_id, lock=False):
        table = TABLES[EntryKind(kind)]
        if lock and self.session.scalar(text(f"SELECT id FROM {table} WHERE id=:id FOR UPDATE"),
                                        {"id": entry_id}) is None:
            raise CatalogAuthoringError("catalog_entry_not_found")
        row = self.session.execute(text(f"SELECT e.*,COALESCE(v.version,0) AS version FROM {table} e "
            "LEFT JOIN catalog_entry_versions v ON v.entry_id=e.id AND v.kind=:kind WHERE e.id=:id"),
            {"kind": str(kind), "id": entry_id}).mappings().first()
        if row is None:
            raise CatalogAuthoringError("catalog_entry_not_found")
        result = {**row, "kind": str(kind), "collection_ids": [], "category_ids": []}
        if kind == EntryKind.PRODUCTS:
            for name in ("collection", "category"):
                result[f"{name}_ids"] = list(self.session.scalars(text(
                    f"SELECT {name}_id FROM catalog_product_{'collections' if name == 'collection' else 'categories'} "
                    f"WHERE product_id=:id ORDER BY {name}_id"), {"id": entry_id}))
        return result

    def page(self, kind, page=1, page_size=24, status="all", query=""):
        table = TABLES[EntryKind(kind)]
        where = "WHERE (:status='all' OR e.published=(:status='published')) "
        where += "AND (:query='' OR strpos(lower(e.title_fa || ' ' || e.title_en || ' ' || e.slug),lower(:query))>0)"
        params = {"status": status, "query": query, "kind": str(kind), "limit": page_size, "offset": (page-1)*page_size}
        total = self.session.scalar(text(f"SELECT count(*) FROM {table} e {where}"), params)
        ids = self.session.scalars(text(f"SELECT e.id FROM {table} e {where} ORDER BY e.slug,e.id LIMIT :limit OFFSET :offset"), params)
        return {"items": [self.read(kind, entry_id) for entry_id in ids], "total": total, "page": page, "page_size": page_size}

    def _memberships(self, content, published):
        for name, ids in (("collections", content.collection_ids), ("categories", content.category_ids)):
            if not ids:
                continue
            rows = self.session.execute(text(f"SELECT id,published FROM catalog_{name} "
                "WHERE id=ANY(:ids) ORDER BY id FOR SHARE"), {"ids": list(ids)}).mappings().all()
            if len(rows) != len(ids):
                raise CatalogAuthoringError("catalog_membership_not_found")
            if published and any(not row["published"] for row in rows):
                raise CatalogAuthoringError("catalog_dependency_unpublished")

    def _content(self, kind, entry_id, content):
        table = TABLES[EntryKind(kind)]
        self.session.execute(text(f"UPDATE {table} SET slug=:slug,title_fa=:fa,title_en=:en,"
            "description_fa=:dfa,description_en=:den WHERE id=:id"),
            {"id": entry_id, "slug": content.slug, "fa": content.title_fa, "en": content.title_en,
             "dfa": content.description_fa, "den": content.description_en})
        if kind == EntryKind.PRODUCTS:
            for name, ids in (("collection", content.collection_ids), ("category", content.category_ids)):
                table = f"catalog_product_{'collections' if name == 'collection' else 'categories'}"
                self.session.execute(text(f"DELETE FROM {table} WHERE product_id=:id"), {"id": entry_id})
                for related_id in sorted(ids):
                    self.session.execute(text(f"INSERT INTO {table} (product_id,{name}_id) VALUES (:id,:related)"),
                                         {"id": entry_id, "related": related_id})

    def _audit(self, kind, entry_id, actor_id, before, action, reason):
        previous = before["version"] if before else 0
        if previous >= 2147483647:
            raise CatalogAuthoringError("catalog_version_exhausted")
        version = previous + 1
        self.session.execute(text("INSERT INTO catalog_entry_versions (kind,entry_id,version) "
            "VALUES (:kind,:id,:version) ON CONFLICT (kind,entry_id) DO UPDATE SET version=EXCLUDED.version"),
            {"kind": str(kind), "id": entry_id, "version": version})
        after = self.read(kind, entry_id)
        self.session.execute(text('INSERT INTO catalog_entry_audits '
            '(id,kind,entry_id,actor_id,action,reason,previous_version,version,created_at,"before","after") '
            'VALUES (:audit,:kind,:id,:actor,:action,:reason,:previous,:version,:now,CAST(:before AS jsonb),CAST(:after AS jsonb))'),
            {"audit": uuid4(), "kind": str(kind), "id": entry_id, "actor": actor_id, "action": action,
             "reason": reason, "previous": previous, "version": version, "now": datetime.now(UTC),
             "before": json.dumps(before, default=str), "after": json.dumps(after, default=str)})
        enqueue(self.session, "catalog.entry_changed", {"kind": str(kind), "entry_id": str(entry_id),
            "version": version, "action": action})
        return after

    def create(self, kind, entry_id, actor_id, content, reason):
        self._serialize()
        self._memberships(content, False)
        table = TABLES[EntryKind(kind)]
        self.session.execute(text(f"INSERT INTO {table} (id,slug,title_fa,title_en,published) "
            "VALUES (:id,:slug,:fa,:en,false)"),
            {"id": entry_id, "slug": content.slug, "fa": content.title_fa, "en": content.title_en})
        self._content(kind, entry_id, content)
        return self._audit(kind, entry_id, actor_id, None, "created", reason)

    def update(self, kind, entry_id, actor_id, version, content, reason):
        self._serialize()
        before = self.read(kind, entry_id, lock=True)
        if version != before["version"]:
            raise CatalogAuthoringError("catalog_version_conflict")
        if before["published"] and content.slug != before["slug"]:
            raise CatalogAuthoringError("published_slug_immutable")
        self._memberships(content, before["published"])
        self._content(kind, entry_id, content)
        return self._audit(kind, entry_id, actor_id, before, "edited", reason)

    def publish(self, kind, entry_id, actor_id, version, published, reason):
        self._serialize()
        before = self.read(kind, entry_id, lock=True)
        if version != before["version"]:
            raise CatalogAuthoringError("catalog_version_conflict")
        if published == before["published"]:
            raise CatalogAuthoringError("catalog_publication_unchanged")
        content = EntryContent(**{key: before[key] for key in ("slug", "title_fa", "title_en", "description_fa", "description_en", "collection_ids", "category_ids")})
        self._memberships(content, published)
        table = TABLES[EntryKind(kind)]
        self.session.execute(text(f"UPDATE {table} SET published=:published WHERE id=:id"),
                             {"id": entry_id, "published": published})
        return self._audit(kind, entry_id, actor_id, before, "published" if published else "unpublished", reason)

    def audits(self, kind, entry_id, before_version=None, limit=20):
        self.read(kind, entry_id)
        rows = self.session.execute(text('SELECT * FROM catalog_entry_audits WHERE kind=:kind AND entry_id=:id '
            'AND (CAST(:before AS integer) IS NULL OR version<:before) ORDER BY version DESC LIMIT :limit'),
            {"kind": str(kind), "id": entry_id, "before": before_version, "limit": limit+1}).mappings().all()
        return {"items": rows[:limit], "next_before_version": rows[limit-1]["version"] if len(rows)>limit else None}

    def skus(self, product_id):
        self.read(EntryKind.PRODUCTS, product_id)
        rows = self.session.execute(text("SELECT s.id,s.product_id,s.code,s.published,"
            "COALESCE(v.version,0) AS version,s.price_amount,s.currency FROM catalog_skus s "
            "LEFT JOIN catalog_sku_authoring_versions v ON v.sku_id=s.id WHERE s.product_id=:id ORDER BY s.code,s.id"),
            {"id": product_id}).mappings().all()
        return [{"id": row["id"], "product_id": row["product_id"], "code": row["code"],
                 "published": row["published"], "version": row["version"],
                 "price": None if row["price_amount"] is None else {"amount": str(row["price_amount"]), "currency": row["currency"]}}
                for row in rows]
