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
    "outbox_events", metadata,
    sa.Column("id", sa.Uuid, primary_key=True),
    sa.Column("event_type", sa.String(200), nullable=False),
    sa.Column("payload", JSONB, nullable=False),
    sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("published_at", sa.DateTime(timezone=True)),
    sa.Column("attempts", sa.Integer, nullable=False, server_default="0"),
)
processed_events = sa.Table(
    "processed_events", metadata,
    sa.Column("event_id", sa.Uuid, primary_key=True),
    sa.Column("processed_at", sa.DateTime(timezone=True), nullable=False),
)
PING_EVENT = "infrastructure.ping"
logger = logging.getLogger(__name__)


def enqueue(session: Session, event_type: str, payload: dict, *,
            event_id: UUID | None = None) -> UUID:
    """Insert using the caller's transaction; never commit or open a session."""
    if not event_type or len(event_type) > 200:
        raise ValueError("event_type must contain 1–200 characters")
    if not isinstance(payload, dict):
        raise ValueError("payload must be a JSON object")
    event_id = event_id or uuid4()
    session.execute(outbox_events.insert().values(
        id=event_id, event_type=event_type, payload=payload,
        occurred_at=datetime.now(timezone.utc), attempts=0,
    ))
    return event_id


def dispatch_pending(session: Session, publish: Callable[[dict], None], *,
                     batch_size: int = 100, max_attempts: int = 5) -> int:
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
    rows = session.execute(sa.select(outbox_events).where(
        outbox_events.c.published_at.is_(None),
        outbox_events.c.attempts < max_attempts,
    ).order_by(outbox_events.c.occurred_at, outbox_events.c.id).limit(
        batch_size,
    ).with_for_update(skip_locked=True)).mappings().all()
    published = 0
    for row in rows:
        values = {"attempts": row["attempts"] + 1}
        try:
            publish({"id": str(row["id"]), "event_type": row["event_type"],
                     "payload": row["payload"],
                     "occurred_at": row["occurred_at"].isoformat()})
        except Exception:
            # Persist the failed attempt while allowing other events to proceed.
            logger.exception("Outbox publication failed for event %s", row["id"])
        else:
            values["published_at"] = datetime.now(timezone.utc)
            published += 1
        session.execute(outbox_events.update().where(
            outbox_events.c.id == row["id"],
        ).values(**values))
    return published


def consume_event(session: Session, envelope: dict) -> bool:
    """Deduplicate in the same transaction as the infrastructure ping handler.

    No dynamic task names, imports, callbacks, or business handler execution.
    PostgreSQL's unique constraint serializes concurrent duplicate deliveries.
    """
    if envelope.get("event_type") != PING_EVENT:
        raise ValueError("unsupported event type")
    if not isinstance(envelope.get("payload"), dict):
        raise ValueError("payload must be a JSON object")
    event_id = UUID(str(envelope["id"]))
    inserted = session.execute(insert(processed_events).values(
        event_id=event_id, processed_at=datetime.now(timezone.utc),
    ).on_conflict_do_nothing(index_elements=[processed_events.c.event_id]).returning(
        processed_events.c.event_id,
    )).scalar_one_or_none()
    if inserted is None:
        return False
    # Infrastructure ping deliberately has no business side effects.
    return True
