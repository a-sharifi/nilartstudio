"""Immutable media; public reads serve only the explicitly published image revision."""
import base64
import hashlib
import json
import unicodedata
from datetime import datetime
from typing import Literal
from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.contexts.business.router import Strict
from nilart.contexts.customer.attachment_formats import media_type, validate_attachment
from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.contexts.identity.presentation.router import failure
from nilart.shared.database import session_dependency
from nilart.shared.outbox import enqueue

router=APIRouter(prefix="/api/v1/admin/media",tags=["media-library"])
public_router=APIRouter(prefix="/api/v1/media",tags=["published-media"])
Purpose=Literal["public_image","print_file","mockup_source"]


class Metadata(Strict):
    title_fa:str=Field(min_length=1,max_length=200)
    title_en:str=Field(min_length=1,max_length=200)
    alt_fa:str=Field(default="",max_length=500)
    alt_en:str=Field(default="",max_length=500)
    sku_id:UUID|None=None
    print_size:str=Field(default="",max_length=120)
    notes:str=Field(default="",max_length=2000)


class Upload(Strict):
    expected_version:int=Field(strict=True,ge=0,le=2147483646)
    action:Literal["draft","publish","unpublish"]
    purpose:Purpose
    metadata:Metadata
    file_name:str=Field(min_length=1,max_length=200)
    content_base64:str|None=Field(default=None,min_length=1,max_length=6990508)
    reason:str=Field(min_length=1,max_length=1000)

    @model_validator(mode="after")
    def valid(self):
        if self.file_name in {".",".."} or any(c in "/\\" or unicodedata.category(c).startswith("C") for c in self.file_name):
            raise ValueError("Printable basename required")
        kind=media_type(self.file_name)
        if self.purpose in {"public_image","mockup_source"} and kind not in {"image/png","image/jpeg"}:
            raise ValueError("Public assets must be raster images")
        if self.purpose=="print_file" and (self.metadata.sku_id is None or not self.metadata.print_size):
            raise ValueError("Print files require explicit SKU and size")
        if self.action=="publish" and (self.purpose!="public_image" or not self.metadata.alt_fa or not self.metadata.alt_en):
            raise ValueError("Only public images with bilingual alt text can be published")
        return self


class Asset(BaseModel):
    id:UUID
    purpose:Purpose
    version:int
    metadata:Metadata
    sha256:str
    file_name:str
    published_revision:UUID|None
    updated_at:datetime


class Revision(BaseModel):
    revision_id:UUID
    asset_id:UUID
    actor_id:UUID
    expected_version:int
    version:int
    action:Literal["draft","publish","unpublish"]
    purpose:Purpose
    metadata:Metadata
    sha256:str
    file_name:str
    reason:str
    created_at:datetime


class Assets(BaseModel):
    items:list[Asset]
    next_cursor:UUID|None


class History(BaseModel):
    items:list[Revision]
    next_before_version:int|None


@router.get("",response_model=Assets)
def listing(q:str=Query("",max_length=200),purpose:Purpose|None=None,cursor:UUID|None=None,limit:int=Query(25,ge=1,le=100),db:Session=Depends(session_dependency),principal:Principal=Depends(require_permission("content.manage"))):
    rows=db.execute(text("SELECT * FROM media_assets WHERE (:q='' OR strpos(lower(concat_ws(' ',file_name,metadata->>'title_fa',metadata->>'title_en')),lower(CAST(:q AS text)))>0) AND (CAST(:purpose AS text) IS NULL OR purpose=:purpose) AND (CAST(:cursor AS uuid) IS NULL OR id>CAST(:cursor AS uuid)) ORDER BY id LIMIT :limit"),{"q":q.strip(),"purpose":purpose,"cursor":cursor,"limit":limit+1}).mappings().all()
    return {"items":[dict(r) for r in rows[:limit]],"next_cursor":rows[limit-1]["id"] if len(rows)>limit else None}


class SkuChoice(BaseModel):
    id:UUID
    code:str
    title_fa:str
    title_en:str


class SkuChoices(BaseModel):
    items:list[SkuChoice]
    next_cursor:UUID|None


@router.get("/choices/skus",response_model=SkuChoices)
def skus(q:str=Query("",max_length=200),cursor:UUID|None=None,limit:int=Query(25,ge=1,le=100),db:Session=Depends(session_dependency),principal:Principal=Depends(require_permission("content.manage"))):
    rows=db.execute(text("SELECT s.id,s.code,p.title_fa,p.title_en FROM catalog_skus s JOIN catalog_products p ON p.id=s.product_id WHERE (:q='' OR strpos(lower(concat_ws(' ',s.code,p.title_fa,p.title_en)),lower(CAST(:q AS text)))>0) AND (CAST(:cursor AS uuid) IS NULL OR s.id>CAST(:cursor AS uuid)) ORDER BY s.id LIMIT :limit"),{"q":q.strip(),"cursor":cursor,"limit":limit+1}).mappings().all()
    return {"items":[dict(r) for r in rows[:limit]],"next_cursor":rows[limit-1]["id"] if len(rows)>limit else None}


@router.get("/{id}",response_model=Asset)
def detail(id:UUID,request:Request,db:Session=Depends(session_dependency),principal:Principal=Depends(require_permission("content.manage"))):
    row=db.execute(text("SELECT * FROM media_assets WHERE id=:id"),{"id":id}).mappings().first()
    return dict(row) if row else failure(request,"media_not_found",404)


@router.get("/{id}/versions",response_model=History)
def history(id:UUID,before:int|None=Query(None,ge=1),limit:int=Query(20,ge=1,le=100),db:Session=Depends(session_dependency),principal:Principal=Depends(require_permission("content.manage"))):
    rows=db.execute(text("SELECT * FROM media_asset_versions WHERE asset_id=:id AND (CAST(:before AS integer) IS NULL OR version<:before) ORDER BY version DESC LIMIT :limit"),{"id":id,"before":before,"limit":limit+1}).mappings().all()
    return {"items":[dict(r) for r in rows[:limit]],"next_before_version":rows[limit-1]["version"] if len(rows)>limit else None}


@router.get("/{id}/versions/{revision}",response_model=Revision)
def receipt(id:UUID,revision:UUID,request:Request,db:Session=Depends(session_dependency),principal:Principal=Depends(require_permission("content.manage"))):
    row=db.execute(text("SELECT * FROM media_asset_versions WHERE asset_id=:id AND revision_id=:revision"),{"id":id,"revision":revision}).mappings().first()
    return dict(row) if row else failure(request,"media_revision_not_found",404)


@router.put("/{id}/versions/{revision}",response_model=Revision)
def save(id:UUID,revision:UUID,body:Upload,request:Request,db:Session=Depends(session_dependency),principal:Principal=Depends(require_permission("content.manage"))):
    actor,denied=write_access(request,db,principal,"content.manage")
    if denied is not None:
        return denied
    return save_record(db, actor, id, revision, body, request)


def save_record(db, actor, id, revision, body, request, *, commit=True):
    db.execute(text("SELECT pg_advisory_xact_lock(78214,37)"))
    current=db.execute(text("SELECT * FROM media_assets WHERE id=:id FOR UPDATE"),{"id":id}).mappings().first()
    prior=db.execute(text("SELECT * FROM media_asset_versions WHERE revision_id=:revision"),{"revision":revision}).mappings().first()
    metadata=body.metadata.model_dump(mode="json")
    content=None
    digest: str | None
    if body.content_base64 is not None:
        try:
            content=base64.b64decode(body.content_base64,validate=True)
            validate_attachment(body.file_name,content)
        except ValueError:
            return failure(request,"invalid_media",422)
        digest=hashlib.sha256(content).hexdigest()
    elif prior:
        # A body without bytes means reuse the previous version, never an unseen later blob.
        digest=db.scalar(text("SELECT sha256 FROM media_asset_versions WHERE asset_id=:id AND version=:version"),{"id":id,"version":body.expected_version})
    else:
        digest=current["sha256"] if current else None
    if not digest:
        return failure(request,"media_file_required",422)
    if prior:
        if (prior["asset_id"],str(prior["actor_id"]),prior["expected_version"],prior["action"],prior["purpose"],prior["metadata"],prior["file_name"],prior["sha256"],prior["reason"])==(id,str(actor.id),body.expected_version,body.action,body.purpose,metadata,body.file_name,digest,body.reason):
            return dict(prior)
        return failure(request,"media_command_conflict",409)
    if (current["version"] if current else 0)!=body.expected_version:
        return failure(request,"media_version_conflict",409)
    if current and current["purpose"]!=body.purpose:
        return failure(request,"media_purpose_immutable",409)
    if body.content_base64 is None and current and current["file_name"]!=body.file_name:
        return failure(request,"media_file_required",422)
    if body.metadata.sku_id and not db.scalar(text("SELECT id FROM catalog_skus WHERE id=:id FOR SHARE"),{"id":body.metadata.sku_id}):
        return failure(request,"media_sku_not_found",422)
    params={"id":id,"version":body.expected_version+1,"expected":body.expected_version,"metadata":json.dumps(metadata),"sha":digest,"name":body.file_name,"purpose":body.purpose,"action":body.action,"actor":actor.id,"revision":revision,"reason":body.reason}
    try:
        if content is not None:
            db.execute(text("INSERT INTO media_blobs(sha256,content,size) VALUES(:sha,:content,:size) ON CONFLICT(sha256) DO NOTHING"),{"sha":digest,"content":content,"size":len(content)})
        db.execute(text("INSERT INTO media_assets(id,purpose,version,metadata,sha256,file_name) VALUES(:id,:purpose,:version,CAST(:metadata AS jsonb),:sha,:name) ON CONFLICT(id) DO UPDATE SET version=:version,metadata=CAST(:metadata AS jsonb),sha256=:sha,file_name=:name,updated_at=now()"),params)
        row=db.execute(text("INSERT INTO media_asset_versions(revision_id,asset_id,actor_id,expected_version,version,action,purpose,metadata,sha256,file_name,reason) VALUES(:revision,:id,:actor,:expected,:version,:action,:purpose,CAST(:metadata AS jsonb),:sha,:name,:reason) RETURNING *"),params).mappings().one()
        if body.action!="draft":
            db.execute(text("UPDATE media_assets SET published_revision=:revision WHERE id=:id"),{"id":id,"revision":revision if body.action=="publish" else None})
        payload={"asset_id":str(id),"revision_id":str(revision),"version":params["version"],"action":body.action}
        SqlAccountManagement(db).audit(actor.id,actor.id,"media.asset_saved",payload,body.reason)
        enqueue(db,"media.asset_saved",payload)
        if commit:
            db.commit()
        return dict(row)
    except Exception:
        db.rollback()
        raise


def binary_response(row,request,inline=False,thumbnail=False):
    if not row:
        return failure(request,"media_not_found",404)
    content=bytes(row["content"])
    if len(content)!=row["size"] or hashlib.sha256(content).hexdigest()!=row["sha256"]:
        return failure(request,"media_integrity_error",503)
    kind=media_type(row["file_name"])
    if thumbnail:
        from io import BytesIO
        from PIL import Image, ImageOps, UnidentifiedImageError
        try:
            with Image.open(BytesIO(content)) as image:
                image=ImageOps.exif_transpose(image)
                image.thumbnail((480,480),Image.Resampling.LANCZOS)
                output=BytesIO()
                image.convert('RGBA' if 'A' in image.getbands() else 'RGB').save(output,'WEBP',quality=65,method=4)
                content=output.getvalue(); kind='image/webp'
        except (ValueError, OSError, UnidentifiedImageError, Image.DecompressionBombError):
            return failure(request,'media_preview_unavailable',422)
    return Response(content,media_type=kind,headers={"Content-Disposition":("inline" if inline else "attachment")+"; filename*=UTF-8''"+quote(row["file_name"],safe=""),"X-Content-Type-Options":"nosniff","Content-Security-Policy":"sandbox; default-src 'none'","Cache-Control":"no-store"})


@router.get("/{id}/versions/{revision}/content")
def private_content(id:UUID,revision:UUID,request:Request,db:Session=Depends(session_dependency),principal:Principal=Depends(require_permission("content.manage"))):
    row=db.execute(text("SELECT v.file_name,v.sha256,b.content,b.size FROM media_asset_versions v JOIN media_blobs b ON b.sha256=v.sha256 WHERE v.asset_id=:id AND v.revision_id=:revision"),{"id":id,"revision":revision}).mappings().first()
    return binary_response(row,request)


@public_router.get("/{id}/content")
def public_content(id:UUID,request:Request,thumbnail:bool=False,db:Session=Depends(session_dependency)):
    row=db.execute(text("SELECT v.file_name,v.sha256,b.content,b.size FROM media_assets a JOIN media_asset_versions v ON v.revision_id=a.published_revision AND v.asset_id=a.id JOIN media_blobs b ON b.sha256=v.sha256 WHERE a.id=:id AND a.purpose='public_image' AND v.purpose='public_image' AND v.action='publish'"),{"id":id}).mappings().first()
    return binary_response(row,request,True,thumbnail=thumbnail)

@public_router.get('/{id}/versions/{revision}/content')
def public_revision_content(id:UUID,revision:UUID,request:Request,thumbnail:bool=False,db:Session=Depends(session_dependency)):
    row=db.execute(text("SELECT v.file_name,v.sha256,b.content,b.size FROM media_assets a JOIN media_asset_versions v ON v.asset_id=a.id JOIN media_blobs b ON b.sha256=v.sha256 WHERE a.id=:id AND v.revision_id=:revision AND a.published_revision IS NOT NULL AND a.purpose='public_image' AND v.purpose='public_image' AND v.action='publish'"),{'id':id,'revision':revision}).mappings().first()
    return binary_response(row,request,True,thumbnail=thumbnail)
