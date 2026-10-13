"""Explicit local test prices from design-reference; never approved retail prices."""
import argparse
import json
import os
from decimal import Decimal
from pathlib import Path

from sqlalchemy import create_engine, select
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from nilart.bootstrap.design_catalog import NOTICE_EN
from nilart.contexts.catalog.infrastructure.repository import ProductRow, SKURow


def seed_test_prices(session, fixture):
    staged = []
    for entry in fixture:
        row = session.scalar(select(SKURow).where(SKURow.code == entry["code"]).with_for_update())
        product = session.get(ProductRow, row.product_id) if row else None
        if not row or not row.code.startswith(("TEST-REF-", "TEST-DESIGN-")) or not product or product.description_en != NOTICE_EN:
            raise ValueError("Expected local reference test SKU")
        amount = Decimal(str(entry["amount"]))
        if not amount.is_finite() or amount < 0 or entry["currency"] not in {"IRT", "IRR"}:
            raise ValueError("Invalid fixture price")
        if row.price_amount is not None:
            if row.price_amount != amount or row.currency != entry["currency"]:
                raise ValueError("Never overwrite an existing different price")
        staged.append((row, amount, entry["currency"]))
    for row, amount, currency in staged:
        row.price_amount = amount
        row.currency = currency
    session.flush()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--local-test-data", action="store_true", required=True)
    parser.add_argument("--fixture", type=Path, required=True)
    args = parser.parse_args()
    if os.environ.get("NILART_ENVIRONMENT", "development") != "development":
        parser.error("Reference test data is restricted to development")
    url = make_url(os.environ["NILART_DATABASE_URL"])
    if url.get_backend_name() != "postgresql" or url.host not in {"postgres", "localhost", "127.0.0.1"}:
        parser.error("Only local PostgreSQL is supported")
    engine = create_engine(url)
    try:
        with Session(engine) as session, session.begin():
            seed_test_prices(session, json.loads(args.fixture.read_text()))
    finally:
        engine.dispose()
    print("Saved reference test prices; no inventory or order records created.")


if __name__ == "__main__":
    main()
