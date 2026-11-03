import importlib.util
from contextlib import contextmanager
from pathlib import Path
from uuid import uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import text
from test_identity_otp_postgres import flow as flow
from test_media_library_postgres import image, metadata
from test_media_library_postgres import prepare as prepare_media

from nilart.contexts.mockups import service

BASE = "/api/v1/admin/mockups"


def prepare(flow, monkeypatch, staff=True):
    client, db, sku = prepare_media(flow, staff)
    for file in ["0053_catalog_profiles.py", "0062_product_mockups.py"]:
        path = Path(__file__).parents[1] / "migrations/versions" / file
        spec = importlib.util.spec_from_file_location(file, path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with Operations.context(MigrationContext.configure(db.connection())):
            module.upgrade()
    product = db.scalar(text("SELECT product_id FROM catalog_skus WHERE id=:id"), dict(id=sku))
    db.execute(text("UPDATE catalog_skus SET published=true"))
    db.execute(text("UPDATE catalog_products SET published=true"))
    db.commit()

    @contextmanager
    def borrowed(_):
        yield db

    monkeypatch.setattr(service, "Session", borrowed)
    return client, db, product, sku


def source(client, color="red"):
    aid, rid = uuid4(), uuid4()
    r = client.put(
        f"/api/v1/admin/media/{aid}/versions/{rid}",
        json=dict(
            expected_version=0,
            action="draft",
            purpose="mockup_source",
            metadata=metadata(),
            file_name="source.png",
            content_base64=image(color),
            reason="Owner-supplied original image",
        ),
    )
    assert r.status_code == 200, r.text
    return dict(asset_id=str(aid), revision_id=str(rid))


def inputs(client, product, sku):
    ref = source(client)
    templates = {}
    for view in ["front", "back"]:
        id = uuid4()
        content = dict(
            title_fa="قالب واقعی",
            title_en="Real photo template",
            notebook_type="sketchbook",
            binding="top",
            view=view,
            photo=ref,
            quads=[dict(points=[[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]])],
            active=True,
        )
        r = client.put(
            f"{BASE}/templates/{id}/commands/{uuid4()}",
            json=dict(expected_version=0, content=content, reason="Reviewed real photo template"),
        )
        assert r.status_code == 200, r.text
        templates[view] = str(id)
    return dict(
        expected_version=0,
        spec=dict(
            design="gorbe",
            title_fa="گربه",
            title_en="Cats",
            group="collection",
            notebook_type="sketchbook",
            size="A5",
            paper="kraft-coffee-100gsm",
            sheets=40,
            binding="top",
        ),
        sources=dict(front=ref, back_art=ref),
        templates=templates,
        target=dict(product_id=str(product), sku_id=str(sku)),
        attach_to="sku",
        reason="Owner requested image previews",
    )


def generate(client, db, body):
    key = uuid4()
    r = client.put(f"{BASE}/runs/{key}", json=body)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "queued"
    assert service.process_run(None, key)
    return key, client.get(f"{BASE}/runs/{key}").json()


def publish(client, item, version=1, action="publish", key=None, **extra):
    return client.put(
        f"{BASE}/sets/{item['set_id']}/commands/{key or uuid4()}",
        json=dict(
            expected_version=version,
            action=action,
            run_id=item["id"],
            reason="Reviewed original artwork and real photo",
            **extra,
        ),
    )


def test_private_sources_draft_isolation_exact_retry_publication_and_withdrawal(flow, monkeypatch):
    client, db, product, sku = prepare(flow, monkeypatch)
    original = db.execute(text("SELECT * FROM catalog_skus")).mappings().all()
    body = inputs(client, product, sku)
    key, item = generate(client, db, body)
    assert item["status"] == "ready" and len(item["outputs"]) == 4
    repeated = client.put(f"{BASE}/runs/{key}", json=body)
    assert repeated.status_code == 200, repeated.text
    assert repeated.json()["id"] == str(key)
    assert db.scalar(text("SELECT count(*) FROM mockup_runs")) == 1
    assert client.get("/api/v1/catalog/image-sets").json()["items"] == []
    ref = body["sources"]["front"]
    assert client.get(f"/api/v1/media/{ref['asset_id']}/content").status_code == 404
    command_id = uuid4()
    published = publish(client, item, key=command_id)
    assert published.status_code == 200, published.text
    assert publish(client, item, key=command_id).json() == published.json()
    public = client.get("/api/v1/catalog/image-sets?size=A5").json()["items"]
    assert len(public) == 1 and public[0]["spec"]["binding"] == "top"
    assert len(public[0]["images"]) == 2 and public[0]["preview_only"] is False
    assert client.get(public[0]["images"][0]["url"]).status_code == 200
    profile = client.get(f"/api/v1/catalog/profiles/skus/{sku}").json()
    assert len(profile["gallery"]) == 2 and profile["delivery"] is None
    assert publish(client, item, version=2, action="unpublish").status_code == 200
    assert client.get("/api/v1/catalog/image-sets").json()["items"] == []
    assert client.get(public[0]["images"][0]["url"]).status_code == 404
    assert db.execute(text("SELECT * FROM catalog_skus")).mappings().all() == original


def test_binding_validation_target_identity_and_source_purpose_guards(flow, monkeypatch):
    client, db, product, sku = prepare(flow, monkeypatch)
    body = inputs(client, product, sku)
    wrong = {**body, "spec": {**body["spec"], "binding": "side"}}
    assert client.put(f"{BASE}/runs/{uuid4()}", json=wrong).status_code == 422
    wrong = {**body, "target": {**body["target"], "product_id": str(uuid4())}}
    assert client.put(f"{BASE}/runs/{uuid4()}", json=wrong).status_code == 422
    wrong = {**body, "templates": {**body["templates"], "inside": body["templates"]["front"]}}
    assert client.put(f"{BASE}/runs/{uuid4()}", json=wrong).status_code == 422
    assert db.scalar(text("SELECT count(*) FROM mockup_runs")) == 0


def test_profile_changes_do_not_get_silently_overwritten_and_publication_is_atomic(
    flow, monkeypatch
):
    client, db, product, sku = prepare(flow, monkeypatch)
    body = inputs(client, product, sku)
    key, item = generate(client, db, body)
    from nilart.contexts.catalog.presentation import profiles

    original = profiles.save_record

    def broken(*args, **kwargs):
        raise RuntimeError("Injected profile failure")

    monkeypatch.setattr(profiles, "save_record", broken)
    with pytest.raises(RuntimeError, match="Injected"):
        publish(client, item)
    assert (
        db.scalar(text("SELECT count(*) FROM media_assets WHERE published_revision IS NOT NULL"))
        == 0
    )
    assert (
        db.scalar(text("SELECT count(*) FROM mockup_commands WHERE intent->>'action'='publish'"))
        == 0
    )
    monkeypatch.setattr(profiles, "save_record", original)
    assert publish(client, item, version=9).status_code == 409
    assert publish(client, item).status_code == 200
    assert publish(client, item, version=2).json()["code"] == "mockup_profile_version_conflict"
    assert client.get("/api/v1/catalog/image-sets").json()["items"]


def test_changed_source_requires_new_render_and_queue_recovery_is_idempotent(flow, monkeypatch):
    client, db, product, sku = prepare(flow, monkeypatch)
    body = inputs(client, product, sku)
    key, item = generate(client, db, body)
    assert service.process_run(None, key) is False
    ref = body["sources"]["front"]
    r = client.put(
        f"/api/v1/admin/media/{ref['asset_id']}/versions/{uuid4()}",
        json=dict(
            expected_version=1,
            action="draft",
            purpose="mockup_source",
            metadata=metadata(),
            file_name="source.png",
            content_base64=image("blue"),
            reason="Updated original artwork",
        ),
    )
    assert r.status_code == 200
    assert client.get(f"{BASE}/runs/{key}").json()["stale"] is True
    assert publish(client, item).json()["code"] == "mockup_inputs_changed"
    assert client.get("/api/v1/catalog/image-sets").json()["items"] == []


def test_restricted_staff_cannot_render_or_publish_and_private_sources_cannot_publish(
    flow, monkeypatch
):
    client, db, product, sku = prepare(flow, monkeypatch, False)
    assert client.get(f"{BASE}/templates").status_code == 403
    assert client.put(f"{BASE}/runs/{uuid4()}", json={}).status_code in [403, 422]


def test_source_publication_and_csrf_are_rejected(flow, monkeypatch):
    client, db, product, sku = prepare(flow, monkeypatch)
    body = inputs(client, product, sku)
    ref = body["sources"]["front"]
    r = client.put(
        f"/api/v1/admin/media/{ref['asset_id']}/versions/{uuid4()}",
        json=dict(
            expected_version=1,
            action="publish",
            purpose="mockup_source",
            metadata=metadata(),
            file_name="source.png",
            reason="Do not expose this source",
        ),
    )
    assert r.status_code == 422
    token = client.headers.pop("X-CSRF-Token")
    assert client.put(f"{BASE}/runs/{uuid4()}", json=body).status_code == 403
    client.headers["X-CSRF-Token"] = token
    assert client.put(f"{BASE}/runs/{uuid4()}", json=body).status_code == 200


def test_dispatch_leases_bound_messages_and_recover_stopped_worker(flow, monkeypatch):
    client, db, product, sku = prepare(flow, monkeypatch)
    body = inputs(client, product, sku)
    for i in range(7):
        value = {**body, "spec": {**body["spec"], "design": f"queue-test-{i}"}}
        assert client.put(f"{BASE}/runs/{uuid4()}", json=value).status_code == 200
    from nilart.bootstrap import worker

    @contextmanager
    def borrowed(_):
        yield db

    monkeypatch.setattr(worker, "Session", borrowed)
    sent = []
    monkeypatch.setattr(worker.celery, "send_task", lambda *a, **k: sent.append(k["args"][0]))
    worker.dispatch_mockups.run()
    assert len(set(sent)) == 5
    worker.dispatch_mockups.run()
    assert len(sent) == 5
    db.execute(
        text("UPDATE mockup_runs SET lease_until=now()-interval '1 minute' WHERE id=:id"),
        dict(id=sent[0]),
    )
    db.commit()
    worker.dispatch_mockups.run()
    assert len(sent) == 6
    assert len(set(sent)) <= 6


def test_gallery_publication_cannot_activate_a_never_published_delivery_draft(flow, monkeypatch):
    from types import SimpleNamespace

    from starlette.requests import Request

    from nilart.contexts.catalog.presentation import profiles

    client, db, product, sku = prepare(flow, monkeypatch)
    key, item = generate(client, db, inputs(client, product, sku))
    actor_id = db.scalar(text("SELECT actor_id FROM mockup_runs WHERE id=:id"), dict(id=key))
    body = profiles.Command(
        expected_version=0,
        action="draft",
        content=profiles.Content(delivery="physical", weight_grams=200, returnable=True),
        reason="Measured delivery details pending separate approval",
    )
    saved = profiles.save_record(
        db,
        SimpleNamespace(id=actor_id),
        "skus",
        sku,
        uuid4(),
        body,
        Request({"type": "http", "headers": []}),
    )
    assert isinstance(saved, dict)
    result = publish(client, item, expected_profile_version=1)
    assert result.json()["code"] == "mockup_profile_has_unpublished_changes"
    assert profiles.record(db, "skus", sku)["published_revision"] is None
    assert (
        db.scalar(text("SELECT count(*) FROM media_assets WHERE published_revision IS NOT NULL"))
        == 0
    )
