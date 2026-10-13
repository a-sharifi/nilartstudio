import hmac
from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from nilart.bootstrap.settings import settings
from nilart.contexts.catalog.infrastructure.prices import PriceError, SqlSKUPriceRepository
from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.infrastructure.secrets import token_digest
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.router import failure, session_account
from nilart.shared.database import session_dependency

router = APIRouter(prefix="/api/v1/admin/catalog", tags=["catalog-prices"])


class ExplicitPrice(BaseModel):
    model_config = ConfigDict(extra="forbid")
    amount: str = Field(pattern=r"^(?:0|[1-9][0-9]{0,17})(?:\.[0-9]{1,6})?$", strict=True)
    currency: Literal["IRT", "IRR"]


class PriceUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: int = Field(ge=0, le=2147483646, strict=True)
    price: ExplicitPrice | None


class PriceOutput(BaseModel):
    sku_id: UUID
    product_id: UUID
    code: str
    version: int
    price: ExplicitPrice | None


@router.get("/skus/{sku_id}/price", response_model=PriceOutput)
def read_price(sku_id: UUID, request: Request, db: Session = Depends(session_dependency),
               principal: Principal = Depends(require_permission("catalog.manage"))):
    try:
        return SqlSKUPriceRepository(db).read(sku_id)
    except PriceError as exc:
        return failure(request, str(exc), 404)


@router.put("/skus/{sku_id}/price", response_model=PriceOutput)
def update_price(sku_id: UUID, body: PriceUpdate, request: Request,
                 db: Session = Depends(session_dependency),
                 principal: Principal = Depends(require_permission("catalog.manage"))):
    if request.headers.get("origin") != settings.public_origin:
        return failure(request, "origin_invalid", 403)
    account = session_account(request, db, lock=True)
    if not account:
        return failure(request, "unauthenticated", 401)
    current = SqlIdentityRepository(db).principal(account.id, lock=True)
    if account.id != principal.account_id or not current.allows("catalog.manage"):
        return failure(request, "permission_denied", 403)
    csrf = request.headers.get("X-CSRF-Token", "")
    if not csrf or len(csrf) > 128 or not hmac.compare_digest(token_digest(csrf), account.csrf_hash):
        return failure(request, "csrf_invalid", 403)
    price = None if body.price is None else {"amount": Decimal(body.price.amount),
                                           "currency": body.price.currency}
    try:
        result = SqlSKUPriceRepository(db).save(sku_id, account.id, body.version, price)
    except PriceError as exc:
        db.rollback()
        return failure(request, str(exc), 409 if str(exc) == "sku_price_version_conflict" else 404)
    db.commit()
    return result


class PriceSnapshot(BaseModel):
    price: ExplicitPrice | None


class PriceAuditOutput(BaseModel):
    id: UUID
    sku_id: UUID
    product_id: UUID
    actor_id: UUID
    previous_version: int
    version: int
    created_at: datetime
    before: PriceSnapshot
    after: PriceSnapshot


class PriceAuditPage(BaseModel):
    items: list[PriceAuditOutput]
    next_before_version: int | None


@router.get("/skus/{sku_id}/price/audits", response_model=PriceAuditPage)
def read_price_audits(sku_id: UUID, request: Request,
                      before_version: int | None = Query(default=None, ge=1, le=2147483647),
                      limit: int = Query(default=20, ge=1, le=100),
                      db: Session = Depends(session_dependency),
                      principal: Principal = Depends(require_permission("catalog.manage"))):
    try:
        return SqlSKUPriceRepository(db).audits(sku_id, before_version, limit)
    except PriceError as exc:
        return failure(request, str(exc), 404)
