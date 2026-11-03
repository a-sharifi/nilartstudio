from uuid import uuid4

from sqlalchemy import text
from test_basket import basket as basket
from test_basket import migrate
from test_fulfillment_postgres import packed, setup
from test_identity_otp_postgres import flow as flow
from test_sandbox_payments import checkout as checkout

from nilart.bootstrap.settings import settings

BASE = "/api/v1/admin/shipping/tapin"


def prepare(checkout, monkeypatch):
    client, db, order, line = setup(checkout)
    migrate(db, "0058_tapin_shipping.py")
    shipment = packed(client, order, line)
    monkeypatch.setattr(settings, "tapin_enabled", False)
    monkeypatch.setattr(settings, "tapin_shop_id", str(uuid4()))
    from pydantic import SecretStr

    monkeypatch.setattr(settings, "tapin_token", SecretStr("private-test-token"))
    csrf = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
    client.headers["X-CSRF-Token"] = csrf
    body = dict(
        expected_version=4,
        confirmed=True,
        reason="Explicit intercepted carrier test",
        parcel=dict(
            first_name="Test",
            last_name="Recipient",
            mobile="09123456789",
            postal_code="1234567890",
            address="Synthetic address for test only",
            province_code=1,
            city_code=1,
            box_id=10,
            package_weight=100,
            product_weights={line: 100},
            has_insurance=True,
        ),
    )
    return client, db, order, shipment, body


def test_disabled_sandbox_and_csrf_never_send(checkout, monkeypatch):
    client, db, order, shipment, body = prepare(checkout, monkeypatch)
    calls = []
    monkeypatch.setattr(
        "nilart.contexts.shipping.tapin.Tapin.register", lambda *_: calls.append(True)
    )
    assert client.get(BASE + "/configuration").json() == dict(enabled=False, configured=True)
    assert client.post(BASE + "/connection").status_code == 409
    path = f"{BASE}/shipments/{shipment}/operations/{uuid4()}"
    assert client.put(path, json=body).json()["code"] == "tapin_disabled"
    monkeypatch.setattr(settings, "tapin_enabled", True)
    assert client.put(path, json=body).json()["code"] == "tapin_sandbox_order_blocked"
    client.headers.pop("X-CSRF-Token")
    assert client.put(path, json=body).status_code == 403
    assert not calls and db.scalar(text("SELECT count(*) FROM tapin_shipments")) == 0


def test_registration_replay_tracking_and_unknown_never_duplicate(checkout, monkeypatch):
    client, db, order, shipment, body = prepare(checkout, monkeypatch)
    monkeypatch.setattr(settings, "tapin_enabled", True)
    # Only this rollback-isolated fixture is promoted; every provider call is mocked.
    db.execute(text("UPDATE customer_orders SET sandbox=false WHERE id=:id"), dict(id=order))
    db.commit()
    monkeypatch.setattr(
        "nilart.contexts.shipping.tapin.Tapin.shop", lambda *_: dict(active=True, status=1)
    )
    calls = []

    def send(*args):
        calls.append(True)
        return dict(order_id=123, barcode=None, status=0)

    monkeypatch.setattr("nilart.contexts.shipping.tapin.Tapin.register", send)
    key = uuid4()
    path = f"{BASE}/shipments/{shipment}/operations/{key}"
    result = client.put(path, json=body)
    assert result.status_code == 200, result.text
    assert result.json()["state"] == "registered"
    assert client.put(path, json=body).json()["provider_order_id"] == 123 and len(calls) == 1
    assert (
        client.put(f"{BASE}/shipments/{shipment}/operations/{uuid4()}", json=body).status_code
        == 409
    )
    assert client.put(path, json={**body, "reason": "Changed intent"}).status_code == 409
    monkeypatch.setattr(
        "nilart.contexts.shipping.tapin.Tapin.detail",
        lambda *_: dict(order_id=123, status=2, barcode="12345678901234567890"),
    )
    assert (
        client.post(f"{BASE}/shipments/{shipment}/refresh").json()["barcode"]
        == "12345678901234567890"
    )
    assert (
        db.scalar(text("SELECT status FROM fulfillment_shipments WHERE id=:id"), dict(id=shipment))
        == "packed"
    )
    # Unknown result is durably visible, with no automatic resend even for the same key.
    db.execute(
        text("UPDATE tapin_shipments SET state='unknown' WHERE shipment_id=:id"), dict(id=shipment)
    )
    db.commit()
    assert client.put(path, json=body).json()["state"] == "unknown" and len(calls) == 1
    assert client.get(f"{BASE}/shipments/{shipment}").json()["state"] == "unknown"
    assert "private-test-token" not in client.get(f"{BASE}/shipments/{shipment}").text


def test_actual_unknown_result_is_recoverable_and_blocks_parcel_cancellation(checkout, monkeypatch):
    from test_fulfillment_postgres import cmd

    client, db, order, shipment, body = prepare(checkout, monkeypatch)
    monkeypatch.setattr(settings, "tapin_enabled", True)
    db.execute(text("UPDATE customer_orders SET sandbox=false WHERE id=:id"), dict(id=order))
    db.commit()
    monkeypatch.setattr(
        "nilart.contexts.shipping.tapin.Tapin.shop", lambda *_: dict(active=True, status=1)
    )
    from nilart.contexts.shipping.tapin import TapinError

    def timeout(*_):
        raise TapinError("tapin_result_unknown", uncertain=True)

    monkeypatch.setattr("nilart.contexts.shipping.tapin.Tapin.register", timeout)
    key = uuid4()
    result = client.put(f"{BASE}/shipments/{shipment}/operations/{key}", json=body)
    assert result.status_code == 200 and result.json()["state"] == "unknown", result.text
    assert cmd(client, shipment, order, 4, "cancel").json()["code"] == "fulfillment_tapin_registration_locked"
    stored = db.scalar(text("SELECT payload FROM tapin_shipments"))
    remote = {
        **stored,
        "state_code": stored["province_code"],
        "order_id": 456,
        "status": 0,
        "barcode": None,
    }
    monkeypatch.setattr("nilart.contexts.shipping.tapin.Tapin.detail", lambda *_: remote)
    recovery = dict(
        operation_id=str(key),
        provider_order_id=456,
        verified_in_panel=True,
        reason="Matched existing carrier order in panel",
    )
    # Correct credentials still require CSRF for every recovery write.
    client.headers["X-CSRF-Token"] = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
    response = client.post(f"{BASE}/shipments/{shipment}/reconcile", json=recovery)
    assert response.status_code == 200 and response.json()["state"] == "registered", response.text
    assert db.scalar(text("SELECT count(*) FROM tapin_shipments")) == 1
