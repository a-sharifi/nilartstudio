"""Versioned discount rules and auditable administration."""
import json
import unicodedata
from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.domain.rules import normalize_phone
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.contexts.identity.presentation.router import failure
from nilart.shared.database import session_dependency
from nilart.shared.outbox import enqueue

router = APIRouter(prefix="/api/v1/admin/discounts", tags=["discounts"])
class Resource(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    kind: Literal["fixed", "percent"]
    code: str = Field(pattern=r"^[A-Z0-9][A-Z0-9_-]{0,79}$")
    title_fa: str = Field(min_length=1, max_length=200)
    title_en: str = Field(min_length=1, max_length=200)
    value: str = Field(pattern=r"^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,6})?$")
    minimum: str = Field(default="0", pattern=r"^(?:0|[1-9][0-9]{0,11})$")
    maximum: str | None = Field(default=None, pattern=r"^(?:[1-9][0-9]{0,11})$")
    valid_from: date
    valid_to: date
    total_limit: int | None = Field(default=None, strict=True, ge=1, le=1000000000)
    customer_limit: int | None = Field(default=None, strict=True, ge=1, le=1000000000)
    product_ids: list[UUID] = Field(default_factory=list, max_length=100)
    collection_ids: list[UUID] = Field(default_factory=list, max_length=100)
    category_ids: list[UUID] = Field(default_factory=list, max_length=100)
    customer_phones: list[str] = Field(default_factory=list, max_length=100)
    allow_bundle_stacking: bool = Field(default=False, strict=True)
    first_purchase_only: bool = Field(default=False, strict=True)
    active: bool = Field(default=False, strict=True)

    @model_validator(mode="after")
    def valid(self):
        if Decimal(self.value)<=0 or (self.kind=="percent" and Decimal(self.value)>100):
            raise ValueError("Invalid discount value")
        if self.kind=="fixed" and Decimal(self.value)!=Decimal(self.value).to_integral_value():
            raise ValueError("Fixed amounts use whole toman")
        if self.valid_from>self.valid_to:
            raise ValueError("Invalid validity range")
        for ids in [self.product_ids,self.collection_ids,self.category_ids]:
            if len(set(ids))!=len(ids):
                raise ValueError("Duplicate scope")
        self.customer_phones=[normalize_phone(phone) for phone in self.customer_phones]
        if len(set(self.customer_phones))!=len(self.customer_phones):
            raise ValueError("Duplicate customer")
        if any(unicodedata.category(c)=="Cc" for value in [self.title_fa,self.title_en] for c in value):
            raise ValueError("Printable titles required")
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
    discount_id: UUID
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


@router.get("/rules", response_model=ResourcePage)
def resources(q: str = Query("", max_length=200), active: bool | None = None,
              cursor: UUID | None = None, limit: int = Query(25, ge=1, le=100),
              db: Session = Depends(session_dependency), principal: Principal = Depends(require_permission("catalog.manage"))):
    rows = db.execute(text("SELECT * FROM discount_rules WHERE true "
        "AND (CAST(:active AS boolean) IS NULL OR (content->>'active')::boolean=:active) "
        "AND (:q='' OR strpos(lower(concat_ws(' ',code,content->>'title_fa',content->>'title_en')),lower(CAST(:q AS text)))>0) "
        "AND (CAST(:cursor AS uuid) IS NULL OR id>CAST(:cursor AS uuid)) ORDER BY id LIMIT :limit"),
        {"q": q.strip(), "active": active, "cursor": cursor, "limit": limit+1}).mappings().all()
    return {"items": [dict(row) for row in rows[:limit]], "next_cursor": rows[limit-1]["id"] if len(rows)>limit else None}


@router.get("/rules/{id}", response_model=ResourceOutput)
def detail(id: UUID, request: Request, db: Session = Depends(session_dependency),
           principal: Principal = Depends(require_permission("catalog.manage"))):
    row = db.execute(text("SELECT * FROM discount_rules WHERE id=:id"), {"id": id}).mappings().first()
    return dict(row) if row else failure(request, "discount_not_found", 404)


@router.get("/rules/{id}/versions", response_model=VersionPage)
def versions(id: UUID, request: Request, before: int | None = Query(None, ge=1), limit: int = Query(20, ge=1, le=100),
             db: Session = Depends(session_dependency), principal: Principal = Depends(require_permission("catalog.manage"))):
    if not db.scalar(text("SELECT id FROM discount_rules WHERE id=:id"), {"id": id}):
        return failure(request, "discount_not_found", 404)
    rows = db.execute(text("SELECT * FROM discount_rule_versions WHERE discount_id=:id "
        "AND (CAST(:before AS integer) IS NULL OR version<:before) ORDER BY version DESC LIMIT :limit"),
        {"id": id, "before": before, "limit": limit+1}).mappings().all()
    return {"items": [dict(row) for row in rows[:limit]], "next_before_version": rows[limit-1]["version"] if len(rows)>limit else None}


@router.get("/rules/{id}/versions/{revision}", response_model=VersionOutput)
def saved_version(id: UUID, revision: UUID, request: Request, db: Session = Depends(session_dependency),
                  principal: Principal = Depends(require_permission("catalog.manage"))):
    row = db.execute(text("SELECT * FROM discount_rule_versions WHERE discount_id=:id AND revision_id=:revision"), {"id": id, "revision": revision}).mappings().first()
    return dict(row) if row else failure(request, "discount_revision_not_found", 404)


@router.put("/rules/{id}/versions/{revision}", response_model=VersionOutput)
def save(id: UUID, revision: UUID, body: SaveResource, request: Request, db: Session = Depends(session_dependency),
         principal: Principal = Depends(require_permission("catalog.manage"))):
    actor, denied = write_access(request, db, principal, "catalog.manage")
    if denied is not None:
        return denied
    db.execute(text("SELECT pg_advisory_xact_lock(78214, 33)"))
    content = body.content.model_dump(mode="json")
    prior = db.execute(text("SELECT * FROM discount_rule_versions WHERE revision_id=:revision"), {"revision": revision}).mappings().first()
    if prior:
        if (prior["discount_id"], str(prior["actor_id"]), prior["expected_version"], Resource.model_validate(prior["content"]).model_dump(mode="json"), prior["reason"]) == (id, str(actor.id), body.expected_version, content, body.reason):
            return dict(prior)
        return failure(request, "discount_revision_conflict", 409)
    current = db.execute(text("SELECT * FROM discount_rules WHERE id=:id FOR UPDATE"), {"id": id}).mappings().first()
    if (current["version"] if current else 0) != body.expected_version:
        return failure(request, "discount_version_conflict", 409)
    for name, ids in [("products",body.content.product_ids),("collections",body.content.collection_ids),("categories",body.content.category_ids)]:
        if ids and db.scalar(text(f"SELECT count(*) FROM catalog_{name} WHERE id=ANY(CAST(:ids AS uuid[]))"), {"ids":[str(v) for v in ids]})!=len(ids):
            return failure(request,"discount_scope_not_found",422)
    params = {"id": id, "kind": body.content.kind, "code": body.content.code, "content": json.dumps(content), "version": body.expected_version+1}
    try:
        if current:
            db.execute(text("UPDATE discount_rules SET kind=:kind,code=:code,content=CAST(:content AS jsonb),version=:version,updated_at=now() WHERE id=:id"), params)
        else:
            db.execute(text("INSERT INTO discount_rules(id,kind,code,content,version) VALUES(:id,:kind,:code,CAST(:content AS jsonb),:version)"), params)
        row = db.execute(text("INSERT INTO discount_rule_versions(revision_id,discount_id,actor_id,expected_version,version,content,reason) "
            "VALUES(:revision,:id,:actor,:expected,:version,CAST(:content AS jsonb),:reason) RETURNING *"),
            {**params, "revision": revision, "actor": actor.id, "expected": body.expected_version, "reason": body.reason}).mappings().one()
        SqlAccountManagement(db).audit(actor.id, actor.id, "discount.rule_saved", {"discount_id": str(id), "revision_id": str(revision), "version": params["version"]}, body.reason)
        enqueue(db, "discount.rule_saved", {"discount_id": str(id), "revision_id": str(revision), "version": params["version"]})
        db.commit()
        return dict(row)
    except IntegrityError:
        db.rollback()
        return failure(request, "discount_code_conflict", 409)
    except Exception:
        db.rollback()
        raise




class Choice(BaseModel):
    id: UUID
    title_fa: str
    title_en: str


class ChoicePage(BaseModel):
    items: list[Choice]
    next_cursor: UUID | None


@router.get('/choices/{kind}',response_model=ChoicePage)
def choices(kind: Literal['products','collections','categories'], q: str = Query('',max_length=200),
            ids: list[UUID] = Query(default=[],max_length=100), cursor: UUID | None = None,
            limit: int = Query(25,ge=1,le=100), db: Session = Depends(session_dependency),principal: Principal=Depends(require_permission('catalog.manage'))):
    rows=db.execute(text(f"SELECT id,title_fa,title_en FROM catalog_{kind} WHERE "
        "(:all OR id=ANY(CAST(:ids AS uuid[]))) AND (:q='' OR strpos(lower(title_fa||' '||title_en),lower(CAST(:q AS text)))>0) "
        "AND (CAST(:cursor AS uuid) IS NULL OR id>:cursor) ORDER BY id LIMIT :limit"),
        {'all':not ids,'ids':[str(v) for v in ids],'q':q.strip(),'cursor':cursor,'limit':limit+1}).mappings().all()
    return {'items':[dict(v) for v in rows[:limit]],'next_cursor':rows[limit-1]['id'] if len(rows)>limit else None}


class Usage(BaseModel):
    redeemed: int
    reserved: int


@router.get('/rules/{id}/usage',response_model=Usage)
def usage(id:UUID,request:Request,db:Session=Depends(session_dependency),principal:Principal=Depends(require_permission('catalog.manage'))):
    from nilart.contexts.discounts.engine import counts
    if not db.scalar(text('SELECT id FROM discount_rules WHERE id=:id'),{'id':id}):
        return failure(request,'discount_not_found',404)
    return counts(db,id)
