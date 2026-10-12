import hmac
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from pydantic import Field
from sqlalchemy.orm import Session

from nilart.bootstrap.settings import settings
from nilart.contexts.catalog.application.options import UpdateOptionDraft
from nilart.contexts.catalog.domain.options import OptionDocument
from nilart.contexts.catalog.infrastructure.options import DraftError, SqlOptionDraftRepository
from nilart.contexts.identity.domain.permissions import Principal, Role
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.infrastructure.secrets import token_digest
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.router import failure, session_account
from nilart.shared.database import session_dependency

router = APIRouter(prefix="/api/v1/admin/catalog", tags=["catalog-options"])


class DraftUpdate(OptionDocument):
    version: int = Field(ge=0, le=2147483646, strict=True)


class DraftOutput(OptionDocument):
    configuration_id: UUID | None
    product_id: UUID
    version: int


@router.get("/products/{product_id}/options", response_model=DraftOutput)
def read_options(product_id: UUID, request: Request, db: Session = Depends(session_dependency),
                 principal: Principal = Depends(require_permission("catalog.manage"))):
    try:
        return SqlOptionDraftRepository(db).read(product_id)
    except DraftError as exc:
        return failure(request, str(exc), 404)


@router.put("/products/{product_id}/options", response_model=DraftOutput)
def update_options(product_id: UUID, body: DraftUpdate, request: Request,
                   db: Session = Depends(session_dependency),
                   principal: Principal = Depends(require_permission("catalog.manage"))):
    if request.headers.get("origin") != settings.public_origin:
        return failure(request, "origin_invalid", 403)
    account = session_account(request, db, lock=True)
    if not account:
        return failure(request, "unauthenticated", 401)
    current = Principal(account.id, frozenset(Role(role) for role in SqlIdentityRepository(db).roles(account.id, lock=True)))
    if account.id != principal.account_id or not current.allows("catalog.manage"):
        return failure(request, "permission_denied", 403)
    csrf = request.headers.get("X-CSRF-Token", "")
    if not csrf or len(csrf) > 128 or not hmac.compare_digest(token_digest(csrf), account.csrf_hash):
        return failure(request, "csrf_invalid", 403)
    document = OptionDocument(options=body.options, combinations=body.combinations)
    try:
        result = UpdateOptionDraft(SqlOptionDraftRepository(db)).execute(product_id, account.id, body.version, document)
    except DraftError as exc:
        db.rollback()
        return failure(request, str(exc), 409 if str(exc) == "option_version_conflict" else 404)
    db.commit()
    return result
