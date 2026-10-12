from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from nilart.contexts.catalog.application.artworks import ReadPublicDescriptions
from nilart.contexts.catalog.infrastructure.bundles import SqlBundleRepository
from nilart.shared.database import session_dependency

router = APIRouter(prefix="/api/v1/catalog/bundles", tags=["bundles"])


class ComponentOutput(BaseModel):
    sku_id: UUID
    quantity: int
    code: str
    title_fa: str
    title_en: str


class BundleOutput(BaseModel):
    id: UUID
    slug: str
    title_fa: str
    title_en: str
    description_fa: str
    description_en: str
    components: list[ComponentOutput]


class BundlePage(BaseModel):
    items: list[BundleOutput]
    total: int
    page: int
    page_size: int


@router.get("", response_model=BundlePage)
def bundles(page: int = Query(default=1, ge=1, le=2147483647), page_size: int = Query(default=24, ge=1, le=100),
            db: Session = Depends(session_dependency)):
    return ReadPublicDescriptions(SqlBundleRepository(db)).page(page, page_size)


@router.get("/{slug}", response_model=BundleOutput)
def bundle(slug: str = Path(min_length=1, max_length=160), db: Session = Depends(session_dependency)):
    result = ReadPublicDescriptions(SqlBundleRepository(db)).detail(slug)
    if result is None:
        raise HTTPException(status_code=404, detail="Bundle not found")
    return result
