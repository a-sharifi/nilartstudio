"""Explicit, opt-in demo data for an already-migrated PostgreSQL database."""
import argparse
import re
from decimal import Decimal, InvalidOperation
from uuid import UUID, uuid4

from sqlalchemy import create_engine, select
from sqlalchemy.engine import make_url
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from nilart.contexts.catalog.domain.entities import SKU
from nilart.contexts.catalog.infrastructure.repository import (
    CategoryRow,
    CollectionRow,
    ProductCategoryRow,
    ProductCollectionRow,
    ProductRow,
    SKURow,
)
from nilart.shared.money import Money


def seed_demo(session: Session, prefix: str = "demo-catalog",
              price: Decimal | None = None, currency: str = "IRT") -> UUID:
    """Stage one shared product and one SKU; caller owns the transaction."""
    if not re.fullmatch(r"demo-[a-z0-9-]{1,100}", prefix):
        raise ValueError("Demo prefix must start with demo- and use lowercase slug characters")
    product_id, sku_id = uuid4(), uuid4()
    code = prefix + "-sku"
    money = None if price is None else Money(price, currency)
    SKU(sku_id, product_id, code, True, money)
    collection_slugs = [prefix + "-collection-1", prefix + "-collection-2"]
    category_slugs = [prefix + "-category-1", prefix + "-category-2"]
    for id_column, column, keys in [
        (ProductRow.id, ProductRow.slug, [prefix + "-product"]),
        (SKURow.id, SKURow.code, [code]),
        (CollectionRow.id, CollectionRow.slug, collection_slugs),
        (CategoryRow.id, CategoryRow.slug, category_slugs),
    ]:
        if session.scalar(select(id_column).where(column.in_(keys)).limit(1)) is not None:
            raise ValueError("Demo records already exist; choose another demo prefix")
    collections = [CollectionRow(id=uuid4(), slug=slug, title_fa="مجموعه نمایشی",
                                 title_en="Demo collection", published=True)
                   for slug in collection_slugs]
    categories = [CategoryRow(id=uuid4(), slug=slug, title_fa="دسته نمایشی",
                             title_en="Demo category", published=True)
                  for slug in category_slugs]
    session.add_all([*collections, *categories, ProductRow(
        id=product_id, slug=prefix + "-product", title_fa="محصول نمایشی",
        title_en="Demo shared product", published=True)])
    session.flush()
    session.add_all([
        *[ProductCollectionRow(product_id=product_id, collection_id=row.id) for row in collections],
        *[ProductCategoryRow(product_id=product_id, category_id=row.id) for row in categories],
        SKURow(id=sku_id, product_id=product_id, code=code, published=True,
               price_amount=None if money is None else money.amount,
               currency=None if money is None else money.currency),
    ])
    session.flush()
    return product_id


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database-url", required=True,
                        help="Explicit PostgreSQL demo database URL; never uses application defaults")
    parser.add_argument("--prefix", default="demo-catalog")
    parser.add_argument("--price", help="Explicit Decimal price; omitted means unknown, not zero")
    parser.add_argument("--currency", choices=["IRT", "IRR"], default="IRT")
    args = parser.parse_args(argv)
    try:
        url = make_url(args.database_url)
        if url.get_backend_name() != "postgresql":
            parser.error("The demo CLI requires an explicit real PostgreSQL database")
        if url.drivername == "postgresql":
            url = url.set(drivername="postgresql+psycopg")
        price = None if args.price is None else Decimal(args.price)
    except (ValueError, InvalidOperation, SQLAlchemyError):
        parser.error("Invalid database URL or Decimal price")
    engine = None
    try:
        engine = create_engine(url, connect_args={"connect_timeout": 3})
        with Session(engine) as session, session.begin():
            seed_demo(session, args.prefix, price, args.currency)
    except ValueError as exc:
        parser.exit(2, f"{exc}\n")
    except (SQLAlchemyError, ImportError):
        # Do not print a connection URL, credentials, or database exception payload.
        parser.exit(2, "Demo failed; verify the PostgreSQL connection and applied migrations.\n")
    finally:
        if engine is not None:
            engine.dispose()
    print("Created demo: two collections, two categories, one product, one SKU; no stock created.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
