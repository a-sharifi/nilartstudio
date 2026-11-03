"""Transaction-owned stock writes; immutable receipts allow exact retry recovery."""
import json
from decimal import ROUND_HALF_UP, Decimal, localcontext
from uuid import uuid5

from sqlalchemy import text

from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.identity.presentation.router import failure
from nilart.contexts.inventory.router import NAMESPACE, movement, source
from nilart.shared.outbox import enqueue


def apply_adjustment(db, actor, request, id, body, *, commit=True):
    db.execute(text("SELECT pg_advisory_xact_lock(78214,35)"))
    intent=body.model_dump(mode="json")
    prior=db.execute(text("SELECT * FROM inventory_movements WHERE id=:id"),{"id":id}).mappings().first()
    if prior:
        return movement(prior) if prior["intent"]==intent and str(prior["actor_id"])==str(actor.id) else failure(request,"stock_command_conflict",409)
    metadata=source(db,body.kind,body.reference_id)
    if not metadata:
        return failure(request,"stock_reference_not_found",404)
    pid=uuid5(NAMESPACE,f"{body.kind}:{body.reference_id}")
    row=db.execute(text("SELECT * FROM inventory_positions WHERE id=:id FOR UPDATE"),{"id":pid}).mappings().first()
    if (row["version"] if row else 0)!=body.expected_version:
        return failure(request,"stock_version_conflict",409)
    if row and row["unit"]!=metadata["unit"]:
        return failure(request,"stock_unit_changed",409)
    if not row and body.action not in {"opening","threshold"}:
        return failure(request,"stock_opening_required",409)
    if body.action=="opening" and row and db.scalar(text("SELECT 1 FROM inventory_movements WHERE position_id=:id AND quantity_delta<>0 LIMIT 1"),{"id":pid}):
        return failure(request,"stock_opening_exists",409)
    qty=row["quantity"] if row else Decimal(0)
    value=row["value"] if row else Decimal(0)
    reserved=row["reserved"] if row else Decimal(0)
    threshold=row["threshold"] if row else None
    with localcontext() as ctx:
        ctx.prec=60
        delta=Decimal(body.quantity)
        cost=Decimal(body.value or "0")
        if body.action in {"decrease","waste"}:
            if delta>qty-reserved:
                return failure(request,"stock_insufficient",409)
            cost=-value if delta==qty else -(value*delta/qty).quantize(Decimal(".000001"),rounding=ROUND_HALF_UP)
            delta=-delta
        elif body.action=="revalue":
            cost=Decimal(body.value)-value
        elif body.action=="threshold":
            threshold=Decimal(body.threshold) if body.threshold is not None else None
        elif body.action=="reverse":
            original=db.execute(text("SELECT * FROM inventory_movements WHERE id=:id AND position_id=:position"),{"id":body.reverses_id,"position":pid}).mappings().first()
            if not original or original.get("source_document_id") or original["kind"]=="reverse" or original["version"]!=body.expected_version or db.scalar(text("SELECT id FROM inventory_movements WHERE reverses_id=:id"),{"id":body.reverses_id}):
                return failure(request,"stock_reversal_conflict",409)
            delta=-original["quantity_delta"]
            cost=-original["value_delta"]
            threshold=db.scalar(text("SELECT threshold_after FROM inventory_movements WHERE position_id=:id AND version=:version"),{"id":pid,"version":original["version"]-1})
        newqty,newvalue=qty+delta,value+cost
        if newqty<reserved or newvalue<0 or (not newqty and newvalue):
            return failure(request,"stock_insufficient",409)
        if body.kind=="artwork" and newqty>1:
            return failure(request,"stock_original_unique",409)
        if newqty>=Decimal("1e18") or newvalue>=Decimal("1e18"):
            return failure(request,"stock_capacity_exceeded",422)
    params={"id":pid,"kind":body.kind,"reference":body.reference_id,**dict(metadata),"quantity":newqty,"value":newvalue,"threshold":threshold,"version":body.expected_version+1,"expected":body.expected_version,"command":id,"actor":actor.id,"action":body.action,"delta":delta,"cost":cost,"reverses":body.reverses_id,"reason":body.reason,"intent":json.dumps(intent)}
    try:
        if row:
            db.execute(text("UPDATE inventory_positions SET quantity=:quantity,value=:value,threshold=:threshold,version=:version WHERE id=:id"),params)
        else:
            db.execute(text("INSERT INTO inventory_positions(id,kind,reference_id,code,title_fa,title_en,unit,quantity,reserved,value,threshold,version) VALUES(:id,:kind,:reference,:code,:title_fa,:title_en,:unit,:quantity,0,:value,:threshold,:version)"),params)
        result=db.execute(text("INSERT INTO inventory_movements(id,position_id,actor_id,kind,expected_version,version,quantity_delta,value_delta,quantity_after,value_after,threshold_after,reverses_id,reason,intent) VALUES(:command,:id,:actor,:action,:expected,:version,:delta,:cost,:quantity,:value,:threshold,:reverses,:reason,CAST(:intent AS jsonb)) RETURNING *"),params).mappings().one()
        payload={"position_id":str(pid),"movement_id":str(id),"version":params["version"]}
        SqlAccountManagement(db).audit(actor.id,actor.id,"inventory.adjusted",payload,body.reason)
        enqueue(db,"inventory.adjusted",payload)
        if commit:
            db.commit()
        return movement(result)
    except Exception:
        db.rollback()
        raise
