import importlib.util
from pathlib import Path

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import func, select, text
from test_design_catalog import FIXTURE
from test_identity_otp_postgres import flow as flow

from nilart.bootstrap.design_bundle import seed_design_bundle
from nilart.bootstrap.design_catalog import seed_design_catalog
from nilart.contexts.catalog.infrastructure.repository import Base, ProductRow, SKURow


def test_reference_bundle_atomic_import_and_public_contents(flow):
    client, db, _ = flow
    Base.metadata.create_all(db.connection())
    spec = importlib.util.spec_from_file_location("bundle_migration", Path(__file__).parents[1] / "migrations/versions/0012_bundles.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with Operations.context(MigrationContext.configure(db.connection())):
        module.upgrade()
    seed_design_catalog(db, FIXTURE)
    db.commit()
    # A missing category after staging the first new product must roll everything back.
    db.execute(text("UPDATE catalog_categories SET slug='missing' WHERE slug='bookmarks'"))
    db.commit()
    with pytest.raises(ValueError), db.begin_nested():
        seed_design_bundle(db)
    assert db.scalar(select(func.count()).select_from(ProductRow)) == 4
    assert db.scalar(select(func.count()).select_from(SKURow)) == 0
    assert db.scalar(text("SELECT count(*) FROM catalog_bundles")) == 0
    db.execute(text("UPDATE catalog_categories SET slug='bookmarks' WHERE slug='missing'"))
    seed_design_bundle(db)
    db.commit()
    detail = client.get("/api/v1/catalog/bundles/cats-bundle").json()
    assert sorted(c["quantity"] for c in detail["components"]) == [1, 1, 2]
    assert "Test data" in detail["description_en"]
    assert db.scalar(select(func.count()).select_from(ProductRow)) == 6
    assert len(db.scalars(select(SKURow)).all()) == 3
    assert all(s.price_amount is None and s.currency is None for s in db.scalars(select(SKURow)))
    with pytest.raises(ValueError, match="already exists"):
        seed_design_bundle(db)
    assert db.scalar(select(func.count()).select_from(ProductRow)) == 6
