import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
import sqlalchemy as sa
from sqlalchemy.orm import Session

from nilart.bootstrap import worker
from nilart.shared.outbox import (
    PING_EVENT,
    consume_event,
    dispatch_pending,
    enqueue,
    metadata,
    outbox_events,
    processed_events,
)


def test_enqueue_does_not_commit():
    session = MagicMock()
    assert enqueue(session, PING_EVENT, {})
    session.execute.assert_called_once()
    session.commit.assert_not_called()


def test_only_infrastructure_ping_supported():
    session = MagicMock()
    with pytest.raises(ValueError, match="unsupported"):
        consume_event(session, {"id": str(uuid4()), "event_type": "os.system", "payload": {}})
    session.execute.assert_not_called()


@pytest.mark.parametrize("failed", [True, False])
def test_dispatch_marks_only_confirmed_events(failed):
    session = MagicMock()
    session.execute.return_value.mappings.return_value.all.return_value = [{
        "id": uuid4(), "event_type": PING_EVENT, "payload": {},
        "occurred_at": datetime.now(timezone.utc), "attempts": 0,
    }]
    publish = MagicMock(side_effect=OSError("no confirmation") if failed else None)
    assert dispatch_pending(session, publish) == (0 if failed else 1)
    update = session.execute.call_args_list[-1].args[0]
    parameters = update.compile().params
    assert parameters["attempts"] == 1
    assert ("published_at" in parameters) is not failed
    session.commit.assert_not_called()


def test_confirmed_fixed_task_publication(monkeypatch):
    producer = MagicMock()
    acquire = MagicMock()
    acquire.return_value.__enter__.return_value = producer
    send = MagicMock()
    monkeypatch.setattr(worker.celery, "producer_or_acquire", acquire)
    monkeypatch.setattr(worker.celery, "send_task", send)
    envelope = {"id": str(uuid4()), "event_type": PING_EVENT, "payload": {}}
    worker.publish_event(envelope)
    send.assert_called_once_with("nilart.outbox.consume", args=[envelope],
                                 producer=producer, delivery_mode=2, retry=False)
    assert worker.celery.conf.broker_transport_options["confirm_publish"] is True
    send.side_effect = OSError("broker confirm failed")
    with pytest.raises(OSError):
        worker.publish_event(envelope)


def test_consumer_retries_are_bounded():
    assert worker.consume.max_retries == 5
    assert worker.celery.conf.control_queue_exclusive is True
    assert worker.celery.conf.event_queue_exclusive is True


@pytest.mark.parametrize("max_attempts", [5, 2])
def test_dispatch_filters_attempt_bound(max_attempts):
    session = MagicMock()
    session.execute.return_value.mappings.return_value.all.return_value = []
    assert dispatch_pending(session, MagicMock(), max_attempts=max_attempts) == 0
    query = session.execute.call_args.args[0]
    assert "outbox_events.attempts <" in str(query)
    assert max_attempts in query.compile().params.values()


@pytest.mark.parametrize("max_attempts", [0, -1])
def test_dispatch_rejects_invalid_attempt_bound(max_attempts):
    session = MagicMock()
    with pytest.raises(ValueError, match="max_attempts"):
        dispatch_pending(session, MagicMock(), max_attempts=max_attempts)
    session.execute.assert_not_called()


@pytest.fixture
def db():
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        pytest.skip("TEST_DATABASE_URL required for PostgreSQL integration tests")
    engine = sa.create_engine(url)
    schema = "test_outbox_" + uuid4().hex
    with engine.begin() as connection:
        connection.execute(sa.schema.CreateSchema(schema))
    scoped = engine.execution_options(schema_translate_map={None: schema})
    metadata.create_all(scoped)
    try:
        yield scoped
    finally:
        with engine.begin() as connection:
            connection.execute(sa.schema.DropSchema(schema, cascade=True))
        engine.dispose()


def test_insertion_rollback_and_commit(db):
    with Session(db) as session:
        enqueue(session, PING_EVENT, {})
        session.rollback()
        assert session.scalar(sa.select(sa.func.count()).select_from(outbox_events)) == 0
        event_id = enqueue(session, PING_EVENT, {"message": "ping"})
        session.commit()
    with Session(db) as session:
        assert session.scalar(sa.select(outbox_events.c.id)) == event_id


def test_failure_retry_and_published_exclusion(db):
    with Session(db) as session, session.begin():
        enqueue(session, PING_EVENT, {})
    publish = MagicMock(side_effect=OSError("broker unavailable"))
    with Session(db) as session, session.begin():
        assert dispatch_pending(session, publish) == 0
    with Session(db) as session:
        row = session.execute(sa.select(outbox_events)).mappings().one()
        assert row["attempts"] == 1
        assert row["published_at"] is None
    publish.side_effect = None
    with Session(db) as session, session.begin():
        assert dispatch_pending(session, publish) == 1
    with Session(db) as session, session.begin():
        assert dispatch_pending(session, publish) == 0
        row = session.execute(sa.select(outbox_events)).mappings().one()
        assert row["attempts"] == 2
        assert row["published_at"] is not None


def test_dispatch_rollback_can_redeliver(db):
    with Session(db) as session, session.begin():
        enqueue(session, PING_EVENT, {})
    publish = MagicMock()
    with Session(db) as session:
        assert dispatch_pending(session, publish) == 1
        session.rollback()
    with Session(db) as session, session.begin():
        assert dispatch_pending(session, publish) == 1
    assert publish.call_args_list[0] == publish.call_args_list[1]


@pytest.mark.parametrize("max_attempts", [5, 2])
def test_exhausted_events_remain_visible_and_are_not_dispatched(db, max_attempts):
    with Session(db) as session, session.begin():
        event_id = enqueue(session, PING_EVENT, {})
    publish = MagicMock(side_effect=OSError("broker unavailable"))
    for _ in range(max_attempts + 2):
        with Session(db) as session, session.begin():
            assert dispatch_pending(session, publish, max_attempts=max_attempts) == 0
    assert publish.call_count == max_attempts
    with Session(db) as session, session.begin():
        row = session.execute(sa.select(outbox_events)).mappings().one()
        assert row["id"] == event_id
        assert row["attempts"] == max_attempts
        assert row["published_at"] is None
        enqueue(session, PING_EVENT, {})
    publish.reset_mock()
    publish.side_effect = None
    with Session(db) as session, session.begin():
        assert dispatch_pending(session, publish, max_attempts=max_attempts) == 1
    publish.assert_called_once()


def test_failed_final_attempt_rollback_preserves_retry(db):
    with Session(db) as session, session.begin():
        event_id = enqueue(session, PING_EVENT, {})
        session.execute(outbox_events.update().where(
            outbox_events.c.id == event_id,
        ).values(attempts=4))
    publish = MagicMock(side_effect=OSError("broker unavailable"))
    with Session(db) as session:
        assert dispatch_pending(session, publish) == 0
        session.rollback()
    with Session(db) as session, session.begin():
        assert session.scalar(sa.select(outbox_events.c.attempts)) == 4
        publish.side_effect = None
        assert dispatch_pending(session, publish) == 1
    with Session(db) as session:
        row = session.execute(sa.select(outbox_events)).mappings().one()
        assert row["attempts"] == 5
        assert row["published_at"] is not None


def test_locked_batch_skipped_by_second_dispatcher(db):
    with Session(db) as session, session.begin():
        enqueue(session, PING_EVENT, {})
    with Session(db) as first, Session(db) as second:
        first.execute(sa.select(outbox_events).with_for_update()).all()
        publish = MagicMock()
        assert dispatch_pending(second, publish) == 0
        publish.assert_not_called()
        first.rollback()
        assert dispatch_pending(second, publish) == 1
        second.commit()


def test_consumer_deduplication_and_rollback(db):
    envelope = {"id": str(uuid4()), "event_type": PING_EVENT, "payload": {}}
    with Session(db) as session:
        assert consume_event(session, envelope) is True
        session.rollback()
    with Session(db) as session, session.begin():
        assert consume_event(session, envelope) is True
    with Session(db) as session, session.begin():
        assert consume_event(session, envelope) is False
        assert session.scalar(sa.select(sa.func.count()).select_from(processed_events)) == 1


def test_concurrent_duplicate_consumers(db):
    envelope = {"id": str(uuid4()), "event_type": PING_EVENT, "payload": {}}

    def consume_once():
        with Session(db) as session, session.begin():
            session.execute(sa.text("SET LOCAL statement_timeout = '5s'"))
            return consume_event(session, envelope)

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(lambda _: consume_once(), range(2)))
    assert sorted(results) == [False, True]
