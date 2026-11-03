import json
from uuid import uuid4

import pytest
from sqlalchemy import text
from test_basket import basket as basket
from test_basket import boot, migrate, mutate
from test_identity_otp_postgres import flow as flow
from test_identity_otp_postgres import register

from nilart.bootstrap.settings import settings
from nilart.contexts.payments.gateway import GatewayUnknown, ZarinpalSandbox, rial


def test_rial_is_exact_and_rejects_fractional_rials():
    assert rial("125000") == 1250000
    assert rial("100.1") == 1001
    with pytest.raises(ValueError):
        rial("100.01")


@pytest.fixture
def checkout(basket, monkeypatch):
    client, db, sms, ids = basket
    for name in [
        "0023_customer_orders.py",
        "0031_sandbox_payments.py",
        "0033_discounts.py",
        "0034_business_settings.py",
        "0035_stock_ledger.py",
        "0043_order_stock_reservations.py",
        "0053_catalog_profiles.py",
    ]:
        migrate(db, name)
    monkeypatch.setattr(settings, "payment_mode", "zarinpal_sandbox")
    monkeypatch.setattr(
        "nilart.contexts.identity.presentation.router.csrf_attempt_allowed", lambda *args: True
    )
    _, registered = register(client, sms)
    owner = registered.json()["account_id"]
    address = uuid4()
    db.execute(
        text(
            "INSERT INTO customer_records(id,account_id,kind,data) VALUES(:id,:owner,'address',CAST(:data AS jsonb))"
        ),
        {
            "id": address,
            "owner": owner,
            "data": json.dumps(
                {
                    "name": "Sandbox recipient",
                    "province": "Test",
                    "city": "Test",
                    "street": "Sandbox only",
                    "postal": "1234567890",
                }
            ),
        },
    )
    db.execute(
        text(
            "INSERT INTO business_settings(key,version,content) VALUES('business',1,CAST(:content AS jsonb))"
        ),
        {
            "content": json.dumps(
                {
                    "reservation_minutes": 15,
                    "tax_percent": "0",
                    "tax_basis": "items",
                    "shipping_calculation": "actual_weight",
                    "shipping_rounding": "half_up_cent",
                    "tax_rounding": "half_up_cent",
                    "refund_policy": "items_and_proportional_tax_shipping_if_unshipped",
                    "return_days": 7,
                    "return_policy_fa": "سیاست آزمایش",
                    "return_policy_en": "Test return policy",
                    "shipping_methods": [
                        {
                            "id": "11111111-1111-4111-8111-111111111111",
                            "title_fa": "پست",
                            "title_en": "Post",
                            "base_amount": "0",
                            "per_kg_amount": "0",
                            "active": True,
                        }
                    ],
                }
            )
        },
    )
    from uuid import uuid5

    from nilart.contexts.inventory.router import NAMESPACE

    for sku in db.execute(text("SELECT id,code FROM catalog_skus")).mappings():
        db.execute(
            text(
                "INSERT INTO inventory_positions(id,kind,reference_id,code,title_fa,title_en,unit,quantity,reserved,value,version) VALUES(:id,'sku',:reference,:code,'آزمایش','Synthetic','piece',100,0,5000,1)"
            ),
            {
                "id": uuid5(NAMESPACE, f"sku:{sku['id']}"),
                "reference": sku["id"],
                "code": sku["code"],
            },
        )
    for sku in db.scalars(text("SELECT id FROM catalog_skus")):
        revision = uuid4()
        content = {
            "specifications": [],
            "gallery": [],
            "delivery": "physical",
            "weight_grams": 100,
            "returnable": True,
        }
        db.execute(
            text(
                "INSERT INTO catalog_profiles(kind,entity_id,version,content) VALUES('skus',:id,1,CAST(:content AS jsonb))"
            ),
            {"id": sku, "content": json.dumps(content)},
        )
        db.execute(
            text(
                "INSERT INTO catalog_profile_revisions(id,kind,entity_id,actor_id,version,intent,result) VALUES(:key,'skus',:id,:actor,1,CAST(:intent AS jsonb),'{}'::jsonb)"
            ),
            {
                "key": revision,
                "id": sku,
                "actor": owner,
                "intent": json.dumps({"action": "publish", "content": content}),
            },
        )
        db.execute(
            text(
                "UPDATE catalog_profiles SET published_revision=:revision WHERE kind='skus' AND entity_id=:id"
            ),
            {"id": sku, "revision": revision},
        )
    db.commit()
    boot(client)
    csrf = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
    added = mutate(client, 0, csrf, item={"kind": "product", "item_id": ids["sku"], "quantity": 2})
    assert added.status_code == 200, added.text
    body = {
        "command_id": str(uuid4()),
        "basket_version": 1,
        "address_id": str(address),
        "language": "en",
        "sandbox_confirmed": True,
        "expected_total": "200.2",
    }
    monkeypatch.setattr(ZarinpalSandbox, "request", lambda self, amount, callback: "A" + "1" * 35)
    monkeypatch.setattr(ZarinpalSandbox, "verify", lambda self, amount, authority: "123456789")
    return client, db, body


def start(client, body):
    original = json.dumps(body, sort_keys=True)
    cache = getattr(client, "_accepted_checkout_intents", {})
    if original in cache:
        csrf = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
        return client.post(
            "/api/v1/payments/sandbox/checkout",
            json=cache[original],
            headers={"X-CSRF-Token": csrf},
        )
    review = client.get(f"/api/v1/payments/stock-review?basket_version={body['basket_version']}")
    if review.status_code == 200 and "stock_fingerprint" not in body:
        body = {**body, "stock_fingerprint": review.json()["fingerprint"]}
    csrf = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
    if "checkout_fingerprint" not in body:
        body = {
            **body,
            "shipping_method_id": body.get(
                "shipping_method_id", "11111111-1111-4111-8111-111111111111"
            ),
        }
        selected = {
            k: body[k]
            for k in [
                "basket_version",
                "address_id",
                "shipping_method_id",
                "discount_code",
                "discount_version",
            ]
            if k in body
        }
        reviewed = client.post(
            "/api/v1/payments/checkout-review", json=selected, headers={"X-CSRF-Token": csrf}
        )
        if reviewed.status_code == 200:
            body = {**body, "checkout_fingerprint": reviewed.json()["fingerprint"]}
    cache[original] = body
    client._accepted_checkout_intents = cache
    return client.post(
        "/api/v1/payments/sandbox/checkout", json=body, headers={"X-CSRF-Token": csrf}
    )


def test_snapshot_callback_replay_and_owner_isolation(checkout):
    client, db, body = checkout
    response = start(client, body)
    assert response.status_code == 200, response.text
    payment = response.json()
    assert payment["amount_rial"] == "2002"
    assert payment["gateway_url"].startswith("https://sandbox.zarinpal.com/")
    assert start(client, body).json()["id"] == payment["id"]
    before = db.scalar(text("SELECT count(*) FROM outbox_events"))
    callback = (
        f"/api/v1/payments/sandbox/callback/{payment['id']}?Authority={'A' + '1' * 35}&Status=OK"
    )
    assert client.get(callback, follow_redirects=False).status_code == 303
    assert client.get(callback, follow_redirects=False).status_code == 303
    assert db.scalar(text("SELECT count(*) FROM customer_orders")) == 1
    assert db.scalar(text("SELECT count(*) FROM outbox_events")) == before + 2
    row = db.execute(text("SELECT snapshot,state,sandbox FROM customer_orders")).mappings().one()
    assert row["sandbox"] is True
    assert row["snapshot"]["total_amount"] == "200.20"
    assert row["snapshot"]["receipt"]["number"].startswith("SANDBOX-ZP-")
    assert row["state"]["payment"] == "paid"
    assert row["state"]["fulfillment"] == "on_hold"
    assert client.get("/api/v1/basket").json()["lines"] == []
    client.cookies.clear()
    assert client.get(f"/api/v1/payments/sandbox/{payment['id']}").status_code == 401


def test_protection_and_stale_totals(checkout):
    client, db, body = checkout
    assert client.post("/api/v1/payments/sandbox/checkout", json=body).status_code == 403
    assert start(client, {**body, "expected_total": "1"}).status_code == 409
    assert start(client, {**body, "basket_version": 0}).status_code == 409
    assert start(client, {**body, "address_id": str(uuid4())}).status_code == 409
    assert db.scalar(text("SELECT count(*) FROM sandbox_payments")) == 0


def test_timeout_never_marks_paid_and_keeps_basket(checkout, monkeypatch):
    client, db, body = checkout
    payment = start(client, body).json()

    def uncertain(*args):
        raise GatewayUnknown()

    monkeypatch.setattr(ZarinpalSandbox, "verify", uncertain)
    callback = (
        f"/api/v1/payments/sandbox/callback/{payment['id']}?Authority={'A' + '1' * 35}&Status=OK"
    )
    assert client.get(callback, follow_redirects=False).status_code == 303
    assert client.get(f"/api/v1/payments/sandbox/{payment['id']}").json()["status"] == "unknown"
    assert client.get("/api/v1/basket").json()["lines"]
    monkeypatch.setattr(ZarinpalSandbox, "verify", lambda *args: "789")
    assert client.get(callback, follow_redirects=False).status_code == 303
    assert client.get(f"/api/v1/payments/sandbox/{payment['id']}").json()["status"] == "paid"


def test_invalid_origin_and_revoked_session(checkout):
    client, db, body = checkout
    csrf = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
    assert (
        client.post(
            "/api/v1/payments/sandbox/checkout",
            json=body,
            headers={"Origin": "https://foreign.example", "X-CSRF-Token": csrf},
        ).status_code
        == 403
    )
    db.execute(text("UPDATE identity_accounts SET blocked=true"))
    db.commit()
    assert (
        client.post(
            "/api/v1/payments/sandbox/checkout", json=body, headers={"X-CSRF-Token": csrf}
        ).status_code
        == 401
    )
    assert db.scalar(text("SELECT count(*) FROM sandbox_payments")) == 0


def test_cancelled_callback_never_marks_order_paid(checkout):
    client, db, body = checkout
    payment = start(client, body).json()
    root = f"/api/v1/payments/sandbox/callback/{payment['id']}"
    assert client.get(root + "?Authority=invalid&Status=OK").status_code == 400
    response = client.get(
        root + "?Authority=" + "A" + "1" * 35 + "&Status=NOK", follow_redirects=False
    )
    assert response.status_code == 303
    assert db.scalar(text("SELECT status FROM sandbox_payments")) == "cancelled"
    assert db.scalar(text("SELECT state->>'payment' FROM customer_orders")) == "failed"
    assert client.get("/api/v1/basket").json()["lines"]
