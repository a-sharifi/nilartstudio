import importlib.util
import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Barrier
from uuid import UUID, uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from test_catalog_options import admin, document
from test_catalog_options import migration as option_migration
from test_identity_otp_postgres import flow as flow
from test_sku_authoring import authoring_flow as authoring_flow
from test_sku_authoring import migration as authoring_migration

from nilart.contexts.catalog.infrastructure.options import SqlOptionDraftRepository
from nilart.contexts.catalog.infrastructure.repository import Base
from nilart.contexts.catalog.infrastructure.sku_authoring import (
    SKUAuthoringError,
    SqlSKUAuthoringRepository,
)
from nilart.contexts.catalog.infrastructure.sku_mappings import SqlSKUMappingRepository
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository


def migration(connection):
    spec = importlib.util.spec_from_file_location("mapping_migration", Path(__file__).parents[1] / "migrations/versions/0015_sku_option_mappings.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with Operations.context(MigrationContext.configure(connection)):
        module.upgrade()
    return module


@pytest.fixture
def mapping_flow(authoring_flow):
    client, db, actor, product, csrf = authoring_flow
    option_migration(db.connection())
    migration(db.connection())
    draft = SqlOptionDraftRepository(db).save(product, actor, 0, document())
    sku = SqlSKUAuthoringRepository(db).create(product, actor, "EXPLICIT-A")
    db.commit()
    selection = {"configuration_id": draft["configuration_id"], "configuration_version": 1, "combination_code": "EXPLICIT-A"}
    return client, db, actor, product, csrf, sku, selection


def test_mapping_exact_snapshot_shared_version_staleness_and_public_isolation(mapping_flow):
    client, db, actor, product, csrf, sku, selection = mapping_flow
    path = f"/api/v1/admin/catalog/skus/{sku['sku_id']}/options"
    assert client.get(path).status_code == 403
    admin(db, actor)
    assert client.get(path).json()["mapping"] is None
    for headers in [{}, {"X-CSRF-Token": "wrong"}, {"X-CSRF-Token": csrf, "Origin": "https://foreign.invalid"}]:
        assert client.put(path, json={"version": 1, "mapping": selection}, headers=headers).status_code == 403
    saved = client.put(path, json={"version": 1, "mapping": selection}, headers={"X-CSRF-Token": csrf})
    assert saved.status_code == 200, saved.text
    assert saved.headers["cache-control"] == "no-store"
    result = saved.json()
    assert result["version"] == 2 and result["mapping"]["current"] is True
    snapshot = result["mapping"]["snapshot"]
    assert sorted(o["title_en"] for o in snapshot["options"]) == ["Binding", "Size"]
    assert len(snapshot["combination"]["selections"]) == 2
    assert snapshot["combination"]["code"] == "EXPLICIT-A"
    audit = db.execute(text('SELECT "before","after",actor_id FROM catalog_sku_authoring_audits WHERE sku_id=:sku AND version=2'), {"sku": sku["sku_id"]}).mappings().one()
    assert audit["before"]["mapping"] is None and audit["after"] == result
    assert str(audit["actor_id"]) == actor
    assert client.put(path, json={"version": 1, "mapping": None}, headers={"X-CSRF-Token": csrf}).status_code == 409
    changed = SqlOptionDraftRepository(db).read(product)
    changed["options"][0]["title_en"] = "Updated label"
    SqlOptionDraftRepository(db).save(product, actor, 1, {k: changed[k] for k in ["options", "combinations"]})
    db.commit()
    stale = client.get(path).json()
    assert stale["mapping"]["current"] is False and stale["mapping"]["snapshot"] == snapshot
    assert client.put(path, json={"version": 2, "mapping": selection}, headers={"X-CSRF-Token": csrf}).status_code == 409
    selection["configuration_version"] = 2
    remapped = client.put(path, json={"version": 2, "mapping": selection}, headers={"X-CSRF-Token": csrf}).json()
    assert remapped["version"] == 3 and remapped["mapping"]["current"] is True
    assert remapped["mapping"]["snapshot"] != snapshot
    edit = client.put(path.removesuffix("/options"), json={"version": 3, "code": "NEW-CODE"}, headers={"X-CSRF-Token": csrf})
    assert edit.status_code == 200
    assert client.get(path).json()["mapping"]["current"] is False
    cleared = client.put(path, json={"version": 4, "mapping": None}, headers={"X-CSRF-Token": csrf}).json()
    assert cleared["version"] == 5 and cleared["mapping"] is None
    assert client.get("/api/v1/catalog/products/authoring-test/skus").json() == []
    assert client.get("/api/v1/catalog/skus/NEW-CODE").status_code == 404
    assert client.get(f"/api/v1/admin/catalog/skus/{uuid4()}/options").status_code == 404
    client.cookies.clear()
    assert client.get(path).status_code == 401


@pytest.mark.parametrize("invalid,status", [("foreign", 422), ("combination", 422), ("code", 422), ("draft_version", 409), ("sku_version", 409), ("published", 409), ("extra", 422), ("missing", 422)])
def test_invalid_mapping_is_atomic(mapping_flow, invalid, status):
    client, db, actor, product, csrf, sku, selection = mapping_flow
    admin(db, actor)
    body = {"version": 1, "mapping": dict(selection)}
    if invalid == "foreign":
        other = uuid4()
        db.execute(text("INSERT INTO catalog_products (id,slug,title_fa,title_en,published) VALUES (:id,'other','تست','Test',true)"), {"id": other})
        other_draft = SqlOptionDraftRepository(db).save(other, actor, 0, document())
        db.commit()
        body["mapping"]["configuration_id"] = other_draft["configuration_id"]
    elif invalid == "combination":
        body["mapping"]["combination_code"] = "MISSING"
    elif invalid == "code":
        db.execute(text("UPDATE catalog_skus SET code='DIFFERENT' WHERE id=:sku"), {"sku": sku["sku_id"]})
        db.commit()
    elif invalid == "draft_version":
        body["mapping"]["configuration_version"] = 2
    elif invalid == "sku_version":
        body["version"] = 0
    elif invalid == "published":
        db.execute(text("UPDATE catalog_skus SET published=true WHERE id=:sku"), {"sku": sku["sku_id"]})
        db.commit()
    elif invalid == "extra":
        body["mapping"]["price"] = 1
    else:
        del body["mapping"]
    response = client.put(f"/api/v1/admin/catalog/skus/{sku['sku_id']}/options", json=body, headers={"X-CSRF-Token": csrf})
    assert response.status_code == status, response.text
    assert db.scalar(text("SELECT count(*) FROM catalog_sku_option_mappings")) == 0
    assert db.scalar(text("SELECT count(*) FROM catalog_sku_authoring_audits")) == 1
    assert SqlSKUAuthoringRepository(db).read(sku["sku_id"])["version"] == 1


def test_mapping_audit_failure_rolls_back(mapping_flow):
    _, db, _, _, _, sku, selection = mapping_flow
    selection["configuration_id"] = db.scalar(text("SELECT id FROM catalog_option_drafts"))
    with pytest.raises(IntegrityError):
        SqlSKUMappingRepository(db).save(sku["sku_id"], uuid4(), 1, selection)
        db.commit()
    db.rollback()
    assert SqlSKUMappingRepository(db).read(sku["sku_id"])["mapping"] is None
    assert SqlSKUAuthoringRepository(db).read(sku["sku_id"])["version"] == 1


@pytest.mark.parametrize("change,status", [("permission", 403), ("rotate", 403), ("revoke", 401)])
def test_mapping_rechecks_write_access(mapping_flow, monkeypatch, change, status):
    client, db, actor, _, csrf, sku, selection = mapping_flow
    admin(db, actor)
    if change == "permission":
        original = SqlIdentityRepository.roles

        def roles(self, account_id, lock=False):
            if lock:
                self.session.execute(text("DELETE FROM identity_account_roles WHERE role='admin'"))
            return original(self, account_id, lock=lock)

        monkeypatch.setattr(SqlIdentityRepository, "roles", roles)
    else:
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
    assert client.put(f"/api/v1/admin/catalog/skus/{sku['sku_id']}/options", json={"version": 1, "mapping": selection}, headers={"X-CSRF-Token": csrf}).status_code == status
    assert db.scalar(text("SELECT count(*) FROM catalog_sku_option_mappings")) == 0


def test_concurrent_mapping_and_option_edit_and_migration_rollback():
    url = os.environ.get("NILART_TEST_DATABASE_URL")
    if not url:
        pytest.skip("isolated PostgreSQL required")
    engine = create_engine(url)
    schema = "mapping_" + uuid4().hex
    actor, product = uuid4(), uuid4()
    try:
        with engine.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))
            connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            Base.metadata.create_all(connection)
            connection.execute(text("CREATE TABLE identity_accounts (id uuid PRIMARY KEY)"))
            option_migration(connection)
            authoring_migration(connection)
            module = migration(connection)
            connection.execute(text("INSERT INTO identity_accounts VALUES (:id)"), {"id": actor})
            connection.execute(text("INSERT INTO catalog_products (id,slug,title_fa,title_en,published) VALUES (:id,'p','تست','Test',true)"), {"id": product})
            db = Session(bind=connection)
            original_doc = document()
            draft = SqlOptionDraftRepository(db).save(product, actor, 0, original_doc)
            sku = SqlSKUAuthoringRepository(db).create(product, actor, "EXPLICIT-A")
            db.flush()
        selection = {"configuration_id": draft["configuration_id"], "configuration_version": 1, "combination_code": "EXPLICIT-A"}
        # Repository API uses parsed UUIDs, like the presentation model.
        selection["configuration_id"] = UUID(selection["configuration_id"])
        barrier = Barrier(2)

        def first_mapping(_):
            with Session(engine) as session:
                session.execute(text(f'SET LOCAL search_path TO "{schema}"'))
                barrier.wait(timeout=10)
                try:
                    SqlSKUMappingRepository(session).save(sku["sku_id"], actor, 1, selection)
                    session.commit()
                    return "saved"
                except SKUAuthoringError:
                    session.rollback()
                    return "conflict"

        with ThreadPoolExecutor(max_workers=2) as pool:
            assert sorted(pool.map(first_mapping, range(2))) == ["conflict", "saved"]
        barrier = Barrier(2)

        def work(kind):
            with Session(engine) as session:
                session.execute(text(f'SET LOCAL search_path TO "{schema}"'))
                barrier.wait(timeout=10)
                try:
                    if kind == "map":
                        SqlSKUMappingRepository(session).save(sku["sku_id"], actor, 2, selection)
                    else:
                        changed = document()
                        changed["options"][0]["title_en"] = "New version"
                        SqlOptionDraftRepository(session).save(product, actor, 1, changed)
                    session.commit()
                    return "saved"
                except SKUAuthoringError as exc:
                    session.rollback()
                    return str(exc)

        with ThreadPoolExecutor(max_workers=2) as pool:
            outcomes = list(pool.map(work, ["map", "draft"]))
        assert outcomes[1] == "saved"
        assert outcomes[0] in {"saved", "option_version_conflict"}
        with engine.begin() as connection:
            connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            row = SqlSKUMappingRepository(Session(bind=connection)).read(sku["sku_id"])
            if row["mapping"]:
                assert row["mapping"]["current"] is False
                assert {o["title_en"] for o in row["mapping"]["snapshot"]["options"]} == {"Size", "Binding"}
            with Operations.context(MigrationContext.configure(connection)):
                module.downgrade()
            assert connection.scalar(text("SELECT count(*) FROM catalog_skus")) == 1
    finally:
        with engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE'))
        engine.dispose()


def test_combination_can_only_map_once_per_configuration_version(mapping_flow):
    client, db, actor, _, csrf, sku, selection = mapping_flow
    admin(db, actor)
    path = f"/api/v1/admin/catalog/skus/{sku['sku_id']}"
    assert client.put(path + "/options", json={"version": 1, "mapping": selection}, headers={"X-CSRF-Token": csrf}).status_code == 200
    assert client.put(path, json={"version": 2, "code": "RENAMED"}, headers={"X-CSRF-Token": csrf}).status_code == 200
    other = SqlSKUAuthoringRepository(db).create(sku["product_id"], actor, "EXPLICIT-A")
    db.commit()
    other_path = f"/api/v1/admin/catalog/skus/{other['sku_id']}/options"
    response = client.put(other_path, json={"version": 1, "mapping": selection}, headers={"X-CSRF-Token": csrf})
    assert response.status_code == 409
    assert client.get(other_path).json()["version"] == 1
    assert client.get(other_path).json()["mapping"] is None
    # Clearing the old association explicitly frees the combination for reassignment.
    assert client.put(path + "/options", json={"version": 3, "mapping": None}, headers={"X-CSRF-Token": csrf}).status_code == 200
    assert client.put(other_path, json={"version": 1, "mapping": selection}, headers={"X-CSRF-Token": csrf}).status_code == 200
