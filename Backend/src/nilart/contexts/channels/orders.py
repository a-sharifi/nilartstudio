"""Authoritative paid vendor parcels; reserve centrally, consume once on dispatch.
Historical/preview orders never change inventory. Returns require physical inspection.
"""

import json
from collections import defaultdict
from datetime import datetime
from decimal import Decimal
from types import SimpleNamespace
from uuid import UUID, uuid5

from sqlalchemy import text
from starlette.requests import Request

from nilart.contexts.channels.adapters import ChannelError
from nilart.contexts.channels.models import Config
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.inventory.reservations import stock_lock
from nilart.contexts.inventory.router import Command
from nilart.contexts.inventory.service import apply_adjustment

NAMESPACE = UUID("7fceaa2b-5cc1-49a4-96a4-470995af9bc9")
PENDING = {3739, 3237, 5017, 3572, 3740, 4633, 5075}
DISPATCHED = {3238, 3195, 3233}
CANCELLED = 3067


def stamp(value):
    value = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if value.tzinfo is None:
        raise ValueError("Timezone required")
    return value


def ingest(db, channel_row, parcel):
    config = Config.model_validate(channel_row["config"])
    try:
        external = parcel["id"]
        vendor = parcel["vendor"]["id"]
        updated = stamp(parcel["updated_at"])
        paid = stamp(parcel["order"]["paid_at"])
        status = int(parcel["status"]["value"])
        if type(external) is not int or external < 1 or vendor != config.vendor_id:
            raise ValueError()
        if not isinstance(parcel["items"], list) or len(parcel["items"]) > 1000:
            raise ValueError()
        items = []
        for item in parcel["items"]:
            pid = item["product"]["id"]
            variation = (item.get("variation") or {}).get("id")
            if (
                type(pid) is not int
                or type(item["quantity"]) is not int
                or not 1 <= item["quantity"] <= 100000
            ):
                raise ValueError()
            if type(item["price"]) is not int or item["price"] < 0:
                raise ValueError()
            items.append(
                dict(
                    product_id=pid,
                    variation_id=variation,
                    quantity=item["quantity"],
                    price_rial=item["price"],
                    title=item["title"],
                )
            )
    except (KeyError, ValueError, TypeError, OverflowError):
        raise ChannelError("channel_order_invalid") from None
    stock_lock(db)
    oid = uuid5(NAMESPACE, f"{channel_row['code']}:{external}")
    previous = (
        db.execute(text("SELECT * FROM channel_orders WHERE id=:id FOR UPDATE"), dict(id=oid))
        .mappings()
        .first()
    )
    if previous and updated < previous["provider_updated_at"]:
        db.execute(text("UPDATE channel_orders SET checked_at=now() WHERE id=:id"), dict(id=oid))
        return previous
    existing = (
        db.execute(
            text(
                "SELECT * FROM channel_stock_commitments WHERE order_id=:id ORDER BY position_id FOR UPDATE"
            ),
            dict(id=oid),
        )
        .mappings()
        .all()
    )
    if previous and updated == previous["provider_updated_at"] and previous["snapshot"] != parcel:
        raise ChannelError("channel_order_revision_conflict")
    if (
        previous
        and previous["snapshot"] == parcel
        and previous["status"] not in ("preview", "historical", "needs_review")
    ):
        db.execute(text("UPDATE channel_orders SET checked_at=now() WHERE id=:id"), dict(id=oid))
        return previous
    historical = not channel_row["live_since"] or paid < channel_row["live_since"]
    mode = (
        "preview"
        if config.mode != "live"
        else "historical"
        if historical
        else "cancelled"
        if status == CANCELLED
        else "dispatched"
        if status in DISPATCHED
        else "processing"
        if status in PENDING
        else "needs_review"
    )
    issue = "unknown_provider_status" if mode == "needs_review" else None
    needs = defaultdict(int)
    if mode not in ("preview", "historical", "cancelled"):
        for item in items:
            mapping = db.execute(
                text("""SELECT i.id FROM channel_listings l JOIN inventory_positions i ON i.kind='sku' AND i.reference_id=l.sku_id
              WHERE l.channel=:channel AND l.external_product_id=:pid AND COALESCE(l.external_variation_id,0)=:variant"""),
                dict(
                    channel=channel_row["code"],
                    pid=item["product_id"],
                    variant=item["variation_id"] or 0,
                ),
            ).scalar()
            if not mapping:
                issue = "order_product_unmapped"
                break
            needs[mapping] += item["quantity"]
    prior = {r["position_id"]: r for r in existing}
    if any(r["state"] == "consumed" for r in existing):
        # Provider cancellation/return is not evidence of goods physically received.
        if mode == "cancelled":
            issue = "return_requires_inspection"
        mode = "dispatched"
        if (
            any(needs.get(pid, 0) != int(r["quantity"]) for pid, r in prior.items())
            and status != CANCELLED
        ):
            issue = "dispatched_quantity_changed"
    if issue:
        mode = "needs_review"
    if mode in ("processing", "dispatched") and not any(r["state"] == "consumed" for r in existing):
        for pid in sorted(set(needs) | set(prior), key=str):
            position = (
                db.execute(
                    text("SELECT * FROM inventory_positions WHERE id=:id FOR UPDATE"), dict(id=pid)
                )
                .mappings()
                .one()
            )
            own = prior.get(pid)
            held = own["quantity"] if own and own["state"] == "held" else 0
            if Decimal(needs.get(pid, 0)) > position["quantity"] - position["reserved"] + held:
                issue = "stock_shortage"
                mode = "needs_review"
                break
    db.execute(
        text("""INSERT INTO channel_orders(id,channel,external_id,provider_updated_at,status,snapshot,issue)
      VALUES(:id,:channel,:external,:updated,:status,CAST(:snapshot AS jsonb),:issue)
      ON CONFLICT(id) DO UPDATE SET provider_updated_at=:updated,status=:status,snapshot=excluded.snapshot,issue=:issue,updated_at=now(),checked_at=now()"""),
        dict(
            id=oid,
            channel=channel_row["code"],
            external=external,
            updated=updated,
            status=mode,
            snapshot=json.dumps(parcel),
            issue=issue,
        ),
    )
    if mode in ("processing", "dispatched", "cancelled"):
        for pid in sorted(set(needs) | set(prior), key=str):
            own = prior.get(pid)
            if own and own["state"] == "consumed":
                continue
            held = own["quantity"] if own and own["state"] == "held" else 0
            target = needs.get(pid, 0) if mode != "cancelled" else 0
            db.execute(
                text("UPDATE inventory_positions SET reserved=reserved+:delta WHERE id=:id"),
                dict(id=pid, delta=Decimal(target) - held),
            )
            if target:
                db.execute(
                    text(
                        "INSERT INTO channel_stock_commitments(order_id,position_id,quantity,state) VALUES(:id,:pid,:qty,'held') ON CONFLICT(order_id,position_id) DO UPDATE SET quantity=:qty,state='held'"
                    ),
                    dict(id=oid, pid=pid, qty=target),
                )
                if mode == "dispatched":
                    db.execute(
                        text("UPDATE inventory_positions SET reserved=reserved-:qty WHERE id=:id"),
                        dict(id=pid, qty=target),
                    )
                    position = (
                        db.execute(
                            text("SELECT * FROM inventory_positions WHERE id=:id FOR UPDATE"),
                            dict(id=pid),
                        )
                        .mappings()
                        .one()
                    )
                    mid = uuid5(oid, str(pid) + ":dispatch")
                    body = Command(
                        kind="sku",
                        reference_id=position["reference_id"],
                        expected_version=position["version"],
                        action="decrease",
                        quantity=str(target),
                        reason=f"Confirmed {channel_row['code']} dispatch; external parcel {external}",
                    )
                    result = apply_adjustment(
                        db,
                        SimpleNamespace(id=channel_row["actor_id"]),
                        Request({"type": "http", "headers": []}),
                        mid,
                        body,
                        commit=False,
                    )
                    if not isinstance(result, dict):
                        raise ChannelError("channel_stock_dispatch_failed")
                    db.execute(
                        text(
                            "UPDATE inventory_movements SET kind='marketplace_dispatch',source_document_id=:oid,source_event_id=:id,source_document_kind='marketplace' WHERE id=:id"
                        ),
                        dict(id=mid, oid=oid),
                    )
                    db.execute(
                        text(
                            "UPDATE channel_stock_commitments SET state='consumed' WHERE order_id=:id AND position_id=:pid"
                        ),
                        dict(id=oid, pid=pid),
                    )
            elif own:
                db.execute(
                    text(
                        "UPDATE channel_stock_commitments SET state='released' WHERE order_id=:id AND position_id=:pid"
                    ),
                    dict(id=oid, pid=pid),
                )
    SqlAccountManagement(db).audit(
        channel_row["actor_id"],
        channel_row["actor_id"],
        "channel.order_ingested",
        dict(
            channel=channel_row["code"],
            order_id=str(oid),
            external_id=external,
            status=mode,
            issue=issue,
        ),
        "Authoritative vendor parcel reconciliation; no payment or refund executed",
    )
    return (
        db.execute(text("SELECT * FROM channel_orders WHERE id=:id"), dict(id=oid)).mappings().one()
    )
