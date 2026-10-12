import json
from pathlib import Path

import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from nilart.bootstrap.design_catalog import seed_design_catalog
from nilart.contexts.catalog.infrastructure.repository import (
    Base,
    CollectionRow,
    ProductRow,
    SKURow,
    SqlCatalogRepository,
)

FIXTURE = json.loads((Path(__file__).parents[1] / "fixtures/design-catalog.json").read_text())


def test_reference_catalog_memberships_and_no_commercial_data():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as session, session.begin():
        assert seed_design_catalog(session, FIXTURE) == {
            "collections": 5, "categories": 4, "products": 4,
        }
        repository = SqlCatalogRepository(session)
        for entry in FIXTURE["products"]:
            items, total = repository.page("products", 1, 24, collection=entry["collection"])
            assert total == 1 and items[0].slug == entry["slug"]
            assert "Test data" in items[0].description_en
            assert len(items[0].category_ids) == 1
        assert session.scalar(select(func.count()).select_from(SKURow)) == 0
        with pytest.raises(ValueError, match="already exist"):
            seed_design_catalog(session, FIXTURE)
        assert session.scalar(select(func.count()).select_from(ProductRow)) == 4
    engine.dispose()


def test_invalid_membership_rolls_back_the_entire_catalog():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    invalid = json.loads(json.dumps(FIXTURE))
    invalid["products"][-1]["collection"] = "missing"
    with Session(engine) as session:
        with pytest.raises(KeyError), session.begin():
            seed_design_catalog(session, invalid)
        assert session.scalar(select(func.count()).select_from(ProductRow)) == 0
        assert session.scalar(select(func.count()).select_from(CollectionRow)) == 0
    engine.dispose()
