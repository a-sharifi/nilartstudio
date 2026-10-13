import hmac
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from nilart.bootstrap.settings import settings
from nilart.contexts.identity.application.otp import SmsSender
from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.domain.rules import (
    IdentityError,
    OtpPurpose,
    normalize_digits,
    normalize_phone,
)
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.identity.infrastructure.otp import SmsUnavailable
from nilart.contexts.identity.infrastructure.rate_limit import (
    otp_attempt_allowed,
    password_attempt_allowed,
)
from nilart.contexts.identity.infrastructure.secrets import new_otp, otp_digest, verify_password
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.contexts.identity.presentation.otp_router import sms_dependency
from nilart.contexts.identity.presentation.router import failure
from nilart.shared.database import session_dependency

router = APIRouter(prefix="/api/v1/account/security/phone", tags=["account-security"])


class PhoneRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    phone: str = Field(max_length=32)
    current_password: str = Field(min_length=1, max_length=128)


class PhoneVerification(BaseModel):
    model_config = ConfigDict(extra="forbid")
    challenge_id: UUID
    code: str = Field(pattern=r"^[0-9]{6}$")

    @field_validator("code", mode="before")
    @classmethod
    def digits(cls, value):
        return normalize_digits(value) if isinstance(value, str) else value


class PhoneChallenge(BaseModel):
    challenge_id: UUID
    expires_at: datetime
    sandbox: bool


class PhoneResult(BaseModel):
    reauthenticate: bool


def code_hash(id, code):
    key = settings.otp_hmac_key
    if not key or len(key.get_secret_value().encode()) < 32:
        raise SmsUnavailable("OTP secret unavailable")
    return otp_digest(key=key.get_secret_value().encode(), challenge_id=str(id), purpose="phone_change", code=code)


@router.post("/request", response_model=PhoneChallenge, status_code=202)
def request_phone(body: PhoneRequest, request: Request, db: Session = Depends(session_dependency),
                  principal: Principal = Depends(require_permission("account.write_self")), sms: SmsSender = Depends(sms_dependency)):
    actor, denied = write_access(request, db, principal, "account.write_self")
    if denied is not None:
        return denied
    try:
        phone = normalize_phone(body.phone)
    except IdentityError:
        return failure(request, "invalid_phone", 422)
    now = datetime.now(UTC)
    try:
        address = request.client.host if request.client else "unknown"
        allowed = otp_attempt_allowed(settings.redis_url, "request", actor.phone, address) and password_attempt_allowed(settings.redis_url, actor.phone, address)
    except Exception:
        return failure(request, "authentication_unavailable", 503)
    if not allowed:
        return failure(request, "rate_limited", 429)
    stored = db.execute(text("SELECT password_hash FROM identity_accounts WHERE id=:id"), {"id": actor.id}).scalar_one()
    if not verify_password(body.current_password, stored):
        return failure(request, "incorrect_current_password", 400)
    if phone == actor.phone or db.execute(text("SELECT 1 FROM identity_accounts WHERE phone=:phone"), {"phone": phone}).first():
        return failure(request, "phone_unavailable", 409)
    latest = db.execute(text("SELECT max(created_at) FROM identity_phone_changes WHERE account_id=:id"), {"id": actor.id}).scalar()
    if latest and now < latest + timedelta(seconds=60):
        return failure(request, "rate_limited", 429)
    id, code = uuid4(), new_otp()
    try:
        digest = code_hash(id, code)
        db.execute(text("UPDATE identity_phone_changes SET consumed=true WHERE account_id=:id"), {"id": actor.id})
        db.execute(text("INSERT INTO identity_phone_changes(id,account_id,phone,code_hash,created_at,expires_at) VALUES(:id,:account,:phone,:hash,:now,:expires)"), {"id": id, "account": actor.id, "phone": phone, "hash": digest, "now": now, "expires": now + timedelta(minutes=3)})
        sms.send_code(phone, code, OtpPurpose.PHONE_CHANGE)
    except SmsUnavailable:
        db.rollback()
        return failure(request, "authentication_unavailable", 503)
    db.commit()
    return {"challenge_id": id, "expires_at": now + timedelta(minutes=3), "sandbox": settings.sms_mode == "sandbox"}


@router.post("/verify", response_model=PhoneResult)
def verify_phone(body: PhoneVerification, request: Request, response: Response, db: Session = Depends(session_dependency),
                 principal: Principal = Depends(require_permission("account.write_self"))):
    actor, denied = write_access(request, db, principal, "account.write_self")
    if denied is not None:
        return denied
    try:
        if not otp_attempt_allowed(settings.redis_url, "verify", actor.phone, request.client.host if request.client else "unknown"):
            return failure(request, "rate_limited", 429)
        digest = code_hash(body.challenge_id, body.code)
    except Exception:
        return failure(request, "authentication_unavailable", 503)
    row = db.execute(text("SELECT * FROM identity_phone_changes WHERE id=:id AND account_id=:account FOR UPDATE"), {"id": body.challenge_id, "account": actor.id}).mappings().first()
    if not row or row["consumed"] or row["attempts"]>=5 or row["expires_at"]<=datetime.now(UTC):
        return failure(request, "invalid_or_expired_challenge", 400)
    valid = hmac.compare_digest(row["code_hash"], digest)
    db.execute(text("UPDATE identity_phone_changes SET attempts=attempts+1,consumed=:valid WHERE id=:id"), {"id": body.challenge_id, "valid": valid})
    if not valid:
        db.commit()
        return failure(request, "invalid_or_expired_challenge", 400)
    try:
        db.execute(text("UPDATE identity_accounts SET phone=:phone,access_version=access_version+1 WHERE id=:id"), {"phone": row["phone"], "id": actor.id})
        db.execute(text("DELETE FROM identity_sessions WHERE account_id=:id"), {"id": actor.id})
        db.execute(text("UPDATE identity_otp_challenges SET consumed=true WHERE phone IN (:old,:new)"), {"old": actor.phone, "new": row["phone"]})
        db.execute(text("UPDATE identity_password_grants SET consumed=true WHERE phone IN (:old,:new)"), {"old": actor.phone, "new": row["phone"]})
        db.execute(text("UPDATE identity_phone_changes SET consumed=true WHERE account_id=:id"), {"id": actor.id})
        SqlAccountManagement(db).audit(actor.id, actor.id, "phone.changed", {"before_phone": actor.phone, "after_phone": row["phone"], "all_sessions_revoked": True}, "Account owner verified a new phone")
        db.commit()
    except IntegrityError:
        db.rollback()
        return failure(request, "phone_unavailable", 409)
    response.delete_cookie("nilart_session", path="/")
    return {"reauthenticate": True}
