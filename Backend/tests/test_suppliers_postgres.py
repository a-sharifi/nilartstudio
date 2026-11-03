import importlib.util
from pathlib import Path
from uuid import uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import text
from test_identity_otp_postgres import flow as flow
from test_identity_otp_postgres import register

from nilart.contexts.identity.infrastructure.management import SqlAccountManagement


def prepare(flow, staff=True):
    client, db, sms = flow
    path = Path(__file__).parents[1] / "migrations/versions/0032_suppliers.py"
    spec = importlib.util.spec_from_file_location("suppliers_migration", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with Operations.context(MigrationContext.configure(db.connection())):
        module.upgrade()
    _, login = register(client, sms)
    owner = login.json()["account_id"]
    client.headers["X-CSRF-Token"] = login.json()["csrf_token"]
    if staff:
        SqlAccountManagement(db).bootstrap(owner, "Isolated supplier test")
        db.commit()
    return client, db, owner


def content(**changes):
    return {
        "kind": "supplier",
        "code": "SUPPLIER-A",
        "title_fa": "تأمین‌کننده آزمایش",
        "title_en": "Test supplier",
        "contact_name": "Test contact",
        "phone": "+98 912 345 6789",
        "email": "vendor@example.test",
        "address": "Address\nSecond line",
        "notes": "Private notes",
        "active": True,
        **changes,
    }


def save(
    client, id=None, revision=None, version=0, resource=None, reason="Reviewed contact details"
):
    return client.put(
        f"/api/v1/admin/procurement/suppliers/{id or uuid4()}/versions/{revision or uuid4()}",
        json={"expected_version": version, "content": resource or content(), "reason": reason},
    )


def test_supplier_versions_replay_archival_and_contact_search(flow):
    client, db, owner = prepare(flow)
    id, key = uuid4(), uuid4()
    first = save(client, id, key)
    assert first.status_code == 200, first.text
    assert save(client, id, key).json() == first.json()
    assert save(client, id, key, reason="Different").status_code == 409
    assert save(client, id, version=0).status_code == 409
    assert save(client, resource=content(kind="service_provider")).status_code == 409
    assert (
        save(
            client, id, version=1, resource=content(kind="both", phone="", active=False)
        ).status_code
        == 200
    )
    assert save(client, id, key).json() == first.json()
    root = f"/api/v1/admin/procurement/suppliers/{id}"
    assert client.get(root).json()["content"]["kind"] == "both"
    page = client.get(root + "/versions?limit=1").json()
    assert page["items"][0]["version"] == 2 and page["next_before_version"] == 2
    assert client.get(root + "/versions?before=2").json()["items"] == [first.json()]
    assert client.get(root + f"/versions/{key}").json() == first.json()
    assert (
        client.get(f"/api/v1/admin/procurement/suppliers/{uuid4()}/versions/{key}").status_code
        == 404
    )
    assert client.get(
        "/api/v1/admin/procurement/suppliers?q=vendor@example.test&active=false"
    ).json()["items"][0]["id"] == str(id)
    assert client.get("/api/v1/admin/procurement/suppliers?active=true").json()["items"] == []
    assert client.get("/api/v1/admin/procurement/suppliers?q=%").json()["items"] == []
    assert (
        db.scalar(
            text("SELECT count(*) FROM identity_audits WHERE action='procurement.supplier_saved'")
        )
        == 2
    )
    assert (
        db.scalar(
            text("SELECT count(*) FROM outbox_events WHERE event_type='procurement.supplier_saved'")
        )
        == 2
    )


@pytest.mark.parametrize(
    "change",
    [
        {"phone": "۰۹۱۲۳۴۵۶۷۸۹"},
        {"email": "invalid"},
        {"title_fa": "\n"},
        {"notes": "hidden\x00value"},
        {"kind": "unknown"},
        {"active": 1},
        {"code": "lowercase"},
        {"unexpected": True},
    ],
)
def test_supplier_invalid_fields_do_not_write(flow, change):
    client, db, owner = prepare(flow)
    assert save(client, resource=content(**change)).status_code == 422
    assert db.scalar(text("SELECT count(*) FROM procurement_suppliers")) == 0


def test_supplier_filters_are_applied_before_cursor(flow):
    client, db, owner = prepare(flow)
    ids = [uuid4() for _ in range(4)]
    for index, id in enumerate(ids):
        assert (
            save(
                client,
                id,
                resource=content(
                    code=f"SUP-{index}",
                    contact_name="Contact match" if index % 2 else "Other",
                    active=index != 0,
                ),
            ).status_code
            == 200
        )
    expected = sorted(str(ids[i]) for i in [1, 3])
    first = client.get(
        "/api/v1/admin/procurement/suppliers?q=Contact%20match&active=true&limit=1"
    ).json()
    assert [v["id"] for v in first["items"]] == expected[:1]
    page = client.get(
        "/api/v1/admin/procurement/suppliers",
        params={"q": "Contact match", "active": True, "limit": 1, "cursor": first["next_cursor"]},
    ).json()
    assert [v["id"] for v in page["items"]] == expected[1:] and page["next_cursor"] is None


def test_supplier_permissions_origin_csrf_and_private_headers(flow):
    client, db, owner = prepare(flow, False)
    assert client.get("/api/v1/admin/procurement/suppliers").status_code == 403
    assert save(client).status_code == 403
    SqlAccountManagement(db).bootstrap(owner, "Test access")
    db.commit()
    client.headers["Origin"] = "https://untrusted.example"
    assert save(client).status_code == 403
    client.headers["Origin"] = "http://localhost:8080"
    token = client.headers.pop("X-CSRF-Token")
    assert save(client).status_code == 403
    client.headers["X-CSRF-Token"] = token
    assert save(client).status_code == 200
    response = client.get("/api/v1/admin/procurement/suppliers")
    assert response.headers["Cache-Control"] == "no-store"
    client.cookies.clear()
    assert client.get("/api/v1/admin/procurement/suppliers").status_code == 401


def test_supplier_outbox_failure_is_atomic(flow, monkeypatch):
    client, db, owner = prepare(flow)

    def fail(*args, **kwargs):
        raise RuntimeError("Isolated outbox failure")

    monkeypatch.setattr("nilart.contexts.procurement.suppliers.enqueue", fail)
    with pytest.raises(RuntimeError):
        save(client)
    for table in ["procurement_suppliers", "procurement_supplier_versions"]:
        assert db.scalar(text(f"SELECT count(*) FROM {table}")) == 0
    assert (
        db.scalar(
            text("SELECT count(*) FROM identity_audits WHERE action='procurement.supplier_saved'")
        )
        == 0
    )


@pytest.mark.parametrize("change,status", [("rotate", 403), ("revoke", 401), ("permission", 403)])
def test_resource_write_rechecks_live_session_and_permission(flow, monkeypatch, change, status):
    from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository

    client, db, owner = prepare(flow)
    original = SqlIdentityRepository.session_account
    original_roles = SqlIdentityRepository.roles

    def session(self, digest, now, *, lock=False):
        result = original(self, digest, now, lock=lock)
        if not lock:
            if change == "revoke":
                self.session.execute(
                    text("DELETE FROM identity_sessions WHERE token_hash=:token"), {"token": digest}
                )
            elif change == "rotate":
                self.rotate_csrf(digest, "changed-nonce", now)
        return result

    def roles(self, account_id, lock=False):
        if lock and change == "permission":
            self.session.execute(text("DELETE FROM identity_account_roles WHERE role='admin'"))
        return original_roles(self, account_id, lock=lock)

    monkeypatch.setattr(SqlIdentityRepository, "session_account", session)
    monkeypatch.setattr(SqlIdentityRepository, "roles", roles)
    assert save(client).status_code == status
    assert db.scalar(text("SELECT count(*) FROM procurement_suppliers")) == 0


def test_concurrent_cost_edits_have_one_winner_and_migration_is_reversible(monkeypatch):
    import os
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    from types import SimpleNamespace

    from fastapi import Request
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    from nilart.contexts.procurement.suppliers import SaveResource
    from nilart.contexts.procurement.suppliers import save as write
    from nilart.shared.outbox import metadata

    url = os.environ.get("NILART_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Isolated PostgreSQL required")
    engine = create_engine(url)
    schema, actor, id = "procurement_suppliers_" + uuid4().hex, uuid4(), uuid4()
    path = Path(__file__).parents[1] / "migrations/versions/0032_suppliers.py"
    spec = importlib.util.spec_from_file_location("concurrent_cost_migration", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    monkeypatch.setattr(
        "nilart.contexts.procurement.suppliers.write_access",
        lambda *args: (SimpleNamespace(id=str(actor)), None),
    )
    request = Request({"type": "http", "headers": [], "method": "PUT", "path": "/"})
    request.state.request_id = "isolated-concurrency-test"
    try:
        with engine.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))
            connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            metadata.create_all(connection)
            connection.execute(text("CREATE TABLE identity_accounts(id uuid PRIMARY KEY)"))
            connection.execute(
                text(
                    "CREATE TABLE identity_audits(id uuid PRIMARY KEY,actor_id uuid,account_id uuid,action text,changes jsonb,reason text,created_at timestamptz DEFAULT now())"
                )
            )
            connection.execute(text("INSERT INTO identity_accounts VALUES(:id)"), {"id": actor})
            with Operations.context(MigrationContext.configure(connection)):
                module.upgrade()
        with engine.connect() as connection:
            connection.execute(text(f'SET search_path TO "{schema}"'))
            connection.commit()
            with Session(bind=connection) as db:
                assert (
                    write(
                        id,
                        uuid4(),
                        SaveResource(expected_version=0, content=content(), reason="Seed test"),
                        request,
                        db,
                        None,
                    )["version"]
                    == 1
                )
        barrier = Barrier(2)

        def edit(index):
            with engine.connect() as connection:
                connection.execute(text(f'SET search_path TO "{schema}"'))
                connection.commit()
                with Session(bind=connection) as db:
                    barrier.wait(timeout=10)
                    result = write(
                        id,
                        uuid4(),
                        SaveResource(
                            expected_version=1,
                            content=content(contact_name=f"Contact {index}"),
                            reason="Concurrent edit",
                        ),
                        request,
                        db,
                        None,
                    )
                    return "saved" if isinstance(result, dict) else "conflict"

        with ThreadPoolExecutor(max_workers=2) as pool:
            assert sorted(pool.map(edit, range(2))) == ["conflict", "saved"]
        with engine.begin() as connection:
            connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            assert (
                connection.scalar(text("SELECT count(*) FROM procurement_supplier_versions")) == 2
            )
            assert connection.scalar(text("SELECT count(*) FROM identity_audits")) == 2
            assert connection.scalar(text("SELECT count(*) FROM outbox_events")) == 2
            with Operations.context(MigrationContext.configure(connection)):
                module.downgrade()
            assert connection.scalar(text("SELECT to_regclass('procurement_suppliers')")) is None
    finally:
        with engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE'))
        engine.dispose()


def test_supplier_events_are_validated_and_deduplicated(flow):
    from nilart.shared.outbox import consume_event

    client, db, owner = prepare(flow)
    envelope = {
        "id": str(uuid4()),
        "event_type": "procurement.supplier_saved",
        "payload": {"supplier_id": str(uuid4()), "revision_id": str(uuid4()), "version": 1},
    }
    assert consume_event(db, envelope)
    assert not consume_event(db, envelope)
    for value in [True, 0, -1, "1"]:
        with pytest.raises(ValueError):
            consume_event(
                db,
                {
                    **envelope,
                    "id": str(uuid4()),
                    "payload": {**envelope["payload"], "version": value},
                },
            )
