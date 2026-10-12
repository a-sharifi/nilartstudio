"""Explicit local test catalog imported from the pinned design reference."""
import argparse
import json
import os
from pathlib import Path
from uuid import uuid4

from sqlalchemy import create_engine, select
from sqlalchemy.engine import make_url
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from nilart.contexts.catalog.infrastructure.repository import (
    CategoryRow,
    CollectionRow,
    ProductCategoryRow,
    ProductCollectionRow,
    ProductRow,
)

NOTICE_FA = "داده آزمایشی از مرجع طراحی؛ محصول واقعی یا تأیید فروش نیست."
NOTICE_EN = "Test data from the design reference; not a real product or approved sale."


def seed_design_catalog(session: Session, fixture: dict) -> dict[str, int]:
    """Stage explicit published test descriptions; caller owns the transaction.

    Existing slugs are rejected before any insert. No SKUs, prices, inventory,
    users, permissions or financial records are created.
    """
    groups: list[tuple[type[CollectionRow | CategoryRow | ProductRow], str]] = [
              (CollectionRow, "collections"), (CategoryRow, "categories"),
              (ProductRow, "products")]
    for model, key in groups:
        slugs = [row["slug"] for row in fixture[key]]
        if len(set(slugs)) != len(slugs):
            raise ValueError("Duplicate fixture slug")
        if session.scalar(select(model.id).where(model.slug.in_(slugs)).limit(1)):
            raise ValueError("Reference test slugs already exist; existing records were not modified")
    collections: dict[str, CollectionRow | CategoryRow] = {}
    categories: dict[str, CollectionRow | CategoryRow] = {}
    description_groups: list[tuple[type[CollectionRow | CategoryRow], str,
                                   dict[str, CollectionRow | CategoryRow]]] = [
        (CollectionRow, "collections", collections), (CategoryRow, "categories", categories),
    ]
    for description_model, key, lookup in description_groups:
        for row in fixture[key]:
            entity = description_model(
                id=uuid4(), slug=row["slug"], title_fa=row["title_fa"],
                title_en=row["title_en"], published=True,
                description_fa=(row.get("description_fa", "") + "\n\n" + NOTICE_FA).strip(),
                description_en=(row.get("description_en", "") + "\n\n" + NOTICE_EN).strip(),
            )
            session.add(entity)
            lookup[row["slug"]] = entity
    session.flush()
    for row in fixture["products"]:
        collection = collections[row["collection"]]
        category = categories[row["category"]]
        product = ProductRow(
            id=uuid4(), slug=row["slug"], title_fa=row["title_fa"],
            title_en=row["title_en"], published=True,
            description_fa=NOTICE_FA, description_en=NOTICE_EN,
        )
        session.add(product)
        session.flush()
        session.add_all([
            ProductCollectionRow(product_id=product.id, collection_id=collection.id),
            ProductCategoryRow(product_id=product.id, category_id=category.id),
        ])
    session.flush()
    return {key: len(fixture[key]) for _, key in groups}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--local-test-data", action="store_true", required=True,
                        help="Explicitly authorize test data in the local development database")
    parser.add_argument("--fixture", type=Path, required=True)
    args = parser.parse_args()
    # The local Docker service supplies credentials; never put them in argv or logs.
    url = make_url(os.environ["NILART_DATABASE_URL"])
    if url.get_backend_name() != "postgresql" or url.host not in {"postgres", "localhost", "127.0.0.1"}:
        parser.error("Only the explicit local PostgreSQL development service is supported")
    fixture = json.loads(args.fixture.read_text())
    engine = create_engine(url, connect_args={"connect_timeout": 3})
    try:
        with Session(engine) as session, session.begin():
            counts = seed_design_catalog(session, fixture)
    except (SQLAlchemyError, ValueError):
        parser.exit(2, "Import failed; check local migrations and conflicting catalog slugs. No existing records were changed.\n")
    finally:
        engine.dispose()
    print(f"Created local reference test catalog: {counts}; no prices, SKUs or stock.")


if __name__ == "__main__":
    main()
