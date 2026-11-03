from celery import Celery
from sqlalchemy.orm import Session

from nilart.bootstrap.settings import settings
from nilart.contexts.inventory.reservations import expire
from nilart.shared.database import engine
from nilart.shared.outbox import consume_event, dispatch_pending

celery = Celery("nilart", broker=settings.broker_url)
celery.conf.update(task_serializer="json", accept_content=["json"],
                   task_ignore_result=True, task_acks_late=True,
                   worker_prefetch_multiplier=1, timezone="UTC", enable_utc=True,
                   broker_transport_options={"confirm_publish": True},
                   task_default_delivery_mode="persistent",
                   task_reject_on_worker_lost=True,
                   control_queue_exclusive=True, event_queue_exclusive=True,
                   beat_schedule={"sync-sales-channels": {"task":"nilart.channels.sync", "schedule":30.0},"send-order-sms": {"task":"nilart.sms.dispatch", "schedule":5.0},"expire-stock-reservations": {"task":"nilart.inventory.expire", "schedule":30.0}, "dispatch-outbox": {
                       "task": "nilart.outbox.dispatch", "schedule": 5.0,
                   }})


def publish_event(envelope):
    """Use a fixed Celery task and synchronous RabbitMQ publisher confirms."""
    if not settings.broker_url.startswith(("amqp://", "amqps://", "pyamqp://")):
        raise ValueError("outbox publication requires RabbitMQ AMQP")
    with celery.producer_or_acquire() as producer:
        celery.send_task("nilart.outbox.consume", args=[envelope],
                         producer=producer, delivery_mode=2, retry=False)


@celery.task(name="nilart.outbox.dispatch")
def dispatch():
    with Session(engine) as session, session.begin():
        return dispatch_pending(session, publish_event)


@celery.task(name="nilart.outbox.consume", autoretry_for=(Exception,),
             retry_backoff=True, retry_jitter=True, max_retries=5,
             dont_autoretry_for=(ValueError, KeyError, TypeError))
def consume(envelope):
    with Session(engine) as session, session.begin():
        return consume_event(session, envelope)


@celery.task(name="nilart.health.ping")
def ping():
    return "pong"


@celery.task(name="nilart.inventory.expire", autoretry_for=(Exception,), retry_backoff=True, max_retries=5)
def expire_reservations():
    with Session(engine) as session, session.begin():
        return expire(session)


@celery.task(name="nilart.sms.dispatch")
def dispatch_order_sms():
    from nilart.contexts.messaging.service import dispatch
    return dispatch(engine)


@celery.task(name="nilart.channels.sync")
def sync_sales_channels():
    from sqlalchemy import text

    from nilart.contexts.channels.service import tick
    # One process owns the periodic scan, including commits around provider I/O.
    with engine.connect() as connection:
        if not connection.scalar(text("SELECT pg_try_advisory_lock(78214,61)")):
            return
        connection.commit()
        try:
            with Session(bind=connection) as session:
                tick(session)
        finally:
            connection.execute(text("SELECT pg_advisory_unlock(78214,61)"))
            connection.commit()


celery.conf.beat_schedule["dispatch-product-images"] = {"task": "nilart.mockups.dispatch", "schedule": 5.0}


@celery.task(name="nilart.mockups.dispatch")
def dispatch_mockups():
    from sqlalchemy import text
    with Session(engine) as session:
        session.execute(text("UPDATE mockup_runs SET status='failed',error='mockup_retry_limit',lease_until=NULL WHERE status='rendering' AND lease_until<now() AND attempts>=3"))
        # Bound in-flight messages; re-dispatch only after an unclaimed message's
        # lease expires. A stopped broker/worker cannot strand durable DB jobs.
        session.execute(text("SELECT pg_advisory_xact_lock(78214,63)"))
        active = session.scalar(text("SELECT count(*) FROM mockup_runs WHERE status='queued' AND lease_until>now()"))
        rows = session.scalars(text("""UPDATE mockup_runs SET status='queued',lease_until=now()+interval '5 minutes'
          WHERE id IN (SELECT id FROM mockup_runs WHERE attempts<3 AND
          ((status='queued' AND (lease_until IS NULL OR lease_until<now())) OR
           (status='rendering' AND lease_until<now())) ORDER BY created_at LIMIT :limit)
          RETURNING id"""),dict(limit=max(0,5-active))).all()
        session.commit()
    for run_id in rows:
        celery.send_task("nilart.mockups.render", args=[str(run_id)], queue="mockups", delivery_mode=2)


@celery.task(name="nilart.mockups.render", queue="mockups", soft_time_limit=180, time_limit=210)
def render_mockup(run_id):
    from uuid import UUID
    from nilart.contexts.mockups.service import process_run
    return process_run(engine, UUID(run_id))
