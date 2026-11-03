"""Versioned supplier directory, separate from purchases and financial ledgers."""
import json
import unicodedata
from datetime import datetime
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

router = APIRouter(prefix="/api/v1/admin/procurement", tags=["suppliers"])
class Resource(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    kind: Literal["supplier", "service_provider", "both"]
    code: str = Field(pattern=r"^[A-Z0-9][A-Z0-9_-]{0,79}$")
    title_fa: str = Field(min_length=1, max_length=200)
    title_en: str = Field(min_length=1, max_length=200)
    contact_name: str = Field(default="", max_length=200)
    phone: str = Field(default="", max_length=40)
    email: str = Field(default="", max_length=254)
    address: str = Field(default="", max_length=1000)
    notes: str = Field(default="", max_length=2000)
    active: bool = Field(default=True, strict=True)

    @model_validator(mode="after")
    def valid(self):
        import re
        if self.phone and not re.fullmatch(r"\+?[0-9][0-9 ()-]{2,39}", self.phone):
            raise ValueError("Invalid contact phone")
        if self.email and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", self.email):
            raise ValueError("Invalid contact email")
        for name in ("title_fa", "title_en", "contact_name", "phone", "email", "address", "notes"):
            if any(unicodedata.category(char) == "Cc" and (name not in {"address", "notes"} or char != "\n") for char in getattr(self, name)):
                raise ValueError("Printable contact details required")
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
    supplier_id: UUID
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


@router.get("/suppliers", response_model=ResourcePage)
def resources(q: str = Query("", max_length=200), active: bool | None = None,
              cursor: UUID | None = None, limit: int = Query(25, ge=1, le=100),
              db: Session = Depends(session_dependency), principal: Principal = Depends(require_permission("inventory.manage"))):
    rows = db.execute(text("SELECT * FROM procurement_suppliers WHERE true "
        "AND (CAST(:active AS boolean) IS NULL OR (content->>'active')::boolean=:active) "
        "AND (:q='' OR strpos(lower(concat_ws(' ',code,content->>'title_fa',content->>'title_en',content->>'contact_name',content->>'phone',content->>'email')),lower(CAST(:q AS text)))>0) "
        "AND (CAST(:cursor AS uuid) IS NULL OR id>CAST(:cursor AS uuid)) ORDER BY id LIMIT :limit"),
        {"q": q.strip(), "active": active, "cursor": cursor, "limit": limit+1}).mappings().all()
    return {"items": [dict(row) for row in rows[:limit]], "next_cursor": rows[limit-1]["id"] if len(rows)>limit else None}


@router.get("/suppliers/{id}", response_model=ResourceOutput)
def detail(id: UUID, request: Request, db: Session = Depends(session_dependency),
           principal: Principal = Depends(require_permission("inventory.manage"))):
    row = db.execute(text("SELECT * FROM procurement_suppliers WHERE id=:id"), {"id": id}).mappings().first()
    return dict(row) if row else failure(request, "supplier_not_found", 404)


@router.get("/suppliers/{id}/versions", response_model=VersionPage)
def versions(id: UUID, request: Request, before: int | None = Query(None, ge=1), limit: int = Query(20, ge=1, le=100),
             db: Session = Depends(session_dependency), principal: Principal = Depends(require_permission("inventory.manage"))):
    if not db.scalar(text("SELECT id FROM procurement_suppliers WHERE id=:id"), {"id": id}):
        return failure(request, "supplier_not_found", 404)
    rows = db.execute(text("SELECT * FROM procurement_supplier_versions WHERE supplier_id=:id "
        "AND (CAST(:before AS integer) IS NULL OR version<:before) ORDER BY version DESC LIMIT :limit"),
        {"id": id, "before": before, "limit": limit+1}).mappings().all()
    return {"items": [dict(row) for row in rows[:limit]], "next_before_version": rows[limit-1]["version"] if len(rows)>limit else None}


@router.get("/suppliers/{id}/versions/{revision}", response_model=VersionOutput)
def saved_version(id: UUID, revision: UUID, request: Request, db: Session = Depends(session_dependency),
                  principal: Principal = Depends(require_permission("inventory.manage"))):
    row = db.execute(text("SELECT * FROM procurement_supplier_versions WHERE supplier_id=:id AND revision_id=:revision"), {"id": id, "revision": revision}).mappings().first()
    return dict(row) if row else failure(request, "supplier_revision_not_found", 404)


@router.put("/suppliers/{id}/versions/{revision}", response_model=VersionOutput)
def save(id: UUID, revision: UUID, body: SaveResource, request: Request, db: Session = Depends(session_dependency),
         principal: Principal = Depends(require_permission("inventory.manage"))):
    actor, denied = write_access(request, db, principal, "inventory.manage")
    if denied is not None:
        return denied
    db.execute(text("SELECT pg_advisory_xact_lock(78214, 32)"))
    content = body.content.model_dump(mode="json")
    prior = db.execute(text("SELECT * FROM procurement_supplier_versions WHERE revision_id=:revision"), {"revision": revision}).mappings().first()
    if prior:
        if (prior["supplier_id"], str(prior["actor_id"]), prior["expected_version"], prior["content"], prior["reason"]) == (id, str(actor.id), body.expected_version, content, body.reason):
            return dict(prior)
        return failure(request, "supplier_revision_conflict", 409)
    current = db.execute(text("SELECT * FROM procurement_suppliers WHERE id=:id FOR UPDATE"), {"id": id}).mappings().first()
    if (current["version"] if current else 0) != body.expected_version:
        return failure(request, "supplier_version_conflict", 409)
    params = {"id": id, "kind": body.content.kind, "code": body.content.code, "content": json.dumps(content), "version": body.expected_version+1}
    try:
        if current:
            db.execute(text("UPDATE procurement_suppliers SET kind=:kind,code=:code,content=CAST(:content AS jsonb),version=:version,updated_at=now() WHERE id=:id"), params)
        else:
            db.execute(text("INSERT INTO procurement_suppliers(id,kind,code,content,version) VALUES(:id,:kind,:code,CAST(:content AS jsonb),:version)"), params)
        row = db.execute(text("INSERT INTO procurement_supplier_versions(revision_id,supplier_id,actor_id,expected_version,version,content,reason) "
            "VALUES(:revision,:id,:actor,:expected,:version,CAST(:content AS jsonb),:reason) RETURNING *"),
            {**params, "revision": revision, "actor": actor.id, "expected": body.expected_version, "reason": body.reason}).mappings().one()
        SqlAccountManagement(db).audit(actor.id, actor.id, "procurement.supplier_saved", {"supplier_id": str(id), "revision_id": str(revision), "version": params["version"]}, body.reason)
        enqueue(db, "procurement.supplier_saved", {"supplier_id": str(id), "revision_id": str(revision), "version": params["version"]})
        db.commit()
        return dict(row)
    except IntegrityError:
        db.rollback()
        return failure(request, "supplier_code_conflict", 409)
    except Exception:
        db.rollback()
        raise
