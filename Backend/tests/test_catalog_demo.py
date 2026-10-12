from decimal import Decimal

import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from nilart.bootstrap.catalog_demo import main, seed_demo
from nilart.contexts.catalog.infrastructure.repository import (
    Base,
    ProductCategoryRow,
    ProductCollectionRow,
    ProductRow,
    SKURow,
    SqlCatalogRepository,
)


@pytest.mark.parametrize("args", [[], ["--database-url", "sqlite://"],
                                 ["--database-url", "not-a-url"]])
def test_demo_cli_requires_explicit_postgres_database(args):
    with pytest.raises(SystemExit) as error:
        main(args)
    assert error.value.code == 2


@pytest.mark.parametrize("price", [None, Decimal("12.345678")])
def test_demo_is_one_shared_product_one_sku_without_stock(price):
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    try:
        with Session(engine) as session, session.begin():
            product_id = seed_demo(session, price=price)
            for model, count in [(ProductRow, 1), (SKURow, 1),
                                 (ProductCollectionRow, 2), (ProductCategoryRow, 2)]:
                assert session.scalar(select(func.count()).select_from(model)) == count
            repository = SqlCatalogRepository(session)
            for slug in ["demo-catalog-collection-1", "demo-catalog-collection-2"]:
                items, total = repository.page("products", 1, 24, collection=slug)
                assert total == 1 and items[0].id == product_id
                assert len(items[0].collection_ids) == len(items[0].category_ids) == 2
            sku = repository.detail("skus", "demo-catalog-sku")
            assert sku.product_id == product_id
            assert (None if sku.price is None else sku.price.amount) == price
            assert "stock" not in SKURow.__table__.columns
            with pytest.raises(ValueError, match="already exist"):
                seed_demo(session, price=price)
            assert session.scalar(select(func.count()).select_from(SKURow)) == 1
    finally:
        engine.dispose()
