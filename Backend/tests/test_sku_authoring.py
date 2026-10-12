import importlib.util
import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Barrier
from uuid import uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from pydantic import ValidationError
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from test_catalog_options import admin
from test_identity_otp_postgres import flow as flow
from test_identity_otp_postgres import register

from nilart.contexts.catalog.infrastructure.repository import Base
from nilart.contexts.catalog.infrastructure.sku_authoring import (
    SKUAuthoringError,
    SqlSKUAuthoringRepository,
)
from nilart.contexts.catalog.presentation.sku_authoring import SKUCreate, SKUUpdate
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository


def migration(connection):
    spec = importlib.util.spec_from_file_location("authoring_migration", Path(__file__).parents[1] / "migrations/versions/0014_sku_authoring.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with Operations.context(MigrationContext.configure(connection)):
        module.upgrade()
    return module


@pytest.fixture
def authoring_flow(flow):
    client, db, sms = flow
    Base.metadata.create_all(db.connection())
    migration(db.connection())
    _, login = register(client, sms)
    actor = login.json()["account_id"]
    product = uuid4()
    db.execute(text("INSERT INTO catalog_products (id,slug,title_fa,title_en,published) "
                    "VALUES (:id,'authoring-test','تست','Test',true)"), {"id": product})
    db.commit()
    return client, db, actor, product, login.json()["csrf_token"]


@pytest.mark.parametrize("code", ["", " ", " A", "A ", "A\nB", 12, "A" * 161])
def test_invalid_code(code):
    with pytest.raises(ValidationError):
        SKUCreate(code=code)


def test_creation_forbids_publication_price_and_invalid_version():
    for body in [{"code": "A", "published": True}, {"code": "A", "price": None}]:
        with pytest.raises(ValidationError):
            SKUCreate.model_validate(body)
    for version in [True, -1, 2147483647]:
        with pytest.raises(ValidationError):
            SKUUpdate(code="A", version=version)


def test_private_creation_edit_conflicts_audit_and_public_isolation(authoring_flow):
    client, db, actor, product, csrf = authoring_flow
    path = f"/api/v1/admin/catalog/products/{product}/skus"
    body = {"code": "EXPLICIT-A"}
    assert client.post(path, json=body).status_code == 403
    admin(db, actor)
    for headers in [{}, {"X-CSRF-Token": "wrong"}, {"X-CSRF-Token": csrf, "Origin": "https://foreign.invalid"}]:
        assert client.post(path, json=body, headers=headers).status_code == 403
    response = client.post(path, json=body, headers={"X-CSRF-Token": csrf})
    assert response.status_code == 201, response.text
    result = response.json()
    assert result["version"] == 1 and result["published"] is False
    assert response.headers["cache-control"] == "no-store"
    sku = result["sku_id"]
    detail = f"/api/v1/admin/catalog/skus/{sku}"
    assert client.get(detail).json() == result
    assert client.post(path, json=body, headers={"X-CSRF-Token": csrf}).status_code == 409
    missing = f"/api/v1/admin/catalog/products/{uuid4()}/skus"
    assert client.post(missing, json=body, headers={"X-CSRF-Token": csrf}).status_code == 404
    assert client.put(detail, json={"version": 0, "code": "B"}, headers={"X-CSRF-Token": csrf}).status_code == 409
    updated = client.put(detail, json={"version": 1, "code": "EXPLICIT-B"}, headers={"X-CSRF-Token": csrf})
    assert updated.json()["version"] == 2
    second = client.post(path, json={"code": "EXPLICIT-C"}, headers={"X-CSRF-Token": csrf}).json()
    assert client.put(detail, json={"version": 2, "code": "EXPLICIT-C"}, headers={"X-CSRF-Token": csrf}).status_code == 409
    assert client.get(detail).json() == updated.json()
    audits = db.execute(text('SELECT * FROM catalog_sku_authoring_audits WHERE sku_id=:sku ORDER BY version'), {"sku": sku}).mappings().all()
    assert len(audits) == 2 and audits[0]["before"] is None
    assert audits[0]["after"] == result and audits[1]["after"] == updated.json()
    assert str(audits[0]["actor_id"]) == actor and audits[0]["created_at"]
    assert client.get("/api/v1/catalog/products/authoring-test/skus").json() == []
    assert client.get("/api/v1/catalog/skus/EXPLICIT-B").status_code == 404
    assert db.scalar(text("SELECT count(*) FROM catalog_skus WHERE price_amount IS NOT NULL")) == 0
    db.execute(text("UPDATE catalog_skus SET published=true WHERE id=:id"), {"id": second["sku_id"]})
    db.commit()
    assert client.put(f"/api/v1/admin/catalog/skus/{second['sku_id']}", json={"version": 1, "code": "CHANGE"}, headers={"X-CSRF-Token": csrf}).status_code == 409
    assert client.get(f"/api/v1/admin/catalog/skus/{uuid4()}").status_code == 404
    client.cookies.clear()
    assert client.post(path, json=body).status_code == 401
    assert client.get(detail).status_code == 401


def test_audit_failure_rolls_back_creation(authoring_flow):
    _, db, _, product, _ = authoring_flow
    with pytest.raises(Exception):
        SqlSKUAuthoringRepository(db).create(product, uuid4(), "ROLLBACK")
        db.commit()
    db.rollback()
    assert db.scalar(text("SELECT count(*) FROM catalog_skus")) == 0
    assert db.scalar(text("SELECT count(*) FROM catalog_sku_authoring_versions")) == 0
    assert db.scalar(text("SELECT count(*) FROM catalog_sku_authoring_audits")) == 0
    sku = SqlSKUAuthoringRepository(db).create(product, authoring_flow[2], "ORIGINAL")
    db.commit()
    with pytest.raises(Exception):
        SqlSKUAuthoringRepository(db).update(sku["sku_id"], uuid4(), 1, "FAILED-EDIT")
        db.commit()
    db.rollback()
    assert SqlSKUAuthoringRepository(db).read(sku["sku_id"]) == sku
    assert db.scalar(text("SELECT count(*) FROM catalog_sku_authoring_audits")) == 1


def test_write_rechecks_permission(authoring_flow, monkeypatch):
    client, db, actor, product, csrf = authoring_flow
    admin(db, actor)
    original = SqlIdentityRepository.roles

    def revoke(self, account_id, lock=False):
        if lock:
            self.session.execute(text("DELETE FROM identity_account_roles WHERE role='admin'"))
        return original(self, account_id, lock=lock)

    monkeypatch.setattr(SqlIdentityRepository, "roles", revoke)
    assert client.post(f"/api/v1/admin/catalog/products/{product}/skus", json={"code": "BLOCKED"}, headers={"X-CSRF-Token": csrf}).status_code == 403
    assert db.scalar(text("SELECT count(*) FROM catalog_skus")) == 0


def test_concurrent_creation_and_stale_edits_and_migration_rollback():
    url = os.environ.get("NILART_TEST_DATABASE_URL")
    if not url:
        pytest.skip("isolated PostgreSQL required")
    engine = create_engine(url)
    schema = "sku_authoring_" + uuid4().hex
    actor, product = uuid4(), uuid4()
    try:
        with engine.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))
            connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            Base.metadata.create_all(connection)
            connection.execute(text("CREATE TABLE identity_accounts (id uuid PRIMARY KEY)"))
            module = migration(connection)
            connection.execute(text("INSERT INTO identity_accounts VALUES (:id)"), {"id": actor})
            connection.execute(text("INSERT INTO catalog_products (id,slug,title_fa,title_en,published) VALUES (:id,'p','تست','Test',true)"), {"id": product})
        barrier = Barrier(2)

        def create(_):
            with Session(engine) as db:
                db.execute(text(f'SET LOCAL search_path TO "{schema}"'))
                barrier.wait(timeout=10)
                try:
                    result = SqlSKUAuthoringRepository(db).create(product, actor, "SAME")
                    db.commit()
                    return result["sku_id"]
                except SKUAuthoringError:
                    db.rollback()
                    return None

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(create, range(2)))
        assert sum(r is not None for r in results) == 1
        sku = next(r for r in results if r is not None)
        barrier = Barrier(2)

        def edit(index):
            with Session(engine) as db:
                db.execute(text(f'SET LOCAL search_path TO "{schema}"'))
                barrier.wait(timeout=10)
                try:
                    SqlSKUAuthoringRepository(db).update(sku, actor, 1, f"EDIT-{index}")
                    db.commit()
                    return "saved"
                except SKUAuthoringError:
                    db.rollback()
                    return "conflict"

        with ThreadPoolExecutor(max_workers=2) as pool:
            assert sorted(pool.map(edit, range(2))) == ["conflict", "saved"]
        with engine.begin() as connection:
            connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            assert connection.scalar(text("SELECT count(*) FROM catalog_sku_authoring_audits")) == 2
            assert connection.scalar(text("SELECT version FROM catalog_sku_authoring_versions")) == 2
            with Operations.context(MigrationContext.configure(connection)):
                module.downgrade()
            assert connection.scalar(text("SELECT count(*) FROM catalog_skus")) == 1
    finally:
        with engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE'))
        engine.dispose()


@pytest.mark.parametrize("operation", ["create", "edit"])
@pytest.mark.parametrize("change,status", [("rotate", 403), ("revoke", 401)])
def test_write_rechecks_session_and_csrf(authoring_flow, monkeypatch, operation, change, status):
    client, db, actor, product, csrf = authoring_flow
    admin(db, actor)
    sku = SqlSKUAuthoringRepository(db).create(product, actor, "BEFORE")
    db.commit()
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
    if operation == "create":
        response = client.post(f"/api/v1/admin/catalog/products/{product}/skus", json={"code": "BLOCKED"}, headers={"X-CSRF-Token": csrf})
    else:
        response = client.put(f"/api/v1/admin/catalog/skus/{sku['sku_id']}", json={"version": 1, "code": "BLOCKED"}, headers={"X-CSRF-Token": csrf})
    assert response.status_code == status
    assert db.scalar(text("SELECT count(*) FROM catalog_skus")) == 1
    assert db.scalar(text("SELECT count(*) FROM catalog_sku_authoring_audits")) == 1
    assert SqlSKUAuthoringRepository(db).read(sku["sku_id"])["code"] == "BEFORE"
