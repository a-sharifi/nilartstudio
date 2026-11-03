import json
from uuid import uuid4

import pytest
from sqlalchemy import text
from test_basket import basket as basket
from test_basket import migrate
from test_fulfillment_postgres import cmd, dispatch, packed, setup
from test_identity_otp_postgres import flow as flow
from test_sandbox_payments import checkout as checkout


def returned(checkout):
    client, db, order, line = setup(checkout)
    migrate(db, "0026_order_request_reviews.py")
    migrate(db, "0045_return_inspections.py")
    shipment = packed(client, order, line, 2)
    assert dispatch(client, shipment, order).status_code == 200
    assert cmd(client, shipment, order, 5, "deliver").status_code == 200
    # Explicitly approved legacy request fixture. Production submission still checks frozen policy.
    request = str(uuid4())
    db.execute(
        text(
            "INSERT INTO customer_order_requests(id,account_id,order_id,kind,status,payload,version,public_reply) SELECT :id,account_id,id,'return','approved',CAST(:p AS jsonb),2,'Approved sandbox fixture' FROM customer_orders WHERE id=:order"
        ),
        {
            "id": request,
            "order": order,
            "p": json.dumps({"reason": "Sandbox return fixture", "quantities": {line: 2}}),
        },
    )
    db.commit()
    return client, db, request, shipment, line


def inspect(client, request, shipment, line, version=2, healthy=1, damaged=0, key=None):
    token = client.post("/api/v1/auth/session/csrf").json()["csrf_token"]
    return client.put(
        f"/api/v1/admin/order-requests/{request}/inspections/{key or uuid4()}",
        headers={"X-CSRF-Token": token},
        json={
            "shipment_id": shipment,
            "expected_version": version,
            "reason": "Received and physically inspected",
            "items": [{"line_id": line, "component": 0, "healthy": healthy, "damaged": damaged}],
        },
    )


def test_original_cost_partial_damage_retry_and_bounds(checkout):
    client, db, request, shipment, line = returned(checkout)
    key = str(uuid4())
    first = inspect(client, request, shipment, line, key=key)
    assert first.status_code == 200, first.text
    result = first.json()["result"]
    assert result["items"][0]["recovered_cost"] == "50.000000"
    assert result["refund_status"] == "not_issued"
    assert inspect(client, request, shipment, line, key=key).json() == first.json()
    assert inspect(client, request, shipment, line).status_code == 409
    # Changing replacement/average inventory cost cannot change original-return valuation.
    db.execute(text("UPDATE inventory_positions SET value=quantity*200"))
    db.commit()
    second = inspect(client, request, shipment, line, 3, healthy=0, damaged=1)
    assert second.status_code == 200, second.text
    item = second.json()["result"]["items"][0]
    assert item["damaged_cost"] == "50.000000" and item["movement"] is None
    assert (
        db.scalar(text("SELECT count(*) FROM inventory_movements WHERE kind='fulfillment_return'"))
        == 1
    )
    assert db.scalar(text("SELECT count(*) FROM order_return_inspections")) == 2
    assert inspect(client, request, shipment, line, 4).status_code == 409
    assert client.get(f"/api/v1/admin/order-requests/{request}/return-plan").json()["items"] == []
    state = db.scalar(text("SELECT state FROM customer_orders"))
    assert state["payment"] == "paid" and state["refunded_amount"] == "0"


def test_permission_approval_and_atomic_rollback(checkout, monkeypatch):
    client, db, request, shipment, line = returned(checkout)
    db.execute(text("UPDATE customer_order_requests SET status='in_review'"))
    db.commit()
    assert inspect(client, request, shipment, line).status_code == 409
    db.execute(text("UPDATE customer_order_requests SET status='approved'"))
    db.commit()
    from nilart.contexts.fulfillment import returns

    before = list(
        db.execute(text("SELECT quantity,value,version FROM inventory_positions ORDER BY id"))
    )

    def crash(*args, **kwargs):
        raise RuntimeError("atomic failure")

    monkeypatch.setattr(returns, "enqueue", crash)
    with pytest.raises(RuntimeError, match="atomic failure"):
        inspect(client, request, shipment, line)
    assert (
        list(db.execute(text("SELECT quantity,value,version FROM inventory_positions ORDER BY id")))
        == before
    )
    assert db.scalar(text("SELECT count(*) FROM order_return_inspections")) == 0
    db.execute(text("DELETE FROM identity_account_roles WHERE role='operations'"))
    db.commit()
    assert inspect(client, request, shipment, line).status_code == 403


def test_customer_receipt_hides_cost_actor_and_internal_notes(checkout):
    client, db, request, shipment, line = returned(checkout)
    assert inspect(client, request, shipment, line).status_code == 200
    r = client.get(f"/api/v1/account/requests/{request}/inspections")
    assert r.status_code == 200, r.text
    assert r.json()["items"][0]["items"][0]["healthy"] == 1
    for private in [
        "actor_id",
        "recovered_cost",
        "damaged_cost",
        "Received and physically inspected",
        "source_movement_id",
    ]:
        assert private not in r.text
    assert client.get(f"/api/v1/account/requests/{uuid4()}/inspections").status_code == 404


def test_changed_command_and_cross_shipment_are_rejected(checkout):
    client, db, request, shipment, line = returned(checkout)
    key = str(uuid4())
    first = inspect(client, request, shipment, line, key=key)
    assert first.status_code == 200
    assert inspect(client, request, shipment, line, damaged=1, key=key).status_code == 409
    assert inspect(client, request, str(uuid4()), line, 3).status_code == 409
    assert inspect(client, request, shipment, str(uuid4()), 3).status_code == 409
    assert db.scalar(text("SELECT count(*) FROM order_return_inspections")) == 1


def test_inspection_and_existing_review_events_are_consumable_once(checkout):
    client, db, request, shipment, line = returned(checkout)
    assert inspect(client, request, shipment, line).status_code == 200
    from nilart.shared.outbox import consume_event

    event = (
        db.execute(
            text("SELECT * FROM outbox_events WHERE event_type='fulfillment.return_inspected'")
        )
        .mappings()
        .one()
    )
    envelope = {
        "id": str(event["id"]),
        "event_type": event["event_type"],
        "payload": event["payload"],
    }
    assert consume_event(db, envelope)
    assert not consume_event(db, envelope)
    review = {
        "id": str(uuid4()),
        "event_type": "orders.request_reviewed",
        "payload": {
            "request_id": request,
            "account_id": str(db.scalar(text("SELECT account_id FROM customer_orders"))),
            "status": "approved",
        },
    }
    assert consume_event(db, review)
    assert not consume_event(db, review)
    with pytest.raises(ValueError, match="invalid request review event"):
        consume_event(db, {**review, "payload": {**review["payload"], "status": "paid"}})
