import hmac
from datetime import datetime
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy.orm import Session

from nilart.bootstrap.settings import settings
from nilart.contexts.commissions.repository import SqlCommissionRepository, SubmissionConflict
from nilart.contexts.identity.domain.permissions import Principal, Role
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.infrastructure.secrets import token_digest
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.router import failure, session_account
from nilart.shared.database import session_dependency

router = APIRouter(prefix="/api/v1/account/commissions", tags=["commissions"])


class CommissionBrief(BaseModel):
    model_config = ConfigDict(extra="forbid")
    submission_id: UUID
    idea: str = Field(min_length=1, max_length=4000)
    changes: str = Field(max_length=2000)
    style: str = Field(min_length=1, max_length=300)
    size: str = Field(min_length=1, max_length=300)
    execution: Literal["digital", "handmade"]

    @model_validator(mode="after")
    def nonblank(self):
        if any(not value.strip() for value in [self.idea, self.style, self.size]):
            raise ValueError("Required commission details are blank")
        return self


class CommissionReceipt(BaseModel):
    id: UUID
    created_at: datetime
    status: Literal["awaiting_review"]


@router.post("", response_model=CommissionReceipt)
def submit(body: CommissionBrief, request: Request, db: Session = Depends(session_dependency),
           principal: Principal = Depends(require_permission("account.write_self"))):
    if request.headers.get("origin") != settings.public_origin:
        return failure(request, "origin_invalid", 403)
    account = session_account(request, db, lock=True)
    if not account:
        return failure(request, "unauthenticated", 401)
    roles = SqlIdentityRepository(db).roles(account.id, lock=True)
    if account.id != principal.account_id or not Principal(account.id, frozenset(Role(role) for role in roles)).allows("account.write_self"):
        return failure(request, "permission_denied", 403)
    csrf = request.headers.get("X-CSRF-Token", "")
    if not csrf or len(csrf) > 128 or not hmac.compare_digest(token_digest(csrf), account.csrf_hash):
        return failure(request, "csrf_invalid", 403)
    try:
        receipt = SqlCommissionRepository(db).submit(account.id, body.submission_id,
                    body.model_dump(mode="json", exclude={"submission_id"}))
    except SubmissionConflict:
        db.rollback()
        return failure(request, "submission_conflict", 409)
    db.commit()
    return receipt
