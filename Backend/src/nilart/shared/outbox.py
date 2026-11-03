"""Transactional, at-least-once delivery infrastructure (no business handlers)."""

import logging
from collections.abc import Callable
from datetime import datetime, timezone
from uuid import UUID, uuid4

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, insert
from sqlalchemy.orm import Session

metadata = sa.MetaData()
outbox_events = sa.Table(
    "outbox_events",
    metadata,
    sa.Column("id", sa.Uuid, primary_key=True),
    sa.Column("event_type", sa.String(200), nullable=False),
    sa.Column("payload", JSONB, nullable=False),
    sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("published_at", sa.DateTime(timezone=True)),
    sa.Column("attempts", sa.Integer, nullable=False, server_default="0"),
)
processed_events = sa.Table(
    "processed_events",
    metadata,
    sa.Column("event_id", sa.Uuid, primary_key=True),
    sa.Column("processed_at", sa.DateTime(timezone=True), nullable=False),
)
PING_EVENT = "infrastructure.ping"
SANDBOX_PAYMENT_EVENTS = frozenset(
    f"sandbox.payment.{state}"
    for state in ("created", "pending", "paid", "cancelled", "failed", "unknown")
)
logger = logging.getLogger(__name__)


def enqueue(
    session: Session, event_type: str, payload: dict, *, event_id: UUID | None = None
) -> UUID:
    """Insert using the caller's transaction; never commit or open a session."""
    if not event_type or len(event_type) > 200:
        raise ValueError("event_type must contain 1–200 characters")
    if not isinstance(payload, dict):
        raise ValueError("payload must be a JSON object")
    event_id = event_id or uuid4()
    session.execute(
        outbox_events.insert().values(
            id=event_id,
            event_type=event_type,
            payload=payload,
            occurred_at=datetime.now(timezone.utc),
            attempts=0,
        )
    )
    return event_id


def dispatch_pending(
    session: Session,
    publish: Callable[[dict], None],
    *,
    batch_size: int = 100,
    max_attempts: int = 5,
) -> int:
    """Lock a bounded batch; mark published only after confirmed publication.

    Caller owns commit. A crash between broker confirmation and DB commit can
    redeliver, so consumers must deduplicate. Failed sends increment attempts
    and stay pending. Events at max_attempts remain in the DB for manual
    investigation but are excluded from dispatch. Attempts roll back with the
    caller's transaction. Publisher must raise on failure or missing confirmation.
    """
    if batch_size < 1:
        raise ValueError("batch_size must be positive")
    if max_attempts < 1:
        raise ValueError("max_attempts must be positive")
    rows = (
        session.execute(
            sa.select(outbox_events)
            .where(
                outbox_events.c.published_at.is_(None),
                outbox_events.c.attempts < max_attempts,
            )
            .order_by(outbox_events.c.occurred_at, outbox_events.c.id)
            .limit(
                batch_size,
            )
            .with_for_update(skip_locked=True)
        )
        .mappings()
        .all()
    )
    published = 0
    for row in rows:
        values = {"attempts": row["attempts"] + 1}
        try:
            publish(
                {
                    "id": str(row["id"]),
                    "event_type": row["event_type"],
                    "payload": row["payload"],
                    "occurred_at": row["occurred_at"].isoformat(),
                }
            )
        except Exception:
            # Persist the failed attempt while allowing other events to proceed.
            logger.exception("Outbox publication failed for event %s", row["id"])
        else:
            values["published_at"] = datetime.now(timezone.utc)
            published += 1
        session.execute(
            outbox_events.update()
            .where(
                outbox_events.c.id == row["id"],
            )
            .values(**values)
        )
    return published


def consume_event(session: Session, envelope: dict) -> bool:
    """Deduplicate in the same transaction as the infrastructure ping handler.

    No dynamic task names, imports, callbacks, or business handler execution.
    PostgreSQL's unique constraint serializes concurrent duplicate deliveries.
    """
    if envelope.get("event_type") not in SANDBOX_PAYMENT_EVENTS | {
        PING_EVENT,
        "customer.record_changed",
        "catalog.entry_changed",
        "catalog.bundle_saved",
        "catalog.profile_saved",
        "catalog.artwork_saved",
        "files.released",
        "files.revoked",
        "costing.resource_saved",
        "costing.recipe_saved",
        "pricing.proposal_changed",
        "procurement.supplier_saved",
        "procurement.purchase_changed",
        "production.batch_changed",
        "finance.recorded",
        "finance.supplier_opening_recorded",
        "discount.rule_saved",
        "business.settings_saved",
        "inventory.adjusted",
        "inventory.reservation_changed",
        "fulfillment.shipment_changed",
        "fulfillment.return_inspected",
        "orders.request_reviewed",
        "orders.cancelled",
        "orders.cancellation_finance_changed",
        "orders.stock_resolution_opened",
        "payments.refund_simulated",
        "content.page_saved",
        "media.asset_saved",
    }:
        raise ValueError("unsupported event type")
    if not isinstance(envelope.get("payload"), dict):
        raise ValueError("payload must be a JSON object")
    if envelope.get("event_type") in {
        "catalog.bundle_saved",
        "catalog.profile_saved",
        "catalog.artwork_saved",
    }:
        payload = envelope["payload"]
        field = {
            "catalog.bundle_saved": "bundle_id",
            "catalog.profile_saved": "entity_id",
            "catalog.artwork_saved": "artwork_id",
        }[envelope["event_type"]]
        UUID(str(payload[field]))
        UUID(str(payload["revision_id"]))
        if (
            type(payload.get("version")) is not int
            or not 1 <= payload["version"] <= 2147483647
            or payload.get("action") not in {"draft", "publish", "unpublish"}
        ):
            raise ValueError("invalid catalogue revision event")
        if envelope["event_type"] == "catalog.profile_saved" and payload.get("kind") not in {
            "products",
            "skus",
            "collections",
        }:
            raise ValueError("invalid catalogue profile kind")
    if envelope.get("event_type") in {"files.released", "files.revoked"}:
        for key in ["file_id", "order_id", "account_id"]:
            UUID(str(envelope["payload"][key]))
    if envelope.get("event_type") == "inventory.reservation_changed":
        payload = envelope["payload"]
        UUID(str(payload["order_id"]))
        UUID(str(payload["event_id"]))
        if (
            type(payload.get("version")) is not int
            or payload["version"] < 1
            or payload.get("action")
            not in {"reserve", "expire", "release", "commit", "shortage", "dispatch", "cancel"}
        ):
            raise ValueError("invalid reservation event")
    if envelope.get("event_type") == "payments.refund_simulated":
        payload = envelope["payload"]
        for key in ["refund_id", "order_id", "request_id"]:
            UUID(str(payload[key]))
        from decimal import Decimal

        if (
            payload.get("simulation") != "local_sandbox"
            or payload.get("currency") not in {"IRT", "IRR"}
            or not Decimal(payload["amount"]).is_finite()
            or Decimal(payload["amount"]) < 0
        ):
            raise ValueError("invalid refund event")
    if envelope.get("event_type") == "orders.stock_resolution_opened":
        for key in ["order_id", "request_id", "actor_id"]:
            UUID(str(envelope["payload"][key]))
    if envelope.get("event_type") == "orders.cancellation_finance_changed":
        for key in ["closure_id", "order_id", "request_id"]:
            UUID(str(envelope["payload"][key]))
        if envelope["payload"].get("phase") not in {"closed", "reopened"}:
            raise ValueError("invalid cancellation finance phase")
    if envelope.get("event_type") == "orders.cancelled":
        for key in ["cancellation_id", "order_id", "request_id"]:
            UUID(str(envelope["payload"][key]))
    if envelope.get("event_type") == "orders.request_reviewed":
        payload = envelope["payload"]
        UUID(str(payload["request_id"]))
        UUID(str(payload["account_id"]))
        if payload.get("status") not in {"in_review", "approved", "rejected"}:
            raise ValueError("invalid request review event")
    if envelope.get("event_type") == "fulfillment.return_inspected":
        for key in ["request_id", "inspection_id", "order_id"]:
            UUID(str(envelope["payload"][key]))
    if envelope.get("event_type") == "fulfillment.shipment_changed":
        payload = envelope["payload"]
        for key in ["shipment_id", "order_id", "event_id"]:
            UUID(str(payload[key]))
        if (
            type(payload.get("version")) is not int
            or payload["version"] < 1
            or payload.get("action")
            not in {
                "draft",
                "edit",
                "pick",
                "qc",
                "pack",
                "dispatch",
                "deliver",
                "cancel",
                "tracking",
            }
        ):
            raise ValueError("invalid shipment event")
    if envelope.get("event_type") == "customer.record_changed":
        payload = envelope["payload"]
        UUID(str(payload["account_id"]))
        UUID(str(payload["record_id"]))
        if payload.get("kind") not in {
            "address",
            "preferences",
            "favorite",
            "ticket",
            "message",
            "notification",
        } or payload.get("action") not in {"saved", "deleted"}:
            raise ValueError("unsupported customer event")
    if envelope.get("event_type") == "catalog.entry_changed":
        payload = envelope["payload"]
        UUID(str(payload["entry_id"]))
        if payload.get("kind") not in {"collections", "categories", "products"} or payload.get(
            "action"
        ) not in {"created", "edited", "published", "unpublished"}:
            raise ValueError("unsupported catalog event")
        if type(payload.get("version")) is not int or not 1 <= payload["version"] <= 2147483647:
            raise ValueError("invalid catalog event version")
    if envelope.get("event_type") == "costing.resource_saved":
        payload = envelope["payload"]
        UUID(str(payload["resource_id"]))
        UUID(str(payload["revision_id"]))
        if type(payload.get("version")) is not int or not 1 <= payload["version"] <= 2147483647:
            raise ValueError("invalid cost resource version")
    if envelope.get("event_type") == "costing.recipe_saved":
        payload = envelope["payload"]
        UUID(str(payload["recipe_id"]))
        UUID(str(payload["revision_id"]))
        if type(payload.get("version")) is not int or not 1 <= payload["version"] <= 2147483647:
            raise ValueError("invalid recipe version")
    if envelope.get("event_type") == "pricing.proposal_changed":
        payload = envelope["payload"]
        UUID(payload["proposal_id"])
        UUID(payload["event_id"])
        if (
            type(payload.get("version")) is not int
            or payload["version"] < 1
            or payload.get("action") not in {"draft", "revise", "publish", "reject"}
        ):
            raise ValueError("Invalid price proposal event")
    if envelope.get("event_type") == "finance.supplier_opening_recorded":
        for key in ["supplier_id", "event_id"]:
            UUID(str(envelope["payload"][key]))
        if (
            type(envelope["payload"].get("version")) is not int
            or envelope["payload"]["version"] < 1
        ):
            raise ValueError("invalid supplier opening event")
    if envelope.get("event_type") == "finance.recorded":
        payload = envelope["payload"]
        UUID(str(payload["command_id"]))
        UUID(str(payload["target_id"]))
        if payload.get("area") not in {"account", "document"}:
            raise ValueError("invalid finance event")
    if envelope.get("event_type") == "production.batch_changed":
        payload = envelope["payload"]
        UUID(str(payload["batch_id"]))
        UUID(str(payload["event_id"]))
        if (
            payload.get("action")
            not in {"draft", "start", "issue", "material_return", "service", "complete", "cancel"}
            or type(payload.get("version")) is not int
            or not 1 <= payload["version"] <= 2147483647
        ):
            raise ValueError("invalid production event")
    if envelope.get("event_type") == "procurement.purchase_changed":
        payload = envelope["payload"]
        UUID(str(payload["purchase_id"]))
        UUID(str(payload["event_id"]))
        if (
            payload.get("action") not in {"draft", "post", "receive", "return", "cancel"}
            or type(payload.get("version")) is not int
            or not 1 <= payload["version"] <= 2147483647
        ):
            raise ValueError("invalid purchase event")
    if envelope.get("event_type") == "procurement.supplier_saved":
        payload = envelope["payload"]
        UUID(str(payload["supplier_id"]))
        UUID(str(payload["revision_id"]))
        if type(payload.get("version")) is not int or not 1 <= payload["version"] <= 2147483647:
            raise ValueError("invalid supplier version")
    if envelope.get("event_type") == "discount.rule_saved":
        payload = envelope["payload"]
        UUID(str(payload["discount_id"]))
        UUID(str(payload["revision_id"]))
        if type(payload.get("version")) is not int or not 1 <= payload["version"] <= 2147483647:
            raise ValueError("invalid discount version")
    if envelope.get("event_type") == "media.asset_saved":
        payload = envelope["payload"]
        UUID(str(payload["asset_id"]))
        UUID(str(payload["revision_id"]))
        if (
            payload.get("action") not in {"draft", "publish", "unpublish"}
            or type(payload.get("version")) is not int
            or not 1 <= payload["version"] <= 2147483647
        ):
            raise ValueError("invalid media asset event")
    if envelope.get("event_type") == "content.page_saved":
        payload = envelope["payload"]
        UUID(str(payload["revision_id"]))
        if payload.get("slug") not in {
            "about",
            "contact",
            "faq",
            "buying-guide",
            "returns",
            "terms",
            "privacy",
        } or payload.get("action") not in {"draft", "publish", "unpublish"}:
            raise ValueError("invalid content page event")
        if type(payload.get("version")) is not int or not 1 <= payload["version"] <= 2147483647:
            raise ValueError("invalid content page version")
    if envelope.get("event_type") == "inventory.adjusted":
        payload = envelope["payload"]
        UUID(str(payload["position_id"]))
        UUID(str(payload["movement_id"]))
        if type(payload.get("version")) is not int or not 1 <= payload["version"] <= 2147483647:
            raise ValueError("invalid stock movement version")
    if envelope.get("event_type") == "business.settings_saved":
        payload = envelope["payload"]
        UUID(str(payload["revision_id"]))
        if type(payload.get("version")) is not int or not 1 <= payload["version"] <= 2147483647:
            raise ValueError("invalid business setting version")
    if envelope.get("event_type") in SANDBOX_PAYMENT_EVENTS:
        payload = envelope["payload"]
        for key in ("payment_id", "order_id", "account_id"):
            UUID(str(payload[key]))
        value = payload.get("amount_rial")
        if (
            payload.get("sandbox") is not True
            or not isinstance(value, str)
            or not value.isascii()
            or not value.isdigit()
            or len(value) > 19
            or int(value) > 9223372036854775807
            or str(int(value)) != value
        ):
            raise ValueError("invalid sandbox payment amount")
        if payload.get("status") != envelope["event_type"].removeprefix("sandbox.payment."):
            raise ValueError("sandbox event state mismatch")
        if value == "0" and payload["status"] not in {"created", "paid"}:
            raise ValueError("zero payment must already be completed")
    event_id = UUID(str(envelope["id"]))
    inserted = session.execute(
        insert(processed_events)
        .values(
            event_id=event_id,
            processed_at=datetime.now(timezone.utc),
        )
        .on_conflict_do_nothing(index_elements=[processed_events.c.event_id])
        .returning(
            processed_events.c.event_id,
        )
    ).scalar_one_or_none()
    if inserted is None:
        return False
    # Customer changes are already committed atomically with their notification/audit.
    # This event acknowledges that signal; it does not send external messages.
    return True
