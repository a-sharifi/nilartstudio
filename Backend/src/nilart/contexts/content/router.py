"""Explicit publication of approved copy; saving a draft never changes public text."""
import json
from datetime import datetime
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.contexts.business.router import Strict
from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.contexts.identity.presentation.router import failure
from nilart.shared.database import session_dependency
from nilart.shared.outbox import enqueue

Slug=Literal["about","contact","faq","buying-guide","returns","terms","privacy"]
SLUGS=("about","contact","faq","buying-guide","returns","terms","privacy")
router=APIRouter(prefix="/api/v1/admin/content",tags=["content-management"])
public_router=APIRouter(prefix="/api/v1/content",tags=["approved-content"])


class Content(Strict):
    title_fa:str=Field(default="",max_length=200)
    title_en:str=Field(default="",max_length=200)
    body_fa:str=Field(default="",max_length=50000)
    body_en:str=Field(default="",max_length=50000)
    description_fa:str=Field(default="",max_length=300)
    description_en:str=Field(default="",max_length=300)


class Command(Strict):
    expected_version:int=Field(strict=True,ge=0,le=2147483646)
    action:Literal["draft","publish","unpublish"]
    content:Content
    reason:str=Field(min_length=1,max_length=1000)

    @model_validator(mode="after")
    def publication_complete(self):
        if self.action=="publish" and any(not getattr(self.content,k) for k in ("title_fa","title_en","body_fa","body_en")):
            raise ValueError("Publication requires bilingual titles and body")
        return self


class Page(BaseModel):
    slug:Slug
    version:int
    content:Content
    published_revision:UUID|None
    updated_at:datetime|None


class Revision(BaseModel):
    revision_id:UUID
    slug:Slug
    actor_id:UUID
    expected_version:int
    version:int
    action:Literal["draft","publish","unpublish"]
    content:Content
    reason:str
    created_at:datetime


class History(BaseModel):
    items:list[Revision]
    next_before_version:int|None


class Published(BaseModel):
    slug:Slug
    revision_id:UUID
    content:Content
    published_at:datetime


@router.get("",response_model=list[Page])
def listing(db:Session=Depends(session_dependency),principal:Principal=Depends(require_permission("content.manage"))):
    rows={r["slug"]:dict(r) for r in db.execute(text("SELECT * FROM content_pages")).mappings()}
    return [rows.get(slug,{"slug":slug,"version":0,"content":Content(),"published_revision":None,"updated_at":None}) for slug in SLUGS]


@router.get("/{slug}",response_model=Page)
def detail(slug:Slug,db:Session=Depends(session_dependency),principal:Principal=Depends(require_permission("content.manage"))):
    row=db.execute(text("SELECT * FROM content_pages WHERE slug=:slug"),{"slug":slug}).mappings().first()
    return dict(row) if row else {"slug":slug,"version":0,"content":Content(),"published_revision":None,"updated_at":None}


@router.get("/{slug}/versions",response_model=History)
def history(slug:Slug,before:int|None=Query(None,ge=1),limit:int=Query(20,ge=1,le=100),db:Session=Depends(session_dependency),principal:Principal=Depends(require_permission("content.manage"))):
    rows=db.execute(text("SELECT * FROM content_page_versions WHERE slug=:slug AND (CAST(:before AS integer) IS NULL OR version<:before) ORDER BY version DESC LIMIT :limit"),{"slug":slug,"before":before,"limit":limit+1}).mappings().all()
    return {"items":[dict(r) for r in rows[:limit]],"next_before_version":rows[limit-1]["version"] if len(rows)>limit else None}


@router.get("/{slug}/versions/{revision}",response_model=Revision)
def receipt(slug:Slug,revision:UUID,request:Request,db:Session=Depends(session_dependency),principal:Principal=Depends(require_permission("content.manage"))):
    row=db.execute(text("SELECT * FROM content_page_versions WHERE slug=:slug AND revision_id=:id"),{"slug":slug,"id":revision}).mappings().first()
    return dict(row) if row else failure(request,"content_revision_not_found",404)


@router.put("/{slug}/versions/{revision}",response_model=Revision)
def save(slug:Slug,revision:UUID,body:Command,request:Request,db:Session=Depends(session_dependency),principal:Principal=Depends(require_permission("content.manage"))):
    actor,denied=write_access(request,db,principal,"content.manage")
    if denied is not None:
        return denied
    db.execute(text("SELECT pg_advisory_xact_lock(78214,36)"))
    content=body.content.model_dump(mode="json")
    prior=db.execute(text("SELECT * FROM content_page_versions WHERE revision_id=:id"),{"id":revision}).mappings().first()
    if prior:
        if (prior["slug"],str(prior["actor_id"]),prior["expected_version"],prior["action"],prior["content"],prior["reason"])==(slug,str(actor.id),body.expected_version,body.action,content,body.reason):
            return dict(prior)
        return failure(request,"content_command_conflict",409)
    current=db.execute(text("SELECT * FROM content_pages WHERE slug=:slug FOR UPDATE"),{"slug":slug}).mappings().first()
    if (current["version"] if current else 0)!=body.expected_version:
        return failure(request,"content_version_conflict",409)
    params={"slug":slug,"content":json.dumps(content),"version":body.expected_version+1,"expected":body.expected_version,"revision":revision,"actor":actor.id,"reason":body.reason,"action":body.action}
    try:
        db.execute(text("INSERT INTO content_pages(slug,version,content) VALUES(:slug,:version,CAST(:content AS jsonb)) ON CONFLICT(slug) DO UPDATE SET version=:version,content=CAST(:content AS jsonb),updated_at=now()"),params)
        row=db.execute(text("INSERT INTO content_page_versions(revision_id,slug,actor_id,expected_version,version,action,content,reason) VALUES(:revision,:slug,:actor,:expected,:version,:action,CAST(:content AS jsonb),:reason) RETURNING *"),params).mappings().one()
        if body.action!="draft":
            db.execute(text("UPDATE content_pages SET published_revision=:published WHERE slug=:slug"),{"slug":slug,"published":revision if body.action=="publish" else None})
        payload={"slug":slug,"revision_id":str(revision),"version":params["version"],"action":body.action}
        SqlAccountManagement(db).audit(actor.id,actor.id,"content.page_saved",payload,body.reason)
        enqueue(db,"content.page_saved",payload)
        db.commit()
        return dict(row)
    except Exception:
        db.rollback()
        raise


@public_router.get("/{slug}",response_model=Published)
def published(slug:Slug,request:Request,db:Session=Depends(session_dependency)):
    row=db.execute(text("SELECT p.slug,v.revision_id,v.content,v.created_at AS published_at FROM content_pages p JOIN content_page_versions v ON v.revision_id=p.published_revision AND v.slug=p.slug WHERE p.slug=:slug AND v.action='publish'"),{"slug":slug}).mappings().first()
    return dict(row) if row else failure(request,"content_unpublished",404)
