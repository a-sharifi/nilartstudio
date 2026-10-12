"""Optional real PostgreSQL migration and exact-money test; never uses the app DB by default."""
import importlib.util
import os
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from nilart.bootstrap.catalog_demo import seed_demo
from nilart.contexts.catalog.infrastructure.repository import SqlCatalogRepository
from nilart.contexts.catalog.presentation.router import SKUOutput


def test_postgres_migrations_and_decimal_roundtrip():
    url = os.environ.get("NILART_TEST_DATABASE_URL")
    if not url:
        pytest.skip("NILART_TEST_DATABASE_URL is required for PostgreSQL precision verification")
    assert make_url(url).get_backend_name() == "postgresql"
    engine = create_engine(url)
    # Schema name is generated here, not supplied by the user. PostgreSQL rolls
    # back the entire isolated schema, data, and DDL even if an assertion fails.
    schema = "catalog_test_" + uuid4().hex
    directory = Path(__file__).resolve().parents[1] / "migrations" / "versions"
    try:
        with engine.connect() as connection:
            transaction = connection.begin()
            try:
                connection.execute(text(f'CREATE SCHEMA "{schema}"'))
                connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
                with Operations.context(MigrationContext.configure(connection)):
                    for filename in ["0001_outbox.py", "0002_catalog.py",
                                     "0003_catalog_foundation.py"]:
                        spec = importlib.util.spec_from_file_location(filename, directory / filename)
                        module = importlib.util.module_from_spec(spec)
                        spec.loader.exec_module(module)
                        module.upgrade()
                with Session(bind=connection, join_transaction_mode="create_savepoint") as session:
                    amount = Decimal("999999999999999999.123456")
                    product_id = seed_demo(session, "demo-postgres", amount, "IRR")
                    session.expire_all()
                    repository = SqlCatalogRepository(session)
                    sku = repository.detail("skus", "demo-postgres-sku")
                    assert sku.product_id == product_id
                    assert sku.price.amount == amount
                    assert SKUOutput.model_validate(sku, from_attributes=True).model_dump(
                        mode="json")["price"] == {"amount": str(amount), "currency": "IRR"}
                    for collection in ["demo-postgres-collection-1", "demo-postgres-collection-2"]:
                        products, total = repository.page("products", 1, 24, collection=collection,
                                                          category="demo-postgres-category-2")
                        assert total == 1 and products[0].id == product_id
                        assert len(products[0].collection_ids) == len(products[0].category_ids) == 2
                    skus, total = repository.page("skus", 1, 24)
                    assert total == 1 and skus[0].id == sku.id
            finally:
                transaction.rollback()
    finally:
        engine.dispose()
