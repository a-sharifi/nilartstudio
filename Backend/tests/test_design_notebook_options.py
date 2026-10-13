import json
from pathlib import Path
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session
from test_design_catalog import FIXTURE

from nilart.bootstrap.design_catalog import NOTICE_EN, NOTICE_FA, seed_design_catalog
from nilart.bootstrap.design_notebook_options import seed_notebook_options
from nilart.bootstrap.design_product_details import seed_product_details
from nilart.contexts.catalog.domain.presentation import ProductPresentation
from nilart.contexts.catalog.infrastructure.repository import (
    Base,
    ProductPresentationRow,
    ProductRow,
    SKURow,
)

ROOT = Path(__file__).parents[1]
OPTIONS = json.loads((ROOT / "fixtures/design-notebook-options.json").read_text())


def test_explicit_notebook_variants_and_guarded_profile_update():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        seed_design_catalog(db, FIXTURE)
        seed_product_details(db, json.loads((ROOT / "fixtures/design-product-details.json").read_text()))
        for slug in ["cat-ruled", "cat-ruled-hard"]:
            db.add(ProductRow(id=uuid4(), slug=slug, title_fa="دفتر", title_en="Notebook", description_fa=NOTICE_FA, description_en=NOTICE_EN, published=True))
        db.commit()
        with pytest.raises(RuntimeError), db.begin_nested():
            seed_notebook_options(db, OPTIONS)
            raise RuntimeError("rollback")
        assert db.scalar(select(func.count()).select_from(SKURow)) == 3
        seed_notebook_options(db, OPTIONS)
        db.commit()
        assert db.scalar(select(func.count()).select_from(SKURow)) == 15
        assert all(s.price_amount is None for s in db.scalars(select(SKURow)))
        product = db.scalar(select(ProductRow).where(ProductRow.slug == "cats-sketchbook-127gsm"))
        doc = db.get(ProductPresentationRow, product.id).document
        assert [group["id"] for group in doc["option_groups"]] == ["size", "sheets", "cover"]
        assert len(doc["option_combinations"]) == 7
        with pytest.raises(ValueError, match="never overwrite"):
            seed_notebook_options(db, OPTIONS)
    engine.dispose()


def test_presentation_rejects_duplicate_and_foreign_option_combinations():
    for mutation in ["duplicate", "foreign", "incomplete"]:
        doc = json.loads(json.dumps(OPTIONS[0]["document"]))
        if mutation == "duplicate":
            doc["option_combinations"].append(doc["option_combinations"][0])
        elif mutation == "foreign":
            doc["option_combinations"][0]["selections"]["size"] = "foreign"
        else:
            del doc["option_combinations"][0]["selections"]["cover"]
        with pytest.raises(ValueError):
            ProductPresentation.model_validate(doc)
