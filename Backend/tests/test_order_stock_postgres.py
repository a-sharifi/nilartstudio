import json
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import text
from test_basket import basket as basket
from test_basket import mutate
from test_identity_otp_postgres import flow as flow
from test_sandbox_payments import checkout as checkout
from test_sandbox_payments import start

from nilart.contexts.inventory.reservations import expire
from nilart.contexts.payments.gateway import GatewayRejected, GatewayUnknown, ZarinpalSandbox


def callback(client, p):
    return client.get(
        f"/api/v1/payments/sandbox/callback/{p['id']}?Authority={'A' + '1' * 35}&Status=OK",
        follow_redirects=False,
    )


def stock(db):
    return db.execute(text("SELECT * FROM inventory_positions WHERE reserved>0")).mappings().all()


def staff(client, db):
    id = db.scalar(text("SELECT id FROM identity_accounts LIMIT 1"))
    db.execute(
        text(
            "INSERT INTO identity_account_roles(account_id,role) VALUES(:id,'operations') ON CONFLICT DO NOTHING"
        ),
        {"id": id},
    )
    db.commit()


def test_reservation_commit_repeated_callbacks_and_frozen_cost(checkout):
    client, db, body = checkout
    before = db.execute(text("SELECT quantity,value FROM inventory_positions ORDER BY id")).all()
    p = start(client, body).json()
    assert len(stock(db)) == 1 and stock(db)[0]["reserved"] == 2
    assert db.scalar(text("SELECT state FROM order_stock_allocations")) == "reserved"
    frozen = db.scalar(text("SELECT components FROM order_stock_allocations"))
    assert frozen[0]["quantity"] == 2 and frozen[0]["per_unit"] == 1
    assert frozen[0]["unit_amount"] == "100.1" and frozen[0]["paid_amount"] == "200.20"
    snapshot = db.scalar(text("SELECT snapshot FROM customer_orders"))
    assert snapshot["items"][0]["stock_components"] == frozen
    assert callback(client, p).status_code == 303
    assert callback(client, p).status_code == 303
    assert db.scalar(text("SELECT state FROM order_stock_allocations")) == "committed"
    assert db.scalar(text("SELECT count(*) FROM stock_reservation_events")) == 2
    assert (
        db.execute(text("SELECT quantity,value FROM inventory_positions ORDER BY id")).all()
        == before
    )
    assert stock(db)[0]["reserved"] == 2
    owned = client.get(f"/api/v1/account/orders/{p['order_id']}/stock")
    assert owned.status_code == 200 and owned.json()["state"] == "committed"
    client.cookies.clear()
    assert client.get(f"/api/v1/account/orders/{p['order_id']}/stock").status_code == 401


def test_repeated_bundle_sku_aggregates_with_standalone(checkout):
    client, db, body = checkout
    skus = db.execute(text("SELECT id,product_id FROM catalog_skus ORDER BY id")).mappings().all()
    target = next(s for s in skus if sum(x["product_id"] == s["product_id"] for x in skus) == 2)
    same = [s for s in skus if s["product_id"] == target["product_id"]]
    target, other = same
    bundle = db.scalar(text("SELECT id FROM catalog_bundles"))
    db.execute(text("DELETE FROM catalog_bundle_components WHERE bundle_id=:id"), {"id": bundle})
    for s in same:
        db.execute(
            text(
                "INSERT INTO catalog_bundle_components(bundle_id,sku_id,quantity) VALUES(:id,:sku,2)"
            ),
            {"id": bundle, "sku": s["id"]},
        )
    choices = [
        {"component_sku_id": str(s["id"]), "allowed_sku_ids": [str(target["id"])]} for s in same
    ]
    db.execute(
        text(
            "UPDATE catalog_bundle_presentations SET document=CAST(:d AS jsonb) WHERE bundle_id=:id"
        ),
        {"id": bundle, "d": json.dumps({"component_choices": choices})},
    )
    csrf = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
    assert mutate(client, 1, csrf, action="clear").status_code == 200
    added = mutate(
        client,
        2,
        csrf,
        item={
            "kind": "bundle",
            "item_id": str(bundle),
            "quantity": 2,
            "choices": {str(s["id"]): str(target["id"]) for s in same},
        },
    )
    assert added.status_code == 200, added.text
    added = mutate(
        client, 3, csrf, item={"kind": "product", "item_id": str(target["id"]), "quantity": 1}
    )
    assert added.status_code == 200, added.text
    review = client.get("/api/v1/payments/stock-review?basket_version=4").json()
    assert len(review["positions"]) == 1 and review["positions"][0]["required"] == 9
    db.execute(
        text("UPDATE inventory_positions SET quantity=8 WHERE reference_id=:id"),
        {"id": target["id"]},
    )
    db.commit()
    result = start(
        client, {**body, "basket_version": 4, "expected_total": added.json()["totals"]["total"]}
    )
    assert result.status_code == 409 and result.json()["code"] == "stock_unavailable"
    assert db.scalar(text("SELECT count(*) FROM customer_orders")) == 0
    assert not stock(db)
    db.execute(
        text("UPDATE inventory_positions SET quantity=9 WHERE reference_id=:id"),
        {"id": target["id"]},
    )
    db.commit()
    result = start(
        client, {**body, "basket_version": 4, "expected_total": added.json()["totals"]["total"]}
    )
    assert result.status_code == 200, result.text
    assert stock(db)[0]["reserved"] == 9
    from decimal import Decimal

    snapshot = db.scalar(text("SELECT snapshot FROM customer_orders"))
    for line in snapshot["items"]:
        assert sum(Decimal(c["paid_amount"]) for c in line["stock_components"]) == Decimal(
            line["unit_amount"]
        ) * line["quantity"] - Decimal(line["discount_amount"])
    frozen = db.scalar(text("SELECT components FROM order_stock_allocations"))
    db.execute(text("UPDATE catalog_skus SET price_amount=9999"))
    db.commit()
    assert db.scalar(text("SELECT components FROM order_stock_allocations")) == frozen


def test_expiry_unknown_late_shortage_and_reasoned_reacquisition(checkout, monkeypatch):
    client, db, body = checkout
    p = start(client, body).json()

    def unknown(*args):
        raise GatewayUnknown()

    monkeypatch.setattr(ZarinpalSandbox, "verify", unknown)
    callback(client, p)
    assert stock(db)[0]["reserved"] == 2
    assert expire(db, now=datetime.now(UTC) + timedelta(hours=1)) == 1
    db.commit()
    assert not stock(db)
    assert expire(db, now=datetime.now(UTC) + timedelta(hours=1)) == 0
    db.execute(text("UPDATE inventory_positions SET quantity=0,value=0"))
    db.commit()
    monkeypatch.setattr(ZarinpalSandbox, "verify", lambda *args: "555")
    callback(client, p)
    assert db.scalar(text("SELECT state FROM order_stock_allocations")) == "shortage"
    assert db.scalar(text("SELECT state->>'payment' FROM customer_orders")) == "paid"
    assert db.scalar(text("SELECT state->>'fulfillment' FROM customer_orders")) == "on_hold"
    staff(client, db)
    detail = client.get(f"/api/v1/admin/order-stock/{p['order_id']}").json()
    assert detail["allocation"]["state"] == "shortage"
    key = str(uuid4())
    intent = {
        "expected_version": detail["allocation"]["version"],
        "reason": "Explicit replenishment review",
    }
    url = f"/api/v1/admin/order-stock/{p['order_id']}/commands/{key}"
    csrf = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
    assert client.put(url, json=intent).status_code == 403
    db.execute(text("UPDATE inventory_positions SET quantity=10,value=500"))
    db.commit()
    actor = db.scalar(text("SELECT id FROM identity_accounts LIMIT 1"))
    db.execute(
        text(
            "INSERT INTO identity_permission_overrides(account_id,permission,allowed) VALUES(:id,'fulfillment.manage',false)"
        ),
        {"id": actor},
    )
    db.commit()
    assert client.put(url, json=intent, headers={"X-CSRF-Token": csrf}).status_code == 403
    db.execute(
        text("DELETE FROM identity_permission_overrides WHERE account_id=:id"), {"id": actor}
    )
    db.commit()
    r = client.put(url, json=intent, headers={"X-CSRF-Token": csrf})
    assert r.status_code == 200, r.text
    assert (
        r.json()["result"]["state"] == "committed"
        and r.json()["result"]["version"] == intent["expected_version"] + 1
    )
    assert client.put(url, json=intent, headers={"X-CSRF-Token": csrf}).json() == r.json()
    assert client.get(url).json() == r.json()
    assert (
        client.put(
            url, json={**intent, "reason": "Changed"}, headers={"X-CSRF-Token": csrf}
        ).status_code
        == 409
    )
    assert stock(db)[0]["reserved"] == 2
    assert client.get("/api/v1/admin/order-stock?state=shortage").json()["items"] == []


@pytest.mark.parametrize("outcome", ["rejected", "cancelled"])
def test_definitive_failure_releases_once(checkout, monkeypatch, outcome):
    client, db, body = checkout
    p = start(client, body).json()
    if outcome == "rejected":

        def rejected(*args):
            raise GatewayRejected()

        monkeypatch.setattr(ZarinpalSandbox, "verify", rejected)
        callback(client, p)
        callback(client, p)
    else:
        url = f"/api/v1/payments/sandbox/callback/{p['id']}?Authority={'A' + '1' * 35}&Status=NOK"
        client.get(url, follow_redirects=False)
        client.get(url, follow_redirects=False)
    assert not stock(db)
    assert db.scalar(text("SELECT count(*) FROM stock_reservation_events")) == 2
    assert db.scalar(text("SELECT state FROM order_stock_allocations")) == "released"


def test_missing_configuration_changed_review_and_atomic_rollback(checkout, monkeypatch):
    client, db, body = checkout
    configured=db.scalar(text("SELECT content FROM business_settings"))
    db.execute(text("UPDATE business_settings SET content='{}'"))
    db.commit()
    response = client.get("/api/v1/payments/stock-review?basket_version=1")
    assert (
        response.status_code == 409
        and response.json()["code"] == "stock_reservation_policy_missing"
    )
    db.execute(
        text("UPDATE business_settings SET content=CAST(:c AS jsonb)"),
        {"c": json.dumps({**configured,"reservation_minutes": 5})},
    )
    db.commit()
    reviewed = client.get("/api/v1/payments/stock-review?basket_version=1").json()
    db.execute(text("UPDATE business_settings SET version=2"))
    db.commit()
    response = start(client, {**body, "stock_fingerprint": reviewed["fingerprint"]})
    assert response.status_code == 409 and response.json()["code"] == "stock_review_required"

    def fail(*args):
        raise RuntimeError("Injected outbox failure")

    monkeypatch.setattr("nilart.contexts.inventory.reservations.enqueue", fail)
    with pytest.raises(RuntimeError):
        start(client, body)
    assert not stock(db)
    for table in [
        "customer_orders",
        "sandbox_payments",
        "order_stock_allocations",
        "stock_reservation_events",
    ]:
        assert db.scalar(text(f"SELECT count(*) FROM {table}")) == 0


def test_missing_opening_stock_blocks_checkout_without_guessing_quantity(checkout):
    client, db, body = checkout
    db.execute(text("DELETE FROM inventory_positions"))
    db.commit()
    reviewed = client.get("/api/v1/payments/stock-review?basket_version=1").json()
    assert (
        reviewed["ready"] is False and reviewed["positions"][0]["issue"] == "stock_opening_required"
    )
    assert start(client, body).status_code == 409
    assert db.scalar(text("SELECT count(*) FROM sandbox_payments")) == 0
    assert client.get("/api/v1/admin/order-stock").status_code == 403
