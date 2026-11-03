"""Order SMS: commit queue atomically; commit a send claim before external I/O."""

import json
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.bootstrap.settings import settings
from nilart.contexts.identity.infrastructure.kavenegar import KavenegarSmsSender
from nilart.contexts.identity.infrastructure.otp import SmsUnavailable


def available():
    approved = {name.strip() for name in settings.kavenegar_approved_templates.split(",")}
    return (
        settings.sms_mode == "kavenegar"
        and settings.order_sms_enabled
        and {settings.kavenegar_template_purchase, settings.kavenegar_template_shipped} <= approved
    )


def opted_out(db, owner, category):
    preferences = db.scalar(
        text(
            "SELECT data FROM customer_records WHERE account_id=:id AND kind='preferences' ORDER BY created_at,id LIMIT 1"
        ),
        {"id": owner},
    )
    return bool(
        preferences and preferences.get("choices", {}).get(category, {}).get("sms") is False
    )


def queue(db, *, order_id, event_key, template, tokens, category):
    if not available():
        return
    order = (
        db.execute(
            text(
                "SELECT o.account_id,o.sandbox,a.phone FROM customer_orders o JOIN identity_accounts a ON a.id=o.account_id WHERE o.id=:id"
            ),
            {"id": order_id},
        )
        .mappings()
        .one()
    )
    # Sandbox payments must never send customers a real purchase/dispatch claim.
    if order["sandbox"] or opted_out(db, order["account_id"], category):
        return
    db.execute(
        text(
            "INSERT INTO sms_deliveries(id,event_key,account_id,order_id,template,recipient,tokens) VALUES(:id,:key,:account,:order,:template,:phone,CAST(:tokens AS jsonb)) ON CONFLICT(event_key) DO NOTHING"
        ),
        {
            "id": uuid4(),
            "key": event_key,
            "account": order["account_id"],
            "order": order_id,
            "template": template,
            "phone": order["phone"],
            "tokens": json.dumps(tokens),
        },
    )


def paid(db, payment):
    if payment["status"] != "paid":
        return
    queue(
        db,
        order_id=payment["order_id"],
        event_key=f"order-paid:{payment['order_id']}",
        template=settings.kavenegar_template_purchase,
        tokens={
            "token": str(payment["order_id"]),
            "token2": format(Decimal(payment["amount_rial"]) / 10, "f"),
        },
        category="order",
    )


def shipped(db, shipment):
    if shipment["status"] != "dispatched":
        return
    tracking = shipment["state"].get("dispatch", {}).get("tracking")
    if not tracking:
        return
    queue(
        db,
        order_id=shipment["order_id"],
        event_key=f"shipment-dispatched:{shipment['id']}",
        template=settings.kavenegar_template_shipped,
        tokens={"token": str(shipment["order_id"]), "token2": tracking},
        category="delivery",
    )


def dispatch(engine, sender=None, limit=10):
    if not available():
        return 0
    sender = sender or KavenegarSmsSender(
        settings.kavenegar_api_key.get_secret_value(),
        {},
        [name.strip() for name in settings.kavenegar_approved_templates.split(",")],
    )
    count = 0
    for _ in range(min(limit, 10)):
        with Session(engine) as db, db.begin():
            # A crashed send may have succeeded externally. Never automatically resend.
            db.execute(
                text(
                    "UPDATE sms_deliveries SET status='unknown',updated_at=now() WHERE status='sending' AND updated_at < now()-interval '3 minutes'"
                )
            )
            row = (
                db.execute(
                    text(
                        "SELECT * FROM sms_deliveries WHERE status='pending' ORDER BY created_at,id FOR UPDATE SKIP LOCKED LIMIT 1"
                    )
                )
                .mappings()
                .first()
            )
            if row is None:
                break
            row = dict(row)
            category = (
                "order" if row["template"] == settings.kavenegar_template_purchase else "delivery"
            )
            if opted_out(db, row["account_id"], category):
                db.execute(
                    text(
                        "UPDATE sms_deliveries SET status='skipped',updated_at=now() WHERE id=:id"
                    ),
                    {"id": row["id"]},
                )
                continue
            db.execute(
                text("UPDATE sms_deliveries SET status='sending',updated_at=now() WHERE id=:id"),
                {"id": row["id"]},
            )
        # The sending claim is now durable. Celery redelivery cannot send it twice.
        try:
            message_id = sender.send_template(row["recipient"], row["template"], row["tokens"])
            status = "accepted"
        except SmsUnavailable:
            message_id, status = None, "unknown"
        with Session(engine) as db, db.begin():
            db.execute(
                text(
                    "UPDATE sms_deliveries SET status=:status,message_id=:message,updated_at=now() WHERE id=:id AND status='sending'"
                ),
                {"status": status, "message": message_id, "id": UUID(str(row["id"]))},
            )
        count += 1
    return count
