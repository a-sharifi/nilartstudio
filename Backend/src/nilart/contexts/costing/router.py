"""Explicit estimates; these records never move stock or publish sale prices."""
import json
import unicodedata
from datetime import date, datetime
from decimal import Decimal, localcontext
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.contexts.identity.presentation.router import failure
from nilart.shared.database import session_dependency
from nilart.shared.outbox import enqueue

router = APIRouter(prefix="/api/v1/admin/costing", tags=["cost-resources"])
Unit = Literal["piece", "sheet", "meter", "gram", "kilogram", "pack", "printed_side", "notebook", "batch", "order"]
DECIMAL = r"^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,6})?$"


class Rate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    amount: str = Field(pattern=DECIMAL)
    currency: Literal["IRT", "IRR"]


class Resource(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    kind: Literal["material", "service"]
    code: str = Field(pattern=r"^[A-Z0-9][A-Z0-9_-]{0,79}$")
    title_fa: str = Field(min_length=1, max_length=200)
    title_en: str = Field(min_length=1, max_length=200)
    base_unit: Unit
    purchase_unit: Unit | None = None
    purchase_to_base: str | None = Field(default=None, pattern=DECIMAL)
    supplier: str = Field(default="", max_length=200)
    width_mm: str | None = Field(default=None, pattern=DECIMAL)
    height_mm: str | None = Field(default=None, pattern=DECIMAL)
    grammage: str | None = Field(default=None, pattern=DECIMAL)
    rate: Rate | None = None
    valid_from: date | None = None
    valid_to: date | None = None
    active: bool = Field(default=True, strict=True)
    zero_rate_acknowledged: bool = Field(default=False, strict=True)

    @model_validator(mode="after")
    def consistent(self):
        for value in (self.purchase_to_base, self.width_mm, self.height_mm, self.grammage):
            if value is not None and Decimal(value) <= 0:
                raise ValueError("Measurements and conversion factors must be positive")
        if self.purchase_to_base is not None and self.purchase_unit is None:
            raise ValueError("Purchase unit required for conversion")
        if self.kind == "service" and any(value is not None for value in (self.purchase_unit, self.purchase_to_base, self.width_mm, self.height_mm, self.grammage)):
            raise ValueError("Material specifications do not apply to services")
        if self.valid_from and self.valid_to and self.valid_from > self.valid_to:
            raise ValueError("Invalid validity range")
        if self.rate is not None and Decimal(self.rate.amount) == 0 and not self.zero_rate_acknowledged:
            raise ValueError("An explicitly zero rate requires acknowledgement")
        if any(unicodedata.category(char) == "Cc" for value in (self.title_fa, self.title_en, self.supplier) for char in value):
            raise ValueError("Printable titles and supplier required")
        return self


class SaveResource(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    expected_version: int = Field(strict=True, ge=0, le=2147483646)
    content: Resource
    reason: str = Field(min_length=1, max_length=1000)

    @model_validator(mode="after")
    def valid_reason(self):
        if any(unicodedata.category(char) == "Cc" for char in self.reason):
            raise ValueError("Printable reason required")
        return self


class ResourceOutput(BaseModel):
    id: UUID
    version: int
    content: Resource
    updated_at: datetime


class VersionOutput(BaseModel):
    revision_id: UUID
    resource_id: UUID
    actor_id: UUID
    expected_version: int
    version: int
    content: Resource
    reason: str
    created_at: datetime


class ResourcePage(BaseModel):
    items: list[ResourceOutput]
    next_cursor: UUID | None


class VersionPage(BaseModel):
    items: list[VersionOutput]
    next_before_version: int | None


@router.get("/resources", response_model=ResourcePage)
def resources(kind: Literal["material", "service"], q: str = Query("", max_length=200), active: bool | None = None,
              cursor: UUID | None = None, limit: int = Query(25, ge=1, le=100),
              db: Session = Depends(session_dependency), principal: Principal = Depends(require_permission("pricing.publish"))):
    rows = db.execute(text("SELECT * FROM cost_resources WHERE kind=:kind "
        "AND (CAST(:active AS boolean) IS NULL OR (content->>'active')::boolean=:active) "
        "AND (:q='' OR strpos(lower(concat_ws(' ',code,content->>'title_fa',content->>'title_en',content->>'supplier')),lower(CAST(:q AS text)))>0) "
        "AND (CAST(:cursor AS uuid) IS NULL OR id>CAST(:cursor AS uuid)) ORDER BY id LIMIT :limit"),
        {"kind": kind, "q": q.strip(), "active": active, "cursor": cursor, "limit": limit+1}).mappings().all()
    return {"items": [dict(row) for row in rows[:limit]], "next_cursor": rows[limit-1]["id"] if len(rows)>limit else None}


@router.get("/resources/{id}", response_model=ResourceOutput)
def detail(id: UUID, request: Request, db: Session = Depends(session_dependency),
           principal: Principal = Depends(require_permission("pricing.publish"))):
    row = db.execute(text("SELECT * FROM cost_resources WHERE id=:id"), {"id": id}).mappings().first()
    return dict(row) if row else failure(request, "resource_not_found", 404)


@router.get("/resources/{id}/versions", response_model=VersionPage)
def versions(id: UUID, request: Request, before: int | None = Query(None, ge=1), limit: int = Query(20, ge=1, le=100),
             db: Session = Depends(session_dependency), principal: Principal = Depends(require_permission("pricing.publish"))):
    if not db.scalar(text("SELECT id FROM cost_resources WHERE id=:id"), {"id": id}):
        return failure(request, "resource_not_found", 404)
    rows = db.execute(text("SELECT * FROM cost_resource_versions WHERE resource_id=:id "
        "AND (CAST(:before AS integer) IS NULL OR version<:before) ORDER BY version DESC LIMIT :limit"),
        {"id": id, "before": before, "limit": limit+1}).mappings().all()
    return {"items": [dict(row) for row in rows[:limit]], "next_before_version": rows[limit-1]["version"] if len(rows)>limit else None}


@router.get("/resources/{id}/versions/{revision}", response_model=VersionOutput)
def saved_version(id: UUID, revision: UUID, request: Request, db: Session = Depends(session_dependency),
                  principal: Principal = Depends(require_permission("pricing.publish"))):
    row = db.execute(text("SELECT * FROM cost_resource_versions WHERE resource_id=:id AND revision_id=:revision"), {"id": id, "revision": revision}).mappings().first()
    return dict(row) if row else failure(request, "resource_revision_not_found", 404)


@router.put("/resources/{id}/versions/{revision}", response_model=VersionOutput)
def save(id: UUID, revision: UUID, body: SaveResource, request: Request, db: Session = Depends(session_dependency),
         principal: Principal = Depends(require_permission("pricing.publish"))):
    actor, denied = write_access(request, db, principal, "pricing.publish")
    if denied is not None:
        return denied
    db.execute(text("SELECT pg_advisory_xact_lock(78214, 29)"))
    content = body.content.model_dump(mode="json")
    prior = db.execute(text("SELECT * FROM cost_resource_versions WHERE revision_id=:revision"), {"revision": revision}).mappings().first()
    if prior:
        if (prior["resource_id"], str(prior["actor_id"]), prior["expected_version"], prior["content"], prior["reason"]) == (id, str(actor.id), body.expected_version, content, body.reason):
            return dict(prior)
        return failure(request, "resource_revision_conflict", 409)
    current = db.execute(text("SELECT * FROM cost_resources WHERE id=:id FOR UPDATE"), {"id": id}).mappings().first()
    if (current["version"] if current else 0) != body.expected_version:
        return failure(request, "resource_version_conflict", 409)
    if current and current["kind"] != body.content.kind:
        return failure(request, "resource_kind_conflict", 409)
    params = {"id": id, "kind": body.content.kind, "code": body.content.code, "content": json.dumps(content), "version": body.expected_version+1}
    try:
        if current:
            db.execute(text("UPDATE cost_resources SET code=:code,content=CAST(:content AS jsonb),version=:version,updated_at=now() WHERE id=:id"), params)
        else:
            db.execute(text("INSERT INTO cost_resources(id,kind,code,content,version) VALUES(:id,:kind,:code,CAST(:content AS jsonb),:version)"), params)
        row = db.execute(text("INSERT INTO cost_resource_versions(revision_id,resource_id,actor_id,expected_version,version,content,reason) "
            "VALUES(:revision,:id,:actor,:expected,:version,CAST(:content AS jsonb),:reason) RETURNING *"),
            {**params, "revision": revision, "actor": actor.id, "expected": body.expected_version, "reason": body.reason}).mappings().one()
        SqlAccountManagement(db).audit(actor.id, actor.id, "costing.resource_saved", {"resource_id": str(id), "revision_id": str(revision), "version": params["version"]}, body.reason)
        enqueue(db, "costing.resource_saved", {"resource_id": str(id), "revision_id": str(revision), "version": params["version"]})
        db.commit()
        return dict(row)
    except IntegrityError:
        db.rollback()
        return failure(request, "resource_code_conflict", 409)
    except Exception:
        db.rollback()
        raise



class EstimateOutput(BaseModel):
    resource_id: UUID
    version: int
    quantity: str
    unit: Literal["base", "purchase"]
    estimate_date: date
    base_quantity: str | None
    amount: str | None
    currency: Literal["IRT", "IRR"] | None
    complete: bool
    missing: list[str]


@router.get("/resources/{id}/estimate", response_model=EstimateOutput)
def estimate(id: UUID, request: Request, quantity: str = Query(pattern=DECIMAL),
             unit: Literal["base", "purchase"] = "base", on: date = Query(),
             db: Session = Depends(session_dependency),
             principal: Principal = Depends(require_permission("pricing.publish"))):
    if Decimal(quantity) <= 0:
        return failure(request, "invalid_estimate_quantity", 422)
    row = db.execute(text("SELECT * FROM cost_resources WHERE id=:id"), {"id": id}).mappings().first()
    if not row:
        return failure(request, "resource_not_found", 404)
    content = Resource.model_validate(row["content"])
    missing = []
    if not content.active:
        missing.append("resource_archived")
    if content.rate is None:
        missing.append("rate_unknown")
    elif content.valid_from is None:
        missing.append("rate_validity_unknown")
    if (content.valid_from and on < content.valid_from) or (content.valid_to and on > content.valid_to):
        missing.append("rate_not_valid_on_date")
    factor = Decimal(1)
    if unit == "purchase":
        if content.kind != "material" or content.purchase_unit is None:
            missing.append("purchase_unit_unknown")
        if content.purchase_to_base is None:
            missing.append("conversion_unknown")
        else:
            factor = Decimal(content.purchase_to_base)
    base_quantity, amount = None, None
    # Three bounded 12-integer/6-fraction inputs require up to 54 significant digits.
    with localcontext() as context:
        context.prec = 80
        if not any(item in missing for item in ("purchase_unit_unknown", "conversion_unknown")):
            converted = Decimal(quantity) * factor
            base_quantity = format(converted, "f")
            if not missing and content.rate is not None:
                amount = format(converted * Decimal(content.rate.amount), "f")
    return {"resource_id": id, "version": row["version"], "quantity": quantity, "unit": unit,
            "estimate_date": on, "base_quantity": base_quantity, "amount": amount,
            "currency": content.rate.currency if content.rate else None, "complete": not missing, "missing": missing}
