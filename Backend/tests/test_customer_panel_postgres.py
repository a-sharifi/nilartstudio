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


def test_staff_conversation_reads_are_protected_paginated_and_scoped(flow):
    from nilart.contexts.identity.infrastructure.management import SqlAccountManagement

    client, db, owner = setup(flow)
    tickets = [str(uuid4()), str(uuid4())]
    for ticket in tickets:
        assert put(client, "ticket", ticket, {
            "topic": "general", "subject": "Private support", "body": "Question",
            "request_id": str(uuid4()),
        }).status_code == 200
    messages = []
    for ticket in [tickets[0], tickets[0], tickets[1]]:
        response = put(client, "message", str(uuid4()), {
            "ticket_id": ticket, "body": "Follow-up", "request_id": str(uuid4()),
        })
        assert response.status_code == 200
        messages.append(response.json())
    messages[:2] = sorted(messages[:2], key=lambda row: (row["created_at"], row["id"]))
    root = f"/api/v1/admin/customer/tickets/{tickets[0]}"
    assert client.get(root).status_code == 403
    assert client.get(f"{root}/messages").status_code == 403
    SqlAccountManagement(db).bootstrap(owner, "Isolated conversation read test")
    db.commit()
    assert client.get(root).json()["id"] == tickets[0]
    first = client.get(f"{root}/messages", params={"limit": 1}).json()
    assert first["items"][0]["id"] == messages[0]["id"]
    second = client.get(f"{root}/messages", params={"limit": 1, "cursor": first["next_cursor"]}).json()
    assert second["items"][0]["id"] == messages[1]["id"]
    assert second["next_cursor"] is None
    assert client.get(f"{root}/messages", params={"cursor": messages[2]["id"]}).status_code == 404
    receipt = client.get(f"{root}/messages", params={"request_id": messages[1]["data"]["request_id"]}).json()
    assert [row["id"] for row in receipt["items"]] == [messages[1]["id"]]
    assert client.get(f"{root}/messages", params={"request_id": messages[2]["data"]["request_id"]}).json()["items"] == []
    missing = f"/api/v1/admin/customer/tickets/{uuid4()}"
    assert client.get(missing).status_code == 404
    assert client.get(f"{missing}/messages").status_code == 404


def test_staff_ticket_state_requires_reason_permission_version_and_valid_transition(flow):
    from nilart.contexts.identity.infrastructure.management import SqlAccountManagement

    client, db, owner = setup(flow)
    id = str(uuid4())
    assert put(client, "ticket", id, {
        "topic": "general", "subject": "State test", "body": "Isolated ticket",
        "request_id": str(uuid4()),
    }).status_code == 200
    url = f"/api/v1/admin/customer/tickets/{id}/state"
    payload = {"version": 0, "status": "closed", "reason": "Resolved in isolated test"}
    assert client.put(url, json=payload).status_code == 403
    SqlAccountManagement(db).bootstrap(owner, "Isolated state test")
    db.commit()
    assert client.put(url, json={**payload, "reason": "   "}).status_code == 422
    assert client.put(url, json={**payload, "status": "submitted"}).status_code == 409
    assert client.put(url, json=payload, headers={"Origin": "https://untrusted.invalid"}).status_code == 403
    saved_csrf = client.headers.pop("X-CSRF-Token")
    assert client.put(url, json=payload).status_code == 403
    client.headers["X-CSRF-Token"] = saved_csrf
    response = client.put(url, json=payload)
    assert response.status_code == 200, response.text
    assert response.json()["version"] == 1
    assert response.json()["data"]["status"] == "closed"
    assert client.put(url, json=payload).json()["code"] == "record_version_conflict"
    assert client.put(url, json={**payload, "version": 1}).json()["code"] == "invalid_ticket_transition"
    assert client.post(f"/api/v1/admin/customer/tickets/{id}/reply", json={
        "version": 1, "body": "Closed reply", "request_id": str(uuid4()),
    }).json()["code"] == "ticket_closed"
    response = client.put(url, json={**payload, "version": 1, "status": "submitted"})
    assert response.status_code == 200
    assert response.json()["version"] == 2
    assert client.get(f"/api/v1/account/panel/ticket/{id}").json()["data"]["status"] == "submitted"
    audits = db.execute(text("SELECT changes,reason FROM identity_audits WHERE action='customer.support_state' ORDER BY created_at")).mappings().all()
    assert len(audits) == 2
    assert audits[0]["changes"]["before"] == "submitted"
    assert audits[0]["changes"]["after"] == "closed"
    assert audits[1]["changes"]["version"] == 2
    assert all(row["reason"] == payload["reason"] for row in audits)


def test_named_regions_persist_without_demo_location_restrictions(flow):
    client, db, owner = setup(flow)
    id = str(uuid4())
    response = put(client, "address", id, address(province=" خراسان رضوی ", city=" مشهد "))
    assert response.status_code == 200, response.text
    saved = client.get(f"/api/v1/account/panel/address/{id}").json()
    assert saved["data"]["province"] == "خراسان رضوی"
    assert saved["data"]["city"] == "مشهد"
    assert put(client, "address", str(uuid4()), address(province="  ")).status_code == 422
    assert put(client, "address", str(uuid4()), address(city="  ")).status_code == 422
    assert put(client, "address", str(uuid4()), address(city="x" * 101)).status_code == 422


def test_support_inbox_status_filter_is_applied_before_pagination(flow):
    from nilart.contexts.identity.infrastructure.management import SqlAccountManagement

    client, db, owner = setup(flow)
    SqlAccountManagement(db).bootstrap(owner, "Isolated filtered inbox test")
    db.commit()
    ids = sorted(str(uuid4()) for _ in range(3))
    for id in ids:
        assert put(client, "ticket", id, {
            "topic": "general", "subject": "Filter test", "body": "Isolated question",
            "request_id": str(uuid4()),
        }).status_code == 200
    assert client.put(f"/api/v1/admin/customer/tickets/{ids[1]}/state", json={
        "version": 0, "status": "closed", "reason": "Filter fixture",
    }).status_code == 200
    root = "/api/v1/admin/customer/tickets"
    first = client.get(root, params={"status": "submitted", "limit": 1}).json()
    assert [x["id"] for x in first["items"]] == [ids[0]]
    second = client.get(root, params={"status": "submitted", "limit": 1, "cursor": first["next_cursor"]}).json()
    assert [x["id"] for x in second["items"]] == [ids[2]]
    assert second["next_cursor"] is None
    assert [x["id"] for x in client.get(root, params={"status": "closed"}).json()["items"]] == [ids[1]]
    assert client.get(root, params={"status": "awaiting_reply"}).json()["items"] == []
    assert client.get(root, params={"status": "invalid"}).status_code == 422


def test_staff_history_is_permission_protected_ticket_scoped_and_paginated(flow):
    from nilart.contexts.identity.infrastructure.management import SqlAccountManagement

    client, db, owner = setup(flow)
    id = str(uuid4())
    assert put(client, "ticket", id, {
        "topic": "general", "subject": "History test", "body": "Private body omitted from history",
        "request_id": str(uuid4()),
    }).status_code == 200
    root = f"/api/v1/admin/customer/tickets/{id}/audits"
    assert client.get(root).status_code == 403
    management = SqlAccountManagement(db)
    management.bootstrap(owner, "Isolated history test")
    for status in ["closed", "submitted"]:
        management.audit(owner, owner, "customer.support_state", {
            "record_id": id, "before": "submitted", "after": status,
        }, "Isolated state reason")
    management.audit(owner, owner, "customer.support_reply", {"record_id": str(uuid4())}, "Other ticket")
    management.audit(owner, owner, "customer.record.saved", {"record_id": id}, "Excluded action")
    db.commit()
    first = client.get(root, params={"limit": 1}).json()
    assert len(first["items"]) == 1 and first["next_cursor"]
    second = client.get(root, params={"limit": 1, "cursor": first["next_cursor"]}).json()
    assert len(second["items"]) == 1 and second["next_cursor"] is None
    assert first["items"][0]["id"] != second["items"][0]["id"]
    assert all(row["reason"] == "Isolated state reason" for row in first["items"] + second["items"])
    assert "Private body omitted" not in str(first)
    assert client.get(root, params={"cursor": str(uuid4())}).status_code == 404
    assert client.get(f"/api/v1/admin/customer/tickets/{uuid4()}/audits").status_code == 404


def test_support_subject_search_is_literal_and_combines_with_status_and_cursor(flow):
    from nilart.contexts.identity.infrastructure.management import SqlAccountManagement

    client, db, owner = setup(flow)
    SqlAccountManagement(db).bootstrap(owner, "Isolated subject search")
    db.commit()
    ids = sorted(str(uuid4()) for _ in range(3))
    for id, subject in zip(ids, ["Request Alpha", "Other", "Request Beta"], strict=True):
        assert put(client, "ticket", id, {
            "topic": "general", "subject": subject, "body": "Isolated question",
            "request_id": str(uuid4()),
        }).status_code == 200
    root = "/api/v1/admin/customer/tickets"
    first = client.get(root, params={"q": "request", "limit": 1}).json()
    second = client.get(root, params={"q": "request", "limit": 1, "cursor": first["next_cursor"]}).json()
    assert [x["id"] for x in first["items"]] == [ids[0]]
    assert [x["id"] for x in second["items"]] == [ids[2]]
    assert second["next_cursor"] is None
    assert client.put(f"{root}/{ids[2]}/state", json={"version": 0, "status": "closed", "reason": "Search fixture"}).status_code == 200
    assert [x["id"] for x in client.get(root, params={"q": "request", "status": "closed"}).json()["items"]] == [ids[2]]
    for subject in ["100%_ready", "100XXready", "پرسش فارسی"]:
        assert put(client, "ticket", str(uuid4()), {
            "topic": "general", "subject": subject, "body": "Isolated question",
            "request_id": str(uuid4()),
        }).status_code == 200
    assert [x["data"]["subject"] for x in client.get(root, params={"q": "%_"}).json()["items"]] == ["100%_ready"]
    assert len(client.get(root, params={"q": "فارسی"}).json()["items"]) == 1
    assert client.get(root, params={"q": "x" * 101}).status_code == 422


def test_customer_conversation_message_filter_checks_ticket_and_cursor(flow):
    client, db, owner = setup(flow)
    tickets = [str(uuid4()), str(uuid4())]
    for ticket in tickets:
        assert put(client, "ticket", ticket, {"topic": "general", "subject": "Private support", "body": "Test request", "request_id": str(uuid4())}).status_code == 200
    messages = []
    for ticket in (tickets[0], tickets[0], tickets[1]):
        id = str(uuid4())
        assert put(client, "message", id, {"ticket_id": ticket, "body": "A reply", "request_id": str(uuid4())}).status_code == 200
        messages.append(id)
    root = "/api/v1/account/panel/message"
    first = client.get(root, params={"ticket_id": tickets[0], "limit": 1}).json()
    assert len(first["items"]) == 1 and first["next_cursor"]
    second = client.get(root, params={"ticket_id": tickets[0], "limit": 1, "cursor": first["next_cursor"]}).json()
    assert {first["items"][0]["id"], second["items"][0]["id"]} == set(messages[:2])
    assert second["next_cursor"] is None
    assert client.get(root, params={"ticket_id": tickets[0], "cursor": messages[2]}).status_code == 404
    assert client.get(root, params={"ticket_id": str(uuid4())}).status_code == 404
    assert client.get("/api/v1/account/panel/ticket", params={"ticket_id": tickets[0]}).status_code == 422


def test_customer_ticket_search_and_status_filter_before_pagination(flow):
    client, db, owner = setup(flow)
    ids = []
    for subject in ("Match 100% first", "Match 100% second", "Other request"):
        id = str(uuid4())
        ids.append(id)
        assert put(client, "ticket", id, {"topic": "general", "subject": subject, "body": "Private help question", "request_id": str(uuid4())}).status_code == 200
    root = "/api/v1/account/panel/ticket"
    first = client.get(root, params={"q": " MATCH 100% ", "status": "submitted", "limit": 1}).json()
    assert first["next_cursor"]
    second = client.get(root, params={"q": "match 100%", "status": "submitted", "limit": 1, "cursor": first["next_cursor"]}).json()
    assert second["next_cursor"] is None
    assert {first["items"][0]["id"], second["items"][0]["id"]} == set(ids[:2])
    assert client.get(root, params={"q": "_"}).json()["items"] == []
    assert client.get(root, params={"status": "closed"}).json()["items"] == []
    assert client.get(root, params={"q": "x" * 201}).status_code == 422
    assert client.get(root, params={"status": "invented"}).status_code == 422


def test_staff_ticket_summary_counts_statuses_and_excludes_other_records(flow):
    from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
    client, db, owner = setup(flow)
    root = "/api/v1/admin/customer/ticket-summary"
    assert client.get(root).status_code == 403
    SqlAccountManagement(db).bootstrap(owner, "Isolated summary test")
    db.commit()
    assert client.get(root).json() == {"total_tickets": 0, "statuses": {}}
    for status in ["submitted", "awaiting_reply", "closed", "closed"]:
        saved = put(client, "ticket", uuid4(), {"subject": "Private subject", "body": "Private customer body", "topic": "general", "request_id": str(uuid4())})
        assert saved.status_code == 200, saved.text
        db.execute(text("UPDATE customer_records SET data=jsonb_set(data,'{status}',CAST(:status AS jsonb)) WHERE id=:id"), {"id": saved.json()["id"], "status": '"'+status+'"'})
    db.commit()
    assert put(client, "address", uuid4(), address()).status_code == 200
    result = client.get(root)
    assert result.json() == {"total_tickets": 4, "statuses": {"submitted": 1, "awaiting_reply": 1, "closed": 2}}
    assert "Private" not in result.text and owner not in result.text
    client.cookies.clear()
    assert client.get(root).status_code == 401


def test_notification_history_filters_before_paging_and_keeps_read_states_separate(flow):
    import json
    client, db, owner = setup(flow)
    ids = [str(uuid4()) for _ in range(4)]
    for id, read, category, title in zip(ids, [False, False, True, False], ["support", "support", "support", "order"], ["Match 100% first", "Match 100% second", "Read match", "Other event"]):
        db.execute(text("INSERT INTO customer_records(id,account_id,kind,data) VALUES(:id,:owner,'notification',CAST(:data AS jsonb))"), {"id": id, "owner": owner, "data": json.dumps({"read": read, "category": category, "title_en": title, "title_fa": "خبر خصوصی"})})
    db.commit()
    root = "/api/v1/account/panel/notification"
    first = client.get(root, params={"q": " MATCH 100% ", "read_filter": "unread", "category": "support", "limit": 1}).json()
    assert len(first["items"]) == 1 and first["next_cursor"]
    second = client.get(root, params={"q": "match 100%", "read_filter": "unread", "category": "support", "limit": 1, "cursor": first["next_cursor"]}).json()
    assert {first["items"][0]["id"], second["items"][0]["id"]} == set(ids[:2])
    assert second["next_cursor"] is None
    assert [item["id"] for item in client.get(root, params={"read_filter": "read"}).json()["items"]] == [ids[2]]
    assert client.get(root, params={"q": "_"}).json()["items"] == []
    assert client.get(root, params={"category": "invented"}).status_code == 422
    assert client.get("/api/v1/account/panel/address", params={"read_filter": "read"}).status_code == 422


def test_favorite_search_uses_published_titles_and_filters_before_pagination(flow):
    import importlib.util
    from pathlib import Path

    from alembic.migration import MigrationContext
    from alembic.operations import Operations
    client, db, owner = setup(flow)
    directory = Path(__file__).resolve().parents[1] / "migrations/versions"
    with Operations.context(MigrationContext.configure(db.connection())):
        for filename in ("0002_catalog.py", "0003_catalog_foundation.py", "0010_artworks.py", "0012_bundles.py"):
            spec = importlib.util.spec_from_file_location(filename, directory / filename)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            module.upgrade()
    favorites, targets = [], []
    for entity, table in (("product", "catalog_products"), ("product", "catalog_products"), ("bundle", "catalog_bundles"), ("artwork", "catalog_artworks")):
        target, id = uuid4(), str(uuid4())
        db.execute(text(f"INSERT INTO {table}(id,slug,title_fa,title_en,published) VALUES(:id,:slug,'کیف','Match 100% item',true)"), {"id": target, "slug": str(target)})
        db.commit()
        assert put(client, "favorite", id, {"kind": entity, "target_id": str(target)}).status_code == 200
        favorites.append(id)
        targets.append(target)
    root = "/api/v1/account/panel/favorite"
    first = client.get(root, params={"q": "MATCH 100%", "favorite_type": "product", "limit": 1}).json()
    assert len(first["items"]) == 1 and first["next_cursor"]
    second = client.get(root, params={"q": "match 100%", "favorite_type": "product", "limit": 1, "cursor": first["next_cursor"]}).json()
    assert second["next_cursor"] is None
    assert {first["items"][0]["id"], second["items"][0]["id"]} == set(favorites[:2])
    assert len(client.get(root, params={"q": "كيف", "favorite_type": "bundle"}).json()["items"]) == 1
    assert len(client.get(root, params={"q": "match", "favorite_type": "artwork"}).json()["items"]) == 1
    db.execute(text("UPDATE catalog_artworks SET published=false WHERE id=:id"), {"id": targets[3]})
    db.commit()
    assert client.get(root, params={"q": "match", "favorite_type": "artwork"}).json()["items"] == []
    assert client.get(root, params={"favorite_type": "artwork"}).json()["items"][0]["catalog"] is None
    assert client.get(root, params={"q": "_"}).json()["items"] == []
    assert client.get(root, params={"favorite_type": "invented"}).status_code == 422
    assert client.get(root, params={"cursor": str(uuid4())}).status_code == 404
