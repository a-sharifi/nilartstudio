import hmac
from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.bootstrap.settings import settings
from nilart.contexts.identity.domain.permissions import KNOWN_PERMISSIONS, Principal, Role
from nilart.contexts.identity.infrastructure.management import ManagementError, SqlAccountManagement
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.infrastructure.secrets import token_digest
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.router import failure, session_account
from nilart.shared.database import session_dependency

router = APIRouter(prefix="/api/v1/admin/identity", tags=["identity-management"])


class AccountOutput(BaseModel):
    id: UUID
    phone: str
    phone_verified: bool
    blocked: bool
    version: int
    roles: list[Role]
    overrides: dict[str, bool]
    permissions: list[str]


class AccountPage(BaseModel):
    items: list[AccountOutput]
    next_cursor: UUID | None


class AccessUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: int = Field(ge=0, strict=True)
    roles: list[Role] = Field(max_length=5)
    overrides: dict[str, Annotated[bool, Field(strict=True)]] = Field(max_length=100)
    blocked: bool = Field(strict=True)
    reason: str = Field(min_length=1, max_length=1000)

    @model_validator(mode="after")
    def valid(self):
        self.reason = self.reason.strip()
        if not self.reason or any(ord(c) < 32 for c in self.reason) or len(set(self.roles)) != len(self.roles) or not set(self.overrides) <= KNOWN_PERMISSIONS:
            raise ValueError("Invalid access changes")
        return self


def write_access(request, db, principal, permission):
    if request.headers.get("origin") != settings.public_origin:
        return None, failure(request, "origin_invalid", 403)
    account = session_account(request, db, lock=True)
    if not account:
        return None, failure(request, "unauthenticated", 401)
    current = SqlIdentityRepository(db).principal(account.id, lock=True)
    if account.id != principal.account_id or not current.allows(permission):
        return None, failure(request, "permission_denied", 403)
    csrf = request.headers.get("X-CSRF-Token", "")
    if not csrf or len(csrf) > 128 or not hmac.compare_digest(token_digest(csrf), account.csrf_hash):
        return None, failure(request, "csrf_invalid", 403)
    return account, None


@router.get("/permissions", response_model=list[str])
def permissions(principal: Principal = Depends(require_permission("identity.manage"))):
    return sorted(KNOWN_PERMISSIONS)


@router.get("/accounts", response_model=AccountPage)
def accounts(cursor: UUID | None = None, limit: int = Query(25, ge=1, le=100),
             db: Session = Depends(session_dependency), principal: Principal = Depends(require_permission("identity.manage"))):
    rows = list(db.execute(text("SELECT id FROM identity_accounts WHERE (CAST(:cursor AS uuid) IS NULL OR id>CAST(:cursor AS uuid)) ORDER BY id LIMIT :limit"), {"cursor": str(cursor) if cursor else None, "limit": limit + 1}).scalars())
    repo = SqlAccountManagement(db)
    return {"items": [repo.read(id) for id in rows[:limit]], "next_cursor": rows[limit-1] if len(rows)>limit else None}


@router.get("/accounts/{account_id}", response_model=AccountOutput)
def account(account_id: UUID, request: Request, db: Session = Depends(session_dependency),
            principal: Principal = Depends(require_permission("identity.manage"))):
    try:
        return SqlAccountManagement(db).read(account_id)
    except ManagementError as exc:
        return failure(request, exc.code, exc.status)


@router.put("/accounts/{account_id}/access", response_model=AccountOutput)
def update(account_id: UUID, body: AccessUpdate, request: Request, db: Session = Depends(session_dependency),
           principal: Principal = Depends(require_permission("identity.manage"))):
    repo = SqlAccountManagement(db)
    repo.serialize_writes()
    actor, denied = write_access(request, db, principal, "identity.manage")
    if denied is not None:
        return denied
    try:
        result = repo.update(actor.id, account_id, body.version, body.roles, body.overrides, body.blocked, body.reason)
    except ManagementError as exc:
        db.rollback()
        return failure(request, exc.code, exc.status)
    db.commit()
    return result


class AuditOutput(BaseModel):
    id: UUID
    actor_id: UUID | None
    account_id: UUID
    action: str
    changes: dict
    reason: str
    created_at: datetime


@router.get("/accounts/{account_id}/audits", response_model=list[AuditOutput])
def audits(account_id: UUID, limit: int = Query(50, ge=1, le=100), db: Session = Depends(session_dependency),
           principal: Principal = Depends(require_permission("identity.manage"))):
    return db.execute(text("SELECT * FROM identity_audits WHERE account_id=:id ORDER BY created_at DESC,id DESC LIMIT :limit"), {"id": account_id, "limit": limit}).mappings().all()
