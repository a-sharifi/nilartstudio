from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from nilart.contexts.catalog.application.artworks import ReadArtworks
from nilart.contexts.catalog.infrastructure.artworks import SqlArtworkRepository
from nilart.shared.database import session_dependency

router = APIRouter(prefix="/api/v1/catalog/artworks", tags=["artworks"])


class ArtworkOutput(BaseModel):
    id: UUID
    slug: str
    title_fa: str
    title_en: str
    description_fa: str
    description_en: str


class ArtworkPage(BaseModel):
    items: list[ArtworkOutput]
    total: int
    page: int
    page_size: int


@router.get("", response_model=ArtworkPage)
def artworks(page: int = Query(default=1, ge=1, le=2147483647),
             page_size: int = Query(default=24, ge=1, le=100),
             db: Session = Depends(session_dependency)):
    return ReadArtworks(SqlArtworkRepository(db)).page(page, page_size)


@router.get("/{slug}", response_model=ArtworkOutput)
def artwork(slug: str = Path(min_length=1, max_length=160), db: Session = Depends(session_dependency)):
    result = ReadArtworks(SqlArtworkRepository(db)).detail(slug)
    if result is None:
        raise HTTPException(status_code=404, detail="Artwork not found")
    return result
