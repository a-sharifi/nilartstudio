from celery import Celery
from sqlalchemy.orm import Session

from nilart.bootstrap.settings import settings
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
                   beat_schedule={"dispatch-outbox": {
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
