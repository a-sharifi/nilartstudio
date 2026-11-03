from datetime import datetime
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from nilart.contexts.catalog.application.authoring import AuthorCatalog
from nilart.contexts.catalog.domain.authoring import (
    CatalogAuthoringError,
    EntryContent,
    EntryKind,
    validate_reason,
)
from nilart.contexts.catalog.infrastructure.authoring import SqlCatalogAuthoringRepository
from nilart.contexts.catalog.presentation.prices import ExplicitPrice
from nilart.contexts.catalog.presentation.sku_authoring import write_access
from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.router import failure
from nilart.shared.database import session_dependency

router = APIRouter(prefix="/api/v1/admin/catalog", tags=["catalog-management"])


class ContentInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    slug: str = Field(min_length=1, max_length=160, strict=True)
    title_fa: str = Field(min_length=1, max_length=300, strict=True)
    title_en: str = Field(min_length=1, max_length=300, strict=True)
    description_fa: str = Field(default="", max_length=10000, strict=True)
    description_en: str = Field(default="", max_length=10000, strict=True)
    collection_ids: list[UUID] = Field(default_factory=list, max_length=100)
    category_ids: list[UUID] = Field(default_factory=list, max_length=100)
    reason: str = Field(min_length=1, max_length=1000, strict=True)

    def content(self):
        return EntryContent(self.slug, self.title_fa, self.title_en, self.description_fa,
                            self.description_en, tuple(self.collection_ids), tuple(self.category_ids))

    @model_validator(mode="after")
    def valid(self):
        self.content()
        validate_reason(self.reason)
        return self


class EntryCreate(ContentInput):
    id: UUID


class EntryUpdate(ContentInput):
    version: int = Field(ge=0, le=2147483646, strict=True)


class PublicationInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: int = Field(ge=0, le=2147483646, strict=True)
    published: bool = Field(strict=True)
    reason: str = Field(min_length=1, max_length=1000, strict=True)

    @model_validator(mode="after")
    def valid(self):
        validate_reason(self.reason)
        return self


class EntryOutput(BaseModel):
    id: UUID
    kind: EntryKind
    slug: str
    title_fa: str
    title_en: str
    description_fa: str
    description_en: str
    collection_ids: list[UUID]
    category_ids: list[UUID]
    published: bool
    version: int


class EntryPage(BaseModel):
    items: list[EntryOutput]
    total: int
    page: int
    page_size: int


class AuditOutput(BaseModel):
    id: UUID
    kind: EntryKind
    entry_id: UUID
    actor_id: UUID
    action: Literal["created", "edited", "published", "unpublished"]
    reason: str
    previous_version: int
    version: int
    created_at: datetime
    before: EntryOutput | None
    after: EntryOutput


class AuditPage(BaseModel):
    items: list[AuditOutput]
    next_before_version: int | None


class ManagedSKU(BaseModel):
    id: UUID
    product_id: UUID
    code: str
    published: bool
    version: int
    price: ExplicitPrice | None


def authoring_failure(request, db, error):
    db.rollback()
    code = str(error)
    return failure(request, code, 404 if code == "catalog_entry_not_found" else
                   422 if code in {"catalog_membership_not_found", "invalid_membership"} else 409)


def conflict(request, db, error):
    db.rollback()
    constraint = getattr(getattr(error.orig, "diag", None), "constraint_name", None)
    if constraint not in {"catalog_collections_slug_key", "catalog_categories_slug_key",
                          "catalog_products_slug_key", "catalog_collections_pkey",
                          "catalog_categories_pkey", "catalog_products_pkey"}:
        raise error
    return failure(request, "catalog_identity_conflict", 409)


@router.get("/entries/{kind}", response_model=EntryPage)
def list_entries(kind: EntryKind, db: Session = Depends(session_dependency),
                 principal: Principal = Depends(require_permission("catalog.manage")),
                 page: int = Query(default=1, ge=1), page_size: int = Query(default=24, ge=1, le=100),
                 status: Literal["all", "draft", "published"] = "all",
                 q: str = Query(default="", max_length=300)):
    return SqlCatalogAuthoringRepository(db).page(kind, page, page_size, status, q)


@router.get("/entries/{kind}/{entry_id}", response_model=EntryOutput)
def read_entry(kind: EntryKind, entry_id: UUID, request: Request,
               db: Session = Depends(session_dependency),
               principal: Principal = Depends(require_permission("catalog.manage"))):
    try:
        return SqlCatalogAuthoringRepository(db).read(kind, entry_id)
    except CatalogAuthoringError as exc:
        return authoring_failure(request, db, exc)


@router.post("/entries/{kind}", response_model=EntryOutput, status_code=201)
def create_entry(kind: EntryKind, body: EntryCreate, request: Request,
                 db: Session = Depends(session_dependency),
                 principal: Principal = Depends(require_permission("catalog.manage"))):
    account, denied = write_access(request, db, principal)
    if denied is not None:
        return denied
    try:
        result = AuthorCatalog(SqlCatalogAuthoringRepository(db)).create(
            kind, body.id, account.id, body.content(), body.reason)
    except CatalogAuthoringError as exc:
        return authoring_failure(request, db, exc)
    except IntegrityError as exc:
        return conflict(request, db, exc)
    db.commit()
    return result


@router.put("/entries/{kind}/{entry_id}", response_model=EntryOutput)
def update_entry(kind: EntryKind, entry_id: UUID, body: EntryUpdate, request: Request,
                 db: Session = Depends(session_dependency),
                 principal: Principal = Depends(require_permission("catalog.manage"))):
    account, denied = write_access(request, db, principal)
    if denied is not None:
        return denied
    try:
        result = AuthorCatalog(SqlCatalogAuthoringRepository(db)).update(
            kind, entry_id, account.id, body.version, body.content(), body.reason)
    except CatalogAuthoringError as exc:
        return authoring_failure(request, db, exc)
    except IntegrityError as exc:
        return conflict(request, db, exc)
    db.commit()
    return result


@router.post("/entries/{kind}/{entry_id}/publication", response_model=EntryOutput)
def publish_entry(kind: EntryKind, entry_id: UUID, body: PublicationInput, request: Request,
                  db: Session = Depends(session_dependency),
                  principal: Principal = Depends(require_permission("catalog.manage"))):
    account, denied = write_access(request, db, principal)
    if denied is not None:
        return denied
    try:
        result = AuthorCatalog(SqlCatalogAuthoringRepository(db)).publish(
            kind, entry_id, account.id, body.version, body.published, body.reason)
    except CatalogAuthoringError as exc:
        return authoring_failure(request, db, exc)
    db.commit()
    return result


@router.get("/entries/{kind}/{entry_id}/audits", response_model=AuditPage)
def entry_audits(kind: EntryKind, entry_id: UUID, request: Request,
                 db: Session = Depends(session_dependency),
                 principal: Principal = Depends(require_permission("catalog.manage")),
                 before_version: int | None = Query(default=None, ge=1, le=2147483647),
                 limit: int = Query(default=20, ge=1, le=100)):
    try:
        return SqlCatalogAuthoringRepository(db).audits(kind, entry_id, before_version, limit)
    except CatalogAuthoringError as exc:
        return authoring_failure(request, db, exc)


@router.get("/entries/products/{product_id}/skus", response_model=list[ManagedSKU])
def managed_skus(product_id: UUID, request: Request, db: Session = Depends(session_dependency),
                 principal: Principal = Depends(require_permission("catalog.manage"))):
    try:
        return SqlCatalogAuthoringRepository(db).skus(product_id)
    except CatalogAuthoringError as exc:
        return authoring_failure(request, db, exc)
