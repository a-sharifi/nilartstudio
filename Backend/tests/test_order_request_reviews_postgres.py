import importlib.util
from pathlib import Path
from uuid import uuid4

from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import text
from test_customer_orders_postgres import prepare, snapshot, state
from test_identity_otp_postgres import flow as flow
from test_private_downloads_postgres import grant_staff

from nilart.contexts.orders.repository import SqlOrderRepository


def setup(flow):
    client, db, owner = prepare(flow)
    path = Path(__file__).resolve().parents[1] / "migrations/versions/0026_order_request_reviews.py"
    with Operations.context(MigrationContext.configure(db.connection())):
        spec = importlib.util.spec_from_file_location("request_reviews_migration", path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        module.upgrade()
    order = SqlOrderRepository(db).record_checkout_snapshot(owner, uuid4(), snapshot(True), state(True))
    db.commit()
    id = uuid4()
    result = client.put(f'/api/v1/account/orders/{order["id"]}/requests/{id}', json={"version": 0, "kind": "cancellation", "reason": "Changed my plans", "quantities": {}})
    assert result.status_code == 200, result.text
    return client, db, owner, order, id


def test_review_permissions_transitions_replay_and_customer_reply(flow):
    client, db, owner, order, id = setup(flow)
    url = f"/api/v1/admin/order-requests/{id}/reviews/{uuid4()}"
    body = {"version": 0, "status": "in_review", "reply": "We are reviewing your request"}
    assert client.get("/api/v1/admin/order-requests").status_code == 403
    assert client.put(url, json=body).status_code == 403
    grant_staff(db, owner)
    assert client.get("/api/v1/admin/order-requests").json()["items"][0]["id"] == str(id)
    assert client.put(url, json={**body, "status": "approved"}).status_code == 409
    saved = client.put(url, json=body)
    assert saved.status_code == 200, saved.text
    assert saved.json()["version"] == 1
    assert client.put(url, json=body).json() == saved.json()
    assert client.put(url, json={**body, "reply": "A different reply"}).status_code == 409
    next_url = f"/api/v1/admin/order-requests/{id}/reviews/{uuid4()}"
    assert client.put(next_url, json={**body, "status": "approved"}).status_code == 409
    approved = client.put(next_url, json={**body, "version": 1, "status": "approved", "reply": "Approved for processing"})
    assert approved.status_code == 200, approved.text
    customer = client.get(f"/api/v1/account/requests/{id}").json()
    assert customer["status"] == "approved" and customer["public_reply"] == "Approved for processing"
    assert "actor_id" not in customer
    assert client.put(f"/api/v1/admin/order-requests/{id}/reviews/{uuid4()}", json={**body, "version": 2, "status": "rejected"}).status_code == 409
    assert client.get(f'/api/v1/account/orders/{order["id"]}').json()["state"] == state(True).model_dump(mode="json")
    assert db.execute(text("SELECT count(*) FROM order_request_reviews")).scalar() == 2
    assert db.execute(text("SELECT count(*) FROM customer_records WHERE kind='notification' AND data->>'category'='order'")).scalar() == 2
    assert db.execute(text("SELECT count(*) FROM outbox_events WHERE event_type='orders.request_reviewed'")).scalar() == 2
    client.headers.pop("X-CSRF-Token")
    assert client.put(url, json=body).status_code == 403


def test_shipped_cancellation_cannot_be_approved_and_rejection_releases_request(flow):
    client, db, owner, order, id = setup(flow)
    grant_staff(db, owner)
    url = f"/api/v1/admin/order-requests/{id}/reviews/{uuid4()}"
    assert client.put(url, json={"version": 0, "status": "in_review", "reply": "Checking fulfillment status"}).status_code == 200
    db.execute(text("UPDATE customer_orders SET state=jsonb_set(state,'{fulfillment}','\"shipped\"') WHERE id=:id"), {"id": order["id"]})
    db.commit()
    url = f"/api/v1/admin/order-requests/{id}/reviews/{uuid4()}"
    assert client.put(url, json={"version": 1, "status": "approved", "reply": "Approved for processing"}).status_code == 409
    assert client.put(url, json={"version": 1, "status": "rejected", "reply": "Your order has already shipped"}).status_code == 200
    assert db.execute(text("SELECT count(*) FROM customer_order_requests WHERE status IN ('submitted','in_review','approved')")).scalar() == 0
    assert client.put(url, json={"version": 2, "status": "completed", "reply": "Refund issued"}).status_code == 422


def test_owned_tracking_shows_public_decisions_and_snapshot_items(flow):
    client, db, owner, order, id = setup(flow)
    tracking_url = f"/api/v1/account/requests/{id}/tracking"
    initial = client.get(tracking_url)
    assert initial.status_code == 200, initial.text
    assert initial.json()["order_reference"] == "TEST-ORDER"
    assert initial.json()["items"][0]["title_en"] == "Notebook"
    assert initial.json()["items"][0]["quantity"] == 2
    assert [event["status"] for event in initial.json()["history"]] == ["submitted"]
    grant_staff(db, owner)
    for version, status, reply in ((0, "in_review", "Checking fulfillment"), (1, "rejected", "Cannot cancel this order")):
        result = client.put(f"/api/v1/admin/order-requests/{id}/reviews/{uuid4()}", json={"version": version, "status": status, "reply": reply})
        assert result.status_code == 200, result.text
    tracked = client.get(tracking_url).json()
    assert [event["status"] for event in tracked["history"]] == ["submitted", "in_review", "rejected"]
    assert [event["version"] for event in tracked["history"]] == [0, 1, 2]
    assert tracked["history"][2]["reply"] == "Cannot cancel this order"
    assert "actor_id" not in str(tracked) and "account_id" not in str(tracked)
    assert "Private address" not in str(tracked)
    assert client.get(f"/api/v1/account/requests/{uuid4()}/tracking").status_code == 404
    # A mismatched order owner cannot reveal its immutable items through a request.
    foreign = uuid4()
    db.execute(text("INSERT INTO identity_accounts(id,phone,password_hash,phone_verified,blocked,created_at) SELECT :foreign,'+989123456780',password_hash,true,false,now() FROM identity_accounts WHERE id=:owner"), {"foreign": foreign, "owner": owner})
    db.execute(text("UPDATE customer_orders SET account_id=:foreign WHERE id=:id"), {"foreign": foreign, "id": order["id"]})
    db.commit()
    assert client.get(tracking_url).status_code == 404
    client.cookies.clear()
    assert client.get(tracking_url).status_code == 401


def test_return_tracking_uses_requested_not_purchased_quantity(flow):
    import json
    client, db, owner, order, id = setup(flow)
    line = str(order["snapshot"]["items"][0]["id"])
    db.execute(text("UPDATE customer_order_requests SET kind='return',payload=CAST(:payload AS jsonb) WHERE id=:id"), {"id": id, "payload": json.dumps({"reason": "One item damaged", "quantities": {line: 1}})})
    db.commit()
    tracking = client.get(f"/api/v1/account/requests/{id}/tracking")
    assert tracking.status_code == 200, tracking.text
    assert len(tracking.json()["items"]) == 1
    assert tracking.json()["items"][0]["quantity"] == 1


def test_admin_request_queue_filters_before_pagination(flow):
    client, db, owner, order, id = setup(flow)
    grant_staff(db, owner)
    second_snapshot = snapshot(True).model_copy(update={"reference": "SECOND-ORDER"})
    second_order = SqlOrderRepository(db).record_checkout_snapshot(owner, uuid4(), second_snapshot, state(True))
    db.commit()
    second_id = uuid4()
    created = client.put(f'/api/v1/account/orders/{second_order["id"]}/requests/{second_id}', json={"version": 0, "kind": "cancellation", "reason": "Changed delivery plans", "quantities": {}})
    assert created.status_code == 200, created.text
    root = "/api/v1/admin/order-requests"
    assert [x["id"] for x in client.get(root, params={"q": "TEST-ORDER", "status": "submitted", "kind": "cancellation"}).json()["items"]] == [str(id)]
    assert client.get(root, params={"kind": "return"}).json()["items"] == []
    assert client.get(root, params={"status": "approved"}).json()["items"] == []
    assert client.get(root, params={"q": "%"}).json()["items"] == []
    first = client.get(root, params={"q": "changed", "limit": 1}).json()
    assert len(first["items"]) == 1 and first["next_cursor"] is not None
    second = client.get(root, params={"q": "changed", "limit": 1, "cursor": first["next_cursor"]}).json()
    assert {first["items"][0]["id"], second["items"][0]["id"]} == {str(id), str(second_id)}
    assert second["next_cursor"] is None
    assert client.get(root, params={"q": str(second_id)}).json()["items"][0]["id"] == str(second_id)
    assert client.get(root, params={"status": "invalid"}).status_code == 422
    assert client.get(root, params={"kind": "invalid"}).status_code == 422
    scoped = client.get(root, params={"order_id": second_order["id"], "q": "changed", "kind": "cancellation", "limit": 1}).json()
    assert [row["id"] for row in scoped["items"]] == [str(second_id)] and scoped["next_cursor"] is None
    assert client.get(root, params={"order_id": uuid4()}).json()["items"] == []
    assert client.get(root, params={"order_id": "invalid"}).status_code == 422


def test_staff_decision_history_is_scoped_paginated_and_read_only(flow):
    client, db, owner, order, id = setup(flow)
    root = f"/api/v1/admin/order-requests/{id}/reviews"
    assert client.get(root).status_code == 403
    grant_staff(db, owner)
    assert client.get(root).json() == {"items": [], "next_cursor": None}
    ids = [uuid4(), uuid4()]
    for version, status in enumerate(["in_review", "rejected"]):
        saved = client.put(f"{root}/{ids[version]}", json={"version": version, "status": status, "reply": f"Decision reply {version}"})
        assert saved.status_code == 200, saved.text
    first = client.get(root, params={"limit": 1}).json()
    assert first["items"][0]["id"] == str(ids[1])
    assert first["items"][0]["actor_id"] == str(owner)
    assert first["items"][0]["expected_version"] == 1
    second = client.get(root, params={"cursor": first["next_cursor"], "limit": 1}).json()
    assert second["items"][0]["reply"] == "Decision reply 0"
    assert second["next_cursor"] is None
    assert client.get(root, params={"cursor": uuid4()}).status_code == 404
    assert client.get(f"/api/v1/admin/order-requests/{uuid4()}/reviews").status_code == 404
    assert db.execute(text("SELECT count(*) FROM order_request_reviews")).scalar() == 2
    other_id, other_review = uuid4(), uuid4()
    other_order = SqlOrderRepository(db).record_checkout_snapshot(owner, uuid4(), snapshot(True), state(True))
    db.commit()
    created = client.put(f'/api/v1/account/orders/{other_order["id"]}/requests/{other_id}', json={"version": 0, "kind": "cancellation", "reason": "Another cancellation request", "quantities": {}})
    assert created.status_code == 200, created.text
    saved = client.put(f"/api/v1/admin/order-requests/{other_id}/reviews/{other_review}", json={"version": 0, "status": "in_review", "reply": "Checking the other request"})
    assert saved.status_code == 200, saved.text
    assert client.get(root, params={"cursor": other_review}).status_code == 404
    assert len(client.get(root).json()["items"]) == 2
    client.cookies.clear()
    assert client.get(root).status_code == 401


def test_dashboard_request_counts_exclude_approved_processing(flow):
    client, db, owner, order, id = setup(flow)
    grant_staff(db, owner)
    root = "/api/v1/admin/order-summary"
    assert client.get(root).json()["pending_requests"] == {"cancellation": 1}
    for version, status in enumerate(["in_review", "approved"]):
        assert client.put(f"/api/v1/admin/order-requests/{id}/reviews/{uuid4()}", json={"version": version, "status": status, "reply": "Checking this cancellation"}).status_code == 200
        assert client.get(root).json()["pending_requests"] == ({"cancellation": 1} if status == "in_review" else {})
    assert client.get(root).json()["payment"] == {"paid": 1}
