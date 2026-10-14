from datetime import datetime
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from nilart.bootstrap.settings import settings
from nilart.contexts.identity.application.otp import OtpService, SmsSender
from nilart.contexts.identity.application.service import SessionGrant
from nilart.contexts.identity.domain.rules import (
    IdentityError,
    OtpPurpose,
    normalize_digits,
    normalize_phone,
)
from nilart.contexts.identity.infrastructure.otp import (
    DisabledSmsSender,
    RedisSandboxSmsSender,
    SecureOtpSecrets,
    SmsUnavailable,
    SqlOtpRepository,
)
from nilart.contexts.identity.infrastructure.rate_limit import otp_attempt_allowed
from nilart.contexts.identity.presentation.router import SessionOutput, failure, set_session_cookie
from nilart.shared.database import session_dependency

router = APIRouter(prefix="/api/v1/auth", tags=["identity"])


class OtpRequest(BaseModel):
    phone: str = Field(max_length=32)
    purpose: Literal[OtpPurpose.REGISTER, OtpPurpose.LOGIN, OtpPurpose.RECOVERY]


class OtpVerification(BaseModel):
    challenge_id: UUID
    purpose: Literal[OtpPurpose.REGISTER, OtpPurpose.LOGIN, OtpPurpose.RECOVERY]
    code: str = Field(pattern=r"^[0-9]{6}$")

    @field_validator("code", mode="before")
    @classmethod
    def localized_digits(cls, value):
        return normalize_digits(value) if isinstance(value, str) else value


class CompletePassword(BaseModel):
    grant: str = Field(min_length=40, max_length=128)
    password: str = Field(min_length=12, max_length=128)


class ChallengeOutput(BaseModel):
    challenge_id: UUID
    purpose: Literal[OtpPurpose.REGISTER, OtpPurpose.LOGIN, OtpPurpose.RECOVERY]
    expires_at: datetime
    resend_after_seconds: Literal[60]
    delivery_status: Literal["accepted"]
    sandbox: bool = False
    development_code: str | None = None


class GrantOutput(BaseModel):
    grant: str
    purpose: Literal[OtpPurpose.REGISTER, OtpPurpose.LOGIN, OtpPurpose.RECOVERY]
    expires_in_seconds: Literal[600]


class DevelopmentSmsPreview:
    """Capture only this request's successfully delivered fake SMS; never log it."""
    def __init__(self, sender: SmsSender):
        self.sender = sender
        self.code: str | None = None

    def send_code(self, phone: str, code: str, purpose: OtpPurpose) -> None:
        self.sender.send_code(phone, code, purpose)
        self.code = code


def sms_dependency() -> SmsSender:
    return RedisSandboxSmsSender(settings.redis_url, settings.environment) if settings.sms_mode == "sandbox" else DisabledSmsSender()


def service(db: Session, sms: SmsSender) -> OtpService:
    key = settings.otp_hmac_key
    if key is None or len(key.get_secret_value().encode()) < 32:
        raise SmsUnavailable("OTP secret not configured")
    return OtpService(SqlOtpRepository(db), SecureOtpSecrets(key.get_secret_value().encode()), sms)


def gate(request: Request, action: str, phone: str = ""):
    if request.headers.get("origin") != settings.public_origin:
        return failure(request, "origin_invalid", 403)
    try:
        if not otp_attempt_allowed(settings.redis_url, action, phone,
                                   request.client.host if request.client else "unknown"):
            return failure(request, "rate_limited", 429)
    except Exception:
        return failure(request, "authentication_unavailable", 503)
    return None


@router.post("/otp/request", status_code=202, response_model=ChallengeOutput, response_model_exclude_none=True)
def request_otp(body: OtpRequest, request: Request, response: Response,
                db: Session = Depends(session_dependency), sms=Depends(sms_dependency)):
    try:
        phone = normalize_phone(body.phone)
    except IdentityError:
        return failure(request, "invalid_phone", 422)
    denied = gate(request, "request", phone)
    if denied is not None:
        return denied
    try:
        preview = DevelopmentSmsPreview(sms) if settings.dev_mode and settings.environment == "development" and settings.sms_mode == "sandbox" else None
        challenge = service(db, preview or sms).request(phone, body.purpose)
        db.commit()
    except IdentityError as exc:
        db.rollback()
        return failure(request, str(exc), 429)
    except SmsUnavailable:
        db.rollback()
        return failure(request, "sms_unavailable", 503)
    except Exception:
        db.rollback()
        return failure(request, "otp_request_unconfirmed", 503)
    response.headers["Cache-Control"] = "no-store"
    return {"challenge_id": challenge.id, "purpose": body.purpose,
            "expires_at": challenge.expires.isoformat(), "resend_after_seconds": 60,
            "delivery_status": "accepted", "sandbox": settings.sms_mode == "sandbox",
            "development_code": preview.code if preview else None}


@router.post("/otp/verify", response_model=SessionOutput | GrantOutput)
def verify_otp(body: OtpVerification, request: Request, response: Response,
               db: Session = Depends(session_dependency), sms=Depends(sms_dependency)):
    denied = gate(request, "verify")
    if denied is not None:
        return denied
    try:
        result = service(db, sms).verify(str(body.challenge_id), body.purpose, body.code)
        db.commit()
    except IdentityError:
        db.commit()  # Persist wrong-code attempts and successful-code consumption.
        return failure(request, "invalid_or_expired_challenge", 400)
    except SmsUnavailable:
        return failure(request, "sms_unavailable", 503)
    response.headers["Cache-Control"] = "no-store"
    if isinstance(result, SessionGrant):
        return set_session_cookie(response, result)
    return {"grant": result, "purpose": body.purpose, "expires_in_seconds": 600}


def complete(body: CompletePassword, purpose: OtpPurpose, request: Request,
             response: Response, db: Session, sms: SmsSender):
    denied = gate(request, "complete")
    if denied is not None:
        return denied
    try:
        grant = service(db, sms).complete(body.grant, purpose, body.password)
        db.commit()
    except IdentityError as exc:
        db.commit()  # Used/invalid grants must not become replayable.
        return failure(request, str(exc), 400)
    except SmsUnavailable:
        return failure(request, "sms_unavailable", 503)
    return set_session_cookie(response, grant)


@router.post("/register/complete", response_model=SessionOutput)
def register_complete(body: CompletePassword, request: Request, response: Response,
                      db: Session = Depends(session_dependency), sms=Depends(sms_dependency)):
    return complete(body, OtpPurpose.REGISTER, request, response, db, sms)


@router.post("/recovery/complete", response_model=SessionOutput)
def recovery_complete(body: CompletePassword, request: Request, response: Response,
                      db: Session = Depends(session_dependency), sms=Depends(sms_dependency)):
    return complete(body, OtpPurpose.RECOVERY, request, response, db, sms)
