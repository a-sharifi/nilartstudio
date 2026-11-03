import json
from uuid import uuid4

import pytest
from sqlalchemy import text
from test_basket import basket as basket
from test_basket import migrate
from test_identity_otp_postgres import flow as flow
from test_sandbox_payments import checkout as checkout
from test_sandbox_payments import start

from nilart.bootstrap.settings import settings
from nilart.contexts.identity.infrastructure.otp import SmsUnavailable
from nilart.contexts.messaging.service import dispatch, paid, shipped


@pytest.fixture
def sms_order(checkout, monkeypatch):
    client, db, body = checkout
    migrate(db, "0056_sms_deliveries.py")
    assert start(client, body).status_code == 200
    row = db.execute(text("SELECT * FROM sandbox_payments")).mappings().one()
    monkeypatch.setattr(settings, "sms_mode", "kavenegar")
    monkeypatch.setattr(settings, "order_sms_enabled", True)
    monkeypatch.setattr(settings, "kavenegar_approved_templates", "nilartpurchase,nilartshipped")
    return db, dict(row)


def test_sandbox_orders_do_not_send_real_purchase_messages(sms_order):
    db, row = sms_order
    paid(db, {**row, "status": "paid"})
    assert db.scalar(text("SELECT count(*) FROM sms_deliveries")) == 0


def test_paid_order_queue_is_atomic_and_deduplicated(sms_order):
    db, row = sms_order
    db.execute(text("UPDATE customer_orders SET sandbox=false"))
    paid(db, row)
    assert db.scalar(text("SELECT count(*) FROM sms_deliveries")) == 0
    paid(db, {**row, "status": "paid"})
    paid(db, {**row, "status": "paid"})
    assert db.scalar(text("SELECT count(*) FROM sms_deliveries")) == 1
    saved = db.execute(text("SELECT * FROM sms_deliveries")).mappings().one()
    assert saved["tokens"]["token2"] == "200.2"

    class Provider:
        calls = 0

        def send_template(self, *args):
            self.calls += 1
            return 12345

    provider = Provider()
    assert dispatch(db.bind, provider) == 1
    assert dispatch(db.bind, provider) == 0
    assert provider.calls == 1
    assert db.scalar(text("SELECT status FROM sms_deliveries")) == "accepted"


def test_unknown_delivery_is_never_automatically_retried(sms_order):
    db, row = sms_order
    db.execute(text("UPDATE customer_orders SET sandbox=false"))
    paid(db, {**row, "status": "paid"})

    class Provider:
        def send_template(self, *args):
            raise SmsUnavailable("Unknown external result")

    assert dispatch(db.bind, Provider()) == 1
    assert db.scalar(text("SELECT status FROM sms_deliveries")) == "unknown"
    assert dispatch(db.bind, Provider()) == 0


def test_partial_shipments_are_distinct_but_duplicate_dispatch_is_not(sms_order):
    db, row = sms_order
    db.execute(text("UPDATE customer_orders SET sandbox=false"))
    shipment = {
        "id": uuid4(),
        "order_id": row["order_id"],
        "status": "packed",
        "state": {"dispatch": {"tracking": "12345678901234567890"}},
    }
    shipped(db, shipment)
    assert db.scalar(text("SELECT count(*) FROM sms_deliveries")) == 0
    shipment["status"] = "dispatched"
    shipped(db, shipment)
    shipped(db, shipment)
    shipped(db, {**shipment, "id": uuid4()})
    assert db.scalar(text("SELECT count(*) FROM sms_deliveries")) == 2


def test_sms_preferences_can_stop_queued_delivery(sms_order):
    db, row = sms_order
    db.execute(text("UPDATE customer_orders SET sandbox=false"))
    paid(db, {**row, "status": "paid"})
    db.execute(
        text(
            "INSERT INTO customer_records(id,account_id,kind,data) VALUES(:id,:owner,'preferences',CAST(:data AS jsonb))"
        ),
        {
            "id": uuid4(),
            "owner": row["account_id"],
            "data": json.dumps({"choices": {"order": {"sms": False}}}),
        },
    )

    class Provider:
        def send_template(self, *args):
            pytest.fail("Customer opted out")

    assert dispatch(db.bind, Provider()) == 0
    assert db.scalar(text("SELECT status FROM sms_deliveries")) == "skipped"
