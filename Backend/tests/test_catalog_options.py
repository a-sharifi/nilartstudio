import copy
import importlib.util
import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from uuid import uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from pydantic import ValidationError
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from test_identity_otp_postgres import flow as flow
from test_identity_otp_postgres import register

from nilart.contexts.catalog.domain.options import OptionDocument
from nilart.contexts.catalog.infrastructure.options import DraftError, SqlOptionDraftRepository
from nilart.contexts.catalog.infrastructure.repository import Base
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository


def document():
    options = [{"id": str(uuid4()), "title_fa": "گزینه", "title_en": name, "order": order,
                "values": [{"id": str(uuid4()), "title_fa": "مقدار", "title_en": "Value", "order": 0}]}
               for order, name in [(1, "Binding"), (0, "Size")]]
    return {"options": options, "combinations": [{"code": "EXPLICIT-A", "selections": [
        {"option_id": option["id"], "value_id": option["values"][0]["id"]} for option in options]}]}


def test_arbitrary_options_order_and_explicit_combinations():
    result = OptionDocument.model_validate(document()).snapshot()
    assert [option["title_en"] for option in result["options"]] == ["Size", "Binding"]
    assert len(result["combinations"]) == 1
    assert OptionDocument(options=[], combinations=[]).snapshot() == {"options": [], "combinations": []}


@pytest.mark.parametrize("invalid", ["foreign", "incomplete", "duplicate_choice", "duplicate_code", "duplicate_combination", "duplicate_id", "blank", "order"])
def test_invalid_draft_combinations(invalid):
    data = document()
    if invalid == "foreign":
        data["combinations"][0]["selections"][0]["value_id"] = str(uuid4())
    elif invalid == "incomplete":
        data["combinations"][0]["selections"].pop()
    elif invalid == "duplicate_choice":
        data["combinations"][0]["selections"].append(data["combinations"][0]["selections"][0])
    elif invalid in {"duplicate_code", "duplicate_combination"}:
        data["combinations"].append(copy.deepcopy(data["combinations"][0]))
        if invalid == "duplicate_combination":
            data["combinations"][1]["code"] = "OTHER"
    elif invalid == "duplicate_id":
        data["options"][1]["values"][0]["id"] = data["options"][0]["values"][0]["id"]
    elif invalid == "blank":
        data["options"][0]["title_en"] = " "
    else:
        data["options"][1]["order"] = data["options"][0]["order"]
    with pytest.raises(ValidationError):
        OptionDocument.model_validate(data)


def migration(connection):
    path = Path(__file__).resolve().parents[1] / "migrations/versions/0009_catalog_options.py"
    spec = importlib.util.spec_from_file_location("options_migration", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with Operations.context(MigrationContext.configure(connection)):
        module.upgrade()
    return module


@pytest.fixture
def draft_flow(flow):
    client, db, sms = flow
    Base.metadata.create_all(db.connection())
    migration(db.connection())
    _, login = register(client, sms)
    actor = login.json()["account_id"]
    product = uuid4()
    db.execute(text("INSERT INTO catalog_products (id,slug,title_fa,title_en,published) VALUES (:id,'test','هنر','Art',true)"), {"id": product})
    db.commit()
    return client, db, actor, product, login.json()["csrf_token"]


def admin(db, actor):
    db.execute(text("INSERT INTO identity_account_roles VALUES (:id,'admin')"), {"id": actor})
    db.commit()


def test_option_api_authorization_versions_audits_and_public_isolation(draft_flow):
    client, db, actor, product, csrf = draft_flow
    path = f"/api/v1/admin/catalog/products/{product}/options"
    payload = {"version": 0, **document()}
    assert client.get(path).status_code == 403
    assert client.put(path, json=payload).status_code == 403
    admin(db, actor)
    initial = client.get(path)
    assert initial.json()["version"] == 0 and initial.json()["configuration_id"] is None
    assert initial.headers["cache-control"] == "no-store"
    before = client.get("/api/v1/catalog/products/test").json()
    assert client.put(path, json=payload).status_code == 403
    assert client.put(path, json=payload, headers={"X-CSRF-Token": csrf, "Origin": "https://foreign.invalid"}).status_code == 403
    saved = client.put(path, json=payload, headers={"X-CSRF-Token": csrf})
    assert saved.status_code == 200, saved.text
    assert saved.json()["version"] == 1
    assert client.put(path, json=payload, headers={"X-CSRF-Token": csrf}).status_code == 409
    assert client.get("/api/v1/catalog/products/test").json() == before
    assert client.get("/api/v1/catalog/products/test/skus").json() == []
    audit = db.execute(text('SELECT actor_id,previous_version,version,"before","after" FROM catalog_option_audits')).mappings().one()
    assert str(audit["actor_id"]) == actor and audit["previous_version"] == 0 and audit["version"] == 1
    assert audit["before"] == {"options": [], "combinations": []}
    assert audit["after"] == OptionDocument.model_validate(document_from(payload)).snapshot()
    updated = client.put(path, json={"version": 1, "options": [], "combinations": []},
                         headers={"X-CSRF-Token": csrf})
    assert updated.status_code == 200 and updated.json()["version"] == 2
    assert updated.json()["configuration_id"] == saved.json()["configuration_id"]
    assert db.scalar(text("SELECT count(*) FROM catalog_option_audits")) == 2
    assert client.get(f"/api/v1/admin/catalog/products/{uuid4()}/options").status_code == 404
    client.cookies.clear()
    assert client.get(path).status_code == 401


def document_from(payload):
    return {key: value for key, value in payload.items() if key != "version"}


def test_option_api_rechecks_revoked_permission(draft_flow, monkeypatch):
    client, db, actor, product, csrf = draft_flow
    admin(db, actor)
    original = SqlIdentityRepository.roles

    def roles(self, account_id, *, lock=False):
        result = original(self, account_id, lock=lock)
        if not lock:
            self.session.execute(text("DELETE FROM identity_account_roles WHERE role='admin'"))
        return result

    monkeypatch.setattr(SqlIdentityRepository, "roles", roles)
    response = client.put(f"/api/v1/admin/catalog/products/{product}/options",
                          json={"version": 0, **document()}, headers={"X-CSRF-Token": csrf})
    assert response.status_code == 403
    assert db.scalar(text("SELECT count(*) FROM catalog_option_drafts")) == 0
    assert db.scalar(text("SELECT count(*) FROM catalog_option_audits")) == 0


def test_option_audit_failure_rolls_back_draft(draft_flow):
    _, db, _, product, _ = draft_flow
    repository = SqlOptionDraftRepository(db)
    with pytest.raises(Exception):
        repository.save(product, uuid4(), 0, document())  # Missing actor rejects audit FK.
        db.commit()
    db.rollback()
    assert repository.read(product)["version"] == 0
    assert db.scalar(text("SELECT count(*) FROM catalog_option_audits")) == 0


def test_concurrent_initial_option_updates_and_migration_downgrade():
    url = os.environ.get("NILART_TEST_DATABASE_URL")
    if not url:
        pytest.skip("NILART_TEST_DATABASE_URL required")
    engine = create_engine(url)
    schema = "options_test_" + uuid4().hex
    actor, product = uuid4(), uuid4()
    try:
        with engine.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))
            connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            Base.metadata.create_all(connection)
            connection.execute(text("CREATE TABLE identity_accounts (id uuid PRIMARY KEY)"))
            module = migration(connection)
            connection.execute(text("INSERT INTO identity_accounts VALUES (:id)"), {"id": actor})
            connection.execute(text("INSERT INTO catalog_products (id,slug,title_fa,title_en,published) VALUES (:id,'test','هنر','Art',true)"), {"id": product})

        def save(_):
            with Session(engine) as db:
                db.execute(text(f'SET LOCAL search_path TO "{schema}"'))
                try:
                    result = SqlOptionDraftRepository(db).save(product, actor, 0, document())
                    db.commit()
                    return result["version"]
                except DraftError:
                    db.rollback()
                    return "conflict"

        with ThreadPoolExecutor(max_workers=2) as workers:
            assert sorted(map(str, workers.map(save, range(2)))) == ["1", "conflict"]
        with engine.begin() as connection:
            connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            assert connection.scalar(text("SELECT count(*) FROM catalog_option_audits")) == 1
            with Operations.context(MigrationContext.configure(connection)):
                module.downgrade()
            assert connection.scalar(text("SELECT count(*) FROM catalog_products")) == 1
    finally:
        with engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE'))
        engine.dispose()


@pytest.mark.parametrize("change,status", [("rotate", 403), ("revoke", 401)])
def test_option_write_rechecks_session_and_csrf(draft_flow, monkeypatch, change, status):
    client, db, actor, product, csrf = draft_flow
    admin(db, actor)
    original = SqlIdentityRepository.session_account

    def account(self, digest, now, *, lock=False):
        result = original(self, digest, now, lock=lock)
        if not lock:
            if change == "revoke":
                self.session.execute(text("DELETE FROM identity_sessions WHERE token_hash=:token"), {"token": digest})
            else:
                self.rotate_csrf(digest, "changed-nonce", now)
        return result

    monkeypatch.setattr(SqlIdentityRepository, "session_account", account)
    response = client.put(f"/api/v1/admin/catalog/products/{product}/options",
                          json={"version": 0, **document()}, headers={"X-CSRF-Token": csrf})
    assert response.status_code == status
    assert db.scalar(text("SELECT count(*) FROM catalog_option_drafts")) == 0
    assert db.scalar(text("SELECT count(*) FROM catalog_option_audits")) == 0


def test_invalid_option_api_document_has_no_audit(draft_flow):
    client, db, actor, product, csrf = draft_flow
    admin(db, actor)
    data = document()
    data["combinations"][0]["selections"][0]["value_id"] = str(uuid4())
    response = client.put(f"/api/v1/admin/catalog/products/{product}/options",
                          json={"version": 0, **data}, headers={"X-CSRF-Token": csrf})
    assert response.status_code == 422
    assert response.headers["cache-control"] == "no-store"
    assert db.scalar(text("SELECT count(*) FROM catalog_option_audits")) == 0



def test_audit_history_authorization_cursor_and_product_scope(draft_flow):
    client, db, actor, product, csrf = draft_flow
    path = f"/api/v1/admin/catalog/products/{product}/options"
    assert client.get(path + "/audits").status_code == 403
    admin(db, actor)
    assert client.get(path + "/audits").json() == {"items": [], "next_before_version": None}
    for version in range(3):
        assert client.put(path, json={"version": version, **document()},
                          headers={"X-CSRF-Token": csrf}).status_code == 200
    first = client.get(path + "/audits", params={"limit": 2})
    assert first.status_code == 200 and first.headers["cache-control"] == "no-store"
    assert [item["version"] for item in first.json()["items"]] == [3, 2]
    assert first.json()["next_before_version"] == 2
    second = client.get(path + "/audits", params={"limit": 2, "before_version": 2}).json()
    assert [item["version"] for item in second["items"]] == [1]
    assert second["next_before_version"] is None
    assert first.json()["items"][0]["actor_id"] == actor
    assert first.json()["items"][0]["product_id"] == str(product)
    other = uuid4()
    db.execute(text("INSERT INTO catalog_products (id,slug,title_fa,title_en,published) VALUES (:id,'other','هنر','Art',true)"), {"id": other})
    db.commit()
    assert client.get(f"/api/v1/admin/catalog/products/{other}/options/audits").json()["items"] == []
    assert client.get(f"/api/v1/admin/catalog/products/{uuid4()}/options/audits").status_code == 404
    assert client.get(path + "/audits", params={"limit": 101}).status_code == 422
    assert client.get(path + "/audits", params={"before_version": 0}).status_code == 422
    client.cookies.clear()
    assert client.get(path + "/audits").status_code == 401
