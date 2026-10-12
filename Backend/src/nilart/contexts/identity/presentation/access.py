from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from nilart.contexts.identity.domain.permissions import Principal, Role
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.presentation.router import session_account
from nilart.shared.database import session_dependency

router = APIRouter(prefix="/api/v1/auth", tags=["identity"])


def authenticated_principal(request: Request, db: Session = Depends(session_dependency)) -> Principal:
    account = session_account(request, db)
    if not account:
        raise HTTPException(status_code=401, detail={"code": "unauthenticated"},
                            headers={"Cache-Control": "no-store"})
    roles = SqlIdentityRepository(db).roles(account.id)
    return Principal(account.id, frozenset(Role(role) for role in roles))


def require_permission(permission: str):
    def authorize(principal: Principal = Depends(authenticated_principal)) -> Principal:
        if not principal.allows(permission):
            raise HTTPException(status_code=403, detail={"code": "permission_denied"},
                                headers={"Cache-Control": "no-store"})
        return principal
    return authorize


class AccessOutput(BaseModel):
    account_id: str
    roles: list[Role]
    permissions: list[str]


@router.get("/access", response_model=AccessOutput)
def access(principal: Principal = Depends(authenticated_principal)):
    from fastapi.responses import JSONResponse

    return JSONResponse(content={"account_id": principal.account_id,
                                "roles": sorted(principal.roles),
                                "permissions": sorted(principal.permissions)},
                        headers={"Cache-Control": "no-store"})
