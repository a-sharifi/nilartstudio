"""Source-document stock writes owned by the caller transaction; never commit here."""

import json
from decimal import ROUND_HALF_UP, Decimal, localcontext
from uuid import uuid5

from sqlalchemy import text

from nilart.contexts.inventory.router import NAMESPACE, source


class DocumentStockError(Exception):
    pass


def move_stock(
    db,
    actor_id,
    document_id,
    event_id,
    line,
    quantity,
    incoming_value,
    reason,
    *,
    domain="purchase",
    action_override=None,
):
    # Same lock as manual adjustments: no independent stock writer can pass this transaction.
    db.execute(text("SELECT pg_advisory_xact_lock(78214,35)"))
    metadata = source(db, line["kind"], line["reference_id"])
    if not metadata or metadata["unit"] != line["unit"]:
        raise DocumentStockError(f"{domain}_stock_unit_changed")
    pid = uuid5(NAMESPACE, f"{line['kind']}:{line['reference_id']}")
    row = (
        db.execute(text("SELECT * FROM inventory_positions WHERE id=:id FOR UPDATE"), {"id": pid})
        .mappings()
        .first()
    )
    if row and row["unit"] != line["unit"]:
        raise DocumentStockError(f"{domain}_stock_unit_changed")
    qty, value, reserved = (
        (row["quantity"], row["value"], row["reserved"])
        if row
        else (Decimal(0), Decimal(0), Decimal(0))
    )
    version = row["version"] if row else 0
    with localcontext() as ctx:
        ctx.prec = 60
        if quantity < 0:
            if -quantity > qty - reserved:
                raise DocumentStockError(f"{domain}_stock_insufficient")
            cost = (
                -value
                if -quantity == qty
                else (value * quantity / qty).quantize(Decimal(".000001"), rounding=ROUND_HALF_UP)
            )
        else:
            cost = incoming_value
        newqty, newvalue = qty + quantity, value + cost
        if newqty >= Decimal("1e18") or newvalue >= Decimal("1e18"):
            raise DocumentStockError(f"{domain}_stock_capacity")
    action = action_override or ("purchase_receipt" if quantity > 0 else "purchase_return")
    movement_id = uuid5(event_id, str(line["id"]))
    intent = dict(
        kind=line["kind"],
        reference_id=str(line["reference_id"]),
        expected_version=version,
        action=("increase" if row else "opening") if quantity > 0 else "decrease",
        quantity=format(abs(quantity), "f"),
        value=format(cost, "f") if quantity > 0 else None,
        threshold=None,
        reverses_id=None,
        reason=reason,
    )
    params = dict(
        id=pid,
        kind=line["kind"],
        reference=line["reference_id"],
        **dict(metadata),
        quantity=newqty,
        value=newvalue,
        version=version + 1,
        expected=version,
        command=movement_id,
        actor=actor_id,
        action=action,
        delta=quantity,
        cost=cost,
        reason=reason,
        intent=json.dumps(intent),
        document=document_id,
        event=event_id,
    )
    if row:
        db.execute(
            text(
                "UPDATE inventory_positions SET quantity=:quantity,value=:value,version=:version WHERE id=:id"
            ),
            params,
        )
    else:
        db.execute(
            text(
                "INSERT INTO inventory_positions(id,kind,reference_id,code,title_fa,title_en,unit,quantity,reserved,value,version) VALUES(:id,:kind,:reference,:code,:title_fa,:title_en,:unit,:quantity,0,:value,:version)"
            ),
            params,
        )
    columns = ",source_document_kind" if domain != "purchase" else ""
    values = ",:domain" if domain != "purchase" else ""
    params["domain"] = domain
    db.execute(
        text(
            "INSERT INTO inventory_movements(id,position_id,actor_id,kind,expected_version,version,quantity_delta,value_delta,quantity_after,value_after,threshold_after,reason,intent,source_document_id,source_event_id"
            + columns
            + ") VALUES(:command,:id,:actor,:action,:expected,:version,:delta,:cost,:quantity,:value,(SELECT threshold FROM inventory_positions WHERE id=:id),:reason,CAST(:intent AS jsonb),:document,:event"
            + values
            + ")"
        ),
        params,
    )
    return dict(
        movement_id=str(movement_id),
        position_id=str(pid),
        quantity_delta=format(quantity, "f"),
        value_delta=format(cost, "f"),
    )
