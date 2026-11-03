"""Bounded read model for day-to-day catalogue management; no inferred money or stock."""
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.presentation.access import require_permission
from nilart.shared.database import session_dependency

router = APIRouter(prefix="/api/v1/admin/catalog", tags=["catalog-management"])


class Collection(BaseModel):
    id: UUID
    title_fa: str
    title_en: str


class PriceRange(BaseModel):
    currency: Literal["IRT", "IRR"]
    minimum: str
    maximum: str


class ProductRow(BaseModel):
    id: UUID
    slug: str
    title_fa: str
    title_en: str
    published: bool
    version: int
    collections: list[Collection]
    thumbnail_url: str | None
    sku_count: int
    published_sku_count: int
    unpriced_sku_count: int
    prices: list[PriceRange]


class Counts(BaseModel):
    total: int
    published: int
    draft: int
    attention: int


class ProductPage(BaseModel):
    items: list[ProductRow]
    total: int
    counts: Counts
    page: int
    page_size: int


BASE = """
 SELECT p.*,COALESCE(v.version,0) AS version,
  (SELECT count(*) FROM catalog_skus s WHERE s.product_id=p.id) AS sku_count,
  (SELECT count(*) FROM catalog_skus s WHERE s.product_id=p.id AND s.published) AS published_sku_count,
  (SELECT count(*) FROM catalog_skus s WHERE s.product_id=p.id AND s.price_amount IS NULL) AS unpriced_sku_count
 FROM catalog_products p LEFT JOIN catalog_entry_versions v ON v.kind='products' AND v.entry_id=p.id
 WHERE (:q='' OR strpos(lower(p.title_fa||' '||p.title_en||' '||p.slug),lower(:q))>0
  OR EXISTS(SELECT 1 FROM catalog_skus s WHERE s.product_id=p.id AND strpos(lower(s.code),lower(:q))>0))
 AND (CAST(:collection AS uuid) IS NULL OR EXISTS(SELECT 1 FROM catalog_product_collections pc WHERE pc.product_id=p.id AND pc.collection_id=CAST(:collection AS uuid)))
"""


@router.get("/product-workspace", response_model=ProductPage)
def products(db: Session = Depends(session_dependency),
             principal: Principal = Depends(require_permission("catalog.manage")),
             page: int = Query(1, ge=1), page_size: int = Query(24, ge=1, le=100),
             q: str = Query("", max_length=300), collection: UUID | None = None,
             status: Literal["all", "published", "draft"] = "all", attention: bool = False,
             sort: Literal["name", "name_desc", "drafts_first"] = "name",
             language: Literal["fa", "en"] = "fa"):
    params = dict(q=q.strip(), collection=collection, status=status, attention=attention,
                  limit=page_size, offset=(page-1)*page_size)
    counts = dict(db.execute(text("WITH products AS ("+BASE+") SELECT count(*) AS total, count(*) FILTER(WHERE published) AS published,count(*) FILTER(WHERE NOT published) AS draft,count(*) FILTER(WHERE sku_count=0 OR unpriced_sku_count>0) AS attention FROM products"), params).mappings().one())
    where = "WHERE (:status='all' OR published=(:status='published')) AND (NOT :attention OR sku_count=0 OR unpriced_sku_count>0)"
    total = db.scalar(text("WITH products AS ("+BASE+") SELECT count(*) FROM products "+where), params)
    # SQL identifiers and ordering are chosen only from these fixed values.
    title = "title_en" if language == "en" else "title_fa"
    ordering = ("published ASC," if sort == "drafts_first" else "") + title + (" DESC" if sort == "name_desc" else " ASC") + ",id ASC"
    rows = [dict(row) for row in db.execute(text("WITH products AS ("+BASE+") SELECT * FROM products "+where+" ORDER BY "+ordering+" LIMIT :limit OFFSET :offset"), params).mappings()]
    ids = [row["id"] for row in rows]
    if ids:
        collections = db.execute(text("SELECT pc.product_id,c.id,c.title_fa,c.title_en FROM catalog_product_collections pc JOIN catalog_collections c ON c.id=pc.collection_id WHERE pc.product_id=ANY(:ids) ORDER BY c.title_fa,c.id"), {"ids": ids}).mappings().all()
        prices = db.execute(text("SELECT product_id,currency,min(price_amount)::text AS minimum,max(price_amount)::text AS maximum FROM catalog_skus WHERE product_id=ANY(:ids) AND price_amount IS NOT NULL GROUP BY product_id,currency ORDER BY currency"), {"ids": ids}).mappings().all()
        galleries = {row["entity_id"]: row["gallery"] for row in db.execute(text("SELECT p.entity_id,r.intent->'content'->'gallery' AS gallery FROM catalog_profiles p JOIN catalog_profile_revisions r ON r.id=p.published_revision AND r.kind=p.kind AND r.entity_id=p.entity_id WHERE p.kind='products' AND p.entity_id=ANY(:ids)"), {"ids": ids}).mappings()}
        for row in rows:
            row["collections"] = [dict(id=c["id"], title_fa=c["title_fa"], title_en=c["title_en"]) for c in collections if c["product_id"] == row["id"]]
            row["prices"] = [dict(currency=p["currency"], minimum=p["minimum"], maximum=p["maximum"]) for p in prices if p["product_id"] == row["id"]]
            gallery = galleries.get(row["id"]) or []
            row["thumbnail_url"] = f"/api/v1/media/{gallery[0]['asset_id']}/versions/{gallery[0]['revision_id']}/content" if gallery else None
    return dict(items=rows, total=total, counts=counts, page=page, page_size=page_size)
