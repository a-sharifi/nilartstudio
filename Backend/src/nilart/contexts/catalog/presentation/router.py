from decimal import Decimal
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from nilart.contexts.catalog.application.queries import (
    GetCatalog,
    GetCollection,
    ListCatalog,
    ListCollections,
    ListProductSKUs,
)
from nilart.contexts.catalog.infrastructure.repository import (
    SqlCatalogRepository,
    SqlCollectionRepository,
)
from nilart.shared.database import session_dependency

router = APIRouter(prefix="/api/v1/catalog", tags=["catalog"])


CatalogKey = Annotated[str, Path(min_length=1, max_length=160)]
CatalogFilter = Annotated[str | None, Query(min_length=1, max_length=160)]


class CollectionOutput(BaseModel):
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
        title_fa=c.title_fa, title_en=c.title_en) for c in items],
        total=total, page=page, page_size=page_size)


class CatalogDetail(CollectionOutput):
    description_fa: str
    description_en: str


class ProductOutput(CatalogDetail):
    collection_ids: list[UUID]
    category_ids: list[UUID]


class MoneyOutput(BaseModel):
    amount: Decimal
    currency: str


class SKUOutput(BaseModel):
    id: UUID
    product_id: UUID
    code: str
    price: MoneyOutput | None


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
    return output(GetCollection(SqlCollectionRepository(session)).execute(slug), CatalogDetail)


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


@router.get("/products/{slug}", response_model=ProductOutput)
def product_detail(slug: CatalogKey, session: SessionDependency):
    return output(GetCatalog(SqlCatalogRepository(session)).execute("products", slug), ProductOutput)


@router.get("/products/{slug}/skus", response_model=list[SKUOutput])
def product_skus(slug: CatalogKey, session: SessionDependency):
    items = ListProductSKUs(SqlCatalogRepository(session)).execute(slug)
    if items is None:
        raise HTTPException(status_code=404, detail="Catalog item not found")
    return [output(item, SKUOutput) for item in items]


@router.get("/skus", response_model=SKUPage)
def skus(session: SessionDependency, page: Page = 1, page_size: PageSize = 24):
    items, total = ListCatalog(SqlCatalogRepository(session)).execute("skus", page, page_size)
    return SKUPage(items=[output(item, SKUOutput) for item in items],
                   total=total, page=page, page_size=page_size)


@router.get("/skus/{code}", response_model=SKUOutput)
def sku_detail(code: CatalogKey, session: SessionDependency):
    return output(GetCatalog(SqlCatalogRepository(session)).execute("skus", code), SKUOutput)
