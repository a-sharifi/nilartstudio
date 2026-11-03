import importlib.util
from pathlib import Path
from uuid import UUID, uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from pydantic import ValidationError
from sqlalchemy import text
from test_identity_otp_postgres import flow as flow
from test_identity_otp_postgres import register

from nilart.contexts.orders.domain import OrderSnapshot, OrderState
from nilart.contexts.orders.repository import OrderConflict, SqlOrderRepository


def prepare(flow):
    client, db, sms = flow
    with Operations.context(MigrationContext.configure(db.connection())):
        directory = Path(__file__).resolve().parents[1] / "migrations/versions"
        for filename in ["0002_catalog.py", "0003_catalog_foundation.py", "0010_artworks.py", "0012_bundles.py", "0022_artwork_details.py", "0023_customer_orders.py"]:
            spec = importlib.util.spec_from_file_location(filename, directory / filename)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            module.upgrade()
    _, result = register(client, sms)
    client.headers["X-CSRF-Token"] = result.json()["csrf_token"]
    return client, db, UUID(result.json()["account_id"])


def snapshot(receipt=False):
    return OrderSnapshot(reference="TEST-ORDER", currency="IRT", items=[dict(
        id=uuid4(), title_fa="دفتر", title_en="Notebook", sku="TEST-SKU",
        options_fa="", options_en="", quantity=2, unit_amount="100.10",
        discount_amount="0.20", delivery="physical", returnable=True)],
        shipping_amount="10", tax_amount="0", total_amount="210",
        recipient="Private name", address="Private address",
        receipt=dict(number="TEST-RECEIPT", issued_at="2026-10-13T12:00:00Z", paid_amount="210") if receipt else None)


def state(paid=False):
    return OrderState(payment="paid" if paid else "verification", fulfillment="unshipped", delivered={})


def test_owned_history_detail_receipt_cursor_and_replay(flow):
    client, db, owner = prepare(flow)
    assert client.get("/api/v1/account/orders").json() == {"items": [], "next_cursor": None}
    repo = SqlOrderRepository(db)
    source = uuid4()
    saved = snapshot(True)
    first = repo.record_checkout_snapshot(owner, source, saved, state(True))
    assert repo.record_checkout_snapshot(owner, source, saved, state(True))["id"] == first["id"]
    changed = saved.model_copy(update={"reference": "OTHER"})
    with pytest.raises(OrderConflict):
        repo.record_checkout_snapshot(owner, source, changed, state(True))
    second = repo.record_checkout_snapshot(owner, uuid4(), snapshot(), state())
    db.commit()
    page = client.get("/api/v1/account/orders?limit=1")
    assert page.status_code == 200, page.text
    cursor = page.json()["next_cursor"]
    remaining = client.get(f"/api/v1/account/orders?limit=1&cursor={cursor}").json()
    assert remaining["next_cursor"] is None
    assert remaining["items"][0]["id"] != page.json()["items"][0]["id"]
    detail = client.get(f'/api/v1/account/orders/{first["id"]}').json()
    assert detail["snapshot"]["total_amount"] == "210"
    assert "account_id" not in detail and "source_id" not in detail
    assert client.get(f'/api/v1/account/orders/{first["id"]}/receipt').json()["number"] == "TEST-RECEIPT"
    assert client.get(f'/api/v1/account/orders/{second["id"]}/receipt').status_code == 404
    assert client.get(f'/api/v1/account/orders/{uuid4()}').status_code == 404
    assert client.get(f'/api/v1/account/orders?cursor={uuid4()}').status_code == 404
    assert db.execute(text("SELECT count(*) FROM outbox_events WHERE event_type='orders.recorded'")).scalar_one() == 2
    assert "Private" not in str(db.execute(text("SELECT changes FROM identity_audits WHERE action='orders.recorded'")).scalars().all())
    client.cookies.clear()
    assert client.get(f'/api/v1/account/orders/{first["id"]}').status_code == 401


def test_foreign_owned_order_is_not_disclosed(flow):
    client, db, owner = prepare(flow)
    saved = SqlOrderRepository(db).record_checkout_snapshot(owner, uuid4(), snapshot(), state())
    foreign = uuid4()
    db.execute(text("INSERT INTO identity_accounts(id,phone,password_hash,phone_verified,blocked,created_at) SELECT :foreign,'+989123456780',password_hash,true,false,now() FROM identity_accounts WHERE id=:owner"), {"foreign": foreign, "owner": owner})
    db.execute(text("UPDATE customer_orders SET account_id=:foreign WHERE id=:id"), {"foreign": foreign, "id": saved["id"]})
    db.commit()
    assert client.get("/api/v1/account/orders").json()["items"] == []
    for suffix in ("", "/receipt"):
        assert client.get(f'/api/v1/account/orders/{saved["id"]}{suffix}').status_code == 404
    assert client.get(f'/api/v1/account/orders?cursor={saved["id"]}').status_code == 404
    request_id = uuid4()
    db.execute(text("INSERT INTO customer_order_requests(id,account_id,order_id,kind,payload) VALUES(:id,:owner,:order,'cancellation','{\"reason\":\"Private reason\",\"quantities\":{}}')"), {"id": request_id, "owner": foreign, "order": saved["id"]})
    db.commit()
    assert client.get("/api/v1/account/requests").json()["items"] == []
    assert client.get(f"/api/v1/account/requests/{request_id}").status_code == 404
    assert client.put(f'/api/v1/account/orders/{saved["id"]}/requests/{uuid4()}', json={"version": 0, "kind": "cancellation", "reason": "Changed my plans", "quantities": {}}).status_code == 404



def test_historical_amount_and_strict_delivery_validation():
    saved = snapshot()
    with pytest.raises(ValidationError):
        OrderSnapshot.model_validate({**saved.model_dump(), "total_amount": "210.01"})
    with pytest.raises(ValidationError):
        OrderState(payment="paid", fulfillment="delivered", delivered={uuid4(): True})


def test_cancellation_is_idempotent_versioned_and_does_not_move_money(flow):
    client, db, owner = prepare(flow)
    saved = SqlOrderRepository(db).record_checkout_snapshot(owner, uuid4(), snapshot(True), state(True))
    db.commit()
    key = uuid4()
    url = f'/api/v1/account/orders/{saved["id"]}/requests/{key}'
    body = {"version": 0, "kind": "cancellation", "reason": "Changed my plans", "quantities": {}}
    response = client.put(url, json=body)
    assert response.status_code == 200, response.text
    assert response.json()["status"] == "submitted"
    assert client.put(url, json=body).json() == response.json()
    assert client.put(url, json={**body, "reason": "Different reason"}).status_code == 409
    assert client.put(url.replace(str(key), str(uuid4())), json=body).status_code == 409
    detail = client.get(f'/api/v1/account/orders/{saved["id"]}').json()
    assert detail["version"] == 1
    assert detail["state"]["payment"] == "paid" and detail["state"]["fulfillment"] == "unshipped"
    assert detail["state"]["refunded_amount"] == "0"
    assert client.get("/api/v1/account/requests").json()["items"][0]["id"] == str(key)
    assert client.get(f"/api/v1/account/requests/{key}").status_code == 200
    assert db.execute(text("SELECT count(*) FROM outbox_events WHERE event_type='orders.request_submitted'")).scalar_one() == 1
    client.headers.pop("X-CSRF-Token")
    assert client.put(url, json=body).status_code == 403


def test_returns_require_explicit_deadline_and_delivered_physical_quantities(flow):
    from datetime import datetime, timedelta, timezone
    client, db, owner = prepare(flow)
    saved_snapshot = snapshot(True)
    line = saved_snapshot.items[0].id
    delivered = OrderState(payment="paid", fulfillment="delivered", delivered={line: 2},
                           return_until=datetime.now(timezone.utc) + timedelta(days=1))
    saved = SqlOrderRepository(db).record_checkout_snapshot(owner, uuid4(), saved_snapshot, delivered)
    db.commit()
    url = f'/api/v1/account/orders/{saved["id"]}/requests/{uuid4()}'
    body = {"version": 0, "kind": "return", "reason": "Received damaged item", "quantities": {str(line): 3}}
    assert client.put(url, json=body).status_code == 409
    body["quantities"][str(line)] = 1
    assert client.put(url, json=body).status_code == 200
    db.execute(text("UPDATE customer_order_requests SET status='completed' WHERE order_id=:id"), {"id": saved["id"]})
    db.commit()
    next_url = f'/api/v1/account/orders/{saved["id"]}/requests/{uuid4()}'
    assert client.put(next_url, json={**body, "version": 1, "quantities": {str(line): 2}}).status_code == 409
    assert client.put(next_url, json={**body, "version": 1}).status_code == 200
    expired = delivered.model_copy(update={"return_until": datetime.now(timezone.utc) - timedelta(seconds=1)})
    another = SqlOrderRepository(db).record_checkout_snapshot(owner, uuid4(), saved_snapshot, expired)
    db.commit()
    assert client.put(f'/api/v1/account/orders/{another["id"]}/requests/{uuid4()}', json=body).status_code == 409
    assert client.put(next_url, json={**body, "quantities": {str(line): True}}).status_code == 422


def test_replaying_pre_linkage_snapshot_remains_compatible(flow):
    client, db, owner = prepare(flow)
    saved_snapshot = snapshot(True)
    source = uuid4()
    repo = SqlOrderRepository(db)
    saved = repo.record_checkout_snapshot(owner, source, saved_snapshot, state(True))
    db.execute(text("UPDATE customer_orders SET snapshot=jsonb_set(snapshot,'{items,0}',(snapshot->'items'->0)-'commission_id') WHERE id=:id"), {"id": saved["id"]})
    assert repo.record_checkout_snapshot(owner, source, saved_snapshot, state(True))["id"] == saved["id"]


def test_owned_order_search_and_status_filters_across_pages(flow):
    client, db, owner = prepare(flow)
    repo = SqlOrderRepository(db)
    first = repo.record_checkout_snapshot(owner, uuid4(), snapshot(), state())
    second = repo.record_checkout_snapshot(owner, uuid4(), snapshot(True).model_copy(update={"reference": "MATCH-SECOND"}), state(True))
    repo.record_checkout_snapshot(owner, uuid4(), snapshot(True).model_copy(update={"reference": "MATCH-THIRD"}), state(True))
    db.commit()
    response = client.get("/api/v1/account/orders?q=match&payment=paid&fulfillment=unshipped&limit=1")
    assert response.status_code == 200, response.text
    assert len(response.json()["items"]) == 1 and response.json()["next_cursor"]
    cursor = response.json()["next_cursor"]
    next_page = client.get(f"/api/v1/account/orders?q=match&payment=paid&fulfillment=unshipped&limit=1&cursor={cursor}")
    assert next_page.status_code == 200, next_page.text
    assert len(next_page.json()["items"]) == 1 and next_page.json()["next_cursor"] is None
    assert next_page.json()["items"][0]["id"] != response.json()["items"][0]["id"]
    assert len(client.get("/api/v1/account/orders?q=دفتر").json()["items"]) == 3
    assert len(client.get("/api/v1/account/orders?q=test-sku&payment=verification").json()["items"]) == 1
    assert client.get("/api/v1/account/orders?q=%25").json()["items"] == []
    assert client.get("/api/v1/account/orders?payment=failed").json()["items"] == []
    assert client.get("/api/v1/account/orders?payment=unknown").status_code == 422
    assert client.get("/api/v1/account/orders?fulfillment=unknown").status_code == 422
    assert client.get("/api/v1/account/orders?q=" + "x" * 201).status_code == 422
    foreign = uuid4()
    db.execute(text("INSERT INTO identity_accounts(id,phone,password_hash,phone_verified,blocked,created_at) SELECT :foreign,'+989123456780',password_hash,true,false,now() FROM identity_accounts WHERE id=:owner"), {"foreign": foreign, "owner": owner})
    db.execute(text("UPDATE customer_orders SET account_id=:foreign WHERE id IN (:first,:second)"), {"foreign": foreign, "first": first["id"], "second": second["id"]})
    db.commit()
    assert len(client.get("/api/v1/account/orders?q=match&payment=paid").json()["items"]) == 1
    assert client.get(f'/api/v1/account/orders?q=match&cursor={second["id"]}').status_code == 404


def test_request_filters_newest_pagination_and_owned_cursor(flow):
    client, db, owner = prepare(flow)
    ids = []
    for reference, reason in (("FIRST-ORDER", "Changed my plans"), ("SECOND-ORDER", "Different plans now")):
        saved = SqlOrderRepository(db).record_checkout_snapshot(owner, uuid4(), snapshot().model_copy(update={"reference": reference}), state())
        db.commit()
        id = uuid4()
        response = client.put(f'/api/v1/account/orders/{saved["id"]}/requests/{id}', json={"version": 0, "kind": "cancellation", "reason": reason, "quantities": {}})
        assert response.status_code == 200, response.text
        ids.append(id)
    db.execute(text("UPDATE customer_order_requests SET created_at=now()-interval '1 day',status='rejected' WHERE id=:id"), {"id": ids[0]})
    db.commit()
    first = client.get("/api/v1/account/requests?limit=1")
    assert first.status_code == 200, first.text
    assert first.json()["items"][0]["id"] == str(ids[1])
    assert first.json()["next_cursor"] == str(ids[1])
    next_page = client.get(f"/api/v1/account/requests?limit=1&cursor={ids[1]}")
    assert next_page.json()["items"][0]["id"] == str(ids[0]) and next_page.json()["next_cursor"] is None
    assert client.get("/api/v1/account/requests?q=first-order&status=rejected&kind=cancellation").json()["items"][0]["id"] == str(ids[0])
    assert client.get("/api/v1/account/requests?q=DIFFERENT").json()["items"][0]["id"] == str(ids[1])
    for query in ("q=%25", "kind=return", "status=approved"):
        assert client.get("/api/v1/account/requests?" + query).json()["items"] == []
    for query in ("kind=unknown", "status=unknown", "q=" + "x" * 201):
        assert client.get("/api/v1/account/requests?" + query).status_code == 422
    assert client.get(f"/api/v1/account/requests?cursor={uuid4()}").status_code == 404
    foreign = uuid4()
    db.execute(text("INSERT INTO identity_accounts(id,phone,password_hash,phone_verified,blocked,created_at) SELECT :foreign,'+989123456780',password_hash,true,false,now() FROM identity_accounts WHERE id=:owner"), {"foreign": foreign, "owner": owner})
    db.execute(text("UPDATE customer_order_requests SET account_id=:foreign WHERE id=:id"), {"foreign": foreign, "id": ids[1]})
    db.commit()
    assert client.get(f"/api/v1/account/requests?cursor={ids[1]}").status_code == 404
    assert client.get("/api/v1/account/requests?q=different").json()["items"] == []


def test_admin_order_reads_require_permission_and_filter_across_customers(flow):
    from test_identity_management_postgres import target

    from nilart.contexts.identity.infrastructure.management import SqlAccountManagement

    client, db, owner = prepare(flow)
    other = UUID(target(db))
    repo = SqlOrderRepository(db)
    first = repo.record_checkout_snapshot(owner, uuid4(), snapshot(True), state(True))
    second = repo.record_checkout_snapshot(other, uuid4(), snapshot().model_copy(update={"reference": "SECOND-ORDER"}), state())
    db.commit()
    root = "/api/v1/admin/orders"
    assert client.get(root).status_code == 403
    assert client.get(f"{root}/{second['id']}").status_code == 403
    assert client.get(f"/api/v1/account/orders/{second['id']}").status_code == 404
    SqlAccountManagement(db).bootstrap(str(owner), "Isolated admin order read")
    db.commit()
    page = client.get(root, params={"limit": 1}).json()
    next_page = client.get(root, params={"limit": 1, "cursor": page["next_cursor"]}).json()
    assert {page["items"][0]["id"], next_page["items"][0]["id"]} == {str(first["id"]), str(second["id"])}
    assert next_page["next_cursor"] is None
    assert client.get(f"{root}/{second['id']}").json()["snapshot"]["reference"] == "SECOND-ORDER"
    assert [x["id"] for x in client.get(root, params={"payment": "paid"}).json()["items"]] == [str(first["id"])]
    assert [x["id"] for x in client.get(root, params={"q": "second", "payment": "verification", "fulfillment": "unshipped"}).json()["items"]] == [str(second["id"])]
    assert client.get(root, params={"q": "%"}).json()["items"] == []
    assert client.get(root, params={"cursor": uuid4()}).status_code == 404
    assert client.get(f"{root}/{uuid4()}").status_code == 404
    assert client.get(root, params={"payment": "invalid"}).status_code == 422


def test_admin_order_summary_counts_persisted_states_without_private_details(flow):
    from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
    client, db, owner = prepare(flow)
    root = "/api/v1/admin/order-summary"
    assert client.get(root).status_code == 403
    SqlAccountManagement(db).bootstrap(str(owner), "Isolated summary access")
    db.commit()
    assert client.get(root).json() == {"total_orders": 0, "payment": {}, "fulfillment": {}, "pending_requests": {}}
    repo = SqlOrderRepository(db)
    repo.record_checkout_snapshot(owner, uuid4(), snapshot(True), state(True))
    repo.record_checkout_snapshot(owner, uuid4(), snapshot(), state())
    db.commit()
    result = client.get(root)
    assert result.status_code == 200
    assert result.json() == {"total_orders": 2, "payment": {"paid": 1, "verification": 1}, "fulfillment": {"unshipped": 2}, "pending_requests": {}}
    assert "Private address" not in result.text and str(owner) not in result.text
    client.cookies.clear()
    assert client.get(root).status_code == 401


def test_order_detail_reports_remaining_returns_and_owned_active_request(flow):
    from datetime import datetime, timedelta, timezone
    client, db, owner = prepare(flow)
    document = snapshot(True)
    line = document.items[0].id
    saved = SqlOrderRepository(db).record_checkout_snapshot(owner, uuid4(), document, OrderState(payment="paid", fulfillment="delivered", delivered={line: 2}, return_until=datetime.now(timezone.utc) + timedelta(days=1)))
    db.commit()
    root = f'/api/v1/account/orders/{saved["id"]}'
    initial = client.get(root).json()
    assert initial["return_available"] == {str(line): 2} and initial["active_request_id"] is None
    request_id = uuid4()
    response = client.put(f"{root}/requests/{request_id}", json={"version": 0, "kind": "return", "reason": "Damaged item", "quantities": {str(line): 1}})
    assert response.status_code == 200, response.text
    active = client.get(root).json()
    assert active["return_available"] == {str(line): 1} and active["active_request_id"] == str(request_id)
    db.execute(text("UPDATE customer_order_requests SET status='completed' WHERE id=:id"), {"id": request_id})
    db.commit()
    completed = client.get(root).json()
    assert completed["return_available"] == {str(line): 1} and completed["active_request_id"] is None
    db.execute(text("UPDATE customer_order_requests SET status='rejected' WHERE id=:id"), {"id": request_id})
    db.commit()
    assert client.get(root).json()["return_available"] == {str(line): 2}
    assert client.get(f"/api/v1/account/orders/{uuid4()}").status_code == 404


def test_support_ticket_links_only_owned_order_items_and_replays_legacy(flow):
    client, db, owner = prepare(flow)
    repo = SqlOrderRepository(db)
    saved = snapshot()
    order = repo.record_checkout_snapshot(owner, uuid4(), saved, state())
    db.commit()
    key = uuid4()
    body = {"topic": "product", "subject": "About this order", "body": "Please inspect this item", "request_id": str(key), "order_id": str(order["id"]), "line_id": str(saved.items[0].id)}
    response = client.put(f"/api/v1/account/panel/ticket/{key}", json={"version": 0, "data": body})
    assert response.status_code == 200, response.text
    assert response.json()["data"]["order_id"] == str(order["id"])
    assert response.json()["data"]["line_id"] == str(saved.items[0].id)
    assert client.put(f"/api/v1/account/panel/ticket/{key}", json={"version": 0, "data": body}).status_code == 200
    for changes, status in (({"order_id": str(uuid4())}, 404), ({"line_id": str(uuid4())}, 404), ({"order_id": None}, 422)):
        new_key = uuid4()
        assert client.put(f"/api/v1/account/panel/ticket/{new_key}", json={"version": 0, "data": {**body, "request_id": str(new_key), **changes}}).status_code == status
    foreign = uuid4()
    db.execute(text("INSERT INTO identity_accounts(id,phone,password_hash,phone_verified,blocked,created_at) SELECT :foreign,'+989123456780',password_hash,true,false,now() FROM identity_accounts WHERE id=:owner"), {"foreign": foreign, "owner": owner})
    db.execute(text("UPDATE customer_orders SET account_id=:foreign WHERE id=:id"), {"foreign": foreign, "id": order["id"]})
    db.commit()
    new_key = uuid4()
    assert client.put(f"/api/v1/account/panel/ticket/{new_key}", json={"version": 0, "data": {**body, "request_id": str(new_key)}}).status_code == 404
    legacy_key = uuid4()
    legacy = {k: v for k, v in body.items() if k not in {"order_id", "line_id"}}
    legacy["request_id"] = str(legacy_key)
    assert client.put(f"/api/v1/account/panel/ticket/{legacy_key}", json={"version": 0, "data": legacy}).status_code == 200
    assert client.put(f"/api/v1/account/panel/ticket/{legacy_key}", json={"version": 0, "data": legacy}).status_code == 200


def test_order_read_permission_required_for_ticket_association(flow):
    client, db, owner = prepare(flow)
    order = SqlOrderRepository(db).record_checkout_snapshot(owner, uuid4(), snapshot(), state())
    db.execute(text("INSERT INTO identity_permission_overrides(account_id,permission,allowed) VALUES(:id,'orders.read_self',false)"), {"id": owner})
    db.commit()
    key = uuid4()
    body = {"topic": "product", "subject": "Help", "body": "About this order", "request_id": str(key), "order_id": str(order["id"])}
    assert client.put(f"/api/v1/account/panel/ticket/{key}", json={"version": 0, "data": body}).status_code == 403
    body.pop("order_id")
    assert client.put(f"/api/v1/account/panel/ticket/{key}", json={"version": 0, "data": body}).status_code == 200


def test_order_catalog_links_resolve_codes_and_ids_and_hide_unpublished(flow):
    client, db, owner = prepare(flow)
    product, sku = uuid4(), uuid4()
    db.execute(text("INSERT INTO catalog_products(id,slug,title_fa,title_en,published) VALUES(:id,'notebook-ghosts','دفتر','Notebook',true)"), {"id": product})
    db.execute(text("INSERT INTO catalog_skus(id,product_id,code,published) VALUES(:id,:product,'TEST-SKU',true)"), {"id": sku, "product": product})
    saved = snapshot()
    order = SqlOrderRepository(db).record_checkout_snapshot(owner, uuid4(), saved, state())
    expected = {str(saved.items[0].id): {"kind": "products", "slug": "notebook-ghosts", "image_url": None}}
    assert client.get(f"/api/v1/account/orders/{order['id']}").json()["catalog_items"] == expected
    assert client.get("/api/v1/account/orders").json()["items"][0]["catalog_items"] == expected
    saved.items[0].sku = str(sku)
    second = SqlOrderRepository(db).record_checkout_snapshot(owner, uuid4(), saved, state())
    assert client.get(f"/api/v1/account/orders/{second['id']}").json()["catalog_items"] == expected
    db.execute(text("UPDATE catalog_skus SET published=false WHERE id=:id"), {"id": sku})
    assert client.get(f"/api/v1/account/orders/{order['id']}").json()["catalog_items"] == expected
    db.execute(text("UPDATE catalog_products SET published=false WHERE id=:id"), {"id": product})
    assert client.get(f"/api/v1/account/orders/{order['id']}").json()["catalog_items"] == {}
    assert client.get(f"/api/v1/account/orders/{order['id']}").json()["snapshot"]["items"][0]["sku"] == "TEST-SKU"


def test_artwork_thumbnail_and_custom_commission_are_not_confused(flow):
    client, db, owner = prepare(flow)
    artwork = uuid4()
    db.execute(text("INSERT INTO catalog_artworks(id,slug,title_fa,title_en,published) VALUES(:id,'spring','بهار','Spring',true)"), {"id": artwork})
    db.execute(text("INSERT INTO catalog_artwork_details(artwork_id,document) VALUES(:id,CAST(:document AS jsonb))"), {"id": artwork, "document": '{"image_url":"/sample-artworks/spring.jpg"}'})
    saved = snapshot()
    saved.items[0].sku = str(artwork)
    order = SqlOrderRepository(db).record_checkout_snapshot(owner, uuid4(), saved, state())
    detail = client.get(f"/api/v1/account/orders/{order['id']}").json()
    assert detail["catalog_items"][str(saved.items[0].id)] == {"kind": "artworks", "slug": "spring", "image_url": "/sample-artworks/spring.jpg"}
    saved.items[0].commission_id = uuid4()
    custom = SqlOrderRepository(db).record_checkout_snapshot(owner, uuid4(), saved, state())
    assert client.get(f"/api/v1/account/orders/{custom['id']}").json()["catalog_items"] == {}
