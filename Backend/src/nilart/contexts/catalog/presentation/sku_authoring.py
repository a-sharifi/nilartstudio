import hmac
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from nilart.bootstrap.settings import settings
from nilart.contexts.catalog.infrastructure.sku_authoring import (
    SKUAuthoringError,
    SqlSKUAuthoringRepository,
)
from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.infrastructure.secrets import token_digest
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.router import failure, session_account
from nilart.shared.database import session_dependency

router = APIRouter(prefix="/api/v1/admin/catalog", tags=["catalog-sku-authoring"])


class SKUCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    code: str = Field(min_length=1, max_length=160, strict=True)

    @model_validator(mode="after")
    def valid_code(self):
        if not self.code.strip() or self.code != self.code.strip() or any(ord(c) < 32 for c in self.code):
            raise ValueError("SKU code must be nonblank, trimmed and free of control characters")
        return self


class SKUUpdate(SKUCreate):
    version: int = Field(ge=0, le=2147483646, strict=True)


class SKUAuthoringOutput(BaseModel):
    sku_id: UUID
    product_id: UUID
    code: str
    published: bool
    version: int


def write_access(request, db, principal):
    if request.headers.get("origin") != settings.public_origin:
        return None, failure(request, "origin_invalid", 403)
    account = session_account(request, db, lock=True)
    if not account:
        return None, failure(request, "unauthenticated", 401)
    current = SqlIdentityRepository(db).principal(account.id, lock=True)
    if account.id != principal.account_id or not current.allows("catalog.manage"):
        return None, failure(request, "permission_denied", 403)
    csrf = request.headers.get("X-CSRF-Token", "")
    if not csrf or len(csrf) > 128 or not hmac.compare_digest(token_digest(csrf), account.csrf_hash):
        return None, failure(request, "csrf_invalid", 403)
    return account, None


@router.get("/skus/{sku_id}", response_model=SKUAuthoringOutput)
def read_sku(sku_id: UUID, request: Request, db: Session = Depends(session_dependency),
             principal: Principal = Depends(require_permission("catalog.manage"))):
    try:
        return SqlSKUAuthoringRepository(db).read(sku_id)
    except SKUAuthoringError as exc:
        return failure(request, str(exc), 404)


@router.post("/products/{product_id}/skus", response_model=SKUAuthoringOutput, status_code=201)
def create_sku(product_id: UUID, body: SKUCreate, request: Request,
               db: Session = Depends(session_dependency),
               principal: Principal = Depends(require_permission("catalog.manage"))):
    account, denied = write_access(request, db, principal)
    if denied is not None:
        return denied
    try:
        result = SqlSKUAuthoringRepository(db).create(product_id, account.id, body.code)
    except SKUAuthoringError as exc:
        db.rollback()
        return failure(request, str(exc), 404 if str(exc) == "product_not_found" else 409)
    db.commit()
    return result


@router.put("/skus/{sku_id}", response_model=SKUAuthoringOutput)
def update_sku(sku_id: UUID, body: SKUUpdate, request: Request,
               db: Session = Depends(session_dependency),
               principal: Principal = Depends(require_permission("catalog.manage"))):
    account, denied = write_access(request, db, principal)
    if denied is not None:
        return denied
    try:
        result = SqlSKUAuthoringRepository(db).update(sku_id, account.id, body.version, body.code)
    except SKUAuthoringError as exc:
        db.rollback()
        return failure(request, str(exc), 404 if str(exc) == "sku_not_found" else 409)
    except IntegrityError as exc:
        db.rollback()
        if getattr(getattr(exc.orig, "diag", None), "constraint_name", None) != "catalog_skus_code_key":
            raise
        return failure(request, "sku_code_conflict", 409)
    db.commit()
    return result
