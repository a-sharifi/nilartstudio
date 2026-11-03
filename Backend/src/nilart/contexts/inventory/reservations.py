"""Transaction-owned stock commitments. Reservations never recognize cost or revenue."""

import hashlib
import json
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import UUID, uuid5

from sqlalchemy import text

from nilart.contexts.business.router import current_settings
from nilart.contexts.inventory.router import NAMESPACE
from nilart.shared.outbox import enqueue


class ReservationError(Exception):
    pass


def stock_lock(db):
    db.execute(text("SELECT pg_advisory_xact_lock(78214,35)"))


def catalogue_lock(db):
    db.execute(text("SELECT pg_advisory_xact_lock_shared(78214,21)"))


def freeze_components(db, lines, line_ids=None, terms=None):
    components = []
    for line in lines:
        item, quote = line["item"], line["quote"]
        parts = (
            quote["parts"]
            if item["kind"] == "bundle"
            else [
                {
                    "sku_id": item["item_id"],
                    "quantity": 1,
                    "name": quote["name"],
                    "unit": quote["unit"],
                }
            ]
        )
        term = next((t for t in terms or [] if t["basket_line_id"] == line["id"]), None)
        for index, part in enumerate(parts):
            delivery = (
                term["parts"][index]["delivery"]
                if term
                else ("digital" if quote.get("edition") == "digital" else "physical")
            )
            kind = "artwork" if item["kind"] == "artwork" else "sku"
            reference = str(part["sku_id"])
            if item["kind"] == "artwork" and quote.get("edition") == "print":
                kind, reference = "sku", quote["linked_sku_id"]
            components.append(
                dict(
                    delivery=delivery,
                    returnable=term["parts"][index]["returnable"] if term else None,
                    line_id=line_ids[line["id"]]
                    if line_ids
                    else str(uuid5(NAMESPACE, f"basket-line:{line['id']}")),
                    basket_line_id=line["id"],
                    component=index,
                    kind=kind,
                    reference_id=reference,
                    unit_amount=part["unit"],
                    paid_amount=None,
                    per_unit=part["quantity"],
                    quantity=part["quantity"] * item["quantity"],
                    title_fa=part["name"][0],
                    title_en=part["name"][1],
                    position_id=str(uuid5(NAMESPACE, f"{kind}:{reference}")),
                )
            )
    return components


def allocate_paid(components, lines):
    from fractions import Fraction

    from nilart.contexts.discounts.engine import allocate

    for line in lines:
        parts = [c for c in components if c["line_id"] == line["id"]]
        cents = (
            Decimal(line["unit_amount"]) * line["quantity"] - Decimal(line["discount_amount"])
        ) * 100
        if cents != cents.to_integral_value() or cents < 0:
            raise ReservationError("stock_component_amount_invalid")
        weights = {
            str(index): Fraction(c["unit_amount"]) * c["quantity"] for index, c in enumerate(parts)
        }
        if cents and not sum(weights.values()):
            raise ReservationError("stock_component_amount_invalid")
        shares = allocate(int(cents), weights)
        for index, part in enumerate(parts):
            part["paid_amount"] = format(Decimal(shares[str(index)]) / 100, ".2f")


def demand(components):
    totals = defaultdict(int)
    for c in components:
        if c.get("delivery", "physical") == "physical":
            totals[c["position_id"]] += c["quantity"]
    return totals


def availability(db, components):
    rows = []
    for position_id, quantity in sorted(demand(components).items()):
        row = (
            db.execute(
                text("SELECT quantity,reserved FROM inventory_positions WHERE id=:id"),
                {"id": position_id},
            )
            .mappings()
            .first()
        )
        remaining = row["quantity"] - row["reserved"] if row else Decimal(0)
        rows.append(
            dict(
                position_id=position_id,
                required=quantity,
                available=format(remaining, "f"),
                issue="stock_opening_required"
                if not row
                else "stock_insufficient"
                if remaining < quantity
                else None,
            )
        )
    return rows


def review(db, basket, current, terms=None):
    # Callers obtain the catalogue lock before constructing the quote. Changes to
    # any reviewed title/options/prices/component or policy require new acceptance.
    db.execute(text("SELECT pg_advisory_xact_lock_shared(78214,34)"))
    version, settings, _ = current_settings(db)
    if settings.reservation_minutes is None:
        raise ReservationError("stock_reservation_policy_missing")
    components = freeze_components(db, current["lines"], terms=terms)
    canonical = dict(
        basket_version=basket["version"],
        lines=current["lines"],
        terms=terms,
        settings_version=version,
        reservation_minutes=settings.reservation_minutes,
    )
    fingerprint = hashlib.sha256(
        json.dumps(canonical, sort_keys=True, separators=(",", ":"), default=str).encode()
    ).hexdigest()
    stock = availability(db, components)
    return dict(
        basket_version=basket["version"],
        fingerprint=fingerprint,
        settings_version=version,
        reservation_minutes=settings.reservation_minutes,
        components=components,
        positions=stock,
        ready=all(p["issue"] is None for p in stock),
    )


def allocation(row):
    return {
        **dict(row),
        "order_id": str(row["order_id"]),
        "expires_at": row["expires_at"].isoformat(),
        "updated_at": row["updated_at"].isoformat(),
    }


def record(db, row, actor_id, action, reason, changes, *, key=None, intent=None):
    key = key or uuid5(UUID(str(row["order_id"])), f"stock:{row['version']}")
    result = allocation(row)
    db.execute(
        text(
            "INSERT INTO stock_reservation_events(id,order_id,actor_id,version,action,reason,intent,result,changes) "
            "VALUES(:id,:order,:actor,:version,:action,:reason,CAST(:intent AS jsonb),CAST(:result AS jsonb),CAST(:changes AS jsonb))"
        ),
        dict(
            id=key,
            order=row["order_id"],
            actor=actor_id,
            version=row["version"],
            action=action,
            reason=reason,
            intent=json.dumps(intent or {}),
            result=json.dumps(result),
            changes=json.dumps(changes),
        ),
    )
    enqueue(
        db,
        "inventory.reservation_changed",
        dict(
            order_id=str(row["order_id"]), event_id=str(key), version=row["version"], action=action
        ),
    )
    return result


def change_reserved(db, components, direction):
    changes = []
    for id, quantity in sorted(demand(components).items()):
        row = (
            db.execute(
                text(
                    "UPDATE inventory_positions SET reserved=reserved+:delta,reservation_version=reservation_version+1 "
                    "WHERE id=:id RETURNING reserved,reservation_version"
                ),
                dict(id=id, delta=direction * quantity),
            )
            .mappings()
            .one()
        )
        changes.append(
            dict(
                position_id=id,
                delta=direction * quantity,
                reserved_after=format(row["reserved"], "f"),
                reservation_version=row["reservation_version"],
            )
        )
    return changes


def reserve_checkout(db, order_id, actor_id, reviewed, components):
    stock_lock(db)
    issues = availability(db, components)
    if any(p["issue"] for p in issues):
        raise ReservationError("stock_unavailable")
    expires = datetime.now(UTC) + timedelta(minutes=reviewed["reservation_minutes"])
    changes = change_reserved(db, components, 1)
    row = (
        db.execute(
            text(
                "INSERT INTO order_stock_allocations(order_id,components,state,version,settings_version,reservation_minutes,expires_at) "
                "VALUES(:id,CAST(:components AS jsonb),'reserved',1,:settings,:minutes,:expires) RETURNING *"
            ),
            dict(
                id=order_id,
                components=json.dumps(components),
                settings=reviewed["settings_version"],
                minutes=reviewed["reservation_minutes"],
                expires=expires,
            ),
        )
        .mappings()
        .one()
    )
    record(db, row, actor_id, "reserve", "Customer accepted checkout stock review", changes)


def transition(db, row, state):
    return (
        db.execute(
            text(
                "UPDATE order_stock_allocations SET state=:state,version=version+1,updated_at=clock_timestamp() "
                "WHERE order_id=:id RETURNING *"
            ),
            dict(id=row["order_id"], state=state),
        )
        .mappings()
        .one()
    )


def release(db, order_id, actor_id, action, reason):
    stock_lock(db)
    row = (
        db.execute(
            text("SELECT * FROM order_stock_allocations WHERE order_id=:id FOR UPDATE"),
            {"id": order_id},
        )
        .mappings()
        .first()
    )
    if not row or row["state"] != "reserved":
        return
    changes = change_reserved(db, row["components"], -1)
    record(db, transition(db, row, "released"), actor_id, action, reason, changes)


def confirm(db, order_id, actor_id, *, key=None, intent=None, reason="Gateway confirmed payment"):
    # Payment/order locks precede stock. No stock writer should lock an order or
    # payment afterwards: expiry touches reservation records only.
    stock_lock(db)
    row = (
        db.execute(
            text("SELECT * FROM order_stock_allocations WHERE order_id=:id FOR UPDATE"),
            {"id": order_id},
        )
        .mappings()
        .first()
    )
    if not row:
        return None  # Historical order: never infer its old component choices.
    if row["state"] == "committed":
        return allocation(row)
    changes = []
    # Expired-but-not-yet-swept rows still own their stock; reusing that reservation
    # is safe because the global stock lock excludes a concurrent release.
    if row["state"] == "reserved":
        state = "committed"
    elif all(p["issue"] is None for p in availability(db, row["components"])):
        changes = change_reserved(db, row["components"], 1)
        state = "committed"
    else:
        state = "shortage"
    saved = transition(db, row, state)
    result = record(
        db,
        saved,
        actor_id,
        "commit" if state == "committed" else "shortage",
        reason,
        changes,
        key=key,
        intent=intent,
    )
    # Keep fulfillment on hold until shipping/QC/return policy is connected. This
    # commitment is shown separately and is not permission to promise shipment.
    return result


def expire(db, *, now=None, limit=100):
    stock_lock(db)
    now = now or datetime.now(UTC)
    rows = (
        db.execute(
            text(
                "SELECT * FROM order_stock_allocations WHERE state='reserved' AND expires_at<=:now "
                "ORDER BY expires_at,order_id LIMIT :limit FOR UPDATE"
            ),
            {"now": now, "limit": limit},
        )
        .mappings()
        .all()
    )
    for row in rows:
        changes = change_reserved(db, row["components"], -1)
        record(
            db,
            transition(db, row, "released"),
            None,
            "expire",
            "Configured stock reservation expired",
            changes,
        )
    return len(rows)
