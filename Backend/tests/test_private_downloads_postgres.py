import base64
import importlib.util
from pathlib import Path
from uuid import uuid4

from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import text
from test_customer_orders_postgres import prepare, snapshot, state
from test_identity_otp_postgres import flow as flow

from nilart.contexts.orders.repository import SqlOrderRepository


def setup(flow, paid=True, digital=True):
    client, db, owner = prepare(flow)
    directory = Path(__file__).resolve().parents[1] / "migrations/versions"
    with Operations.context(MigrationContext.configure(db.connection())):
        for filename in ("0011_commissions.py", "0024_commission_reviews.py", "0025_private_downloads.py"):
            spec = importlib.util.spec_from_file_location(filename, directory / filename)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            module.upgrade()
    saved_snapshot = snapshot(paid)
    saved_snapshot.items[0].delivery = "digital" if digital else "physical"
    order = SqlOrderRepository(db).record_checkout_snapshot(owner, uuid4(), saved_snapshot, state(paid))
    db.commit()
    return client, db, owner, order["id"], saved_snapshot.items[0].id


def grant_staff(db, owner):
    db.execute(text("INSERT INTO identity_account_roles(account_id,role) VALUES(:id,'admin')"), {"id": owner})
    db.commit()


def body(order, line, content=b"test-private-file"):
    return dict(order_id=str(order), line_id=str(line), file_name="اثر نهایی.pdf", description="Final purchased file", content_base64=base64.b64encode(content).decode())


def test_release_download_integrity_and_revocation(flow):
    client, db, owner, order, line = setup(flow)
    id = uuid4()
    url = f"/api/v1/admin/downloads/{id}"
    data = body(order, line)
    assert client.get("/api/v1/account/downloads").json()["items"] == []
    assert client.put(url, json=data).status_code == 403
    grant_staff(db, owner)
    assert client.put(url, json={**data, "content_base64": "not base64!"}).status_code == 422
    saved = client.put(url, json=data)
    assert saved.status_code == 200, saved.text
    assert client.put(url, json=data).json() == saved.json()
    assert db.execute(text("SELECT count(*) FROM customer_records WHERE kind='notification' AND data->>'category'='files'")).scalar() == 1
    assert client.put(url, json={**data, "file_name": "Different.pdf"}).status_code == 409
    library = client.get("/api/v1/account/downloads").json()
    assert library["items"][0]["id"] == str(id)
    assert "content" not in library["items"][0] and "content_base64" not in library["items"][0]
    file = client.get(f"/api/v1/account/downloads/{id}/content")
    assert file.status_code == 200 and file.content == b"test-private-file"
    assert file.headers["cache-control"] == "no-store"
    assert file.headers["content-type"] == "application/octet-stream"
    assert file.headers["content-disposition"].startswith("attachment;") and "filename*=UTF-8''" in file.headers["content-disposition"]
    assert client.put(url + "/revoke", json=dict(version=1, reason="Staff correction")).status_code == 409
    revoked = client.put(url + "/revoke", json=dict(version=0, reason="Staff correction"))
    assert revoked.status_code == 200, revoked.text
    assert client.put(url + "/revoke", json=dict(version=0, reason="Staff correction")).json() == revoked.json()
    assert client.get(f"/api/v1/account/downloads/{id}/content").status_code == 404
    assert client.get("/api/v1/account/downloads").json()["items"] == []
    assert client.put(url, json=data).json()["code"] == "file_revoked"
    assert db.execute(text("SELECT count(*) FROM outbox_events WHERE event_type LIKE 'files.%'")).scalar_one() == 2


def test_refund_and_foreign_owner_deny_stale_download_links(flow):
    client, db, owner, order, line = setup(flow)
    grant_staff(db, owner)
    id = uuid4()
    assert client.put(f"/api/v1/admin/downloads/{id}", json=body(order, line)).status_code == 200
    db.execute(text("UPDATE customer_orders SET state=jsonb_set(state,'{payment}','\"refunded\"') WHERE id=:id"), {"id": order})
    db.commit()
    assert client.get(f"/api/v1/account/downloads/{id}/content").status_code == 404
    assert client.get("/api/v1/account/downloads").json()["items"] == []
    foreign = uuid4()
    db.execute(text("INSERT INTO identity_accounts(id,phone,password_hash,phone_verified,blocked,created_at) SELECT :foreign,'+989123456780',password_hash,true,false,now() FROM identity_accounts WHERE id=:owner"), {"foreign": foreign, "owner": owner})
    db.execute(text("UPDATE customer_orders SET account_id=:foreign,state=jsonb_set(state,'{payment}','\"paid\"') WHERE id=:id"), {"foreign": foreign, "id": order})
    db.commit()
    assert client.get(f"/api/v1/account/downloads/{id}/content").status_code == 404
    assert client.get(f"/api/v1/account/downloads?cursor={id}").status_code == 404
    client.cookies.clear()
    assert client.get(f"/api/v1/account/downloads/{id}/content").status_code == 401


def test_release_requires_paid_digital_line_and_safe_filename(flow):
    client, db, owner, order, line = setup(flow, paid=False)
    grant_staff(db, owner)
    url = f"/api/v1/admin/downloads/{uuid4()}"
    data = body(order, line)
    assert client.put(url, json=data).json()["code"] == "file_release_not_eligible"
    for name in ("../secret.pdf", "bad\r\nheader.pdf", "bad\\file.pdf", "..", "name\u202eevil.pdf"):
        assert client.put(url, json={**data, "file_name": name}).status_code == 422
    assert client.put(url, json=data, headers={"Origin": "https://foreign.invalid"}).status_code == 403
    db.execute(text("UPDATE customer_orders SET state=jsonb_set(state,'{payment}','\"paid\"'),snapshot=jsonb_set(snapshot,'{items,0,delivery}','\"physical\"') WHERE id=:id"), {"id": order})
    db.commit()
    assert client.put(url, json=data).json()["code"] == "file_release_not_eligible"


def test_approved_commission_alone_does_not_grant_a_final_download(flow):
    client, db, owner, order, line = setup(flow)
    grant_staff(db, owner)
    commission = uuid4()
    db.execute(text("INSERT INTO commission_requests(id,account_id,submission_id,brief,created_at,status) VALUES(:id,:owner,:submission,'{}',now(),'awaiting_customer')"), {"id": commission, "owner": owner, "submission": uuid4()})
    db.execute(text("UPDATE customer_orders SET snapshot=jsonb_set(snapshot,'{items,0,commission_id}',to_jsonb(CAST(:commission AS text))) WHERE id=:id"), {"id": order, "commission": str(commission)})
    db.commit()
    url = f"/api/v1/admin/downloads/{uuid4()}"
    assert client.put(url, json=body(order, line)).status_code == 409
    db.execute(text("UPDATE commission_requests SET status='approved' WHERE id=:id"), {"id": commission})
    db.commit()
    assert client.put(url, json=body(order, line)).status_code == 200
    db.execute(text("UPDATE commission_requests SET status='cancelled' WHERE id=:id"), {"id": commission})
    db.commit()
    assert client.get("/api/v1/account/downloads").json()["items"] == []


def test_content_corruption_fails_closed(flow):
    client, db, owner, order, line = setup(flow)
    grant_staff(db, owner)
    id = uuid4()
    assert client.put(f"/api/v1/admin/downloads/{id}", json=body(order, line)).status_code == 200
    db.execute(text("UPDATE customer_downloads SET sha256=:hash WHERE id=:id"), {"hash": "0" * 64, "id": id})
    db.commit()
    failed = client.get(f"/api/v1/account/downloads/{id}/content")
    assert failed.status_code == 503 and failed.json()["code"] == "file_integrity_error"



def test_pagination_remains_stable_when_an_earlier_file_is_revoked(flow):
    client, db, owner, order, line = setup(flow)
    grant_staff(db, owner)
    ids = [uuid4() for _ in range(3)]
    for id in ids:
        assert client.put(f"/api/v1/admin/downloads/{id}", json=body(order, line)).status_code == 200
    page = client.get("/api/v1/account/downloads?limit=1").json()
    first = page["items"][0]["id"]
    cursor = page["next_cursor"]
    assert cursor == first
    assert client.put(f"/api/v1/admin/downloads/{first}/revoke", json=dict(version=0, reason="Staff correction")).status_code == 200
    remaining = client.get(f"/api/v1/account/downloads?limit=100&cursor={cursor}")
    assert remaining.status_code == 200, remaining.text
    assert remaining.json()["next_cursor"] is None
    assert len(remaining.json()["items"]) == 2
    assert {item["id"] for item in remaining.json()["items"]} == {str(id) for id in ids} - {first}


def test_order_summary_counts_only_owned_currently_eligible_records(flow):
    client, db, owner, order, line = setup(flow)
    summary_url = "/api/v1/account/orders/summary"
    assert client.get(summary_url).json() == {"orders": 1, "awaiting_delivery": 1, "active_requests": 0, "available_files": 0}
    SqlOrderRepository(db).record_checkout_snapshot(owner, uuid4(), snapshot(), state())
    foreign = uuid4()
    db.execute(text("INSERT INTO identity_accounts(id,phone,password_hash,phone_verified,blocked,created_at) SELECT :foreign,'+989123456780',password_hash,true,false,now() FROM identity_accounts WHERE id=:owner"), {"foreign": foreign, "owner": owner})
    SqlOrderRepository(db).record_checkout_snapshot(foreign, uuid4(), snapshot(True), state(True))
    db.commit()
    id = uuid4()
    assert client.put(f'/api/v1/account/orders/{order}/requests/{uuid4()}', json={"version": 0, "kind": "cancellation", "reason": "Changed my plans", "quantities": {}}).status_code == 200
    grant_staff(db, owner)
    assert client.put(f"/api/v1/admin/downloads/{id}", json=body(order, line)).status_code == 200
    assert client.get(summary_url).json() == {"orders": 2, "awaiting_delivery": 1, "active_requests": 1, "available_files": 1}
    assert client.put(f"/api/v1/admin/downloads/{id}/revoke", json={"version": 0, "reason": "Staff correction"}).status_code == 200
    assert client.get(summary_url).json()["available_files"] == 0
    db.execute(text("UPDATE customer_order_requests SET status='rejected' WHERE order_id=:id"), {"id": order})
    db.execute(text("UPDATE customer_orders SET state=jsonb_set(state,'{payment}','\"refunded\"') WHERE id=:id"), {"id": order})
    db.commit()
    assert client.get(summary_url).json() == {"orders": 2, "awaiting_delivery": 0, "active_requests": 0, "available_files": 0}
    client.cookies.clear()
    assert client.get(summary_url).status_code == 401


def test_download_library_filters_by_owned_order_and_rejects_cross_order_cursor(flow):
    client, db, owner, order, line = setup(flow)
    other_snapshot = snapshot(True)
    other_snapshot.items[0].delivery = "digital"
    other = SqlOrderRepository(db).record_checkout_snapshot(owner, uuid4(), other_snapshot, state(True))
    db.commit()
    grant_staff(db, owner)
    first, second = uuid4(), uuid4()
    assert client.put(f"/api/v1/admin/downloads/{first}", json=body(order, line)).status_code == 200
    assert client.put(f"/api/v1/admin/downloads/{second}", json=body(other["id"], other_snapshot.items[0].id)).status_code == 200
    page = client.get(f"/api/v1/account/downloads?order_id={order}")
    assert page.status_code == 200, page.text
    assert [item["id"] for item in page.json()["items"]] == [str(first)]
    assert client.get(f"/api/v1/account/downloads?order_id={order}&cursor={second}").status_code == 404
    assert client.get(f"/api/v1/account/downloads?order_id={uuid4()}").status_code == 404
    assert client.get("/api/v1/account/downloads?order_id=invalid").status_code == 422
    assert client.put(f"/api/v1/admin/downloads/{first}/revoke", json={"version": 0, "reason": "Staff correction"}).status_code == 200
    assert client.get(f"/api/v1/account/downloads?order_id={order}&cursor={first}").json() == {"items": [], "next_cursor": None}
    foreign = uuid4()
    db.execute(text("INSERT INTO identity_accounts(id,phone,password_hash,phone_verified,blocked,created_at) SELECT :foreign,'+989123456780',password_hash,true,false,now() FROM identity_accounts WHERE id=:owner"), {"foreign": foreign, "owner": owner})
    db.execute(text("UPDATE customer_orders SET account_id=:foreign WHERE id=:id"), {"foreign": foreign, "id": other["id"]})
    db.commit()
    assert client.get(f'/api/v1/account/downloads?order_id={other["id"]}').status_code == 404


def test_library_search_is_literal_scoped_and_precedes_pagination(flow):
    client, db, owner, order, line = setup(flow)
    grant_staff(db, owner)
    ids = []
    for name in ("Match 100% first.pdf", "Match 100% second.pdf", "Unrelated.pdf"):
        id = uuid4()
        ids.append(str(id))
        saved = client.put(f"/api/v1/admin/downloads/{id}", json={**body(order, line), "file_name": name})
        assert saved.status_code == 200, saved.text
    first = client.get("/api/v1/account/downloads", params={"q": " MATCH 100% ", "order_id": str(order), "limit": 1}).json()
    assert len(first["items"]) == 1 and first["next_cursor"]
    second = client.get("/api/v1/account/downloads", params={"q": "match 100%", "order_id": str(order), "limit": 1, "cursor": first["next_cursor"]}).json()
    assert len(second["items"]) == 1 and second["next_cursor"] is None
    assert {first["items"][0]["id"], second["items"][0]["id"]} == set(ids[:2])
    assert len(client.get("/api/v1/account/downloads", params={"q": "Final purchased"}).json()["items"]) == 3
    assert client.get("/api/v1/account/downloads", params={"q": "_"}).json()["items"] == []
    assert client.get("/api/v1/account/downloads", params={"q": "x" * 201}).status_code == 422
    assert client.put(f"/api/v1/admin/downloads/{ids[0]}/revoke", json={"version": 0, "reason": "Withdraw file"}).status_code == 200
    assert len(client.get("/api/v1/account/downloads", params={"q": "match 100%"}).json()["items"]) == 1


def test_staff_file_reads_include_revoked_rows_are_scoped_and_permission_checked(flow):
    client, db, owner, order, line = setup(flow)
    base = "/api/v1/admin/downloads"
    assert client.get(f"{base}?order_id={order}").status_code == 403
    grant_staff(db, owner)
    assert client.get(f"{base}?order_id={order}").json() == {"items": [], "next_cursor": None}
    keys = [uuid4(), uuid4()]
    for key in keys:
        assert client.put(f"{base}/{key}", json=body(order, line)).status_code == 200
    page = client.get(f"{base}?order_id={order}&limit=1").json()
    assert len(page["items"]) == 1 and page["next_cursor"]
    assert "content" not in page["items"][0] and page["items"][0]["active"] is True
    other = client.get(f"{base}?order_id={order}&limit=1&cursor={page['next_cursor']}").json()
    assert len(other["items"]) == 1 and other["next_cursor"] is None
    assert client.put(f"{base}/{keys[0]}/revoke", json={"version": 0, "reason": "Incorrect final file"}).status_code == 200
    assert client.get(f"{base}/{keys[0]}").json()["active"] is False
    assert len(client.get(f"{base}?order_id={order}").json()["items"]) == 2
    assert client.get(f"{base}/{uuid4()}").status_code == 404
    assert client.get(f"{base}?order_id={uuid4()}").status_code == 404
    assert client.get(f"{base}?order_id={order}&cursor={uuid4()}").status_code == 404
    db.execute(text("DELETE FROM identity_account_roles WHERE account_id=:id AND role='admin'"), {"id": owner})
    db.commit()
    assert client.get(f"{base}/{keys[0]}").status_code == 403
