import importlib.util
from pathlib import Path

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import func, select, text
from test_design_catalog import FIXTURE
from test_identity_otp_postgres import flow as flow

from nilart.bootstrap.design_bundle import seed_design_bundle
from nilart.bootstrap.design_bundle_sets import seed_bundle_sets
from nilart.bootstrap.design_catalog import seed_design_catalog
from nilart.contexts.catalog.infrastructure.repository import Base, ProductRow, SKURow


def test_reference_bundle_sets_share_real_component_skus_and_do_not_infer_prices(flow):
    client, db, _ = flow
    Base.metadata.create_all(db.connection())
    spec = importlib.util.spec_from_file_location("bundle_migration", Path(__file__).parents[1] / "migrations/versions/0012_bundles.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with Operations.context(MigrationContext.configure(db.connection())):
        module.upgrade()
    seed_design_catalog(db, FIXTURE)
    seed_design_bundle(db)
    db.commit()
    # A conflict with the second bundle must reject the whole import before the first insert.
    db.execute(text("INSERT INTO catalog_bundles (id,slug,title_fa,title_en,published) "
                    "VALUES (gen_random_uuid(),'cat-keepsake-set','تست','Conflict',false)"))
    db.commit()
    with pytest.raises(ValueError, match="never overwrite"), db.begin_nested():
        seed_bundle_sets(db)
    assert db.scalar(select(func.count()).select_from(ProductRow)) == 6
    assert db.scalar(select(func.count()).select_from(SKURow)) == 3
    db.execute(text("DELETE FROM catalog_bundles WHERE slug='cat-keepsake-set'"))
    seed_bundle_sets(db)
    db.commit()
    bundles = client.get("/api/v1/catalog/bundles").json()
    assert bundles["total"] == 3
    expected = {"cats-bundle": "cats-sketchbook-127gsm", "cat-everyday-set": "cat-ruled", "cat-keepsake-set": "cat-ruled-hard"}
    sticker_ids = set()
    for bundle in bundles["items"]:
        assert sorted(p["quantity"] for p in bundle["components"]) == [1, 1, 2]
        assert {p["product_slug"] for p in bundle["components"]} == {expected[bundle["slug"]], "cat-stickers", "cat-bookmark"}
        sticker_ids.update(p["sku_id"] for p in bundle["components"] if p["quantity"] == 2)
        assert "Test data" in bundle["description_en"]
        assert not {"price", "discount", "stock"}.intersection(bundle)
    assert len(sticker_ids) == 1
    assert all(s.price_amount is None for s in db.scalars(select(SKURow)))
    with pytest.raises(ValueError):
        seed_bundle_sets(db)
    assert db.scalar(select(func.count()).select_from(ProductRow)) == 8
    db.execute(text("UPDATE catalog_skus SET published=false WHERE code='TEST-DESIGN-CATS-STICKERS'"))
    db.commit()
    assert client.get("/api/v1/catalog/bundles").json()["total"] == 0
