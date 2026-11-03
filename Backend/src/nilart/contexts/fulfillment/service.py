"""Caller-owned commands: shipment, reservation, stock, COGS and audit commit together."""

import json
from collections import defaultdict
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import UUID, uuid5

from sqlalchemy import text

from nilart.contexts.business.router import current_settings
from nilart.contexts.customer.notifications import notify
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.inventory import reservations as stock
from nilart.contexts.inventory.document_stock import move_stock
from nilart.contexts.orders.domain import OrderSnapshot, OrderState, validate_state
from nilart.shared.outbox import enqueue

ACTIVE = {"draft", "picked", "qc_failed", "qc_passed", "packed", "dispatched", "delivered"}


class FulfillmentError(Exception):
    pass


def fail(code):
    raise FulfillmentError("fulfillment_" + code)


def output(row):
    return {
        **dict(row),
        "id": str(row["id"]),
        "order_id": str(row["order_id"]),
        "updated_at": row["updated_at"].isoformat(),
    }


def load_order(db, id, lock=False):
    row = (
        db.execute(
            text("SELECT * FROM customer_orders WHERE id=:id" + (" FOR UPDATE" if lock else "")),
            {"id": id},
        )
        .mappings()
        .first()
    )
    if not row:
        fail("order_not_found")
    return row


def planned(db, order_id, exclude=None):
    counts = defaultdict(int)
    for content in db.execute(
        text(
            "SELECT content FROM fulfillment_shipments WHERE order_id=:id AND status!='cancelled' AND (CAST(:exclude AS uuid) IS NULL OR id<>:exclude)"
        ),
        {"id": order_id, "exclude": exclude},
    ).scalars():
        for line, qty in content["quantities"].items():
            counts[line] += qty
    return counts


def validate_content(db, order, content, exclude=None):
    snapshot = OrderSnapshot.model_validate(order["snapshot"])
    lines = {str(line.id): line for line in snapshot.items}
    counts = planned(db, order["id"], exclude)
    for id, qty in content["quantities"].items():
        line = lines.get(str(id))
        if (
            not line
            or line.delivery != "physical"
            or line.commission_id
            or not line.stock_components
        ):
            fail("line_not_ready")
        if qty + counts[str(id)] > line.quantity:
            fail("quantity_exceeded")


def eligibility(db, order):
    if (
        order["state"]["payment"] not in {"paid", "partially_refunded"}
        or order["state"]["fulfillment"] == "cancelled"
    ):
        fail("paid_required")
    allocation = (
        db.execute(
            text("SELECT * FROM order_stock_allocations WHERE order_id=:id"), {"id": order["id"]}
        )
        .mappings()
        .first()
    )
    if not allocation or allocation["state"] != "committed":
        fail("stock_commitment_required")
    if db.scalar(
        text(
            "SELECT 1 FROM customer_order_requests WHERE order_id=:id AND kind='cancellation' AND status IN ('submitted','in_review','approved') LIMIT 1"
        ),
        {"id": order["id"]},
    ):
        fail("cancellation_pending")
    return allocation


def derive_order(db, order):
    snapshot = OrderSnapshot.model_validate(order["snapshot"])
    state = OrderState.model_validate(order["state"])
    shipped, delivered = defaultdict(int), defaultdict(int)
    deadlines = []
    for row in db.execute(
        text(
            "SELECT status,content,state FROM fulfillment_shipments WHERE order_id=:id AND status IN ('dispatched','delivered')"
        ),
        {"id": order["id"]},
    ).mappings():
        for id, qty in row["content"]["quantities"].items():
            shipped[id] += qty
            if row["status"] == "delivered":
                delivered[id] += qty
        if row["status"] == "delivered" and row["state"].get("return_until"):
            deadlines.append(datetime.fromisoformat(row["state"]["return_until"]))
    for line in snapshot.items:
        if line.delivery == "physical":
            state.delivered[line.id] = delivered[str(line.id)]
    if all(
        state.delivered.get(line.id, 0) == line.quantity
        and (
            not any(c.delivery == "digital" for c in line.stock_components or [])
            or state.digital_delivered.get(line.id, 0) == line.quantity
        )
        for line in snapshot.items
    ):
        state.fulfillment = "delivered"
    elif any(state.delivered.values()) and any(
        state.digital_delivered.get(line.id, 0) < line.quantity
        and (
            line.delivery == "digital"
            or any(c.delivery == "digital" for c in line.stock_components or [])
        )
        for line in snapshot.items
    ):
        # Delivered physical goods retain their return window while an
        # independent digital item is still awaiting its private-file release.
        state.fulfillment = "partial"
    elif shipped:
        state.fulfillment = (
            "shipped"
            if all(
                shipped[str(line.id)] == line.quantity
                for line in snapshot.items
                if line.delivery == "physical"
            )
            else "partial"
        )
    else:
        state.fulfillment = "partial" if any(state.delivered.values()) else "on_hold"
    if deadlines:
        # The existing order-wide return gate is conservative for partial deliveries.
        # Per-shipment deadlines are exposed independently; never extend an older parcel.
        state.return_until = min(deadlines)
    validate_state(snapshot, state)
    db.execute(
        text(
            "UPDATE customer_orders SET state=CAST(:state AS jsonb),version=version+1,updated_at=clock_timestamp() WHERE id=:id"
        ),
        {"id": order["id"], "state": state.model_dump_json()},
    )


def dispatch_stock(db, actor, key, row, order, allocation, reason):
    parts = []
    for line_id, qty in row["content"]["quantities"].items():
        for c in allocation["components"]:
            if c["line_id"] == line_id and c.get("delivery", "physical") == "physical":
                parts.append({**c, "quantity": c["per_unit"] * qty})
    if not parts:
        fail("historical_components_missing")
    stock.stock_lock(db)
    allocation = (
        db.execute(
            text("SELECT * FROM order_stock_allocations WHERE order_id=:id FOR UPDATE"),
            {"id": order["id"]},
        )
        .mappings()
        .one()
    )
    shipped = dict(allocation["shipped"])
    for position, qty in stock.demand(parts).items():
        total = stock.demand(allocation["components"])[position]
        if qty + shipped.get(position, 0) > total:
            fail("commitment_exceeded")
        position_row = (
            db.execute(
                text("SELECT reserved FROM inventory_positions WHERE id=:id FOR UPDATE"),
                {"id": position},
            )
            .mappings()
            .first()
        )
        if not position_row or position_row["reserved"] < qty:
            fail("commitment_inconsistent")
        shipped[position] = shipped.get(position, 0) + qty
    changes = stock.change_reserved(db, parts, -1)
    costs = []
    for c in parts:
        pid = c["position_id"]
        unit = db.scalar(text("SELECT unit FROM inventory_positions WHERE id=:id"), {"id": pid})
        component_id = uuid5(UUID(str(row["id"])), f"{c['line_id']}:{c['component']}")
        cost = move_stock(
            db,
            actor,
            row["id"],
            key,
            {
                "id": component_id,
                "kind": c["kind"],
                "reference_id": c["reference_id"],
                "unit": unit,
            },
            -Decimal(c["quantity"]),
            None,
            reason,
            domain="fulfillment",
            action_override="fulfillment_dispatch",
        )
        costs.append(
            {
                **cost,
                "line_id": c["line_id"],
                "component": c["component"],
                "reference_id": c["reference_id"],
                "quantity": c["quantity"],
            }
        )
    saved = (
        db.execute(
            text(
                "UPDATE order_stock_allocations SET shipped=CAST(:shipped AS jsonb),version=version+1,updated_at=clock_timestamp() WHERE order_id=:id RETURNING *"
            ),
            {"id": order["id"], "shipped": json.dumps(shipped)},
        )
        .mappings()
        .one()
    )
    stock.record(db, saved, actor, "dispatch", reason, changes, key=uuid5(key, "stock-dispatch"))
    return costs


def apply(db, actor, id, key, body):
    intent = body.model_dump(mode="json")
    prior = (
        db.execute(text("SELECT * FROM fulfillment_events WHERE id=:id"), {"id": key})
        .mappings()
        .first()
    )
    if prior:
        if (
            str(prior["shipment_id"]) != str(id)
            or str(prior["actor_id"]) != str(actor)
            or prior["intent"] != intent
        ):
            fail("command_conflict")
        return dict(prior)
    # No network calls occur while holding these locks.
    db.execute(
        text("SELECT id FROM sandbox_payments WHERE order_id=:id FOR UPDATE"), {"id": body.order_id}
    )
    order = load_order(db, body.order_id, True)
    row = (
        db.execute(text("SELECT * FROM fulfillment_shipments WHERE id=:id FOR UPDATE"), {"id": id})
        .mappings()
        .first()
    )
    if (row and str(row["order_id"]) != str(body.order_id)) or (
        row["version"] if row else 0
    ) != body.expected_version:
        fail("version_conflict")
    if (
        row
        and body.action in {"edit", "cancel", "pack", "qc", "pick"}
        and db.scalar(text("SELECT to_regclass('tapin_shipments')"))
    ):
        if db.scalar(
            text(
                "SELECT operation_id FROM tapin_shipments WHERE shipment_id=:id AND state IN ('sending','unknown','registered')"
            ),
            dict(id=id),
        ):
            fail("tapin_registration_locked")
    if not row:
        if body.action != "draft":
            fail("draft_required")
        eligibility(db, order)
        content = body.content.model_dump(mode="json")
        validate_content(db, order, content)
        saved = dict(
            id=id, order_id=body.order_id, version=1, status="draft", content=content, state={}
        )
    else:
        saved = dict(row)
        saved["state"] = dict(row["state"])
        status = row["status"]
        if body.action == "edit" and status == "draft":
            eligibility(db, order)
            saved["content"] = body.content.model_dump(mode="json")
            validate_content(db, order, saved["content"], id)
        elif body.action == "pick" and status == "draft":
            eligibility(db, order)
            saved["status"] = "picked"
            saved["state"]["picked_at"] = datetime.now(UTC).isoformat()
        elif body.action == "qc" and status in {"picked", "qc_failed"}:
            saved["state"]["qc"] = body.qc.model_dump()
            saved["status"] = "qc_passed" if all(body.qc.model_dump().values()) else "qc_failed"
        elif body.action == "pack" and status == "qc_passed":
            saved["state"]["packing"] = body.packing.model_dump()
            saved["status"] = "packed"
        elif body.action == "dispatch" and status == "packed":
            allocation = eligibility(db, order)
            if not order["sandbox"]:
                fail("sandbox_only")
            db.execute(text("SELECT pg_advisory_xact_lock_shared(78214,34)"))
            version, settings, _ = current_settings(db)
            frozen = order["snapshot"].get("checkout_terms")
            if frozen:
                policy = frozen["policy"]
            else:
                policy = dict(
                    settings_version=version,
                    return_days=settings.return_days,
                    return_policy_fa=settings.return_policy_fa,
                    return_policy_en=settings.return_policy_en,
                )
            if (
                policy["return_days"] is None
                or not policy["return_policy_fa"]
                or not policy["return_policy_en"]
            ):
                fail("policy_configuration_missing")
            costs = dispatch_stock(db, actor, key, row, order, allocation, body.reason)
            saved["state"].update(
                dispatch=body.dispatch.model_dump(),
                dispatched_at=datetime.now(UTC).isoformat(),
                policy=policy,
                costs=costs,
                actual_cost=format(
                    sum((-Decimal(c["value_delta"]) for c in costs), Decimal(0)), "f"
                ),
            )
            saved["status"] = "dispatched"
        elif body.action == "deliver" and status == "dispatched":
            now = datetime.now(UTC)
            saved["state"]["delivered_at"] = now.isoformat()
            saved["state"]["return_until"] = (
                now + timedelta(days=row["state"]["policy"]["return_days"])
            ).isoformat()
            saved["status"] = "delivered"
        elif body.action == "tracking" and status in {"dispatched", "delivered"}:
            saved["state"]["dispatch"] = {**row["state"]["dispatch"], **body.carrier.model_dump()}
        elif body.action == "cancel" and status in {
            "draft",
            "picked",
            "qc_failed",
            "qc_passed",
            "packed",
        }:
            saved["status"] = "cancelled"
        else:
            fail("transition_not_allowed")
        saved["version"] = row["version"] + 1
    params = dict(
        id=id,
        order=body.order_id,
        version=saved["version"],
        status=saved["status"],
        content=json.dumps(saved["content"]),
        state=json.dumps(saved["state"]),
    )
    if row:
        saved = (
            db.execute(
                text(
                    "UPDATE fulfillment_shipments SET version=:version,status=:status,content=CAST(:content AS jsonb),state=CAST(:state AS jsonb),updated_at=clock_timestamp() WHERE id=:id RETURNING *"
                ),
                params,
            )
            .mappings()
            .one()
        )
    else:
        saved = (
            db.execute(
                text(
                    "INSERT INTO fulfillment_shipments(id,order_id,version,status,content,state) VALUES(:id,:order,:version,:status,CAST(:content AS jsonb),CAST(:state AS jsonb)) RETURNING *"
                ),
                params,
            )
            .mappings()
            .one()
        )
    if body.action in {"dispatch", "deliver", "cancel"}:
        derive_order(db, order)
    event = (
        db.execute(
            text(
                "INSERT INTO fulfillment_events(id,shipment_id,actor_id,version,action,intent,result) VALUES(:key,:id,:actor,:version,:action,CAST(:intent AS jsonb),CAST(:result AS jsonb)) RETURNING *"
            ),
            {
                "key": key,
                "id": id,
                "actor": actor,
                "version": saved["version"],
                "action": body.action,
                "intent": json.dumps(intent),
                "result": json.dumps(output(saved)),
            },
        )
        .mappings()
        .one()
    )
    SqlAccountManagement(db).audit(
        str(actor),
        str(order["account_id"]),
        "fulfillment.shipment_changed",
        {
            "shipment_id": str(id),
            "order_id": str(body.order_id),
            "version": saved["version"],
            "before": {"status": row["status"], "version": row["version"]} if row else None,
            "after": {"status": saved["status"], "version": saved["version"]},
        },
        body.reason,
    )
    if body.action == "dispatch":
        from nilart.contexts.messaging.service import shipped

        shipped(db, saved)
    if body.action in {"dispatch", "deliver"}:
        notify(
            db,
            order["account_id"],
            event=f"fulfillment:{key}",
            category="order",
            title_fa="بسته سفارش ارسال شد"
            if body.action == "dispatch"
            else "تحویل بسته سفارش ثبت شد",
            title_en="Order parcel dispatched"
            if body.action == "dispatch"
            else "Parcel delivery recorded",
            reference="order_id",
            id=body.order_id,
        )
    enqueue(
        db,
        "fulfillment.shipment_changed",
        {
            "shipment_id": str(id),
            "order_id": str(body.order_id),
            "event_id": str(key),
            "version": saved["version"],
            "action": body.action,
        },
    )
    return dict(event)
