from decimal import Decimal
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.contexts.catalog.application.queries import (
    GetCatalog,
    GetCollection,
    ListCatalog,
    ListCollections,
    ListProductSKUs,
)
from nilart.contexts.catalog.domain.options import Combination, Option
from nilart.contexts.catalog.domain.presentation import ProductPresentation
from nilart.contexts.catalog.infrastructure.repository import (
    ProductPresentationRow,
    SqlCatalogRepository,
    SqlCollectionRepository,
)
from nilart.shared.database import session_dependency

router = APIRouter(prefix="/api/v1/catalog", tags=["catalog"])


class PublishedSKUOptions(BaseModel):
    sku_id: UUID
    product_id: UUID
    configuration_id: UUID
    configuration_version: int
    options: list[Option]
    combination: Combination


@router.get("/skus/{code}/options", response_model=PublishedSKUOptions)
def published_sku_options(code: Annotated[str, Path(min_length=1, max_length=160)],
                          session: Annotated[Session, Depends(session_dependency)]):
    row = session.execute(text("SELECT s.id AS sku_id,s.product_id,m.configuration_id,"
        "m.configuration_version,m.snapshot FROM catalog_skus s "
        "JOIN catalog_products p ON p.id=s.product_id "
        "JOIN catalog_sku_option_mappings m ON m.sku_id=s.id "
        "WHERE s.code=:code AND s.published=true AND p.published=true"), {"code": code}).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Published SKU options not found")
    return {key: row[key] for key in ["sku_id", "product_id", "configuration_id", "configuration_version"]} | row["snapshot"]


CatalogKey = Annotated[str, Path(min_length=1, max_length=160)]
CatalogFilter = Annotated[str | None, Query(min_length=1, max_length=160)]


def cover(session, kind, entity_id):
    row=session.execute(text("""SELECT image->>'asset_id' AS asset,image->>'revision_id' AS revision,
    image->>'alt_fa' AS alt_fa,image->>'alt_en' AS alt_en
    FROM catalog_profiles p JOIN catalog_profile_revisions r ON r.id=p.published_revision
    CROSS JOIN LATERAL jsonb_array_elements(r.intent->'content'->'gallery') WITH ORDINALITY g(image,n)
    JOIN media_assets a ON a.id=(image->>'asset_id')::uuid AND a.published_revision IS NOT NULL AND a.purpose='public_image'
    WHERE p.kind=:kind AND p.entity_id=:id ORDER BY g.n LIMIT 1"""),dict(kind=kind,id=entity_id)).mappings().first()
    return dict(image_url=f"/api/v1/media/{row['asset']}/versions/{row['revision']}/content",image_alt_fa=row['alt_fa'],image_alt_en=row['alt_en']) if row else {}


class CollectionOutput(BaseModel):
    image_url: str | None = None
    image_alt_fa: str = ''
    image_alt_en: str = ''
    id: UUID
    slug: str
    title_fa: str
    title_en: str


class CollectionPage(BaseModel):
    items: list[CollectionOutput]
    total: int
    page: int
    page_size: int


@router.get("/collections", response_model=CollectionPage)
def list_collections(session: Annotated[Session, Depends(session_dependency)],
                     page: Annotated[int, Query(ge=1)] = 1,
                     page_size: Annotated[int, Query(ge=1, le=100)] = 24):
    items, total = ListCollections(SqlCollectionRepository(session)).execute(page, page_size)
    return CollectionPage(items=[CollectionOutput(id=c.id, slug=c.slug,
        title_fa=c.title_fa, title_en=c.title_en, **cover(session,"collections",c.id)) for c in items],
        total=total, page=page, page_size=page_size)


class CatalogDetail(CollectionOutput):
    description_fa: str
    description_en: str


class ProductOutput(CatalogDetail):
    collection_ids: list[UUID]
    category_ids: list[UUID]


class ProductDetailOutput(ProductOutput):
    presentation: ProductPresentation | None = None


class MoneyOutput(BaseModel):
    amount: Decimal
    currency: str


class SKUOutput(BaseModel):
    id: UUID
    product_id: UUID
    code: str
    price: MoneyOutput | None
    original_price: MoneyOutput | None = None


class CategoryPage(BaseModel):
    items: list[CatalogDetail]
    total: int
    page: int
    page_size: int


class ProductPage(BaseModel):
    items: list[ProductOutput]
    total: int
    page: int
    page_size: int


class SKUPage(BaseModel):
    items: list[SKUOutput]
    total: int
    page: int
    page_size: int


SessionDependency = Annotated[Session, Depends(session_dependency)]
Page = Annotated[int, Query(ge=1)]
PageSize = Annotated[int, Query(ge=1, le=100)]


def output(entity, schema):
    if entity is None:
        raise HTTPException(status_code=404, detail="Catalog item not found")
    return schema.model_validate(entity, from_attributes=True)


@router.get("/collections/{slug}", response_model=CatalogDetail)
def collection_detail(slug: CatalogKey, session: SessionDependency):
    result=output(GetCollection(SqlCollectionRepository(session)).execute(slug), CatalogDetail)
    return result.model_copy(update=cover(session,"collections",result.id))


@router.get("/categories", response_model=CategoryPage)
def categories(session: SessionDependency, page: Page = 1, page_size: PageSize = 24):
    items, total = ListCatalog(SqlCatalogRepository(session)).execute("categories", page, page_size)
    return CategoryPage(items=[output(item, CatalogDetail) for item in items],
                        total=total, page=page, page_size=page_size)


@router.get("/categories/{slug}", response_model=CatalogDetail)
def category_detail(slug: CatalogKey, session: SessionDependency):
    return output(GetCatalog(SqlCatalogRepository(session)).execute("categories", slug), CatalogDetail)


@router.get("/products", response_model=ProductPage)
def products(session: SessionDependency, page: Page = 1, page_size: PageSize = 24,
             collection: CatalogFilter = None, category: CatalogFilter = None):
    items, total = ListCatalog(SqlCatalogRepository(session)).execute(
        "products", page, page_size, collection, category)
    return ProductPage(items=[output(item, ProductOutput) for item in items],
                       total=total, page=page, page_size=page_size)


@router.get("/products/{slug}", response_model=ProductDetailOutput, response_model_exclude_unset=True)
def product_detail(slug: CatalogKey, session: SessionDependency):
    product = output(GetCatalog(SqlCatalogRepository(session)).execute("products", slug), ProductOutput)
    presentation = session.get(ProductPresentationRow, product.id)
    data = product.model_dump()
    if presentation and presentation.published:
        data["presentation"] = ProductPresentation.model_validate(presentation.document)
    data.update(cover(session,"products",product.id))
    return ProductDetailOutput(**data)


@router.get("/products/{slug}/skus", response_model=list[SKUOutput])
def product_skus(slug: CatalogKey, session: SessionDependency):
    items = ListProductSKUs(SqlCatalogRepository(session)).execute(slug)
    if items is None:
        raise HTTPException(status_code=404, detail="Catalog item not found")
    return [sale_output(item, session) for item in items]


@router.get("/skus", response_model=SKUPage)
def skus(session: SessionDependency, page: Page = 1, page_size: PageSize = 24):
    items, total = ListCatalog(SqlCatalogRepository(session)).execute("skus", page, page_size)
    return SKUPage(items=[sale_output(item, session) for item in items],
                   total=total, page=page, page_size=page_size)


@router.get("/skus/{code}", response_model=SKUOutput)
def sku_detail(code: CatalogKey, session: SessionDependency):
    return sale_output(GetCatalog(SqlCatalogRepository(session)).execute("skus", code), session)


def sale_output(item, session):
    from nilart.contexts.marketing.service import effective_sale
    data=output(item,SKUOutput)
    if data.price:
        value=effective_sale(session,'sku',item.id,data.price.amount,data.price.currency)
        if value<data.price.amount:
            data.original_price=data.price
            data.price=MoneyOutput(amount=value,currency=data.price.currency)
    return data
