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


def seed_product_details(session, fixture):
    staged = []
    slugs, codes = set(), set()
    for entry in fixture:
        slug = entry["slug"]
        code = entry.get("sku_code")
        if slug in slugs or (code and code in codes):
            raise ValueError("Duplicate fixture identity")
        slugs.add(slug)
        if code:
            codes.add(code)
        product = session.scalar(select(ProductRow).where(ProductRow.slug == slug))
        if not product or product.description_en != NOTICE_EN:
            raise ValueError("Expected existing local reference test product")
        if session.get(ProductPresentationRow, product.id):
            raise ValueError("Presentation exists; never overwrite")
        if code and session.scalar(select(SKURow.id).where(SKURow.code == code)):
            raise ValueError("Test SKU already exists")
        document = ProductPresentation.model_validate(entry["document"]).model_dump(mode="json")
        staged.append((product, code, document))
    for product, code, document in staged:
        session.add(ProductPresentationRow(product_id=product.id, document=document, published=True))
        if code:
            session.add(SKURow(id=uuid4(), product_id=product.id, code=code, published=True,
                               price_amount=None, currency=None))
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
            seed_product_details(session, json.loads(args.fixture.read_text()))
    except (SQLAlchemyError, ValueError):
        parser.exit(2, "Import failed; transaction rolled back. Existing details were not overwritten.\n")
    finally:
        engine.dispose()
    print("Imported four local product detail fixtures and three unpriced test SKUs; no stock.")


if __name__ == "__main__":
    main()
