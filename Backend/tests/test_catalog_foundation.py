import importlib.util
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.exc import IntegrityError, StatementError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from nilart.bootstrap.main import app
from nilart.contexts.catalog.application.queries import GetCollection, ListCatalog
from nilart.contexts.catalog.domain.entities import SKU, Category, Product
from nilart.contexts.catalog.infrastructure.repository import (
    Base,
    CategoryRow,
    CollectionRow,
    ProductCategoryRow,
    ProductCollectionRow,
    ProductRow,
    SKURow,
)
from nilart.shared.database import session_dependency
from nilart.shared.money import Money


@pytest.fixture
def catalog():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False},
                           poolclass=StaticPool)

    @event.listens_for(engine, "connect")
    def foreign_keys(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    collection, category, draft_collection, draft_category = [uuid4() for _ in range(4)]
    public, hidden, private_collection, private_category, empty = [uuid4() for _ in range(5)]
    with Session(engine) as session:
        for model, id_, slug, published in [
            (CollectionRow, collection, "art", True),
            (CollectionRow, draft_collection, "draft-collection", False),
            (CategoryRow, category, "prints", True),
            (CategoryRow, draft_category, "draft-category", False),
        ]:
            session.add(model(id=id_, slug=slug, title_fa="هنر", title_en="Art",
                              published=published, description_fa="شرح", description_en="Details"))
        session.flush()
        for id_, slug, published, collection_id, category_id in [
            (public, "art-print", True, collection, category),
            (hidden, "draft-product", False, collection, category),
            (private_collection, "private-collection", True, draft_collection, category),
            (private_category, "private-category", True, collection, draft_category),
            (empty, "empty", True, None, None),
        ]:
            session.add(ProductRow(id=id_, slug=slug, title_fa="چاپ", title_en="Print",
                                   published=published))
            session.flush()
            if collection_id is not None:
                session.add(ProductCollectionRow(product_id=id_, collection_id=collection_id))
            if category_id is not None:
                session.add(ProductCategoryRow(product_id=id_, category_id=category_id))
        session.flush()
        for code, product_id, published, price, currency in [
            ("PRINT-A", public, True, Decimal("12.345678"), "IRT"),
            ("PRINT-B", public, True, None, None),
            ("DRAFT-SKU", public, False, None, None),
            ("HIDDEN-PRODUCT", hidden, True, None, None),
            ("HIDDEN-COLLECTION", private_collection, True, None, None),
            ("HIDDEN-CATEGORY", private_category, True, None, None),
        ]:
            session.add(SKURow(id=uuid4(), code=code, product_id=product_id,
                               published=published, price_amount=price, currency=currency))
        session.commit()

    def override():
        with Session(engine) as session:
            yield session

    previous = app.dependency_overrides.copy()
    app.dependency_overrides[session_dependency] = override
    try:
        with TestClient(app) as client:
            yield client, engine, public
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous)
        engine.dispose()


@pytest.mark.parametrize("resource,key", [
    ("collections", "draft-collection"), ("categories", "draft-category"),
    ("products", "draft-product"), ("skus", "DRAFT-SKU"),
    ("skus", "HIDDEN-PRODUCT"), ("products", "missing"),
])
def test_nonpublic_detail_is_not_found(catalog, resource, key):
    client, _, _ = catalog
    response = client.get(f"/api/v1/catalog/{resource}/{key}")
    assert response.status_code == 404
    assert response.json()["code"] == "not_found"
    assert response.json()["request_id"] == response.headers["x-request-id"]


def test_details_and_filters(catalog):
    client, _, _ = catalog
    detail = client.get("/api/v1/catalog/collections/art").json()
    assert detail["description_en"] == "Details"
    assert "published" not in detail
    assert client.get("/api/v1/catalog/categories/prints").status_code == 200
    assert client.get("/api/v1/catalog/products/art-print").status_code == 200
    for query, expected in [("collection=art", 2), ("category=prints", 2),
                            ("collection=missing", 0), ("category=draft-category", 0),
                            ("collection=draft-collection", 0),
                            ("collection=art&category=prints", 1)]:
        response = client.get(f"/api/v1/catalog/products?{query}")
        assert response.status_code == 200
        assert response.json()["total"] == expected


@pytest.mark.parametrize("resource,total", [("categories", 1), ("products", 4), ("skus", 4)])
def test_pagination_and_draft_filtering(catalog, resource, total):
    client, _, _ = catalog
    first = client.get(f"/api/v1/catalog/{resource}?page_size=1").json()
    assert first["total"] == total
    assert len(first["items"]) == 1
    assert first["page"] == 1
    assert first["page_size"] == 1
    assert client.get(f"/api/v1/catalog/{resource}?page=99").json()["items"] == []
    for query in ["page=0", "page_size=0", "page_size=101"]:
        response = client.get(f"/api/v1/catalog/{resource}?{query}")
        assert response.status_code == 422
        assert response.json()["request_id"] == response.headers["x-request-id"]


def test_explicit_prices_and_no_inventory(catalog):
    client, _, _ = catalog
    response = client.get("/api/v1/catalog/products/art-print/skus")
    assert response.status_code == 200
    items = response.json()
    assert [item["code"] for item in items] == ["PRINT-A", "PRINT-B"]
    assert items[0]["price"] == {"amount": "12.345678", "currency": "IRT"}
    assert items[1]["price"] is None
    assert set(items[0]) == {"id", "product_id", "code", "price"}
    assert client.get("/api/v1/catalog/skus/PRINT-A").json() == items[0]
    assert client.get("/api/v1/catalog/products/empty/skus").json() == []
    assert client.get("/api/v1/catalog/products/draft-product/skus").status_code == 404


@pytest.mark.parametrize("amount", [1.2, Decimal("NaN"), Decimal("Infinity"),
                                    Decimal("-1"), Decimal("0.0000001"), Decimal("1e18")])
def test_lossy_or_invalid_money_rejected_by_persistence(catalog, amount):
    _, engine, product_id = catalog
    with Session(engine) as session:
        session.add(SKURow(id=uuid4(), product_id=product_id, code="INVALID",
                           published=True, price_amount=amount, currency="IRT"))
        with pytest.raises(StatementError):
            session.flush()


@pytest.mark.parametrize("amount,currency", [(None, "IRT"), (Decimal("1"), None),
                                            (Decimal("1"), "USD")])
def test_price_currency_constraint(catalog, amount, currency):
    _, engine, product_id = catalog
    with Session(engine) as session:
        session.add(SKURow(id=uuid4(), product_id=product_id, code="INVALID",
                           published=True, price_amount=amount, currency=currency))
        with pytest.raises(IntegrityError):
            session.flush()


def test_foreign_keys_and_unique_codes(catalog):
    _, engine, product_id = catalog
    for code, parent in [("PRINT-A", product_id), ("ORPHAN", uuid4())]:
        with Session(engine) as session:
            session.add(SKURow(id=uuid4(), product_id=parent, code=code, published=True))
            with pytest.raises(IntegrityError):
                session.flush()


@pytest.mark.parametrize("entity", [Category, Product])
def test_domain_requires_translations(entity):
    with pytest.raises(ValueError):
        entity(uuid4(), "art", "هنر", " ", True)


def test_sku_domain_validation():
    with pytest.raises(ValueError):
        SKU(uuid4(), uuid4(), " ", True)
    with pytest.raises(ValueError):
        SKU(uuid4(), uuid4(), "CODE", True, Money(Decimal("0.0000001")))
    assert SKU(uuid4(), uuid4(), "CODE", True).price is None
    assert SKU(uuid4(), uuid4(), "CODE", True, Money(Decimal("0"))).price.amount == 0


def test_query_ports_and_validation():
    class Repository:
        def published_detail(self, slug):
            return slug

        def page(self, *args):
            return args

    assert GetCollection(Repository()).execute("art") == "art"
    assert ListCatalog(Repository()).execute("products", 2, 10, "art", "prints") == (
        "products", 2, 10, "art", "prints")
    with pytest.raises(ValueError):
        ListCatalog(None).execute("products", 1, 101)


def test_migration_preserves_existing_collection_and_reverses():
    directory = Path(__file__).resolve().parents[1] / "migrations" / "versions"
    modules = []
    for filename in ["0002_catalog.py", "0003_catalog_foundation.py"]:
        spec = importlib.util.spec_from_file_location(filename, directory / filename)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        modules.append(module)
    engine = create_engine("sqlite://")
    with engine.begin() as connection:
        with Operations.context(MigrationContext.configure(connection)):
            modules[0].upgrade()
            connection.execute(text("INSERT INTO catalog_collections "
                "(id, slug, title_fa, title_en, published) "
                "VALUES (:id, 'existing', 'هنر', 'Art', true)"), {"id": uuid4().hex})
            modules[1].upgrade()
            assert connection.execute(text("SELECT description_en FROM catalog_collections "
                                           "WHERE slug = 'existing'")).scalar_one() == ""
            # 0016 product presentations are covered by their own migration test.
            foundation_tables = set(Base.metadata.tables) - {"catalog_product_presentations"}
            assert foundation_tables.issubset(inspect(connection).get_table_names())
            assert {column["name"] for column in inspect(connection).get_columns(
                "catalog_products")} == {"id", "slug", "title_fa", "title_en",
                                          "published", "description_fa", "description_en"}
            for table, field in [("catalog_product_collections", "collection_id"),
                                 ("catalog_product_categories", "category_id")]:
                assert inspect(connection).get_pk_constraint(table)["constrained_columns"] == [
                    "product_id", field]
            modules[1].downgrade()
            assert connection.execute(text("SELECT slug FROM catalog_collections")).scalar_one() == "existing"
            assert "catalog_products" not in inspect(connection).get_table_names()
    engine.dispose()


def test_unpublished_associations_do_not_hide_product_or_sku(catalog):
    client, _, _ = catalog
    for slug, field, sku in [
        ("private-collection", "collection_ids", "HIDDEN-COLLECTION"),
        ("private-category", "category_ids", "HIDDEN-CATEGORY"),
    ]:
        response = client.get(f"/api/v1/catalog/products/{slug}")
        assert response.status_code == 200
        assert response.json()[field] == []
        assert client.get(f"/api/v1/catalog/skus/{sku}").status_code == 200


def test_shared_product_multiple_memberships_keep_one_product_and_sku(catalog):
    client, engine, product_id = catalog
    second_collection, second_category = uuid4(), uuid4()
    with Session(engine) as session:
        first_collection = session.query(CollectionRow).filter_by(slug="art").one().id
        first_category = session.query(CategoryRow).filter_by(slug="prints").one().id
        draft_collection = session.query(CollectionRow).filter_by(slug="draft-collection").one().id
        draft_category = session.query(CategoryRow).filter_by(slug="draft-category").one().id
        session.add(CollectionRow(id=second_collection, slug="second", title_fa="هنر",
                                  title_en="Second", published=True))
        session.add(CategoryRow(id=second_category, slug="second-category", title_fa="هنر",
                                title_en="Second", published=True))
        session.flush()
        session.add_all([
            ProductCollectionRow(product_id=product_id, collection_id=second_collection),
            ProductCollectionRow(product_id=product_id, collection_id=draft_collection),
            ProductCategoryRow(product_id=product_id, category_id=second_category),
            ProductCategoryRow(product_id=product_id, category_id=draft_category),
        ])
        session.commit()
        original_sku_id = str(session.query(SKURow).filter_by(code="PRINT-A").one().id)
        assert session.query(SKURow).filter_by(code="PRINT-A").count() == 1

    detail = client.get("/api/v1/catalog/products/art-print").json()
    assert detail["collection_ids"] == [str(first_collection), str(second_collection)]
    assert detail["category_ids"] == [str(first_category), str(second_category)]
    assert "collection_id" not in detail and "category_id" not in detail
    for query in ["collection=art&category=second-category", "collection=second",
                  "category=second-category", "collection=second&category=prints"]:
        response = client.get(f"/api/v1/catalog/products?{query}&page_size=1").json()
        assert response["total"] == 1
        assert [item["id"] for item in response["items"]] == [str(product_id)]
        assert response["items"][0] == detail
        skus = client.get(f"/api/v1/catalog/products/{response['items'][0]['slug']}/skus").json()
        assert skus[0]["id"] == original_sku_id
        assert skus[0]["product_id"] == str(product_id)

    pages = [client.get(f"/api/v1/catalog/products?page_size=1&page={page}").json()
             for page in range(1, 5)]
    assert all(page["total"] == 4 for page in pages)
    assert len({page["items"][0]["id"] for page in pages}) == 4
    all_skus = client.get("/api/v1/catalog/skus").json()
    assert all_skus["total"] == 4
    assert sum(item["id"] == original_sku_id for item in all_skus["items"]) == 1

    with Session(engine) as session:
        session.get(CollectionRow, second_collection).published = False
        session.get(CategoryRow, second_category).published = False
        session.commit()
    detail = client.get("/api/v1/catalog/products/art-print").json()
    assert detail["collection_ids"] == [str(first_collection)]
    assert detail["category_ids"] == [str(first_category)]
    assert client.get("/api/v1/catalog/products?collection=second").json()["total"] == 0
    assert client.get("/api/v1/catalog/products?category=second-category").json()["total"] == 0
    assert client.get("/api/v1/catalog/skus/PRINT-A").json()["id"] == original_sku_id


@pytest.mark.parametrize("association,parent", [
    (ProductCollectionRow, CollectionRow), (ProductCategoryRow, CategoryRow),
])
def test_associations_reject_duplicate_and_orphan_links(catalog, association, parent):
    _, engine, product_id = catalog
    field = "collection_id" if association is ProductCollectionRow else "category_id"
    with Session(engine) as session:
        parent_id = session.query(parent).filter_by(published=True).one().id
    for linked_product, linked_parent in [(product_id, parent_id), (uuid4(), parent_id),
                                          (product_id, uuid4())]:
        with Session(engine) as session:
            session.add(association(product_id=linked_product, **{field: linked_parent}))
            with pytest.raises(IntegrityError):
                session.flush()


@pytest.mark.parametrize("page_size,expected_count", [(1, 1), (24, 4)])
def test_product_page_batches_published_associations(catalog, page_size, expected_count):
    client, engine, _ = catalog
    statements = []

    def record(connection, cursor, statement, parameters, context, executemany):
        statements.append(statement)

    event.listen(engine, "before_cursor_execute", record)
    try:
        response = client.get(f"/api/v1/catalog/products?page_size={page_size}")
    finally:
        event.remove(engine, "before_cursor_execute", record)
    assert response.status_code == 200
    assert len(response.json()["items"]) == expected_count
    assert len(statements) == 4  # Count, page, collection links, category links.
    for item in response.json()["items"]:
        detail = client.get(f"/api/v1/catalog/products/{item['slug']}").json()
        assert item == detail


def test_empty_product_page_skips_association_queries(catalog):
    client, engine, _ = catalog
    statements = []

    def record(connection, cursor, statement, parameters, context, executemany):
        statements.append(statement)

    event.listen(engine, "before_cursor_execute", record)
    try:
        response = client.get("/api/v1/catalog/products?page=100")
    finally:
        event.remove(engine, "before_cursor_execute", record)
    assert response.status_code == 200
    assert response.json()["items"] == []
    assert response.json()["total"] == 4
    assert len(statements) == 2


@pytest.mark.parametrize("slug,status,size,queries", [
    ("art-print", 200, 2, 2), ("empty", 200, 0, 2),
    ("draft-product", 404, None, 1), ("missing", 404, None, 1),
])
def test_product_skus_only_query_visibility_and_skus(catalog, slug, status, size, queries):
    client, engine, _ = catalog
    statements = []

    def record(connection, cursor, statement, parameters, context, executemany):
        statements.append(statement)

    event.listen(engine, "before_cursor_execute", record)
    try:
        response = client.get(f"/api/v1/catalog/products/{slug}/skus")
    finally:
        event.remove(engine, "before_cursor_execute", record)
    assert response.status_code == status
    assert len(statements) == queries
    assert all("catalog_product_collections" not in sql and "catalog_product_categories" not in sql
               for sql in statements)
    if size is not None:
        assert len(response.json()) == size
        assert [item["code"] for item in response.json()] == (["PRINT-A", "PRINT-B"] if size else [])
