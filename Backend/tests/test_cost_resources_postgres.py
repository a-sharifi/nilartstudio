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
    path = Path(__file__).parents[1] / "migrations/versions/0029_cost_resources.py"
    spec = importlib.util.spec_from_file_location("cost_resources_migration", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with Operations.context(MigrationContext.configure(db.connection())):
        module.upgrade()
    _, login = register(client, sms)
    owner = login.json()["account_id"]
    client.headers["X-CSRF-Token"] = login.json()["csrf_token"]
    if staff:
        SqlAccountManagement(db).bootstrap(owner, "Isolated costing test")
        db.commit()
    return client, db, owner


def content(**changes):
    return {"kind": "material", "code": "PAPER-A", "title_fa": "کاغذ آزمایش", "title_en": "Test paper", "base_unit": "sheet", "purchase_unit": "pack", "purchase_to_base": "250", "supplier": "Test supplier", "rate": {"amount": "12.000001", "currency": "IRT"}, **changes}


def save(client, id=None, revision=None, version=0, resource=None, reason="Explicit estimated rate"):
    return client.put(f"/api/v1/admin/costing/resources/{id or uuid4()}/versions/{revision or uuid4()}", json={"expected_version": version, "content": resource or content(), "reason": reason})


def test_resources_are_private_versioned_idempotent_and_exact(flow):
    client, db, owner = prepare(flow)
    id, revision = uuid4(), uuid4()
    first = save(client, id, revision)
    assert first.status_code == 200, first.text
    assert first.json()["content"]["rate"]["amount"] == "12.000001"
    assert first.json()["content"]["width_mm"] is None
    assert save(client, id, revision).json() == first.json()
    assert save(client, id, revision, reason="Different intent").status_code == 409
    changed = save(client, id, version=1, resource=content(rate={"amount": "15.123456", "currency": "IRR"}))
    assert changed.status_code == 200 and changed.json()["version"] == 2
    assert save(client, id, version=1).status_code == 409
    root = f"/api/v1/admin/costing/resources/{id}"
    assert client.get(root).json()["content"]["rate"] == {"amount": "15.123456", "currency": "IRR"}
    assert save(client, id, revision).json() == first.json()
    page = client.get(root+"/versions", params={"limit": 1}).json()
    assert page["items"][0]["version"] == 2 and page["next_before_version"] == 2
    older = client.get(root+"/versions", params={"before": 2}).json()
    assert older["items"][0]["version"] == 1 and older["next_before_version"] is None
    assert client.get(root+f"/versions/{revision}").json() == first.json()
    assert client.get(f"/api/v1/admin/costing/resources/{uuid4()}/versions/{revision}").status_code == 404
    assert save(client, resource=content()).status_code == 409
    assert db.scalar(text("SELECT count(*) FROM cost_resources")) == 1
    assert db.scalar(text("SELECT count(*) FROM cost_resource_versions")) == 2
    assert db.scalar(text("SELECT count(*) FROM identity_audits WHERE action='costing.resource_saved'")) == 2
    assert db.scalar(text("SELECT count(*) FROM outbox_events WHERE event_type='costing.resource_saved'")) == 2


@pytest.mark.parametrize("changes", [
    {"purchase_to_base": "0"}, {"rate": {"amount": "0", "currency": "IRT"}},
    {"rate": {"amount": "1e4", "currency": "IRT"}}, {"rate": {"amount": "1.1234567", "currency": "IRT"}},
    {"kind": "service"}, {"width_mm": "-1"}, {"code": "invalid code"}, {"title_fa": " "},
    {"valid_from": "2026-10-17", "valid_to": "2026-10-16"}, {"purchase_unit": None},
])
def test_invalid_resources_never_write(flow, changes):
    client, db, owner = prepare(flow)
    result = save(client, resource=content(**changes))
    assert result.status_code == 422, result.text
    assert db.scalar(text("SELECT count(*) FROM cost_resources")) == 0


def test_unknown_zero_archive_search_and_kind_filters(flow):
    client, db, owner = prepare(flow)
    id = uuid4()
    unknown = content(rate=None, purchase_to_base=None)
    assert save(client, id, resource=unknown).json()["content"]["rate"] is None
    zero = content(code="PAPER-ZERO", rate={"amount": "0", "currency": "IRT"}, zero_rate_acknowledged=True, active=False)
    assert save(client, resource=zero).status_code == 200
    service = content(kind="service", code="CUT", purchase_unit=None, purchase_to_base=None, base_unit="batch")
    assert save(client, resource=service).status_code == 200
    root = "/api/v1/admin/costing/resources"
    page = client.get(root, params={"kind": "material", "limit": 1}).json()
    assert page["next_cursor"]
    next_page = client.get(root, params={"kind": "material", "limit": 1, "cursor": page["next_cursor"]}).json()
    assert next_page["next_cursor"] is None and next_page["items"][0]["id"] != page["items"][0]["id"]
    active = client.get(root, params={"kind": "material", "active": True, "q": "کاغذ"}).json()
    assert [item["id"] for item in active["items"]] == [str(id)]
    assert len(client.get(root, params={"kind": "material", "active": False}).json()["items"]) == 1
    assert len(client.get(root, params={"kind": "service"}).json()["items"]) == 1
    assert client.get(root, params={"kind": "material", "q": "%"}).json()["items"] == []
    assert save(client, id, version=1, resource=service).status_code == 409


def test_resource_permissions_csrf_origin_and_revocation(flow):
    client, db, owner = prepare(flow, False)
    root = "/api/v1/admin/costing/resources?kind=material"
    assert client.get(root).status_code == 403 and save(client).status_code == 403
    SqlAccountManagement(db).bootstrap(owner, "Isolated cost access")
    db.commit()
    token = client.headers["X-CSRF-Token"]
    client.headers["X-CSRF-Token"] = "invalid"
    assert save(client).status_code == 403
    client.headers["X-CSRF-Token"] = token
    client.headers["Origin"] = "http://untrusted.invalid"
    assert save(client).status_code == 403
    client.headers["Origin"] = "http://localhost:8080"
    assert save(client).status_code == 200
    db.execute(text("DELETE FROM identity_account_roles WHERE account_id=:owner"), {"owner": owner})
    db.commit()
    assert save(client).status_code == 403 and client.get(root).status_code == 403
    client.cookies.clear()
    assert client.get(root).status_code == 401


def test_resource_outbox_failure_rolls_back_every_write(flow, monkeypatch):
    client, db, owner = prepare(flow)
    def fail(*args, **kwargs):
        raise RuntimeError("Isolated outbox failure")
    monkeypatch.setattr("nilart.contexts.costing.router.enqueue", fail)
    with pytest.raises(RuntimeError, match="Isolated outbox failure"):
        save(client)
    assert db.scalar(text("SELECT count(*) FROM cost_resources")) == 0
    assert db.scalar(text("SELECT count(*) FROM cost_resource_versions")) == 0
    assert db.scalar(text("SELECT count(*) FROM identity_audits WHERE action='costing.resource_saved'")) == 0


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
                self.session.execute(text("DELETE FROM identity_sessions WHERE token_hash=:token"), {"token": digest})
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
    assert db.scalar(text("SELECT count(*) FROM cost_resources")) == 0


def test_concurrent_cost_edits_have_one_winner_and_migration_is_reversible(monkeypatch):
    import os
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    from types import SimpleNamespace

    from fastapi import Request
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    from nilart.contexts.costing.router import SaveResource
    from nilart.contexts.costing.router import save as write
    from nilart.shared.outbox import metadata
    url = os.environ.get("NILART_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Isolated PostgreSQL required")
    engine = create_engine(url)
    schema, actor, id = "cost_resources_"+uuid4().hex, uuid4(), uuid4()
    path = Path(__file__).parents[1] / "migrations/versions/0029_cost_resources.py"
    spec = importlib.util.spec_from_file_location("concurrent_cost_migration", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    monkeypatch.setattr("nilart.contexts.costing.router.write_access", lambda *args: (SimpleNamespace(id=str(actor)), None))
    request = Request({"type": "http", "headers": [], "method": "PUT", "path": "/"})
    request.state.request_id = "isolated-concurrency-test"
    try:
        with engine.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))
            connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            metadata.create_all(connection)
            connection.execute(text("CREATE TABLE identity_accounts(id uuid PRIMARY KEY)"))
            connection.execute(text("CREATE TABLE identity_audits(id uuid PRIMARY KEY,actor_id uuid,account_id uuid,action text,changes jsonb,reason text,created_at timestamptz DEFAULT now())"))
            connection.execute(text("INSERT INTO identity_accounts VALUES(:id)"), {"id": actor})
            with Operations.context(MigrationContext.configure(connection)):
                module.upgrade()
        with engine.connect() as connection:
            connection.execute(text(f'SET search_path TO "{schema}"'))
            connection.commit()
            with Session(bind=connection) as db:
                assert write(id, uuid4(), SaveResource(expected_version=0, content=content(), reason="Seed test"), request, db, None)["version"] == 1
        barrier = Barrier(2)
        def edit(index):
            with engine.connect() as connection:
                connection.execute(text(f'SET search_path TO "{schema}"'))
                connection.commit()
                with Session(bind=connection) as db:
                    barrier.wait(timeout=10)
                    result = write(id, uuid4(), SaveResource(expected_version=1, content=content(rate={"amount": str(index+20), "currency": "IRT"}), reason="Concurrent edit"), request, db, None)
                    return "saved" if isinstance(result, dict) else "conflict"
        with ThreadPoolExecutor(max_workers=2) as pool:
            assert sorted(pool.map(edit, range(2))) == ["conflict", "saved"]
        with engine.begin() as connection:
            connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            assert connection.scalar(text("SELECT count(*) FROM cost_resource_versions")) == 2
            assert connection.scalar(text("SELECT count(*) FROM identity_audits")) == 2
            assert connection.scalar(text("SELECT count(*) FROM outbox_events")) == 2
            with Operations.context(MigrationContext.configure(connection)):
                module.downgrade()
            assert connection.scalar(text("SELECT to_regclass('cost_resources')")) is None
    finally:
        with engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE'))
        engine.dispose()


def test_cost_estimate_uses_exact_saved_conversion_and_explicit_validity(flow):
    client, db, owner = prepare(flow)
    id = uuid4()
    assert save(client, id, resource=content(purchase_to_base="0.000001", rate={"amount": "999999999999.999999", "currency": "IRR"}, valid_from="2026-10-17", valid_to="2026-10-18")).status_code == 200
    root = f"/api/v1/admin/costing/resources/{id}/estimate"
    result = client.get(root, params={"quantity": "999999999999.999999", "unit": "purchase", "on": "2026-10-17"})
    from decimal import Decimal, localcontext
    with localcontext() as context:
        context.prec = 80
        expected = Decimal("999999999999.999999") * Decimal("0.000001") * Decimal("999999999999.999999")
    assert result.status_code == 200, result.text
    assert result.json()["amount"] == format(expected, "f")
    assert result.json()["complete"] is True and result.json()["currency"] == "IRR"
    assert client.get(root, params={"quantity": "1", "on": "2026-10-16"}).json()["missing"] == ["rate_not_valid_on_date"]
    assert client.get(root, params={"quantity": "1", "on": "2026-10-19"}).json()["amount"] is None
    assert client.get(root, params={"quantity": "0", "on": "2026-10-17"}).status_code == 422
    assert client.get(root, params={"quantity": "1e4", "on": "2026-10-17"}).status_code == 422
    assert db.scalar(text("SELECT count(*) FROM cost_resource_versions")) == 1


def test_cost_estimate_is_incomplete_for_unknowns_and_archives(flow):
    client, db, owner = prepare(flow)
    id = uuid4()
    assert save(client, id, resource=content(rate=None, purchase_to_base=None)).status_code == 200
    root = f"/api/v1/admin/costing/resources/{id}/estimate"
    result = client.get(root, params={"quantity": "2", "unit": "purchase", "on": "2026-10-17"}).json()
    assert result["complete"] is False and result["amount"] is None and result["base_quantity"] is None
    assert set(result["missing"]) == {"rate_unknown", "conversion_unknown"}
    assert save(client, id, version=1, resource=content(active=False, valid_from="2026-10-17")).status_code == 200
    assert client.get(root, params={"quantity": "2", "on": "2026-10-17"}).json()["missing"] == ["resource_archived"]
    assert save(client, id, version=2, resource=content(rate={"amount": "0", "currency": "IRT"}, zero_rate_acknowledged=True, valid_from="2026-10-17")).status_code == 200
    zero = client.get(root, params={"quantity": "2", "on": "2026-10-17"}).json()
    assert zero["complete"] is True and zero["amount"] == "0"
    client.cookies.clear()
    assert client.get(root, params={"quantity": "2", "on": "2026-10-17"}).status_code == 401


def test_cost_resource_event_is_validated_and_consumed_once(flow):
    from nilart.shared.outbox import consume_event
    client, db, owner = prepare(flow)
    assert save(client).status_code == 200
    row = db.execute(text("SELECT * FROM outbox_events WHERE event_type='costing.resource_saved'")).mappings().one()
    envelope = {"id": str(row["id"]), "event_type": row["event_type"], "payload": row["payload"]}
    assert consume_event(db, envelope) is True
    assert consume_event(db, envelope) is False
    with pytest.raises(ValueError):
        consume_event(db, {**envelope, "payload": {**envelope["payload"], "version": True}})
    assert db.scalar(text("SELECT count(*) FROM processed_events")) == 1
