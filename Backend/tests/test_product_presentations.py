import importlib.util
import json
from pathlib import Path

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine, func, select, text
from sqlalchemy.orm import Session
from test_design_catalog import FIXTURE
from test_identity_otp_postgres import flow as flow

from nilart.bootstrap.design_catalog import seed_design_catalog
from nilart.bootstrap.design_product_details import seed_product_details
from nilart.contexts.catalog.infrastructure.repository import Base, ProductPresentationRow, SKURow

DETAILS = json.loads((Path(__file__).parents[1] / "fixtures/design-product-details.json").read_text())


def test_fixture_details_and_explicit_unpriced_skus():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as db, db.begin():
        seed_design_catalog(db, FIXTURE)
        seed_product_details(db, DETAILS)
        assert db.scalar(select(func.count()).select_from(ProductPresentationRow)) == 4
        assert db.scalar(select(func.count()).select_from(SKURow)) == 3
        assert all(sku.price_amount is None for sku in db.scalars(select(SKURow)))
        with pytest.raises(ValueError, match="never overwrite"):
            seed_product_details(db, DETAILS)
    engine.dispose()


def test_invalid_reference_detail_rolls_back_before_writing():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        seed_design_catalog(db, FIXTURE)
        db.commit()
        invalid = json.loads(json.dumps(DETAILS))
        invalid[-1]["document"]["kind"] = "not-a-product"
        with pytest.raises(ValueError), db.begin_nested():
            seed_product_details(db, invalid)
        assert db.scalar(select(func.count()).select_from(ProductPresentationRow)) == 0
        assert db.scalar(select(func.count()).select_from(SKURow)) == 0
    engine.dispose()


def test_public_detail_content_is_database_backed_and_publication_filtered(flow):
    client, db, _ = flow
    Base.metadata.create_all(db.connection())
    db.execute(text("DROP TABLE catalog_product_presentations"))
    spec = importlib.util.spec_from_file_location("presentation_migration", Path(__file__).parents[1] / "migrations/versions/0016_product_presentations.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with Operations.context(MigrationContext.configure(db.connection())):
        module.upgrade()
    seed_design_catalog(db, FIXTURE)
    seed_product_details(db, DETAILS)
    db.commit()
    detail = client.get("/api/v1/catalog/products/bookmark-love").json()
    assert detail["presentation"]["kind"] == "bookmark"
    assert detail["presentation"]["color"] == "rose"
    assert len(detail["presentation"]["gallery"]) == 1
    assert "Binding" not in json.dumps(detail["presentation"])
    assert all("presentation" not in item for item in client.get("/api/v1/catalog/products").json()["items"])
    assert client.get("/api/v1/catalog/products/bookmark-love/skus").json()[0]["price"] is None
    db.execute(text("UPDATE catalog_product_presentations SET published=false"))
    db.commit()
    assert "presentation" not in client.get("/api/v1/catalog/products/bookmark-love").json()
    db.execute(text("UPDATE catalog_products SET published=false WHERE slug='bookmark-love'"))
    db.commit()
    assert client.get("/api/v1/catalog/products/bookmark-love").status_code == 404
    with Operations.context(MigrationContext.configure(db.connection())):
        module.downgrade()
    assert db.scalar(text("SELECT count(*) FROM catalog_products")) == 4
