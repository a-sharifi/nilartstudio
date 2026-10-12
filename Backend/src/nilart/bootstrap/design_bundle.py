"""Explicit local Cats bundle fixture from design-reference/src/catalog.ts."""
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


def seed_design_bundle(session: Session) -> None:
    """Caller owns transaction. Reject conflicts; never overwrite existing records."""
    collection = session.scalar(select(CollectionRow).where(CollectionRow.slug == "gorbe"))
    book = session.scalar(select(ProductRow).where(ProductRow.slug == "cats-sketchbook-127gsm"))
    if not collection or not book or book.description_en != NOTICE_EN:
        raise ValueError("Seed the local reference test catalog first")
    if session.scalar(text("SELECT id FROM catalog_bundles WHERE slug='cats-bundle'")):
        raise ValueError("Reference bundle already exists")
    entries = [("cat-stickers", "استیکر — گربه", "Sticker — Cats", "stickers", 2),
               ("cat-bookmark", "نشانک — گربه", "Bookmark — Cats", "bookmarks", 1)]
    if session.scalar(select(ProductRow.id).where(ProductRow.slug.in_([e[0] for e in entries]))):
        raise ValueError("Reference product slug already exists")
    codes = ["TEST-DESIGN-CATS-BOOK", "TEST-DESIGN-CATS-STICKERS", "TEST-DESIGN-CATS-BOOKMARK"]
    if session.scalar(select(SKURow.id).where(SKURow.code.in_(codes))):
        raise ValueError("Reference SKU code already exists")
    products = [(book, 1)]
    for slug, fa, en, category_slug, quantity in entries:
        category = session.scalar(select(CategoryRow).where(CategoryRow.slug == category_slug))
        if not category:
            raise ValueError("Missing reference category")
        product = ProductRow(id=uuid4(), slug=slug, title_fa=fa, title_en=en,
                             description_fa=NOTICE_FA, description_en=NOTICE_EN, published=True)
        session.add(product)
        session.flush()
        session.add_all([ProductCollectionRow(product_id=product.id, collection_id=collection.id),
                        ProductCategoryRow(product_id=product.id, category_id=category.id)])
        products.append((product, quantity))
    bundle_id = uuid4()
    session.execute(text("INSERT INTO catalog_bundles "
        "(id,slug,title_fa,title_en,description_fa,description_en,published) "
        "VALUES (:id,'cats-bundle','پکیج گربه','Cats bundle',:fa,:en,true)"),
        {"id": bundle_id, "fa": "یک دفتر طراحی + دو استیکر + یک نشانک\n\n" + NOTICE_FA,
         "en": "1 sketchbook + 2 stickers + 1 bookmark\n\n" + NOTICE_EN})
    for (product, quantity), code in zip(products, codes, strict=True):
        sku = SKURow(id=uuid4(), product_id=product.id, code=code, published=True,
                     price_amount=None, currency=None)
        session.add(sku)
        session.flush()
        session.execute(text("INSERT INTO catalog_bundle_components (bundle_id,sku_id,quantity) "
                             "VALUES (:bundle,:sku,:quantity)"),
                        {"bundle": bundle_id, "sku": sku.id, "quantity": quantity})


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--local-test-data", action="store_true", required=True)
    parser.parse_args()
    url = make_url(os.environ["NILART_DATABASE_URL"])
    if url.get_backend_name() != "postgresql" or url.host not in {"postgres", "localhost", "127.0.0.1"}:
        parser.error("Only the local PostgreSQL development service is supported")
    engine = create_engine(url, connect_args={"connect_timeout": 3})
    try:
        with Session(engine) as session, session.begin():
            seed_design_bundle(session)
    except (SQLAlchemyError, ValueError):
        parser.exit(2, "Import failed; check local reference fixtures and conflicting records. Transaction rolled back.\n")
    finally:
        engine.dispose()
    print("Created local Cats test bundle, two products and three unpriced test SKUs; no stock.")


if __name__ == "__main__":
    main()
