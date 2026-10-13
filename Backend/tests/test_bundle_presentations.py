import importlib.util
import json
from pathlib import Path
from uuid import uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import select, text
from test_identity_otp_postgres import flow as flow

from nilart.bootstrap.design_bundle_presentations import seed_bundle_presentations
from nilart.bootstrap.design_catalog import NOTICE_EN
from nilart.contexts.catalog.infrastructure.repository import Base, ProductRow, SKURow


def test_explicit_reference_bundle_choices_prices_and_publication(flow):
    client, db, _ = flow
    Base.metadata.create_all(db.connection())
    directory = Path(__file__).resolve().parents[1]
    modules = []
    with Operations.context(MigrationContext.configure(db.connection())):
        for filename in ["0012_bundles.py", "0020_bundle_presentations.py"]:
            spec = importlib.util.spec_from_file_location(
                filename, directory / "migrations/versions" / filename
            )
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            module.upgrade()
            modules.append(module)
    fixture = json.loads((directory / "fixtures/design-bundle-presentations.json").read_text())[:1]
    components = []
    for index, code in enumerate(
        ["TEST-DESIGN-CATS-BOOK", "TEST-DESIGN-CATS-STICKERS", "TEST-DESIGN-CATS-BOOKMARK"]
    ):
        product = ProductRow(
            id=uuid4(),
            slug=f"isolated-{index}",
            title_fa="تست",
            title_en="Test",
            published=True,
            description_en=NOTICE_EN,
        )
        db.add(product)
        db.flush()
        sku = SKURow(id=uuid4(), product_id=product.id, code=code, published=True)
        db.add(sku)
        db.flush()
        components.append(sku)
        if index == 0:
            for allowed in fixture[0]["choices"][0]["allowed_codes"]:
                db.add(SKURow(id=uuid4(), product_id=product.id, code=allowed, published=True))
    bundle = uuid4()
    db.execute(
        text("INSERT INTO catalog_bundles VALUES(:id,'cats-bundle','تست','Test','',:notice,true)"),
        {"id": bundle, "notice": NOTICE_EN},
    )
    for sku in components:
        db.execute(
            text("INSERT INTO catalog_bundle_components VALUES(:bundle,:sku,1)"),
            {"bundle": bundle, "sku": sku.id},
        )
    db.commit()
    assert client.get("/api/v1/catalog/bundles/cats-bundle/presentation").status_code == 404
    seed_bundle_presentations(db, fixture)
    db.commit()
    response = client.get("/api/v1/catalog/bundles/cats-bundle/presentation")
    assert response.status_code == 200, response.text
    document = response.json()
    assert document["sample"] is True and document["discount"]["amount"] == "30000"
    assert len(document["component_choices"][0]["allowed_sku_ids"]) == 5
    assert db.get(SKURow, components[1].id).price_amount == 35000
    # Repeated seed preserves the exact document; different authored values are rejected.
    seed_bundle_presentations(db, fixture)
    changed = json.loads(json.dumps(fixture))
    changed[0]["document"]["discount"]["amount"] = "1"
    with pytest.raises(ValueError, match="Never overwrite"):
        seed_bundle_presentations(db, changed)
    allowed = document["component_choices"][0]["allowed_sku_ids"][0]
    db.execute(text("UPDATE catalog_skus SET published=false WHERE id=:id"), {"id": allowed})
    db.commit()
    filtered = client.get("/api/v1/catalog/bundles/cats-bundle/presentation").json()
    assert allowed not in filtered["component_choices"][0]["allowed_sku_ids"]
    # A SKU from a different component product is never exposed as a notebook choice.
    document["component_choices"][0]["allowed_sku_ids"] = [str(components[1].id)]
    db.execute(
        text("UPDATE catalog_bundle_presentations SET document=CAST(:doc AS jsonb)"),
        {"doc": json.dumps(document)},
    )
    db.commit()
    assert client.get("/api/v1/catalog/bundles/cats-bundle/presentation").status_code == 404
    assert "presentation" not in client.get("/api/v1/catalog/bundles/cats-bundle").json()
    with Operations.context(MigrationContext.configure(db.connection())):
        modules[-1].downgrade()
        assert db.scalar(select(SKURow.id).where(SKURow.id == components[0].id)) == components[0].id
        modules[-1].upgrade()
    assert client.get("/api/v1/catalog/bundles/cats-bundle/presentation").status_code == 404
