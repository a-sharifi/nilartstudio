import importlib.util
import os
from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
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

from nilart.contexts.catalog.infrastructure.prices import PriceError, SqlSKUPriceRepository
from nilart.contexts.catalog.infrastructure.repository import Base
from nilart.contexts.catalog.presentation.prices import PriceUpdate
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository


def migration(connection):
    path = Path(__file__).parents[1] / "migrations/versions/0013_sku_prices.py"
    spec = importlib.util.spec_from_file_location("price_migration", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with Operations.context(MigrationContext.configure(connection)):
        module.upgrade()
    return module


def insert_catalog(db, product, sku):
    db.execute(text("INSERT INTO catalog_products (id,slug,title_fa,title_en,published) "
        "VALUES (:id,'price-test','تست','Test',true)"), {"id": product})
    db.execute(text("INSERT INTO catalog_skus (id,product_id,code,published) "
        "VALUES (:id,:product,'PRICE-TEST',true)"), {"id": sku, "product": product})


@pytest.fixture
def price_flow(flow):
    client, db, sms = flow
    Base.metadata.create_all(db.connection())
    migration(db.connection())
    _, login = register(client, sms)
    actor = login.json()["account_id"]
    product, sku = uuid4(), uuid4()
    insert_catalog(db, product, sku)
    db.commit()
    return client, db, actor, product, sku, login.json()["csrf_token"]


@pytest.mark.parametrize("amount", [1, "-1", "NaN", "Infinity", "1e3", "01", "1.1234567", "1000000000000000000"])
def test_reject_imprecise_price(amount):
    with pytest.raises(ValidationError):
        PriceUpdate(version=0, price={"amount": amount, "currency": "IRT"})


def test_price_requires_explicit_null_or_money_and_rejects_extra_fields():
    for body in [{"version": 0}, {"version": True, "price": None},
                 {"version": 0, "price": None, "published": True},
                 {"version": 0, "price": {"amount": "1", "currency": "USD"}}]:
        with pytest.raises(ValidationError):
            PriceUpdate.model_validate(body)
    assert PriceUpdate(version=0, price=None).price is None


def test_price_api_auth_exact_money_versions_audit_and_public_reads(price_flow):
    client, db, actor, product, sku, csrf = price_flow
    path = f"/api/v1/admin/catalog/skus/{sku}/price"
    body = {"version": 0, "price": {"amount": "123456789012345678.123456", "currency": "IRT"}}
    assert client.get(path).status_code == 403
    assert client.put(path, json=body).status_code == 403
    admin(db, actor)
    assert client.get(path).json()["price"] is None
    assert client.get(path).json()["version"] == 0
    assert client.put(path, json=body).status_code == 403
    assert client.put(path, json=body, headers={"Origin": "https://foreign.invalid", "X-CSRF-Token": csrf}).status_code == 403
    assert client.put(path, json=body, headers={"X-CSRF-Token": "wrong"}).status_code == 403
    saved = client.put(path, json=body, headers={"X-CSRF-Token": csrf})
    assert saved.status_code == 200, saved.text
    assert saved.json()["price"] == body["price"]
    assert saved.json()["version"] == 1
    assert saved.headers["cache-control"] == "no-store"
    assert client.put(path, json=body, headers={"X-CSRF-Token": csrf}).status_code == 409
    assert client.get("/api/v1/catalog/skus/PRICE-TEST").json()["price"] == body["price"]
    audit = db.execute(text('SELECT * FROM catalog_sku_price_audits')).mappings().one()
    assert str(audit["actor_id"]) == actor and audit["product_id"] == product
    assert audit["before"] == {"price": None} and audit["after"] == {"price": body["price"]}
    assert audit["created_at"] is not None
    assert client.put(path, json={"version": 1, "price": None}, headers={"X-CSRF-Token": csrf}).json()["version"] == 2
    assert client.get("/api/v1/catalog/skus/PRICE-TEST").json()["price"] is None
    assert db.scalar(text("SELECT count(*) FROM catalog_sku_price_audits")) == 2
    assert client.get(f"/api/v1/admin/catalog/skus/{uuid4()}/price").status_code == 404
    client.cookies.clear()
    assert client.get(path).status_code == 401


def test_revoked_permission_prevents_price_and_audit(price_flow, monkeypatch):
    client, db, actor, _, sku, csrf = price_flow
    admin(db, actor)
    original = SqlIdentityRepository.roles

    def roles(self, account_id, *, lock=False):
        result = original(self, account_id, lock=lock)
        if not lock:
            self.session.execute(text("DELETE FROM identity_account_roles WHERE role='admin'"))
        return result

    monkeypatch.setattr(SqlIdentityRepository, "roles", roles)
    response = client.put(f"/api/v1/admin/catalog/skus/{sku}/price", json={"version": 0, "price": None}, headers={"X-CSRF-Token": csrf})
    assert response.status_code == 403
    assert db.scalar(text("SELECT count(*) FROM catalog_sku_price_audits")) == 0
    assert SqlSKUPriceRepository(db).read(sku)["version"] == 0


def test_audit_failure_rolls_back_price_and_version(price_flow):
    _, db, _, _, sku, _ = price_flow
    with pytest.raises(Exception):
        SqlSKUPriceRepository(db).save(sku, uuid4(), 0, {"amount": Decimal("12.123456"), "currency": "IRR"})
        db.commit()
    db.rollback()
    assert SqlSKUPriceRepository(db).read(sku)["version"] == 0
    assert SqlSKUPriceRepository(db).read(sku)["price"] is None


def test_concurrent_price_updates_one_winner_and_migration_rollback():
    url = os.environ.get("NILART_TEST_DATABASE_URL")
    if not url:
        pytest.skip("isolated PostgreSQL required")
    engine = create_engine(url)
    schema = "prices_test_" + uuid4().hex
    actor, product, sku = uuid4(), uuid4(), uuid4()
    try:
        with engine.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))
            connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            Base.metadata.create_all(connection)
            connection.execute(text("CREATE TABLE identity_accounts (id uuid PRIMARY KEY)"))
            module = migration(connection)
            connection.execute(text("INSERT INTO identity_accounts VALUES (:id)"), {"id": actor})
            insert_catalog(connection, product, sku)
        barrier = Barrier(2)

        def save(index):
            with Session(engine) as db:
                db.execute(text(f'SET LOCAL search_path TO "{schema}"'))
                barrier.wait(timeout=10)
                try:
                    SqlSKUPriceRepository(db).save(sku, actor, 0, {"amount": Decimal(index + 1), "currency": "IRT"})
                    db.commit()
                    return "saved"
                except PriceError:
                    db.rollback()
                    return "conflict"

        with ThreadPoolExecutor(max_workers=2) as workers:
            assert sorted(workers.map(save, range(2))) == ["conflict", "saved"]
        with engine.begin() as connection:
            connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            assert connection.scalar(text("SELECT count(*) FROM catalog_sku_price_audits")) == 1
            assert connection.scalar(text("SELECT version FROM catalog_sku_price_versions")) == 1
            with Operations.context(MigrationContext.configure(connection)):
                module.downgrade()
            assert connection.scalar(text("SELECT count(*) FROM catalog_skus")) == 1
    finally:
        with engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE'))
        engine.dispose()


@pytest.mark.parametrize("change,status", [("rotate", 403), ("revoke", 401)])
def test_write_rechecks_session_and_fresh_csrf(price_flow, monkeypatch, change, status):
    client, db, actor, _, sku, csrf = price_flow
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
    response = client.put(f"/api/v1/admin/catalog/skus/{sku}/price", json={"version": 0, "price": None}, headers={"X-CSRF-Token": csrf})
    assert response.status_code == status
    assert db.scalar(text("SELECT count(*) FROM catalog_sku_price_audits")) == 0
    assert SqlSKUPriceRepository(db).read(sku)["version"] == 0
