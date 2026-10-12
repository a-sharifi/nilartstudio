from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from nilart.bootstrap.settings import settings
from nilart.contexts.identity.application.service import PasswordSignIn, SessionGrant
from nilart.contexts.identity.domain.rules import IdentityError, normalize_phone
from nilart.contexts.identity.infrastructure.rate_limit import (
    csrf_attempt_allowed,
    password_attempt_allowed,
)
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.infrastructure.secrets import (
    hash_password,
    new_session_token,
    token_digest,
    verify_password,
)
from nilart.shared.database import session_dependency

router = APIRouter(prefix="/api/v1/auth", tags=["identity"])
# Equalize unknown-account password verification; never use this as an account credential.
_dummy_hash = hash_password(new_session_token())
_cookie = "nilart_session"


class PasswordLogin(BaseModel):
    phone: str = Field(max_length=32)
    password: str = Field(min_length=1, max_length=128)


class SessionOutput(BaseModel):
    account_id: UUID
    csrf_token: str
    expires_at: datetime


class CurrentSessionOutput(BaseModel):
    account_id: UUID
    phone: str


class CsrfOutput(BaseModel):
    csrf_token: str


def failure(request: Request, code: str, status: int) -> JSONResponse:
    return JSONResponse(status_code=status, content={"code": code,
                        "request_id": request.state.request_id},
                        headers={"Cache-Control": "no-store"})


def rate_allowed(phone: str, address: str) -> bool:
    return password_attempt_allowed(settings.redis_url, phone, address)


def set_session_cookie(response: Response, grant: SessionGrant):
    response.set_cookie(_cookie, grant.token, httponly=True,
                        secure=settings.environment != "development", samesite="lax",
                        max_age=86400, path="/")
    response.headers["Cache-Control"] = "no-store"
    return {"account_id": grant.account_id, "csrf_token": grant.csrf,
            "expires_at": grant.expires.isoformat()}


@router.post("/login/password", response_model=SessionOutput)
def login(body: PasswordLogin, request: Request, response: Response,
          db: Session = Depends(session_dependency)):
    if request.headers.get("origin") != settings.public_origin:
        return failure(request, "origin_invalid", 403)
    try:
        phone = normalize_phone(body.phone)
    except IdentityError:
        return failure(request, "invalid_credentials", 401)
    try:
        if not rate_allowed(phone, request.client.host if request.client else "unknown"):
            return failure(request, "rate_limited", 429)
    except Exception:
        # Authentication must not bypass limits when cache is unavailable.
        return failure(request, "authentication_unavailable", 503)
    service = PasswordSignIn(SqlIdentityRepository(db), verify_password,
                             new_session_token, token_digest, _dummy_hash)
    try:
        grant = service.execute(phone, body.password)
    except IdentityError:
        db.rollback()
        return failure(request, "invalid_credentials", 401)
    db.commit()
    return set_session_cookie(response, grant)


def session_account(request: Request, db: Session):
    token = request.cookies.get(_cookie, "")
    if not 40 <= len(token) <= 128:
        return None
    return SqlIdentityRepository(db).session_account(token_digest(token), datetime.now(UTC))


@router.get("/session", response_model=CurrentSessionOutput)
def current_session(request: Request, response: Response,
                    db: Session = Depends(session_dependency)):
    account = session_account(request, db)
    if not account:
        return failure(request, "unauthenticated", 401)
    response.headers["Cache-Control"] = "no-store"
    return {"account_id": account.id, "phone": account.phone}


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(session_dependency)):
    import hmac

    account = session_account(request, db)
    if not account:
        return failure(request, "unauthenticated", 401)
    csrf = request.headers.get("X-CSRF-Token", "")
    if not csrf or len(csrf) > 128 or not hmac.compare_digest(token_digest(csrf), account.csrf_hash):
        return failure(request, "csrf_invalid", 403)
    if not SqlIdentityRepository(db).delete_session(token_digest(request.cookies[_cookie]),
                                                    token_digest(csrf)):
        db.rollback()
        return failure(request, "csrf_invalid", 403)
    db.commit()
    response.delete_cookie(_cookie, path="/", httponly=True,
                           secure=settings.environment != "development", samesite="lax")
    response.headers["Cache-Control"] = "no-store"


@router.post("/session/csrf", response_model=CsrfOutput)
def refresh_csrf(request: Request, response: Response, db: Session = Depends(session_dependency)):
    # Exact same-origin gate protects the cookie-authenticated bootstrap operation.
    # Never return CSRF through an unguarded GET or allow cross-origin CORS.
    if request.headers.get("origin") != settings.public_origin:
        return failure(request, "origin_invalid", 403)
    try:
        if not csrf_attempt_allowed(settings.redis_url,
                                    request.client.host if request.client else "unknown"):
            return failure(request, "rate_limited", 429)
    except Exception:
        return failure(request, "authentication_unavailable", 503)
    token = request.cookies.get(_cookie, "")
    if not 40 <= len(token) <= 128:
        return failure(request, "unauthenticated", 401)
    csrf = new_session_token()
    if not SqlIdentityRepository(db).rotate_csrf(token_digest(token), token_digest(csrf),
                                                datetime.now(UTC)):
        db.rollback()
        return failure(request, "unauthenticated", 401)
    db.commit()
    response.headers["Cache-Control"] = "no-store"
    return {"csrf_token": csrf}
