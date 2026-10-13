"""Explicit remaining local test bundles from design-reference/src/catalog.ts."""
import argparse
import os
from uuid import uuid4

from sqlalchemy import create_engine, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from nilart.bootstrap.design_catalog import NOTICE_EN, NOTICE_FA
from nilart.contexts.catalog.infrastructure.repository import (
    CategoryRow,
    CollectionRow,
    ProductCategoryRow,
    ProductCollectionRow,
    ProductRow,
    SKURow,
)


def seed_bundle_sets(db):
    collection = db.scalar(select(CollectionRow).where(CollectionRow.slug == "gorbe"))
    category = db.scalar(select(CategoryRow).where(CategoryRow.slug == "notebooks"))
    shared = []
    for code, quantity in [("TEST-DESIGN-CATS-STICKERS", 2), ("TEST-DESIGN-CATS-BOOKMARK", 1)]:
        sku = db.scalar(select(SKURow).where(SKURow.code == code))
        product = db.get(ProductRow, sku.product_id) if sku else None
        if not sku or not product or product.description_en != NOTICE_EN:
            raise ValueError("Seed the local Cats bundle first")
        shared.append((sku.id, quantity))
    if not collection or not category:
        raise ValueError("Missing reference membership")
    entries = [
        ("cat-ruled", "دفتر خط‌دار — گربه", "Ruled notebook — Cats", "TEST-DESIGN-CATS-RULED", "cat-everyday-set", "پکیج روزمره گربه", "Cats everyday bundle", "یک دفتر + دو استیکر + یک نشانک", "1 notebook + 2 stickers + 1 bookmark"),
        ("cat-ruled-hard", "دفتر خط‌دار جلد سخت — گربه", "Hardcover notebook — Cats", "TEST-DESIGN-CATS-HARDCOVER", "cat-keepsake-set", "پکیج یادگاری گربه", "Cats keepsake bundle", "یک دفتر جلد سخت + دو استیکر + یک نشانک", "1 hardcover notebook + 2 stickers + 1 bookmark"),
    ]
    for slug, _, _, code, bundle_slug, *_ in entries:
        if db.scalar(select(ProductRow.id).where(ProductRow.slug == slug)) or db.scalar(select(SKURow.id).where(SKURow.code == code)) or db.scalar(text("SELECT id FROM catalog_bundles WHERE slug=:slug"), {"slug": bundle_slug}):
            raise ValueError("Reference identity exists; never overwrite")
    for slug, fa, en, code, bundle_slug, bundle_fa, bundle_en, summary_fa, summary_en in entries:
        product = ProductRow(id=uuid4(), slug=slug, title_fa=fa, title_en=en,
                             description_fa=NOTICE_FA, description_en=NOTICE_EN, published=True)
        db.add(product)
        db.flush()
        db.add_all([ProductCollectionRow(product_id=product.id, collection_id=collection.id),
                    ProductCategoryRow(product_id=product.id, category_id=category.id)])
        sku = SKURow(id=uuid4(), product_id=product.id, code=code, published=True, price_amount=None, currency=None)
        db.add(sku)
        db.flush()
        bundle = uuid4()
        db.execute(text("INSERT INTO catalog_bundles (id,slug,title_fa,title_en,description_fa,description_en,published) "
                        "VALUES (:id,:slug,:fa,:en,:summary_fa,:summary_en,true)"),
                   {"id": bundle, "slug": bundle_slug, "fa": bundle_fa, "en": bundle_en,
                    "summary_fa": summary_fa + "\n\n" + NOTICE_FA, "summary_en": summary_en + "\n\n" + NOTICE_EN})
        for sku_id, quantity in [(sku.id, 1), *shared]:
            db.execute(text("INSERT INTO catalog_bundle_components (bundle_id,sku_id,quantity) VALUES (:bundle,:sku,:quantity)"),
                       {"bundle": bundle, "sku": sku_id, "quantity": quantity})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--local-test-data", action="store_true", required=True)
    parser.parse_args()
    url = make_url(os.environ["NILART_DATABASE_URL"])
    if url.get_backend_name() != "postgresql" or url.host not in {"postgres", "localhost", "127.0.0.1"}:
        parser.error("Only local PostgreSQL is supported")
    engine = create_engine(url)
    try:
        with Session(engine) as db, db.begin():
            seed_bundle_sets(db)
    except (SQLAlchemyError, ValueError):
        parser.exit(2, "Import failed; transaction rolled back. Existing records were not overwritten.\n")
    finally:
        engine.dispose()
    print("Added two local reference test bundles, two products and two unpriced SKUs; no stock.")


if __name__ == "__main__":
    main()
