"""Versioned purchases; invoice, receipt and receipt-linked return are separate events."""
import json
from datetime import date, datetime
from decimal import ROUND_HALF_UP, Decimal, localcontext
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
from nilart.contexts.inventory.router import Number, source
from nilart.contexts.procurement.purchase_stock import PurchaseError, move_stock
from nilart.shared.database import session_dependency
from nilart.shared.outbox import enqueue

router = APIRouter(prefix="/api/v1/admin/procurement", tags=["purchases"])


class Line(Strict):
    id: UUID
    kind: Literal["material", "sku"]
    reference_id: UUID
    quantity: Number
    unit_price: Number
    discount: Number
    supplier_acquisition_cost: Number

    @model_validator(mode="after")
    def valid(self):
        if Decimal(self.quantity)<=0 or (self.kind=="sku" and Decimal(self.quantity)%1):
            raise ValueError("Positive base quantity required; SKUs use whole units")
        with localcontext() as ctx:
            ctx.prec=60
            gross=Decimal(self.quantity)*Decimal(self.unit_price)
            if Decimal(self.discount)>gross or gross+Decimal(self.supplier_acquisition_cost)>=Decimal("1e18"):
                raise ValueError("Invalid line amount")
        return self


class Content(Strict):
    supplier_id: UUID
    document_number: str=Field(min_length=1,max_length=100)
    document_date: date
    currency: Literal["IRT"]
    notes: str=Field(default="",max_length=2000)
    lines: list[Line]=Field(min_length=1,max_length=100)

    @model_validator(mode="after")
    def unique_lines(self):
        if len({v.id for v in self.lines})!=len(self.lines):
            raise ValueError("Duplicate line ID")
        if len({(v.kind,v.reference_id) for v in self.lines})!=len(self.lines):
            raise ValueError("Aggregate repeated purchase items into one line")
        return self


class Quantity(Strict):
    line_id: UUID
    quantity: Number

    @model_validator(mode="after")
    def positive(self):
        if Decimal(self.quantity)<=0:
            raise ValueError("Positive receipt/return quantity required")
        return self


class Command(Strict):
    expected_version: int=Field(strict=True,ge=0,le=2147483646)
    action: Literal["draft","post","receive","return","cancel"]
    content: Content|None=None
    lines: list[Quantity]=Field(default_factory=list,max_length=100)
    receipt_id: UUID|None=None
    reason: str=Field(min_length=1,max_length=1000)

    @model_validator(mode="after")
    def shape(self):
        if (self.action=="draft") != (self.content is not None):
            raise ValueError("Content belongs only to a draft command")
        if (self.action in {"receive","return"}) != bool(self.lines):
            raise ValueError("Receipt and return need quantities")
        if (self.action=="return") != (self.receipt_id is not None):
            raise ValueError("Return needs its source receipt")
        if len({v.line_id for v in self.lines})!=len(self.lines):
            raise ValueError("Duplicate quantity line")
        return self


class FrozenLine(Line):
    code: str
    title_fa: str
    title_en: str
    unit: str
    total: str


class FrozenContent(Content):
    supplier_name_fa: str
    supplier_name_en: str
    lines: list[FrozenLine]


class LineBalance(BaseModel):
    received: str
    returned: str
    received_value: str
    credited: str


class StockEffect(BaseModel):
    movement_id: UUID
    position_id: UUID
    quantity_delta: str
    value_delta: str
    supplier_credit: str | None = None
    valuation_difference: str | None = None


class PurchaseState(BaseModel):
    lines: dict[str, LineBalance]
    total: str
    liability: str
    movements: list[StockEffect]


class Purchase(BaseModel):
    id: UUID
    supplier_id: UUID
    status: Literal["draft","posted","cancelled"]
    content: FrozenContent
    state: PurchaseState
    version: int
    updated_at: datetime


class Event(BaseModel):
    id: UUID
    purchase_id: UUID
    actor_id: UUID
    version: int
    action: str
    intent: Command
    result: Purchase
    created_at: datetime


class Page(BaseModel):
    items: list[Purchase]
    next_cursor: UUID|None


class Statement(Page):
    supplier_id: UUID
    currency: Literal["IRT"] = "IRT"
    purchase_liability: str
    payments_included: Literal[False] = False


class History(BaseModel):
    items: list[Event]
    next_before_version: int|None


def rounded(value):
    return value.quantize(Decimal(".000001"), rounding=ROUND_HALF_UP)


def money(line):
    return rounded(Decimal(line["quantity"])*Decimal(line["unit_price"])-Decimal(line["discount"])+Decimal(line["supplier_acquisition_cost"]))


@router.get("/purchases", response_model=Page)
def listing(q:str=Query("",max_length=200), status:Literal["draft","posted","cancelled"]|None=None,
            supplier_id:UUID|None=None,cursor:UUID|None=None,limit:int=Query(25,ge=1,le=100),
            db:Session=Depends(session_dependency),principal:Principal=Depends(require_permission("inventory.manage"))):
    rows=db.execute(text("SELECT * FROM procurement_purchases WHERE (:q='' OR strpos(lower(content->>'document_number'),lower(CAST(:q AS text)))>0) AND (CAST(:status AS text) IS NULL OR status=:status) AND (CAST(:supplier AS uuid) IS NULL OR supplier_id=:supplier) AND (CAST(:cursor AS uuid) IS NULL OR id>:cursor) ORDER BY id LIMIT :limit"),dict(q=q.strip(),status=status,supplier=supplier_id,cursor=cursor,limit=limit+1)).mappings().all()
    return dict(items=[dict(r) for r in rows[:limit]],next_cursor=rows[limit-1]["id"] if len(rows)>limit else None)


@router.get("/purchases/{id}", response_model=Purchase)
def detail(id:UUID,request:Request,db:Session=Depends(session_dependency),principal:Principal=Depends(require_permission("inventory.manage"))):
    row=db.execute(text("SELECT * FROM procurement_purchases WHERE id=:id"),dict(id=id)).mappings().first()
    return dict(row) if row else failure(request,"purchase_not_found",404)


@router.get("/purchases/{id}/events",response_model=History)
def history(id:UUID,before:int|None=Query(None,ge=1),limit:int=Query(20,ge=1,le=100),db:Session=Depends(session_dependency),principal:Principal=Depends(require_permission("inventory.manage"))):
    rows=db.execute(text("SELECT * FROM procurement_purchase_events WHERE purchase_id=:id AND (CAST(:before AS int) IS NULL OR version<:before) ORDER BY version DESC LIMIT :limit"),dict(id=id,before=before,limit=limit+1)).mappings().all()
    return dict(items=[dict(r) for r in rows[:limit]],next_before_version=rows[limit-1]["version"] if len(rows)>limit else None)


@router.get("/purchases/{id}/commands/{key}",response_model=Event)
def receipt(id:UUID,key:UUID,request:Request,db:Session=Depends(session_dependency),principal:Principal=Depends(require_permission("inventory.manage"))):
    row=db.execute(text("SELECT * FROM procurement_purchase_events WHERE id=:key AND purchase_id=:id"),dict(id=id,key=key)).mappings().first()
    return dict(row) if row else failure(request,"purchase_command_not_found",404)


@router.get("/suppliers/{id}/purchase-statement", response_model=Statement)
def statement(id:UUID,cursor:UUID|None=None,limit:int=Query(25,ge=1,le=100),db:Session=Depends(session_dependency),principal:Principal=Depends(require_permission("inventory.manage"))):
    # This is purchase liability, not a cash/account balance. Payments remain separate.
    total=db.scalar(text("SELECT coalesce(sum((state->>'liability')::numeric),0) FROM procurement_purchases WHERE supplier_id=:id AND status='posted'"),dict(id=id))
    rows=db.execute(text("SELECT * FROM procurement_purchases WHERE supplier_id=:id AND status='posted' AND (CAST(:cursor AS uuid) IS NULL OR id>:cursor) ORDER BY id LIMIT :limit"),dict(id=id,cursor=cursor,limit=limit+1)).mappings().all()
    return dict(supplier_id=id,currency="IRT",purchase_liability=format(total,"f"),payments_included=False,items=[dict(r) for r in rows[:limit]],next_cursor=rows[limit-1]["id"] if len(rows)>limit else None)


@router.put("/purchases/{id}/commands/{key}",response_model=Event)
def command(id:UUID,key:UUID,body:Command,request:Request,db:Session=Depends(session_dependency),principal:Principal=Depends(require_permission("inventory.manage"))):
    actor,denied=write_access(request,db,principal,"inventory.manage")
    if denied is not None:
        return denied
    db.execute(text("SELECT pg_advisory_xact_lock(78214,38)"))
    intent=body.model_dump(mode="json")
    prior=db.execute(text("SELECT * FROM procurement_purchase_events WHERE id=:key"),dict(key=key)).mappings().first()
    if prior:
        return dict(prior) if prior["purchase_id"]==id and str(prior["actor_id"])==str(actor.id) and prior["intent"]==intent else failure(request,"purchase_command_conflict",409)
    row=db.execute(text("SELECT * FROM procurement_purchases WHERE id=:id FOR UPDATE"),dict(id=id)).mappings().first()
    if (row["version"] if row else 0)!=body.expected_version:
        return failure(request,"purchase_version_conflict",409)
    if not row and body.action!="draft":
        return failure(request,"purchase_not_found",404)
    content=json.loads(json.dumps(row["content"])) if row else {}
    state=json.loads(json.dumps(row["state"])) if row else {}
    status=row["status"] if row else "draft"
    try:
        with localcontext() as ctx:
            ctx.prec=60
            if body.action=="draft":
                if status!="draft":
                    raise PurchaseError("purchase_immutable")
                content=body.content.model_dump(mode="json")
                supplier=db.execute(text("SELECT content FROM procurement_suppliers WHERE id=:id"),dict(id=content["supplier_id"])).scalar_one_or_none()
                if not supplier or not supplier["active"] or supplier["kind"]=="service_provider":
                    raise PurchaseError("purchase_supplier_unavailable")
                content["supplier_name_fa"],content["supplier_name_en"]=supplier["title_fa"],supplier["title_en"]
                state=dict(lines={},total="0",liability="0",movements=[])
                total=Decimal(0)
                for line in content["lines"]:
                    meta=source(db,line["kind"],line["reference_id"])
                    if not meta:
                        raise PurchaseError("purchase_item_not_found")
                    line.update(dict(meta))
                    amount=money(line)
                    line["total"]=format(amount,"f")
                    state["lines"][line["id"]]=dict(received="0",returned="0",received_value="0",credited="0")
                    total+=amount
                if total>=Decimal("1e18"):
                    raise PurchaseError("purchase_amount_out_of_range")
                state["total"]=format(total,"f")
            elif body.action=="post":
                if status!="draft":
                    raise PurchaseError("purchase_state_conflict")
                supplier=db.scalar(text("SELECT content FROM procurement_suppliers WHERE id=:id"),dict(id=content["supplier_id"]))
                if not supplier or not supplier["active"] or supplier["kind"] == "service_provider":
                    raise PurchaseError("purchase_supplier_unavailable")
                for line in content["lines"]:
                    meta=source(db,line["kind"],line["reference_id"])
                    if not meta or meta["unit"]!=line["unit"]:
                        raise PurchaseError("purchase_stock_unit_changed")
                status="posted"
                state["liability"]=state["total"]
            elif body.action=="cancel":
                if status=="cancelled" or any(Decimal(v["received"]) for v in state["lines"].values()):
                    raise PurchaseError("purchase_cancellation_ineligible")
                status="cancelled"
                state["liability"]="0"
            else:
                if status!="posted":
                    raise PurchaseError("purchase_not_posted")
                state["movements"]=[]
                lines={v["id"]:v for v in content["lines"]}
                for change in body.lines:
                    lid=str(change.line_id)
                    line=lines.get(lid)
                    if not line:
                        raise PurchaseError("purchase_line_not_found")
                    qty=Decimal(change.quantity)
                    if line["kind"]=="sku" and qty%1:
                        raise PurchaseError("purchase_whole_quantity_required")
                    balance=state["lines"][lid]
                    if body.action=="receive":
                        received=Decimal(balance["received"])+qty
                        if received>Decimal(line["quantity"]):
                            raise PurchaseError("purchase_over_receipt")
                        # Cumulative allocation makes the final partial receipt absorb rounding.
                        value=rounded(Decimal(line["total"])*received/Decimal(line["quantity"]))-Decimal(balance["received_value"])
                        balance["received"],balance["received_value"]=format(received,"f"),format(Decimal(balance["received_value"])+value,"f")
                        db.execute(text("INSERT INTO procurement_receipt_lines(receipt_id,line_id,quantity,value) VALUES(:receipt,:line,:quantity,:value)"),dict(receipt=key,line=change.line_id,quantity=qty,value=value))
                        movement=move_stock(db,actor.id,id,key,line,qty,value,body.reason)
                    else:
                        original=db.execute(text("SELECT r.* FROM procurement_receipt_lines r JOIN procurement_purchase_events e ON e.id=r.receipt_id WHERE r.receipt_id=:receipt AND r.line_id=:line AND e.purchase_id=:purchase FOR UPDATE OF r"),dict(receipt=body.receipt_id,line=change.line_id,purchase=id)).mappings().first()
                        if not original or original["returned"]+qty>original["quantity"]:
                            raise PurchaseError("purchase_return_exceeds_receipt")
                        returned=original["returned"]+qty
                        credit=rounded(original["value"]*returned/original["quantity"])-original["credited"]
                        db.execute(text("UPDATE procurement_receipt_lines SET returned=:returned,credited=credited+:credit WHERE receipt_id=:receipt AND line_id=:line"),dict(returned=returned,credit=credit,receipt=body.receipt_id,line=change.line_id))
                        balance["returned"]=format(Decimal(balance["returned"])+qty,"f")
                        balance["credited"]=format(Decimal(balance["credited"])+credit,"f")
                        state["liability"]=format(Decimal(state["liability"])-credit,"f")
                        movement=move_stock(db,actor.id,id,key,line,-qty,None,body.reason)
                        movement["supplier_credit"]=format(credit,"f")
                        movement["valuation_difference"]=format(credit+Decimal(movement["value_delta"]),"f")
                    state["movements"].append(movement)
            params=dict(id=id,supplier=content["supplier_id"],status=status,content=json.dumps(content),state=json.dumps(state),version=body.expected_version+1)
            if row:
                record=db.execute(text("UPDATE procurement_purchases SET supplier_id=:supplier,status=:status,content=CAST(:content AS jsonb),state=CAST(:state AS jsonb),version=:version,updated_at=now() WHERE id=:id RETURNING *"),params).mappings().one()
            else:
                record=db.execute(text("INSERT INTO procurement_purchases(id,supplier_id,status,content,state,version) VALUES(:id,:supplier,:status,CAST(:content AS jsonb),CAST(:state AS jsonb),:version) RETURNING *"),params).mappings().one()
            output=Purchase(**dict(record)).model_dump(mode="json")
            event=db.execute(text("INSERT INTO procurement_purchase_events(id,purchase_id,actor_id,version,action,intent,result) VALUES(:key,:id,:actor,:version,:action,CAST(:intent AS jsonb),CAST(:result AS jsonb)) RETURNING *"),dict(key=key,id=id,actor=actor.id,version=params["version"],action=body.action,intent=json.dumps(intent),result=json.dumps(output))).mappings().one()
            payload=dict(purchase_id=str(id),event_id=str(key),version=params["version"],action=body.action)
            SqlAccountManagement(db).audit(actor.id,actor.id,"procurement.purchase_changed",payload,body.reason)
            enqueue(db,"procurement.purchase_changed",payload)
            db.commit()
            return dict(event)
    except PurchaseError as exc:
        db.rollback()
        return failure(request,str(exc),409)
    except Exception:
        db.rollback()
        raise
