"""Physical stock adjustments with moving-average valuation and immutable receipts."""
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal, localcontext
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.contexts.business.router import Strict
from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.contexts.identity.presentation.router import failure
from nilart.shared.database import session_dependency

router=APIRouter(prefix="/api/v1/admin/inventory",tags=["inventory"])
Number=Annotated[str,Field(pattern=r"^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,6})?$")]
Kind=Literal["sku","material","artwork"]
NAMESPACE=UUID("0c306c1a-78b9-4bbb-af51-033cd21c0ca1")


class Command(Strict):
    kind: Kind
    reference_id: UUID
    expected_version: int=Field(strict=True,ge=0,le=2147483646)
    action: Literal["opening","increase","decrease","waste","threshold","reverse","revalue"]
    quantity: Number="0"
    value: Number | None=None
    threshold: Number | None=None
    reverses_id: UUID | None=None
    reason: str=Field(min_length=1,max_length=1000)

    @model_validator(mode="after")
    def valid(self):
        if self.action in {"opening","increase","decrease","waste"} and Decimal(self.quantity)<=0:
            raise ValueError("Positive quantity required")
        if self.action in {"opening","increase","revalue"} and self.value is None:
            raise ValueError("Explicit incoming total valuation required")
        if self.action not in {"opening","increase","revalue"} and self.value is not None:
            raise ValueError("Outgoing costs derive from recorded valuation")
        if self.action in {"threshold","reverse","revalue"} and Decimal(self.quantity)!=0:
            raise ValueError("No quantity for metadata or reversal")
        if (self.action=="reverse") != (self.reverses_id is not None):
            raise ValueError("Reversal must identify the original movement")
        if self.action!="threshold" and self.threshold is not None:
            raise ValueError("Threshold requires its own command")
        if self.kind in {"sku","artwork"} and Decimal(self.quantity)!=Decimal(self.quantity).to_integral_value():
            raise ValueError("Finished goods use whole units")
        return self


class Position(BaseModel):
    id: UUID
    kind: Kind
    reference_id: UUID
    code: str
    title_fa: str
    title_en: str
    unit: str
    quantity: str
    reserved: str
    available: str
    value: str
    average_cost: str | None
    threshold: str | None
    version: int


class RecordedCommand(Command):
    value: Annotated[str, Field(pattern=r"^(?:0|[1-9][0-9]{0,17})(?:\.[0-9]{1,6})?$")] | None = None


class Movement(BaseModel):
    source_document_kind: Literal["purchase", "production", "fulfillment", "marketplace"] | None = None
    source_document_id: UUID | None = None
    source_event_id: UUID | None = None
    id: UUID
    position_id: UUID
    actor_id: UUID
    kind: str
    expected_version: int
    version: int
    quantity_delta: str
    value_delta: str
    quantity_after: str
    value_after: str
    threshold_after: str | None
    reverses_id: UUID | None
    reason: str
    intent: RecordedCommand
    created_at: datetime


class Positions(BaseModel):
    items: list[Position]
    next_cursor: UUID | None


class Movements(BaseModel):
    items: list[Movement]
    next_before_version: int | None


def fmt(value):
    return None if value is None else format(value,"f")


def position(row):
    with localcontext() as ctx:
        ctx.prec=60
        return {**dict(row),"quantity":fmt(row["quantity"]),"reserved":fmt(row["reserved"]),"available":fmt(row["quantity"]-row["reserved"]),"value":fmt(row["value"]),"threshold":fmt(row["threshold"]),"average_cost":fmt((row["value"]/row["quantity"]).quantize(Decimal(".000001"),rounding=ROUND_HALF_UP)) if row["quantity"] else None}


def movement(row):
    return {**dict(row),**{k:fmt(row[k]) for k in ("quantity_delta","value_delta","quantity_after","value_after","threshold_after")}}


def source(db,kind,reference):
    if kind=="sku":
        row=db.execute(text("SELECT s.code,p.title_fa,p.title_en,'piece' AS unit FROM catalog_skus s JOIN catalog_products p ON p.id=s.product_id WHERE s.id=:id"),{"id":reference}).mappings().first()
    elif kind=="material":
        row=db.execute(text("SELECT code,content->>'title_fa' AS title_fa,content->>'title_en' AS title_en,content->>'base_unit' AS unit FROM cost_resources WHERE id=:id AND kind='material'"),{"id":reference}).mappings().first()
    else:
        row=db.execute(text("SELECT slug AS code,title_fa,title_en,'piece' AS unit FROM catalog_artworks WHERE id=:id"),{"id":reference}).mappings().first()
    return row


@router.get("",response_model=Positions)
def listing(q:str=Query("",max_length=200),kind:Kind|None=None,low:bool=False,cursor:UUID|None=None,limit:int=Query(25,ge=1,le=100),db:Session=Depends(session_dependency),principal:Principal=Depends(require_permission("inventory.manage"))):
    rows=db.execute(text("SELECT * FROM inventory_positions WHERE (:q='' OR strpos(lower(concat_ws(' ',code,title_fa,title_en)),lower(CAST(:q AS text)))>0) AND (CAST(:kind AS text) IS NULL OR kind=:kind) AND (NOT :low OR quantity-reserved<=threshold) AND (CAST(:cursor AS uuid) IS NULL OR id>CAST(:cursor AS uuid)) ORDER BY id LIMIT :limit"),{"q":q.strip(),"kind":kind,"low":low,"cursor":cursor,"limit":limit+1}).mappings().all()
    return {"items":[position(r) for r in rows[:limit]],"next_cursor":rows[limit-1]["id"] if len(rows)>limit else None}


class Choice(BaseModel):
    id: UUID
    code: str
    title_fa: str
    title_en: str
    unit: str


class Choices(BaseModel):
    items: list[Choice]
    next_cursor: UUID | None


@router.get("/choices/{kind}",response_model=Choices)
def choices(kind:Kind,q:str=Query("",max_length=200),cursor:UUID|None=None,limit:int=Query(25,ge=1,le=100),db:Session=Depends(session_dependency),principal:Principal=Depends(require_permission("inventory.manage"))):
    queries={"sku":"SELECT s.id,s.code,p.title_fa,p.title_en,'piece' AS unit FROM catalog_skus s JOIN catalog_products p ON p.id=s.product_id","material":"SELECT id,code,content->>'title_fa' AS title_fa,content->>'title_en' AS title_en,content->>'base_unit' AS unit FROM cost_resources WHERE kind='material'","artwork":"SELECT id,slug AS code,title_fa,title_en,'piece' AS unit FROM catalog_artworks"}
    rows=db.execute(text("SELECT * FROM ("+queries[kind]+") c WHERE (:q='' OR strpos(lower(concat_ws(' ',code,title_fa,title_en)),lower(CAST(:q AS text)))>0) AND (CAST(:cursor AS uuid) IS NULL OR id>CAST(:cursor AS uuid)) ORDER BY id LIMIT :limit"),{"q":q.strip(),"cursor":cursor,"limit":limit+1}).mappings().all()
    return {"items":[dict(r) for r in rows[:limit]],"next_cursor":rows[limit-1]["id"] if len(rows)>limit else None}


@router.get("/positions/{id}",response_model=Position)
def detail(id:UUID,request:Request,db:Session=Depends(session_dependency),principal:Principal=Depends(require_permission("inventory.manage"))):
    row=db.execute(text("SELECT * FROM inventory_positions WHERE id=:id"),{"id":id}).mappings().first()
    return position(row) if row else failure(request,"stock_not_found",404)


@router.get("/positions/{id}/movements",response_model=Movements)
def history(id:UUID,request:Request,before:int|None=Query(None,ge=1),limit:int=Query(25,ge=1,le=100),db:Session=Depends(session_dependency),principal:Principal=Depends(require_permission("inventory.manage"))):
    if not db.scalar(text("SELECT id FROM inventory_positions WHERE id=:id"),{"id":id}):
        return failure(request,"stock_not_found",404)
    rows=db.execute(text("SELECT * FROM inventory_movements WHERE position_id=:id AND (CAST(:before AS integer) IS NULL OR version<:before) ORDER BY version DESC LIMIT :limit"),{"id":id,"before":before,"limit":limit+1}).mappings().all()
    return {"items":[movement(r) for r in rows[:limit]],"next_before_version":rows[limit-1]["version"] if len(rows)>limit else None}


@router.get("/commands/{id}",response_model=Movement)
def receipt(id:UUID,request:Request,db:Session=Depends(session_dependency),principal:Principal=Depends(require_permission("inventory.manage"))):
    row=db.execute(text("SELECT * FROM inventory_movements WHERE id=:id"),{"id":id}).mappings().first()
    return movement(row) if row else failure(request,"stock_command_not_found",404)


@router.put("/commands/{id}",response_model=Movement)
def adjust(id:UUID,body:Command,request:Request,db:Session=Depends(session_dependency),principal:Principal=Depends(require_permission("inventory.manage"))):
    actor,denied=write_access(request,db,principal,"inventory.manage")
    if denied is not None:
        return denied
    # Canonical command content is persisted separately from normalized movement amounts.
    from nilart.contexts.inventory.service import apply_adjustment
    return apply_adjustment(db,actor,request,id,body)


class WasteItem(BaseModel):
    movement: Movement
    code: str
    title_fa: str
    title_en: str
    unit: str
    reversed: bool


class WastePage(BaseModel):
    items: list[WasteItem]
    next_cursor: UUID | None


@router.get("/waste", response_model=WastePage)
def waste(q: str = Query("", max_length=200), cursor: UUID | None = None,
          limit: int = Query(25, ge=1, le=100), db: Session = Depends(session_dependency),
          principal: Principal = Depends(require_permission("inventory.manage"))):
    rows = db.execute(text("SELECT m.*,p.code,p.title_fa,p.title_en,p.unit,EXISTS(SELECT 1 FROM inventory_movements r WHERE r.reverses_id=m.id) AS reversed FROM inventory_movements m JOIN inventory_positions p ON p.id=m.position_id WHERE m.kind='waste' AND (:q='' OR strpos(lower(concat_ws(' ',p.code,p.title_fa,p.title_en,m.reason)),lower(CAST(:q AS text)))>0) AND (CAST(:cursor AS uuid) IS NULL OR m.id>:cursor) ORDER BY m.id LIMIT :limit"), dict(q=q.strip(),cursor=cursor,limit=limit+1)).mappings().all()
    return dict(items=[dict(movement=movement(r),**{key:r[key] for key in ("code","title_fa","title_en","unit","reversed")}) for r in rows[:limit]],next_cursor=rows[limit-1]["id"] if len(rows)>limit else None)
