import hmac

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from nilart.bootstrap.settings import settings
from nilart.contexts.identity.application.profile import UpdateProfile
from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.domain.rules import IdentityError
from nilart.contexts.identity.infrastructure.profile import SqlProfileRepository
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.infrastructure.secrets import token_digest
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.router import failure, session_account
from nilart.shared.database import session_dependency

router = APIRouter(prefix="/api/v1/account", tags=["account"])


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    full_name: str = Field(max_length=120)
    version: int = Field(ge=0, strict=True)


class ProfileOutput(BaseModel):
    account_id: str
    full_name: str
    phone: str
    version: int


@router.get("/profile", response_model=ProfileOutput)
def get_profile(response: Response, db: Session = Depends(session_dependency),
                principal: Principal = Depends(require_permission("account.read_self"))):
    response.headers["Cache-Control"] = "no-store"
    return SqlProfileRepository(db).read(principal.account_id)


@router.put("/profile", response_model=ProfileOutput)
def update_profile(body: ProfileUpdate, request: Request, response: Response,
                   db: Session = Depends(session_dependency),
                   principal: Principal = Depends(require_permission("account.write_self"))):
    if request.headers.get("origin") != settings.public_origin:
        return failure(request, "origin_invalid", 403)
    expected_owner = request.headers.get("X-Profile-Owner")
    if expected_owner is not None and expected_owner != principal.account_id:
        return failure(request, "permission_denied", 403)
    account = session_account(request, db, lock=True)
    if not account:
        return failure(request, "unauthenticated", 401)
    current_principal = SqlIdentityRepository(db).principal(account.id, lock=True)
    if not current_principal.allows("account.write_self"):
        return failure(request, "permission_denied", 403)
    csrf = request.headers.get("X-CSRF-Token", "")
    if not csrf or len(csrf) > 128 or not hmac.compare_digest(token_digest(csrf), account.csrf_hash):
        return failure(request, "csrf_invalid", 403)
    try:
        result = UpdateProfile(SqlProfileRepository(db)).execute(principal.account_id, body.full_name, body.version)
    except IdentityError as exc:
        db.rollback()
        return failure(request, str(exc), 409 if str(exc) == "profile_version_conflict" else 422)
    db.commit()
    response.headers["Cache-Control"] = "no-store"
    return result
