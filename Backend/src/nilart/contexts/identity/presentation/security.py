
from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.bootstrap.settings import settings
from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.domain.rules import IdentityError
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.identity.infrastructure.rate_limit import password_attempt_allowed
from nilart.contexts.identity.infrastructure.secrets import (
    hash_password,
    verify_password,
)
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.contexts.identity.presentation.router import failure
from nilart.shared.database import session_dependency

router = APIRouter(prefix="/api/v1/account/security", tags=["account-security"])


class PasswordUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class PasswordResult(BaseModel):
    reauthenticate: bool


class SecurityMethods(BaseModel):
    password_enabled: bool
    otp_enabled: bool
    can_change: bool
    sandbox_sms: bool
    order_sms_enabled: bool = False


@router.get("/methods", response_model=SecurityMethods)
def methods(principal: Principal = Depends(require_permission("account.read_self"))):
    from nilart.contexts.messaging.service import available
    return {"password_enabled": True, "otp_enabled": settings.sms_mode != "disabled" and settings.otp_hmac_key is not None,
            "can_change": principal.allows("account.write_self"), "sandbox_sms": settings.sms_mode == "sandbox", "order_sms_enabled": available()}


@router.post("/password", response_model=PasswordResult)
def password(body: PasswordUpdate, request: Request, response: Response, db: Session = Depends(session_dependency),
             principal: Principal = Depends(require_permission("account.write_self"))):
    actor, denied = write_access(request, db, principal, "account.write_self")
    if denied is not None:
        return denied
    try:
        allowed = password_attempt_allowed(settings.redis_url, actor.phone, request.client.host if request.client else "unknown")
    except Exception:
        return failure(request, "authentication_unavailable", 503)
    if not allowed:
        return failure(request, "rate_limited", 429)
    stored = db.execute(text("SELECT password_hash FROM identity_accounts WHERE id=:id"), {"id": actor.id}).scalar_one()
    if not verify_password(body.current_password, stored):
        return failure(request, "incorrect_current_password", 400)
    try:
        encoded = hash_password(body.new_password)
    except IdentityError as exc:
        return failure(request, str(exc), 422)
    db.execute(text("UPDATE identity_accounts SET password_hash=:hash WHERE id=:id"), {"hash": encoded, "id": actor.id})
    db.execute(text("DELETE FROM identity_sessions WHERE account_id=:id"), {"id": actor.id})
    db.execute(text("UPDATE identity_phone_changes SET consumed=true WHERE account_id=:id"), {"id": actor.id})
    db.execute(text("UPDATE identity_password_grants SET consumed=true WHERE phone=:phone"), {"phone": actor.phone})
    db.execute(text("UPDATE identity_otp_challenges SET consumed=true WHERE phone=:phone"), {"phone": actor.phone})
    SqlAccountManagement(db).audit(actor.id, actor.id, "password.changed", {"all_sessions_revoked": True}, "Account owner changed password")
    db.commit()
    response.delete_cookie("nilart_session", path="/")
    return {"reauthenticate": True}
