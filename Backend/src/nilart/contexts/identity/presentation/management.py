import hmac
from datetime import date, datetime
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
def accounts(request: Request, cursor: UUID | None = None, limit: int = Query(25, ge=1, le=100), role: Role | None = None, q: str | None = Query(None, min_length=1, max_length=32), blocked: bool | None = None,
             db: Session = Depends(session_dependency), principal: Principal = Depends(require_permission("identity.manage"))):
    term = (q or "").translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789"))
    term = "".join(char for char in term if char not in " ()-")
    if q is not None and (not term or not term.lstrip("+").isdigit() or "+" in term[1:]):
        return failure(request, "invalid_phone_search", 422)
    if term.startswith("0"):
        term = "+98" + term[1:]
    rows = list(db.execute(text("SELECT id FROM identity_accounts WHERE (CAST(:blocked AS boolean) IS NULL OR blocked=:blocked) AND (CAST(:phone AS text) IS NULL OR position(:phone in phone)>0) AND (CAST(:role AS text) IS NULL OR EXISTS (SELECT 1 FROM identity_account_roles r WHERE r.account_id=identity_accounts.id AND r.role=:role)) AND (CAST(:cursor AS uuid) IS NULL OR id>CAST(:cursor AS uuid)) ORDER BY id LIMIT :limit"), {"blocked": blocked, "phone": term or None, "cursor": str(cursor) if cursor else None, "role": role.value if role else None, "limit": limit + 1}).scalars())
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


class ActivityOutput(BaseModel):
    id: UUID
    actor_id: UUID | None
    account_id: UUID
    action: str
    reason: str
    created_at: datetime


class ActivityPage(BaseModel):
    items: list[ActivityOutput]
    next_cursor: UUID | None


@router.get("/audits", response_model=ActivityPage)
def activity(request: Request, q: str = Query("", max_length=200), account_id: UUID | None = None, actor_id: UUID | None = None,
             date_from: date | None = None, date_to: date | None = None, action: str | None = Query(None, min_length=1, max_length=100),
             cursor: UUID | None = None, limit: int = Query(25, ge=1, le=100),
             db: Session = Depends(session_dependency),
             principal: Principal = Depends(require_permission("identity.manage"))):
    if date_from and date_to and date_from > date_to:
        return failure(request, "invalid_activity_date_range", 422)
    scope = "(CAST(:action AS text) IS NULL OR action=:action) AND (CAST(:date_from AS date) IS NULL OR (created_at AT TIME ZONE 'Asia/Tehran')::date>=CAST(:date_from AS date)) AND (CAST(:date_to AS date) IS NULL OR (created_at AT TIME ZONE 'Asia/Tehran')::date<=CAST(:date_to AS date)) AND (CAST(:actor AS uuid) IS NULL OR actor_id=CAST(:actor AS uuid)) AND (CAST(:account AS uuid) IS NULL OR account_id=CAST(:account AS uuid)) AND (:q='' OR strpos(lower(concat_ws(' ',action,reason)),lower(CAST(:q AS text)))>0)"
    params = {"action": action, "date_from": date_from, "date_to": date_to, "actor": actor_id, "account": account_id, "q": q.strip(), "cursor": cursor, "limit": limit + 1}
    stamp = None
    if cursor:
        stamp = db.scalar(text(f"SELECT created_at FROM identity_audits WHERE {scope} AND id=:cursor"), params)
        if stamp is None:
            return failure(request, "audit_cursor_not_found", 404)
    rows = db.execute(text(f"SELECT id,actor_id,account_id,action,reason,created_at FROM identity_audits WHERE {scope} "
                           "AND (CAST(:stamp AS timestamptz) IS NULL OR (created_at,id)<(CAST(:stamp AS timestamptz),CAST(:cursor AS uuid))) "
                           "ORDER BY created_at DESC,id DESC LIMIT :limit"), {**params, "stamp": stamp}).mappings().all()
    return {"items": [dict(row) for row in rows[:limit]], "next_cursor": rows[limit - 1]["id"] if len(rows)>limit else None}
