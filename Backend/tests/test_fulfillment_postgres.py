import json
from uuid import uuid4

import pytest
from sqlalchemy import text
from test_basket import basket as basket
from test_basket import migrate
from test_identity_otp_postgres import flow as flow
from test_order_stock_postgres import callback, staff
from test_sandbox_payments import checkout as checkout
from test_sandbox_payments import start


def setup(checkout):
    client, db, body = checkout
    for name in [
        "0032_suppliers.py",
        "0038_purchases.py",
        "0039_production.py",
        "0044_fulfillment.py",
    ]:
        migrate(db, name)
    p = start(client, body).json()
    assert callback(client, p).status_code == 303
    staff(client, db)
    policy = {
        **db.scalar(text("SELECT content FROM business_settings")),
        "reservation_minutes": 15,
        "return_days": 7,
        "return_policy_fa": "سیاست صریح آزمایش",
        "return_policy_en": "Explicit sandbox return policy",
    }
    db.execute(
        text("UPDATE business_settings SET content=CAST(:c AS jsonb)"), {"c": json.dumps(policy)}
    )
    db.commit()
    line = db.scalar(text("SELECT snapshot FROM customer_orders"))["items"][0]["id"]
    return client, db, p["order_id"], line


def cmd(client, id, order, version, action, key=None, **extra):
    csrf = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
    body = dict(
        order_id=order,
        expected_version=version,
        action=action,
        reason="Explicit sandbox shipment action",
        **extra,
    )
    return client.put(
        f"/api/v1/admin/fulfillment/shipments/{id}/commands/{key or uuid4()}",
        json=body,
        headers={"X-CSRF-Token": csrf},
    )


def packed(client, order, line, qty=1):
    id = str(uuid4())
    for version, action, extra in [
        (0, "draft", {"content": {"quantities": {line: qty}}}),
        (1, "pick", {"pick_confirmed": True}),
        (2, "qc", {"qc": {"correct_items": True, "intact": True, "complete": True}}),
        (3, "pack", {"packing": {"note": "Protected test packaging", "weight_grams": 200}}),
    ]:
        r = cmd(client, id, order, version, action, **extra)
        assert r.status_code == 200, r.text
    return id


def dispatch(client, id, order, key=None):
    return cmd(
        client,
        id,
        order,
        4,
        "dispatch",
        key=key,
        dispatch={
            "carrier": "Sandbox post",
            "tracking": "TRACK-TEST",
            "actual_shipping_cost": "20",
            "sandbox_confirmed": True,
        },
    )


def test_partial_dispatch_cost_replay_delivery_and_historical_cost(checkout):
    client, db, order, line = setup(checkout)
    assert client.get("/api/v1/admin/fulfillment/orders").json()["items"][0]["id"] == order
    first = packed(client, order, line)
    key = str(uuid4())
    r = dispatch(client, first, order, key)
    assert r.status_code == 200, r.text
    result = r.json()
    assert result["result"]["state"]["actual_cost"] == "50.000000"
    assert dispatch(client, first, order, key).json() == result
    assert (
        client.get(f"/api/v1/admin/fulfillment/shipments/{first}/commands/{key}").json() == result
    )
    assert (
        db.scalar(
            text("SELECT count(*) FROM inventory_movements WHERE kind='fulfillment_dispatch'")
        )
        == 1
    )
    position = db.execute(
        text("SELECT quantity,reserved,value FROM inventory_positions WHERE reserved>0")
    ).one()
    assert tuple(position) == (99, 1, 4950)
    assert db.scalar(text("SELECT state->>'fulfillment' FROM customer_orders")) == "partial"
    assert cmd(client, first, order, 5, "deliver").status_code == 200
    snapshot = db.scalar(text("SELECT snapshot FROM customer_orders"))
    assert snapshot["items"][0]["quantity"] == 2
    state = db.scalar(text("SELECT state FROM customer_orders"))
    assert state["delivered"][line] == 1 and state["fulfillment"] == "partial"
    correction = cmd(
        client,
        first,
        order,
        6,
        "tracking",
        carrier={"carrier": "Corrected sandbox carrier", "tracking": "TRACK-CORRECTED"},
    )
    assert correction.status_code == 200, correction.text
    assert correction.json()["result"]["state"]["actual_cost"] == "50.000000"
    assert (
        client.get(f"/api/v1/admin/fulfillment/shipments/{first}/commands/{key}").json() == result
    )
    second = packed(client, order, line)
    assert dispatch(client, second, order).status_code == 200
    assert db.scalar(text("SELECT state->>'fulfillment' FROM customer_orders")) == "shipped"
    assert cmd(client, second, order, 5, "deliver").status_code == 200
    assert db.scalar(text("SELECT state->>'fulfillment' FROM customer_orders")) == "delivered"
    assert client.get("/api/v1/admin/fulfillment/orders").json()["items"] == []
    assert (
        db.scalar(text("SELECT state->'delivered'->>:line FROM customer_orders"), {"line": line})
        == "2"
    )
    assert db.scalar(text("SELECT sum(reserved) FROM inventory_positions")) == 0
    assert (
        db.scalar(
            text(
                "SELECT sum(value_delta) FROM inventory_movements WHERE kind='fulfillment_dispatch'"
            )
        )
        == -100
    )
    db.execute(text("UPDATE catalog_skus SET price_amount=9999"))
    db.commit()
    assert (
        client.get(f"/api/v1/admin/fulfillment/shipments/{first}").json()["state"]["actual_cost"]
        == "50.000000"
    )
    tracking = client.get(f"/api/v1/account/orders/{order}/shipments").json()
    assert len(tracking["items"]) == 2 and all(
        p["status"] == "delivered" for p in tracking["items"]
    )
    assert "actual_cost" not in str(tracking)
    assert any(p["tracking"] == "TRACK-CORRECTED" for p in tracking["items"])
    assert db.scalar(text("SELECT count(*) FROM customer_records WHERE kind='notification'")) == 4
    other = uuid4()
    db.execute(
        text(
            "INSERT INTO identity_accounts(id,phone,password_hash,phone_verified,blocked,created_at) SELECT :id,'+989111112222',password_hash,true,false,now() FROM identity_accounts LIMIT 1"
        ),
        {"id": other},
    )
    db.execute(
        text("INSERT INTO identity_account_roles(account_id,role) VALUES(:id,'customer')"),
        {"id": other},
    )
    db.commit()
    client.cookies.clear()
    assert (
        client.post(
            "/api/v1/auth/login/password",
            json={"phone": "+989111112222", "password": "a long secure passphrase"},
        ).status_code
        == 200
    )
    assert client.get(f"/api/v1/account/orders/{order}/shipments").status_code == 404
    assert client.get("/api/v1/admin/fulfillment/shipments").status_code == 403
    client.cookies.clear()
    assert client.get(f"/api/v1/account/orders/{order}/shipments").status_code == 401


def test_planning_bounds_qc_failure_cancel_and_permissions(checkout):
    client, db, order, line = setup(checkout)
    id = str(uuid4())
    assert cmd(client, id, order, 0, "draft", content={"quantities": {line: 3}}).status_code == 409
    assert cmd(client, id, order, 0, "draft", content={"quantities": {line: 2}}).status_code == 200
    assert (
        cmd(client, str(uuid4()), order, 0, "draft", content={"quantities": {line: 1}}).status_code
        == 409
    )
    assert cmd(client, id, order, 1, "pick", pick_confirmed=True).status_code == 200
    r = cmd(
        client, id, order, 2, "qc", qc={"correct_items": True, "intact": False, "complete": True}
    )
    assert r.json()["result"]["status"] == "qc_failed"
    assert (
        cmd(
            client, id, order, 3, "pack", packing={"note": "Invalid skip QC", "weight_grams": 1}
        ).status_code
        == 409
    )
    assert cmd(client, id, order, 3, "cancel").status_code == 200
    assert (
        client.get(f"/api/v1/admin/fulfillment/orders/{order}").json()["lines"][0]["remaining"] == 2
    )
    assert db.scalar(text("SELECT count(*) FROM inventory_movements")) == 0
    assert db.scalar(text("SELECT sum(reserved) FROM inventory_positions")) == 2
    actor = db.scalar(text("SELECT account_id FROM customer_orders"))
    db.execute(
        text("INSERT INTO identity_permission_overrides VALUES(:id,'fulfillment.manage',false)"),
        {"id": actor},
    )
    db.commit()
    assert (
        cmd(client, str(uuid4()), order, 0, "draft", content={"quantities": {line: 1}}).status_code
        == 403
    )


def test_dispatch_policy_pending_cancellation_and_atomic_rollback(checkout, monkeypatch):
    client, db, order, line = setup(checkout)
    id = packed(client, order, line, 2)
    # This branch verifies the retained legacy fallback. New orders use accepted checkout policy.
    db.execute(
        text("UPDATE customer_orders SET snapshot=snapshot-'checkout_terms' WHERE id=:id"),
        {"id": order},
    )
    db.execute(text("UPDATE business_settings SET content='{}'"))
    db.commit()
    assert dispatch(client, id, order).json()["code"] == "fulfillment_policy_configuration_missing"
    policy = {"return_days": 0, "return_policy_fa": "آزمایش", "return_policy_en": "Test"}
    db.execute(
        text("UPDATE business_settings SET content=CAST(:c AS jsonb)"), {"c": json.dumps(policy)}
    )
    owner = db.scalar(text("SELECT account_id FROM customer_orders"))
    req = uuid4()
    db.execute(
        text(
            "INSERT INTO customer_order_requests(id,account_id,order_id,kind,payload) VALUES(:id,:owner,:order,'cancellation','{}')"
        ),
        {"id": req, "owner": owner, "order": order},
    )
    db.commit()
    assert dispatch(client, id, order).json()["code"] == "fulfillment_cancellation_pending"
    db.execute(text("UPDATE customer_order_requests SET status='rejected'"))
    db.commit()

    def fail(*args):
        raise RuntimeError("Injected shipment publication failure")

    monkeypatch.setattr("nilart.contexts.fulfillment.service.enqueue", fail)
    with pytest.raises(RuntimeError):
        dispatch(client, id, order)
    assert db.scalar(text("SELECT count(*) FROM inventory_movements")) == 0
    assert db.scalar(text("SELECT sum(reserved) FROM inventory_positions")) == 2
    assert db.scalar(text("SELECT state FROM order_stock_allocations")) == "committed"
    assert db.scalar(text("SELECT status FROM fulfillment_shipments")) == "packed"


def test_bundle_dispatch_uses_frozen_repeated_component_choices(checkout, monkeypatch):
    from test_basket import mutate

    from nilart.contexts.payments.gateway import ZarinpalSandbox

    client, db, _, _ = setup(checkout)
    bundle = db.scalar(text("SELECT id FROM catalog_bundles"))
    original = db.scalar(
        text("SELECT sku_id FROM catalog_bundle_components WHERE bundle_id=:id"), {"id": bundle}
    )
    product = db.scalar(text("SELECT product_id FROM catalog_skus WHERE id=:id"), {"id": original})
    alternate = db.scalar(
        text("SELECT id FROM catalog_skus WHERE product_id=:id AND id<>:original"),
        {"id": product, "original": original},
    )
    db.execute(
        text(
            "INSERT INTO catalog_bundle_components(bundle_id,sku_id,quantity) VALUES(:bundle,:sku,1)"
        ),
        {"bundle": bundle, "sku": alternate},
    )
    choices = [
        {"component_sku_id": str(id), "allowed_sku_ids": [str(alternate)]}
        for id in [original, alternate]
    ]
    db.execute(
        text(
            "UPDATE catalog_bundle_presentations SET document=CAST(:d AS jsonb) WHERE bundle_id=:id"
        ),
        {
            "id": bundle,
            "d": json.dumps(
                {"discount": {"amount": "10", "currency": "IRT"}, "component_choices": choices}
            ),
        },
    )
    db.commit()
    csrf = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
    version = client.get("/api/v1/basket").json()["version"]
    added = mutate(
        client,
        version,
        csrf,
        item={
            "kind": "bundle",
            "item_id": str(bundle),
            "quantity": 2,
            "choices": {str(id): str(alternate) for id in [original, alternate]},
        },
    )
    assert added.status_code == 200, added.text
    monkeypatch.setattr(ZarinpalSandbox, "request", lambda *args: "A" + "2" * 35)
    body = checkout[2]
    paid = start(
        client,
        {
            **body,
            "command_id": str(uuid4()),
            "basket_version": added.json()["version"],
            "expected_total": added.json()["totals"]["total"],
        },
    ).json()
    assert (
        client.get(
            f"/api/v1/payments/sandbox/callback/{paid['id']}?Authority={'A' + '2' * 35}&Status=OK",
            follow_redirects=False,
        ).status_code
        == 303
    )
    snapshot = db.scalar(
        text("SELECT snapshot FROM customer_orders WHERE id=:id"), {"id": paid["order_id"]}
    )
    line = snapshot["items"][0]["id"]
    shipment = packed(client, paid["order_id"], line, 1)
    db.execute(
        text("UPDATE catalog_bundle_components SET quantity=99 WHERE bundle_id=:id"), {"id": bundle}
    )
    db.commit()
    result = dispatch(client, shipment, paid["order_id"])
    assert result.status_code == 200, result.text
    costs = result.json()["result"]["state"]["costs"]
    assert len(costs) == 2 and sum(c["quantity"] for c in costs) == 3
    assert all(c["reference_id"] == str(alternate) for c in costs)
    assert result.json()["result"]["state"]["actual_cost"] == "150.000000"
    position = db.execute(
        text("SELECT quantity,reserved,value FROM inventory_positions WHERE reference_id=:id"),
        {"id": alternate},
    ).one()
    assert tuple(position) == (97, 3, 4850)
