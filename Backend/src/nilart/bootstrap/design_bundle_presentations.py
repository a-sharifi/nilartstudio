"""Opt-in local reference bundle choices/prices; never inventory or retail approval."""

import argparse
import json
import os
from decimal import Decimal
from pathlib import Path

from sqlalchemy import create_engine, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from nilart.bootstrap.design_catalog import NOTICE_EN
from nilart.contexts.catalog.domain.bundle_presentation import BundlePresentation
from nilart.contexts.catalog.infrastructure.repository import ProductRow, SKURow


def seed_bundle_presentations(db, fixture):
    staged = []
    for entry in fixture:
        bundle = (
            db.execute(
                text("SELECT id,description_en FROM catalog_bundles WHERE slug=:slug FOR UPDATE"),
                {"slug": entry["slug"]},
            )
            .mappings()
            .one_or_none()
        )
        if not bundle or NOTICE_EN not in bundle["description_en"]:
            raise ValueError("Expected reference test bundle")
        document = dict(entry["document"])
        choices = []
        for item in entry["choices"]:
            base = db.scalar(select(SKURow).where(SKURow.code == item["base_code"]))
            if not base or not db.scalar(
                text(
                    "SELECT 1 FROM catalog_bundle_components WHERE bundle_id=:bundle AND sku_id=:sku"
                ),
                {"bundle": bundle["id"], "sku": base.id},
            ):
                raise ValueError("Invalid component")
            allowed = []
            for code in item["allowed_codes"]:
                sku = db.scalar(select(SKURow).where(SKURow.code == code))
                product = db.get(ProductRow, sku.product_id) if sku else None
                if (
                    not sku
                    or not sku.published
                    or sku.product_id != base.product_id
                    or not product
                    or product.description_en != NOTICE_EN
                ):
                    raise ValueError("Invalid reference choice")
                allowed.append(str(sku.id))
            choices.append({"component_sku_id": str(base.id), "allowed_sku_ids": allowed})
        document.update(sample=True, component_choices=choices)
        document = BundlePresentation.model_validate(document).model_dump(mode="json")
        existing = db.execute(
            text("SELECT document FROM catalog_bundle_presentations WHERE bundle_id=:id"),
            {"id": bundle["id"]},
        ).scalar_one_or_none()
        if existing is not None and existing != document:
            raise ValueError("Never overwrite a different presentation")
        staged.append((bundle["id"], document, existing))
    prices = []
    for code, amount in [
        ("TEST-DESIGN-CATS-STICKERS", "35000"),
        ("TEST-DESIGN-CATS-BOOKMARK", "30000"),
    ]:
        sku = db.scalar(select(SKURow).where(SKURow.code == code).with_for_update())
        product = db.get(ProductRow, sku.product_id) if sku else None
        if (
            not sku
            or not product
            or product.description_en != NOTICE_EN
            or (
                sku.price_amount is not None
                and (sku.price_amount != Decimal(amount) or sku.currency != "IRT")
            )
        ):
            raise ValueError("Never overwrite a different price")
        prices.append((sku, Decimal(amount)))
    for id, document, existing in staged:
        if existing is None:
            db.execute(
                text(
                    "INSERT INTO catalog_bundle_presentations VALUES(:id,CAST(:document AS jsonb),true)"
                ),
                {"id": id, "document": json.dumps(document)},
            )
    for sku, price_amount in prices:
        sku.price_amount = price_amount
        sku.currency = "IRT"
    db.flush()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--local-test-data", action="store_true", required=True)
    parser.add_argument("--fixture", type=Path, required=True)
    args = parser.parse_args()
    if os.environ.get("NILART_ENVIRONMENT", "development") != "development":
        parser.error("Reference test data is restricted to development")
    url = make_url(os.environ["NILART_DATABASE_URL"])
    if url.get_backend_name() != "postgresql" or url.host not in {
        "postgres",
        "localhost",
        "127.0.0.1",
    }:
        parser.error("Only local PostgreSQL is supported")
    engine = create_engine(url)
    try:
        with Session(engine) as db, db.begin():
            seed_bundle_presentations(db, json.loads(args.fixture.read_text()))
    finally:
        engine.dispose()
    print("Saved explicitly marked reference bundle test choices and prices; no stock or orders.")


if __name__ == "__main__":
    main()
