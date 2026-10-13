from uuid import uuid4

from sqlalchemy import text
from test_identity_otp_postgres import flow as flow
from test_identity_otp_postgres import register

from nilart.contexts.identity.infrastructure.secrets import hash_password


def setup(flow):
    client, db, sms = flow
    _, result = register(client, sms)
    client.headers["X-CSRF-Token"] = result.json()["csrf_token"]
    return client, db, result.json()["account_id"]


def put(client, kind, id, data, version=0):
    return client.put(f"/api/v1/account/panel/{kind}/{id}", json={"version": version, "data": data})


def address(**changes):
    return {
        "name": "Test recipient",
        "phone": "09123456789",
        "province": "tehran",
        "city": "tehran",
        "street": "Isolated test street",
        "postal": "1234567890",
        "label": "Home",
        "default": True,
        **changes,
    }


def test_address_persistence_default_versions_and_stale_updates(flow):
    client, db, owner = setup(flow)
    a, b = str(uuid4()), str(uuid4())
    assert client.get("/api/v1/account/panel/address").json()["items"] == []
    first = put(client, "address", a, address())
    assert first.status_code == 200, first.text
    assert first.json()["data"]["phone"] == "9123456789"
    assert put(client, "address", b, address(label="Work")).status_code == 200
    saved = client.get(f"/api/v1/account/panel/address/{a}").json()
    assert saved["data"]["default"] is False and saved["version"] == 1
    assert put(client, "address", a, address()).status_code == 409
    assert client.delete(f"/api/v1/account/panel/address/{a}?version=0").status_code == 409
    assert client.delete(f"/api/v1/account/panel/address/{a}?version=1").status_code == 204
    assert client.delete(f"/api/v1/account/panel/address/{a}?version=1").status_code == 204
    assert (
        db.execute(
            text(
                "SELECT count(*) FROM identity_audits WHERE action LIKE 'customer.%' AND account_id=:id"
            ),
            {"id": owner},
        ).scalar_one()
        == 3
    )
    assert "Test recipient" not in str(
        db.execute(text("SELECT changes FROM identity_audits")).scalars().all()
    )


def test_private_ownership_write_gates_and_validation(flow):
    client, db, owner = setup(flow)
    foreign, id = uuid4(), uuid4()
    db.execute(
        text(
            "INSERT INTO identity_accounts(id,phone,password_hash,phone_verified,blocked,created_at) VALUES(:id,'+989123456780',:hash,true,false,now())"
        ),
        {"id": foreign, "hash": hash_password("a long secure passphrase")},
    )
    db.execute(
        text(
            "INSERT INTO customer_records(id,account_id,kind,data) VALUES(:id,:owner,'address','{}')"
        ),
        {"id": id, "owner": foreign},
    )
    db.commit()
    assert client.get(f"/api/v1/account/panel/address/{id}").status_code == 404
    assert put(client, "address", str(id), address()).status_code == 404
    assert client.delete(f"/api/v1/account/panel/address/{id}?version=0").status_code == 204
    assert (
        db.execute(
            text("SELECT account_id FROM customer_records WHERE id=:id"), {"id": id}
        ).scalar_one()
        == foreign
    )
    own = str(uuid4())
    assert put(client, "address", own, address(postal="invalid")).status_code == 422
    assert put(client, "address", own, address(phone="wrong")).status_code == 422
    assert (
        client.put(
            f"/api/v1/account/panel/address/{own}",
            json={"version": 0, "data": address()},
            headers={"Origin": "https://invalid.example"},
        ).status_code
        == 403
    )
    assert (
        client.put(
            f"/api/v1/account/panel/address/{own}",
            json={"version": 0, "data": address()},
            headers={"X-CSRF-Token": "wrong"},
        ).status_code
        == 403
    )
    db.execute(
        text("INSERT INTO identity_permission_overrides VALUES(:id,'account.write_self',false)"),
        {"id": owner},
    )
    db.commit()
    assert put(client, "address", own, address()).status_code == 403
    client.cookies.clear()
    assert client.get("/api/v1/account/panel/address").status_code == 401


def test_support_idempotency_owned_replies_and_notifications(flow):
    client, db, owner = setup(flow)
    id, key = str(uuid4()), str(uuid4())
    data = {
        "topic": "general",
        "subject": "Test request",
        "body": "An isolated support question",
        "request_id": key,
    }
    assert put(client, "ticket", id, data).status_code == 200
    assert put(client, "ticket", id, data).status_code == 200
    assert put(client, "ticket", str(uuid4()), data).json()["id"] == id
    assert (
        put(client, "ticket", str(uuid4()), {**data, "body": "Changed request payload"}).status_code
        == 409
    )
    message = {"ticket_id": id, "body": "A follow-up reply", "request_id": str(uuid4())}
    assert put(client, "message", str(uuid4()), message).status_code == 200
    assert (
        put(
            client,
            "message",
            str(uuid4()),
            {**message, "ticket_id": str(uuid4()), "request_id": str(uuid4())},
        ).status_code
        == 404
    )
    notices = client.get("/api/v1/account/panel/notification").json()["items"]
    assert len(notices) == 1 and notices[0]["data"]["read"] is False
    notice = notices[0]
    assert put(client, "notification", notice["id"], {"read": True}).status_code == 200
    assert put(client, "notification", str(uuid4()), {"read": True}).status_code == 404
    assert put(client, "notification", notice["id"], {"read": False}, 1).status_code == 422
    assert "An isolated support question" not in str(
        db.execute(text("SELECT changes FROM identity_audits")).scalars().all()
    )


def test_preferences_version_capabilities_and_pagination(flow):
    client, db, owner = setup(flow)
    id = str(uuid4())
    choices = {
        key: {"inApp": True, "sms": False}
        for key in ["order", "delivery", "proposal", "artwork", "files", "support"]
    }
    data = {"language": "fa", "choices": choices}
    assert put(client, "preferences", id, data).status_code == 200
    assert put(client, "preferences", str(uuid4()), data).status_code == 409
    assert put(client, "preferences", id, {**data, "language": "en"}).status_code == 200
    assert put(client, "preferences", id, data).status_code == 409
    invalid = {**choices, "support": {"inApp": True, "sms": True}}
    assert (
        put(client, "preferences", id, {"language": "en", "choices": invalid}, 1).status_code == 422
    )
    for i in range(3):
        assert (
            put(client, "address", str(uuid4()), address(default=False, label=str(i))).status_code
            == 200
        )
    one = client.get("/api/v1/account/panel/address?limit=2").json()
    two = client.get(
        "/api/v1/account/panel/address", params={"limit": 2, "cursor": one["next_cursor"]}
    ).json()
    assert len(one["items"]) == 2 and len(two["items"]) == 1
    assert not {item["id"] for item in one["items"]} & {item["id"] for item in two["items"]}


def test_staff_reply_closed_ticket_and_customer_notification(flow):
    from nilart.contexts.identity.infrastructure.management import SqlAccountManagement

    client, db, owner = setup(flow)
    id = str(uuid4())
    assert (
        put(
            client,
            "ticket",
            id,
            {
                "topic": "general",
                "subject": "Support issue",
                "body": "This is an isolated request",
                "request_id": str(uuid4()),
            },
        ).status_code
        == 200
    )
    assert client.get("/api/v1/admin/customer/tickets").status_code == 403
    SqlAccountManagement(db).bootstrap(owner, "Isolated support test")
    db.commit()
    reply = {"version": 0, "body": "A real stored staff response", "request_id": str(uuid4())}
    response = client.post(f"/api/v1/admin/customer/tickets/{id}/reply", json=reply)
    assert response.status_code == 200, response.text
    assert (
        client.post(f"/api/v1/admin/customer/tickets/{id}/reply", json=reply).json()["id"]
        == response.json()["id"]
    )
    assert len(client.get("/api/v1/account/panel/notification").json()["items"]) == 2
    ticket = client.get(f"/api/v1/account/panel/ticket/{id}").json()
    assert ticket["version"] == 1 and ticket["data"]["status"] == "awaiting_customer"
    assert (
        client.put(
            f"/api/v1/account/panel/tickets/{id}/state", json={"version": 1, "status": "closed"}
        ).status_code
        == 200
    )
    assert (
        put(
            client,
            "message",
            str(uuid4()),
            {"ticket_id": id, "body": "Cannot reply while closed", "request_id": str(uuid4())},
        ).status_code
        == 409
    )
    assert (
        client.put(
            f"/api/v1/account/panel/tickets/{id}/state", json={"version": 2, "status": "submitted"}
        ).status_code
        == 200
    )
    assert (
        db.execute(
            text("SELECT count(*) FROM outbox_events WHERE event_type='customer.record_changed'")
        ).scalar_one()
        == 4
    )


def test_favorites_are_published_only_unique_and_hide_unpublished_metadata(flow):
    import importlib.util
    from pathlib import Path

    from alembic.migration import MigrationContext
    from alembic.operations import Operations

    client, db, owner = setup(flow)
    directory = Path(__file__).resolve().parents[1] / "migrations/versions"
    with Operations.context(MigrationContext.configure(db.connection())):
        for filename in [
            "0002_catalog.py",
            "0003_catalog_foundation.py",
            "0010_artworks.py",
            "0012_bundles.py",
        ]:
            spec = importlib.util.spec_from_file_location(filename, directory / filename)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            module.upgrade()
    product, hidden = uuid4(), uuid4()
    for id, published in [(product, True), (hidden, False)]:
        db.execute(
            text(
                "INSERT INTO catalog_products(id,slug,title_fa,title_en,published) VALUES(:id,:slug,'عنوان آزمایش','Isolated title',:published)"
            ),
            {"id": id, "slug": str(id), "published": published},
        )
    db.commit()
    id = str(uuid4())
    data = {"kind": "product", "target_id": str(product)}
    assert put(client, "favorite", id, data).status_code == 200
    assert put(client, "favorite", str(uuid4()), data).json()["id"] == id
    assert (
        put(
            client, "favorite", str(uuid4()), {"kind": "product", "target_id": str(hidden)}
        ).status_code
        == 404
    )
    assert (
        client.get("/api/v1/account/panel/favorite").json()["items"][0]["catalog"]["title_en"]
        == "Isolated title"
    )
    db.execute(text("UPDATE catalog_products SET published=false WHERE id=:id"), {"id": product})
    db.commit()
    item = client.get("/api/v1/account/panel/favorite").json()["items"][0]
    assert item["catalog"] is None and "Isolated title" not in str(item)


def test_panel_mutation_audit_and_outbox_rollback_together(flow, monkeypatch):
    import pytest

    from nilart.contexts.identity.infrastructure.management import SqlAccountManagement

    client, db, owner = setup(flow)
    id = str(uuid4())

    def failed_audit(*args, **kwargs):
        raise RuntimeError("Isolated audit failure")

    monkeypatch.setattr(SqlAccountManagement, "audit", failed_audit)
    with pytest.raises(RuntimeError, match="Isolated audit failure"):
        put(client, "address", id, address())
    db.rollback()
    assert db.execute(text("SELECT count(*) FROM customer_records")).scalar_one() == 0
    assert db.execute(text("SELECT count(*) FROM outbox_events")).scalar_one() == 0


def test_dashboard_summary_uses_owned_counts_and_safe_events(flow):
    from nilart.shared.outbox import consume_event

    client, db, owner = setup(flow)
    assert client.get("/api/v1/account/panel/summary").json() == {
        "addresses": 0,
        "favorites": 0,
        "tickets": 0,
        "unread_notifications": 0,
    }
    assert put(client, "address", str(uuid4()), address()).status_code == 200
    assert (
        put(
            client,
            "ticket",
            str(uuid4()),
            {
                "topic": "general",
                "subject": "Summary test",
                "body": "A real isolated request",
                "request_id": str(uuid4()),
            },
        ).status_code
        == 200
    )
    summary = client.get("/api/v1/account/panel/summary").json()
    assert summary == {"addresses": 1, "favorites": 0, "tickets": 1, "unread_notifications": 1}
    event = (
        db.execute(
            text("SELECT * FROM outbox_events WHERE event_type='customer.record_changed' LIMIT 1")
        )
        .mappings()
        .one()
    )
    envelope = {
        "id": str(event["id"]),
        "event_type": event["event_type"],
        "payload": event["payload"],
    }
    assert consume_event(db, envelope) is True
    assert consume_event(db, envelope) is False
    assert "street" not in str(envelope) and "phone" not in str(envelope)


def test_customer_migration_downgrade_preserves_identity(flow):
    import importlib.util
    from pathlib import Path

    from alembic.migration import MigrationContext
    from alembic.operations import Operations

    client, db, owner = setup(flow)
    assert put(client, "address", str(uuid4()), address()).status_code == 200
    path = Path(__file__).resolve().parents[1] / "migrations/versions/0019_customer_panel.py"
    spec = importlib.util.spec_from_file_location("customer_migration", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with Operations.context(MigrationContext.configure(db.connection())):
        module.downgrade()
        assert db.execute(text("SELECT to_regclass('customer_records')")).scalar_one() is None
        assert (
            db.execute(
                text("SELECT count(*) FROM identity_accounts WHERE id=:id"), {"id": owner}
            ).scalar_one()
            == 1
        )
        module.upgrade()
    assert client.get("/api/v1/account/panel/address").json()["items"] == []
