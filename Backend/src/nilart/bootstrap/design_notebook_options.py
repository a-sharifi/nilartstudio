"""Opt-in local product detail fixtures; no approved prices or inventory."""
import argparse
import json
import os
from pathlib import Path
from uuid import uuid4

from sqlalchemy import create_engine, select
from sqlalchemy.engine import make_url
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from nilart.bootstrap.design_catalog import NOTICE_EN
from nilart.contexts.catalog.domain.presentation import ProductPresentation
from nilart.contexts.catalog.infrastructure.repository import (
    ProductPresentationRow,
    ProductRow,
    SKURow,
)


def seed_notebook_options(session, fixture):
    staged = []
    for entry in fixture:
        product = session.scalar(select(ProductRow).where(ProductRow.slug == entry["slug"]))
        if not product or product.description_en != NOTICE_EN:
            raise ValueError("Expected local reference test product")
        existing = session.get(ProductPresentationRow, product.id)
        expected = entry["expected_document"]
        if expected is None:
            if existing:
                raise ValueError("Unexpected presentation; never overwrite")
        elif not existing or ProductPresentation.model_validate(existing.document) != ProductPresentation.model_validate(expected):
            raise ValueError("Presentation changed; never overwrite")
        document = ProductPresentation.model_validate(entry["document"]).model_dump(mode="json")
        codes = [row["code"] for row in document["option_combinations"]]
        if session.scalar(select(SKURow.id).where(SKURow.code.in_(codes))):
            raise ValueError("Reference options already exist")
        staged.append((product, existing, document, codes))
    for product, existing, document, codes in staged:
        if existing:
            existing.document = document
        else:
            session.add(ProductPresentationRow(product_id=product.id, document=document, published=True))
        for code in codes:
            session.add(SKURow(id=uuid4(), product_id=product.id, code=code, published=True, price_amount=None, currency=None))
    session.flush()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--local-test-data", action="store_true", required=True)
    parser.add_argument("--fixture", type=Path, required=True)
    args = parser.parse_args()
    url = make_url(os.environ["NILART_DATABASE_URL"])
    if url.get_backend_name() != "postgresql" or url.host not in {"postgres", "localhost", "127.0.0.1"}:
        parser.error("Only local PostgreSQL is supported")
    engine = create_engine(url, connect_args={"connect_timeout": 3})
    try:
        with Session(engine) as session, session.begin():
            seed_notebook_options(session, json.loads(args.fixture.read_text()))
    except (SQLAlchemyError, ValueError):
        parser.exit(2, "Import failed; transaction rolled back. Existing details were not overwritten.\n")
    finally:
        engine.dispose()
    print("Imported four local notebook option profiles and twelve unpriced test variants; no stock.")


if __name__ == "__main__":
    main()
