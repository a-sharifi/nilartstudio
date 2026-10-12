import importlib.util
from pathlib import Path
from uuid import uuid4

from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import text
from test_identity_otp_postgres import flow as flow

from nilart.contexts.catalog.infrastructure.repository import Base


def test_bundle_publication_components_and_no_inferred_offers(flow):
    client, db, _ = flow
    Base.metadata.create_all(db.connection())
    spec = importlib.util.spec_from_file_location("bundle_migration", Path(__file__).resolve().parents[1] / "migrations/versions/0012_bundles.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with Operations.context(MigrationContext.configure(db.connection())):
        module.upgrade()
    product, sku, bundle, empty = [uuid4() for _ in range(4)]
    db.execute(text("INSERT INTO catalog_products (id,slug,title_fa,title_en,published) VALUES (:id,'product','محصول','Product',true)"), {"id": product})
    db.execute(text("INSERT INTO catalog_skus (id,product_id,code,published) VALUES (:id,:product,'SKU-A',true)"), {"id": sku, "product": product})
    for id_, slug in [(bundle, "set"), (empty, "empty")]:
        db.execute(text("INSERT INTO catalog_bundles (id,slug,title_fa,title_en,published) VALUES (:id,:slug,'پکیج','Set',true)"), {"id": id_, "slug": slug})
    db.execute(text("INSERT INTO catalog_bundle_components VALUES (:bundle,:sku,2)"), {"bundle": bundle, "sku": sku})
    db.commit()
    response = client.get("/api/v1/catalog/bundles").json()
    assert response["total"] == 1
    detail = client.get("/api/v1/catalog/bundles/set").json()
    assert detail == response["items"][0]
    assert detail["components"][0]["quantity"] == 2
    assert not {"price", "capacity", "discount"}.intersection(detail)
    assert client.get("/api/v1/catalog/bundles/empty").status_code == 404
    assert client.get("/api/v1/catalog/bundles/missing").status_code == 404
    db.execute(text("UPDATE catalog_skus SET published=false"))
    db.commit()
    assert client.get("/api/v1/catalog/bundles").json()["total"] == 0
    assert client.get("/api/v1/catalog/bundles/set").status_code == 404
    db.execute(text("UPDATE catalog_skus SET published=true"))
    db.execute(text("UPDATE catalog_products SET published=false"))
    db.commit()
    assert client.get("/api/v1/catalog/bundles/set").status_code == 404
    with Operations.context(MigrationContext.configure(db.connection())):
        module.downgrade()
