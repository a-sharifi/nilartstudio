from uuid import UUID

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from nilart.contexts.catalog.domain.options import Combination, Option
from nilart.contexts.catalog.infrastructure.sku_authoring import SKUAuthoringError
from nilart.contexts.catalog.infrastructure.sku_mappings import SqlSKUMappingRepository
from nilart.contexts.catalog.presentation.sku_authoring import SKUAuthoringOutput, write_access
from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.router import failure
from nilart.shared.database import session_dependency

router = APIRouter(prefix="/api/v1/admin/catalog", tags=["catalog-sku-mappings"])


class MappingSelection(BaseModel):
    model_config = ConfigDict(extra="forbid")
    configuration_id: UUID
    configuration_version: int = Field(ge=1, le=2147483647, strict=True)
    combination_code: str = Field(min_length=1, max_length=160, strict=True)


class MappingUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: int = Field(ge=0, le=2147483646, strict=True)
    mapping: MappingSelection | None


class MappingSnapshot(BaseModel):
    options: list[Option]
    combination: Combination


class MappingOutput(MappingSelection):
    snapshot: MappingSnapshot
    current: bool


class SKUMappingOutput(SKUAuthoringOutput):
    mapping: MappingOutput | None


@router.get("/skus/{sku_id}/options", response_model=SKUMappingOutput)
def read_mapping(sku_id: UUID, request: Request, db: Session = Depends(session_dependency),
                 principal: Principal = Depends(require_permission("catalog.manage"))):
    try:
        return SqlSKUMappingRepository(db).read(sku_id)
    except SKUAuthoringError as exc:
        return failure(request, str(exc), 404)


@router.put("/skus/{sku_id}/options", response_model=SKUMappingOutput)
def update_mapping(sku_id: UUID, body: MappingUpdate, request: Request,
                   db: Session = Depends(session_dependency),
                   principal: Principal = Depends(require_permission("catalog.manage"))):
    account, denied = write_access(request, db, principal)
    if denied is not None:
        return denied
    try:
        result = SqlSKUMappingRepository(db).save(sku_id, account.id, body.version,
            None if body.mapping is None else body.mapping.model_dump())
    except SKUAuthoringError as exc:
        db.rollback()
        code = str(exc)
        status = 404 if code == "sku_not_found" else 422 if code in {
            "option_configuration_mismatch", "option_combination_mismatch"} else 409
        return failure(request, code, status)
    except IntegrityError as exc:
        db.rollback()
        if getattr(getattr(exc.orig, "diag", None), "constraint_name", None) != "uq_sku_mapping_combination":
            raise
        return failure(request, "option_combination_already_mapped", 409)
    db.commit()
    return result
