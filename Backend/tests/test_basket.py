import importlib.util
import json
from pathlib import Path
from uuid import uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import text
from test_identity_otp_postgres import flow as flow
from test_identity_otp_postgres import register

from nilart.contexts.catalog.infrastructure.repository import Base


def migrate(db, filename):
    spec = importlib.util.spec_from_file_location(filename, Path(__file__).parents[1] / "migrations/versions" / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with Operations.context(MigrationContext.configure(db.connection())):
        module.upgrade()
    return module


@pytest.fixture
def basket(flow):
    client, db, sms = flow
    Base.metadata.create_all(db.connection())
    for filename in ["0010_artworks.py", "0012_bundles.py", "0020_bundle_presentations.py", "0022_artwork_details.py", "0027_baskets.py"]:
        migrate(db, filename)
    product, other, sku, alternative, foreign, bundle = [uuid4() for _ in range(6)]
    for identity in [product, other]:
        db.execute(text("INSERT INTO catalog_products(id,slug,title_fa,title_en,published) VALUES (:id,:slug,'دفتر','Notebook',true)"), {"id": identity, "slug": str(identity)})
    for identity, owner, price in [(sku, product, "100.1"), (alternative, product, "80"), (foreign, other, "1")]:
        db.execute(text("INSERT INTO catalog_skus(id,product_id,code,published,price_amount,currency) VALUES (:id,:owner,:code,true,:amount,'IRT')"), {"id": identity, "owner": owner, "code": str(identity), "amount": price})
    db.execute(text("INSERT INTO catalog_bundles(id,slug,title_fa,title_en,published) VALUES (:id,'test-bundle','پکیج','Bundle',true)"), {"id": bundle})
    db.execute(text("INSERT INTO catalog_bundle_components(bundle_id,sku_id,quantity) VALUES (:bundle,:sku,2)"), {"bundle": bundle, "sku": sku})
    db.execute(text("INSERT INTO catalog_bundle_presentations(bundle_id,document,published) VALUES (:id,CAST(:document AS jsonb),true)"), {"id": bundle, "document": json.dumps({"discount": {"amount": "10", "currency": "IRT"}, "component_choices": [{"component_sku_id": str(sku), "allowed_sku_ids": [str(sku), str(alternative)]}]})})
    db.commit()
    return client, db, sms, {"sku": str(sku), "alternative": str(alternative), "foreign": str(foreign), "bundle": str(bundle)}


def boot(client):
    response = client.post("/api/v1/basket/bootstrap")
    assert response.status_code == 200, response.text
    return response.json()


def mutate(client, version, csrf, action="add", **values):
    return client.post("/api/v1/basket/commands", headers={"X-CSRF-Token": csrf}, json={"command_id": str(uuid4()), "version": version, "action": action, **values})


def test_guest_persistence_idempotency_stale_and_atomic_validation(basket):
    client, db, _, ids = basket
    assert client.get("/api/v1/basket").json()["lines"] == []
    assert db.scalar(text("SELECT count(*) FROM shopping_baskets")) == 0
    initial = boot(client)
    body = {"command_id": str(uuid4()), "version": 0, "action": "add", "item": {"kind": "product", "item_id": ids["sku"], "quantity": 2}}
    response = client.post("/api/v1/basket/commands", headers={"X-CSRF-Token": initial["csrf_token"]}, json=body)
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["totals"]["total"] == "200.2"
    assert result["checkout_enabled"] is False
    assert client.post("/api/v1/basket/commands", headers={"X-CSRF-Token": initial["csrf_token"]}, json=body).json()["version"] == 1
    assert client.post("/api/v1/basket/commands", headers={"X-CSRF-Token": initial["csrf_token"]}, json={**body, "item": {**body["item"], "quantity": 3}}).status_code == 409
    assert mutate(client, 0, initial["csrf_token"], "clear").status_code == 409
    assert mutate(client, 1, initial["csrf_token"], item={"kind": "product", "item_id": str(uuid4())}).status_code == 400
    assert client.get("/api/v1/basket").json()["version"] == 1
    assert db.scalar(text("SELECT count(*) FROM shopping_basket_commands")) == 1
    assert client.get("/api/v1/basket").json()["lines"][0]["item"]["quantity"] == 2
    client.cookies.clear()
    assert client.get("/api/v1/basket").json()["lines"] == []


def test_origin_csrf_and_rotation(basket):
    client, _, _, ids = basket
    assert client.post("/api/v1/basket/bootstrap", headers={"Origin": "https://other.test"}).status_code == 403
    first, second = boot(client), boot(client)
    assert mutate(client, 0, "").status_code == 403
    assert mutate(client, 0, first["csrf_token"], item={"kind": "product", "item_id": ids["sku"]}).status_code == 403
    assert client.post("/api/v1/basket/commands", headers={"Origin": "https://other.test", "X-CSRF-Token": second["csrf_token"]}, json={"command_id": str(uuid4()), "version": 0, "action": "clear"}).status_code == 403


def test_explicit_bundle_choices_quantities_price_changes_and_unpublication(basket):
    client, db, _, ids = basket
    initial = boot(client)
    assert mutate(client, 0, initial["csrf_token"], item={"kind": "bundle", "item_id": ids["bundle"]}).status_code == 400
    assert mutate(client, 0, initial["csrf_token"], item={"kind": "bundle", "item_id": ids["bundle"], "choices": {ids["sku"]: ids["foreign"]}}).status_code == 400
    result = mutate(client, 0, initial["csrf_token"], item={"kind": "bundle", "item_id": ids["bundle"], "choices": {ids["sku"]: ids["alternative"]}, "quantity": 3}).json()
    assert result["totals"]["total"] == "450"
    assert result["totals"]["discount"] == "30"
    db.execute(text("UPDATE catalog_skus SET price_amount=90 WHERE id=:id"), {"id": ids["alternative"]})
    db.commit()
    changed = client.get("/api/v1/basket").json()
    assert changed["lines"][0]["issue"] == "price"
    assert changed["totals"]["total"] == "0"
    result = mutate(client, 1, initial["csrf_token"], "accept", line_id=changed["lines"][0]["id"], expected_unit="170").json()
    assert result["totals"]["total"] == "510"
    db.execute(text("UPDATE catalog_skus SET published=false WHERE id=:id"), {"id": ids["alternative"]})
    db.commit()
    assert client.get("/api/v1/basket").json()["lines"][0]["issue"] == "unavailable"


def test_explicit_account_merge_is_idempotent_and_session_revocation_blocks_writes(basket):
    client, db, sms, ids = basket
    initial = boot(client)
    mutate(client, 0, initial["csrf_token"], item={"kind": "product", "item_id": ids["sku"]})
    _, registration = register(client, sms)
    csrf = registration.json()["csrf_token"]
    account = boot(client)
    assert account["guest_available"] is True and account["lines"] == []
    result = mutate(client, 0, csrf, "merge")
    assert result.status_code == 200, result.text
    assert len(result.json()["lines"]) == 1
    assert mutate(client, 1, csrf, "merge").json()["totals"]["count"] == 1
    db.execute(text("DELETE FROM identity_sessions"))
    db.commit()
    assert mutate(client, 2, csrf, "clear").status_code == 401


def test_remove_undo_and_replace_preserve_quantity_and_price_consent(basket):
    client, _, _, ids = basket
    initial = boot(client)
    result = mutate(client, 0, initial["csrf_token"], item={"kind": "product", "item_id": ids["sku"], "quantity": 2}).json()
    identity = result["lines"][0]["id"]
    replaced = mutate(client, 1, initial["csrf_token"], "replace", line_id=identity, item={"kind": "product", "item_id": ids["alternative"], "quantity": 2}).json()
    assert replaced["totals"]["total"] == "160"
    new_identity = replaced["lines"][0]["id"]
    assert new_identity != identity
    changed = mutate(client, 2, initial["csrf_token"], "quantity", line_id=new_identity, quantity=3).json()
    assert changed["totals"]["total"] == "240"
    removed = mutate(client, 3, initial["csrf_token"], "remove", line_id=new_identity).json()
    assert removed["lines"] == []
    restored = mutate(client, 4, initial["csrf_token"], item=changed["lines"][0]["item"]).json()
    assert restored["totals"]["total"] == "240"


def test_parallel_adds_cannot_overwrite_or_double_apply_a_stale_version():
    import os
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier

    from fastapi import HTTPException, Request, Response
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    from nilart.contexts.basket.domain import Command
    from nilart.contexts.basket.router import command
    from nilart.contexts.identity.infrastructure.secrets import new_session_token, token_digest

    url = os.environ.get("NILART_TEST_DATABASE_URL")
    if not url:
        pytest.skip("isolated PostgreSQL required")
    engine = create_engine(url)
    schema = "basket_parallel_"+uuid4().hex
    token, csrf = new_session_token(), new_session_token()
    product, sku, basket_id = uuid4(), uuid4(), uuid4()
    try:
        with Session(engine) as db:
            db.execute(text(f'CREATE SCHEMA "{schema}"'))
            db.execute(text(f'SET search_path TO "{schema}"'))
            Base.metadata.create_all(db.connection())
            for filename in ["0005_identity.py", "0010_artworks.py", "0012_bundles.py", "0020_bundle_presentations.py", "0022_artwork_details.py", "0027_baskets.py"]:
                migrate(db, filename)
            db.execute(text("INSERT INTO catalog_products(id,slug,title_fa,title_en,published) VALUES (:id,'p','محصول','Product',true)"), {"id": product})
            db.execute(text("INSERT INTO catalog_skus(id,product_id,code,published,price_amount,currency) VALUES (:id,:product,'SKU',true,10,'IRT')"), {"id": sku, "product": product})
            db.execute(text("INSERT INTO shopping_baskets(id,token_hash,csrf_hash) VALUES (:id,:token,:csrf)"), {"id": basket_id, "token": token_digest(token), "csrf": token_digest(csrf)})
            db.commit()
        barrier = Barrier(2)

        def submit():
            with Session(engine) as db:
                db.execute(text(f'SET search_path TO "{schema}"'))
                request = Request({"type": "http", "headers": [(b"origin", b"http://localhost:8080"), (b"cookie", ("nilart_basket="+token).encode()), (b"x-csrf-token", csrf.encode())]})
                body = Command(command_id=uuid4(), version=0, action="add", item={"kind": "product", "item_id": sku})
                barrier.wait(timeout=5)
                try:
                    command(body, request, Response(), db)
                    return 200
                except HTTPException as exc:
                    return exc.status_code

        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(lambda _: submit(), range(2)))
        assert sorted(results) == [200, 409]
        with Session(engine) as db:
            db.execute(text(f'SET search_path TO "{schema}"'))
            row = db.execute(text("SELECT version,lines FROM shopping_baskets")).mappings().one()
            assert row["version"] == 1 and row["lines"][0]["item"]["quantity"] == 1
            assert db.scalar(text("SELECT count(*) FROM shopping_basket_commands")) == 1
    finally:
        with engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE'))
        engine.dispose()
