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

from nilart.contexts.catalog.domain.authoring import CatalogAuthoringError, EntryContent, EntryKind
from nilart.contexts.catalog.infrastructure.authoring import SqlCatalogAuthoringRepository
from nilart.contexts.catalog.infrastructure.repository import Base
from nilart.contexts.catalog.presentation.authoring import EntryCreate, PublicationInput
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.shared.outbox import consume_event, metadata


def migration(connection, filename="0021_catalog_management.py"):
    path = Path(__file__).parents[1] / "migrations/versions" / filename
    spec = importlib.util.spec_from_file_location(filename, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with Operations.context(MigrationContext.configure(connection)):
        module.upgrade()
    return module


def body(slug="draft-entry", **extra):
    return {"id": str(uuid4()), "slug": slug, "title_fa": "رکورد آزمایش",
            "title_en": "Test entry", "description_fa": "شرح", "description_en": "Description",
            "reason": "Explicit test creation", **extra}


@pytest.fixture
def management_flow(flow):
    client, db, sms = flow
    Base.metadata.create_all(db.connection())
    migration(db.connection())
    migration(db.connection(), "0014_sku_authoring.py")
    _, login = register(client, sms)
    actor = login.json()["account_id"]
    admin(db, actor)
    return client, db, actor, {"X-CSRF-Token": login.json()["csrf_token"]}


@pytest.mark.parametrize("change", [
    {"slug": "Invalid Slug"}, {"slug": "../bad"}, {"title_fa": " "},
    {"title_en": "A\nB"}, {"description_en": "bad\x00"}, {"reason": " "},
    {"published": True}, {"version": 1}, {"price": None},
])
def test_invalid_creation(change):
    with pytest.raises(ValidationError):
        EntryCreate.model_validate(body(**change))


def test_publication_is_explicit_and_validated():
    for change in [{"published": "true"}, {"version": True}, {"reason": ""}, {"slug": "x"}]:
        with pytest.raises(ValidationError):
            PublicationInput.model_validate({"version": 1, "published": True, "reason": "Publish", **change})


@pytest.mark.parametrize("kind", ["collections", "categories", "products"])
def test_draft_edit_publish_unpublish_audits_and_public_isolation(management_flow, kind):
    client, db, actor, headers = management_flow
    path = f"/api/v1/admin/catalog/entries/{kind}"
    content = body()
    response = client.post(path, json=content, headers=headers)
    assert response.status_code == 201, response.text
    record = response.json()
    assert record["version"] == 1 and not record["published"] and record["kind"] == kind
    assert response.headers["cache-control"] == "no-store"
    assert client.get(f"/api/v1/catalog/{kind}/draft-entry").status_code == 404
    assert client.get(path, params={"status": "draft"}).json()["total"] == 1
    assert client.get(path, params={"status": "published"}).json()["total"] == 0
    assert client.get(path, params={"q": "Test entry"}).json()["total"] == 1
    assert client.get(path, params={"q": "%"}).json()["total"] == 0
    detail = f"{path}/{record['id']}"
    update = {key: value for key, value in content.items() if key != "id"}
    update.update(version=1, title_en="Edited entry", reason="Edit content")
    edited = client.put(detail, json=update, headers=headers)
    assert edited.status_code == 200, edited.text
    assert edited.json()["version"] == 2
    assert client.put(detail, json=update, headers=headers).status_code == 409
    publish = {"version": 2, "published": True, "reason": "Publish reviewed text"}
    published = client.post(detail+"/publication", json=publish, headers=headers)
    assert published.status_code == 200, published.text
    assert client.get(f"/api/v1/catalog/{kind}/draft-entry").json()["title_en"] == "Edited entry"
    assert client.put(detail, json={**update, "version": 3, "slug": "changed"}, headers=headers).json()["code"] == "published_slug_immutable"
    assert client.post(detail+"/publication", json={**publish, "version": 3}, headers=headers).status_code == 409
    assert client.post(detail+"/publication", json={"version": 3, "published": False, "reason": "Remove public visibility"}, headers=headers).status_code == 200
    assert client.get(f"/api/v1/catalog/{kind}/draft-entry").status_code == 404
    audits = client.get(detail+"/audits", params={"limit": 2}).json()
    assert [audit["action"] for audit in audits["items"]] == ["unpublished", "published"]
    assert audits["next_before_version"] == 3
    older = client.get(detail+"/audits", params={"before_version": 3}).json()["items"]
    assert [audit["action"] for audit in older] == ["edited", "created"]
    assert older[-1]["before"] is None and older[-1]["actor_id"] == actor
    events = db.execute(text("SELECT * FROM outbox_events WHERE event_type='catalog.entry_changed'")).mappings().all()
    assert len(events) == 4
    event = events[0]
    envelope = {"id": str(event["id"]), "event_type": event["event_type"], "payload": event["payload"]}
    assert consume_event(db, envelope) is True
    assert consume_event(db, envelope) is False
    db.commit()


def test_membership_validation_and_draft_dependencies(management_flow):
    client, db, _, headers = management_flow
    root = "/api/v1/admin/catalog/entries/"
    collection = client.post(root+"collections", json=body("collection"), headers=headers).json()
    category = client.post(root+"categories", json=body("category"), headers=headers).json()
    product = body("product", collection_ids=[collection["id"]], category_ids=[category["id"]])
    result = client.post(root+"products", json=product, headers=headers)
    assert result.status_code == 201, result.text
    assert result.json()["collection_ids"] == [collection["id"]]
    detail = root+f"products/{product['id']}"
    publication = {"version": 1, "published": True, "reason": "Review publication"}
    assert client.post(detail+"/publication", json=publication, headers=headers).json()["code"] == "catalog_dependency_unpublished"
    for kind, value in [("collections", collection), ("categories", category)]:
        assert client.post(root+f"{kind}/{value['id']}/publication", json=publication, headers=headers).status_code == 200
    assert client.post(detail+"/publication", json=publication, headers=headers).status_code == 200
    assert client.get("/api/v1/catalog/products/product").json()["collection_ids"] == [collection["id"]]
    # Unpublishing a collection hides its public association, without deleting history or product.
    assert client.post(root+f"collections/{collection['id']}/publication", json={"version": 2, "published": False, "reason": "Hide collection"}, headers=headers).status_code == 200
    assert client.get("/api/v1/catalog/products/product").json()["collection_ids"] == []
    assert client.get(detail).json()["collection_ids"] == [collection["id"]]
    assert client.post(root+"products", json=body("foreign", collection_ids=[str(uuid4())]), headers=headers).status_code == 422
    assert client.post(root+"categories", json=body("bad", collection_ids=[collection["id"]]), headers=headers).status_code == 422
    repeated = [category["id"], category["id"]]
    assert client.post(root+"products", json=body("duplicate", category_ids=repeated), headers=headers).status_code == 422
    assert db.scalar(text("SELECT count(*) FROM catalog_products")) == 1


def test_permission_origin_csrf_conflicts_and_private_skus(management_flow):
    client, db, actor, headers = management_flow
    path = "/api/v1/admin/catalog/entries/products"
    content = body()
    for invalid in [{}, {"X-CSRF-Token": "wrong"}, {**headers, "Origin": "https://foreign.invalid"}]:
        assert client.post(path, json=content, headers=invalid).status_code == 403
    created = client.post(path, json=content, headers=headers).json()
    assert client.post(path, json=body(), headers=headers).status_code == 409
    assert client.post(path, json=content, headers=headers).status_code == 409
    detail = f"{path}/{created['id']}"
    sku = client.post(f"/api/v1/admin/catalog/products/{created['id']}/skus", json={"code": "PRIVATE-TEST"}, headers=headers)
    assert sku.status_code == 201, sku.text
    private = client.get(detail+"/skus").json()
    assert len(private) == 1 and not private[0]["published"] and private[0]["price"] is None
    assert client.get("/api/v1/catalog/skus/PRIVATE-TEST").status_code == 404
    assert client.get(path+f"/{uuid4()}").status_code == 404
    assert client.get(path, params={"status": "unknown"}).status_code == 422
    db.execute(text("DELETE FROM identity_account_roles WHERE account_id=:id AND role='admin'"), {"id": actor})
    db.commit()
    for suffix in ["", f"/{created['id']}", f"/{created['id']}/audits", f"/{created['id']}/skus"]:
        assert client.get(path+suffix).status_code == 403
    assert client.post(path, json=body("forbidden"), headers=headers).status_code == 403
    client.cookies.clear()
    assert client.get(path).status_code == 401


@pytest.mark.parametrize("operation", ["create", "edit", "publish"])
def test_audit_failure_rolls_back_content_version_and_outbox(management_flow, operation):
    _, db, actor, _ = management_flow
    repository = SqlCatalogAuthoringRepository(db)
    id_ = uuid4()
    content = EntryContent("rollback-test", "آزمایش", "Test")
    before = repository.create(EntryKind.PRODUCTS, id_, actor, content, "Create")
    db.commit()
    with pytest.raises(Exception):
        if operation == "create":
            repository.create(EntryKind.PRODUCTS, uuid4(), uuid4(), EntryContent("failed", "آزمایش", "Test"), "Create")
        elif operation == "edit":
            repository.update(EntryKind.PRODUCTS, id_, uuid4(), 1, EntryContent("rollback-test", "آزمایش", "Changed"), "Edit")
        else:
            repository.publish(EntryKind.PRODUCTS, id_, uuid4(), 1, True, "Publish")
        db.commit()
    db.rollback()
    assert repository.read(EntryKind.PRODUCTS, id_) == before
    assert db.scalar(text("SELECT count(*) FROM catalog_products")) == 1
    assert db.scalar(text("SELECT count(*) FROM catalog_entry_audits")) == 1
    assert db.scalar(text("SELECT count(*) FROM outbox_events WHERE event_type='catalog.entry_changed'")) == 1


def test_write_rechecks_permission_inside_transaction(management_flow, monkeypatch):
    client, db, _, headers = management_flow
    original = SqlIdentityRepository.roles

    def revoke(self, account_id, lock=False):
        if lock:
            self.session.execute(text("DELETE FROM identity_account_roles WHERE role='admin'"))
        return original(self, account_id, lock=lock)

    monkeypatch.setattr(SqlIdentityRepository, "roles", revoke)
    assert client.post("/api/v1/admin/catalog/entries/products", json=body(), headers=headers).status_code == 403
    assert db.scalar(text("SELECT count(*) FROM catalog_products")) == 0
    assert db.scalar(text("SELECT count(*) FROM catalog_entry_audits")) == 0


def test_concurrent_edits_publication_and_migration_rollback():
    url = os.environ.get("NILART_TEST_DATABASE_URL")
    if not url:
        pytest.skip("isolated PostgreSQL required")
    engine = create_engine(url)
    schema = "catalog_authoring_"+uuid4().hex
    actor, id_ = uuid4(), uuid4()
    try:
        with engine.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))
            connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            Base.metadata.create_all(connection)
            metadata.create_all(connection)
            connection.execute(text("CREATE TABLE identity_accounts (id uuid PRIMARY KEY)"))
            module = migration(connection)
            connection.execute(text("INSERT INTO identity_accounts VALUES (:id)"), {"id": actor})
            with Session(bind=connection) as db:
                SqlCatalogAuthoringRepository(db).create(EntryKind.PRODUCTS, id_, actor,
                    EntryContent("concurrent", "آزمایش", "Test"), "Create")
                db.flush()
        for publishing in (False, True):
            barrier = Barrier(2)

            def write(index):
                with Session(engine) as db:
                    db.execute(text(f'SET LOCAL search_path TO "{schema}"'))
                    barrier.wait(timeout=10)
                    repo = SqlCatalogAuthoringRepository(db)
                    try:
                        if publishing:
                            repo.publish(EntryKind.PRODUCTS, id_, actor, 2, True, "Publish")
                        else:
                            repo.update(EntryKind.PRODUCTS, id_, actor, 1, EntryContent("concurrent", "آزمایش", f"Edit {index}"), "Edit")
                        db.commit()
                        return "saved"
                    except CatalogAuthoringError:
                        db.rollback()
                        return "conflict"

            with ThreadPoolExecutor(max_workers=2) as pool:
                assert sorted(pool.map(write, range(2))) == ["conflict", "saved"]
        with engine.begin() as connection:
            connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            assert connection.scalar(text("SELECT count(*) FROM catalog_entry_audits")) == 3
            assert connection.scalar(text("SELECT count(*) FROM outbox_events")) == 3
            with Operations.context(MigrationContext.configure(connection)):
                module.downgrade()
            assert connection.scalar(text("SELECT count(*) FROM catalog_products")) == 1
    finally:
        with engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE'))
        engine.dispose()

@pytest.mark.parametrize("operation", ["create", "edit", "publish"])
@pytest.mark.parametrize("change,status", [("rotate", 403), ("revoke", 401)])
def test_mutations_recheck_session_and_csrf(management_flow, monkeypatch, operation, change, status):
    client, db, _, headers = management_flow
    root = "/api/v1/admin/catalog/entries/products"
    content = body()
    record = client.post(root, json=content, headers=headers).json()
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
    detail = root+f"/{record['id']}"
    if operation == "create":
        response = client.post(root, json=body("blocked"), headers=headers)
    elif operation == "edit":
        response = client.put(detail, json={**{key:value for key,value in content.items() if key != "id"}, "version": 1, "title_en": "Blocked edit"}, headers=headers)
    else:
        response = client.post(detail+"/publication", json={"version": 1, "published": True, "reason": "Blocked publish"}, headers=headers)
    assert response.status_code == status
    assert db.scalar(text("SELECT count(*) FROM catalog_products")) == 1
    assert db.scalar(text("SELECT count(*) FROM catalog_entry_audits")) == 1
    assert db.scalar(text("SELECT count(*) FROM outbox_events WHERE event_type='catalog.entry_changed'")) == 1
    current = SqlCatalogAuthoringRepository(db).read(EntryKind.PRODUCTS, record["id"])
    assert current["version"] == 1 and not current["published"] and current["title_en"] == "Test entry"


def test_outbox_failure_rolls_back_catalog_and_audit(management_flow, monkeypatch):
    _, db, actor, _ = management_flow
    def fail(*args, **kwargs):
        raise RuntimeError("forced outbox failure")
    monkeypatch.setattr("nilart.contexts.catalog.infrastructure.authoring.enqueue", fail)
    with pytest.raises(RuntimeError, match="outbox"):
        SqlCatalogAuthoringRepository(db).create(EntryKind.PRODUCTS, uuid4(), actor, EntryContent("failed", "آزمایش", "Test"), "Create")
    db.rollback()
    assert db.scalar(text("SELECT count(*) FROM catalog_products")) == 0
    assert db.scalar(text("SELECT count(*) FROM catalog_entry_versions")) == 0
    assert db.scalar(text("SELECT count(*) FROM catalog_entry_audits")) == 0
    assert db.scalar(text("SELECT count(*) FROM outbox_events WHERE event_type='catalog.entry_changed'")) == 0
