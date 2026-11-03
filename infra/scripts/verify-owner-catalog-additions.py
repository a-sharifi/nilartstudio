#!/usr/bin/env python3
"""Read-only verification of the owner's independent sticker and Mandala products."""

import argparse
import hashlib
import io
import json
import urllib.error
import urllib.request
from decimal import Decimal
from pathlib import Path

from nilart.shared.database import engine
from PIL import Image
from sqlalchemy import text
from sqlalchemy.orm import Session


def get(base, path, expected=200):
    try:
        with urllib.request.urlopen(base + path, timeout=30) as response:
            status, data = response.status, response.read()
    except urllib.error.HTTPError as error:
        status, data = error.code, error.read()
    if status != expected:
        raise RuntimeError(f"Unexpected public status {status}: {path}")
    return data


def one(db, query, **params):
    return db.execute(text(query), params).mappings().one()


def commerce(db, id, cost, price):
    row = one(
        db,
        "SELECT s.code,s.published,s.price_amount,s.currency,c.unit_cost,"
        "p.quantity,p.reserved,p.value FROM catalog_skus s "
        "JOIN simple_variant_costs c ON c.sku_id=s.id "
        "JOIN inventory_positions p ON p.kind='sku' AND p.reference_id=s.id "
        "WHERE s.id=:id",
        id=id,
    )
    assert row["currency"] == "IRT" and row["price_amount"] == price
    assert row["unit_cost"] == cost
    return dict(row)


def verify(db, base, manifest):
    db.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY"))
    category = json.loads(
        get(base, "/api/v1/catalog/categories/switch-socket-stickers")
    )
    products = []
    images_checked = 0
    for design in ["gorbe", "gav", "roh", "qolche"]:
        slug = f"{design}-switch-sticker"
        product = json.loads(get(base, "/api/v1/catalog/products/" + slug))
        assert category["id"] in product["category_ids"]
        assert (
            "پریز" in product["description_fa"]
            and "not included" in product["description_en"]
        )
        gallery = json.loads(
            get(base, "/api/v1/catalog/profiles/products/" + product["id"])
        )
        assert len(gallery["gallery"]) == 6
        skus = json.loads(get(base, "/api/v1/catalog/products/" + slug + "/skus"))
        assert len(skus) == 3
        rows = []
        for pose in range(1, 4):
            code = f"NIL-{design.upper()}-SWITCH-STICKER-{pose}"
            sku = next(s for s in skus if s["code"] == code)
            assert Decimal(sku["price"]["amount"]) == 50000
            values = commerce(db, sku["id"], 10000, 50000)
            assert values["published"]
            profile = json.loads(
                get(base, "/api/v1/catalog/profiles/skus/" + sku["id"])
            )
            assert profile["delivery"] == "physical" and profile["returnable"]
            assert profile["weight_grams"] == 20 and profile["weight_estimated"]
            assert len(profile["gallery"]) == 2
            original = next(
                a
                for a in manifest["assets"]
                if a["kind"] == "sticker"
                and a["design"] == design
                and a["pose"] == pose
            )
            w, h = original["dimensions_cm"]
            assert Decimal(str(profile["length_cm"])) == Decimal(
                str(round(max(w, h), 2))
            )
            assert Decimal(str(profile["width_cm"])) == Decimal(
                str(round(min(w, h), 2))
            )
            options = json.loads(get(base, "/api/v1/catalog/skus/" + code + "/options"))
            assert options["combination"]["code"] == code
            for image, expected_sha in zip(
                profile["gallery"],
                [original["installed_sha256"], original["sha256"]],
                strict=True,
            ):
                path = f"/api/v1/media/{image['asset_id']}/versions/{image['revision_id']}/content"
                data = get(base, path)
                assert len(data) <= 5 * 1024 * 1024
                assert hashlib.sha256(data).hexdigest() == expected_sha
                photo = Image.open(io.BytesIO(data))
                photo.load()
                assert photo.mode == "RGBA" and photo.size == (1600, 1600)
                assert photo.getpixel((0, 0))[3] == 0
                thumbnail = Image.open(io.BytesIO(get(base, path + "?thumbnail=true")))
                assert max(thumbnail.size) <= 480
                images_checked += 1
            rows.append({"id": sku["id"], **values})
        products.append({"slug": slug, "id": product["id"], "variants": rows})
    book = one(db, "SELECT * FROM catalog_products WHERE slug='mandala-spiral-book'")
    row = one(db, "SELECT id FROM catalog_skus WHERE product_id=:id", id=book["id"])
    values = commerce(db, row["id"], 550000, 900000)
    assert not book["published"] and not values["published"]
    profile = one(
        db,
        "SELECT content,published_revision FROM catalog_profiles WHERE kind='skus' AND entity_id=:id",
        id=row["id"],
    )
    assert profile["published_revision"] is None and profile["content"]["gallery"] == []
    content = profile["content"]
    assert content["length_cm"] == 29.7 and content["width_cm"] == 21
    assert content["weight_estimated"] and content["weight_grams"] == 475
    assert "فنری از سمت راست" in json.dumps(content, ensure_ascii=False)
    assert "۴۰ برگ کرافت ۱۱۰ گرم" in json.dumps(content, ensure_ascii=False)
    for path in [
        "/api/v1/catalog/products/mandala-spiral-book",
        "/api/v1/catalog/categories/mandala-books",
        "/api/v1/catalog/skus/" + values["code"],
        "/api/v1/catalog/profiles/skus/" + str(row["id"]),
    ]:
        get(base, path, 404)
    return dict(
        origin=base,
        products=products,
        installed_and_original_images_checked=images_checked,
        book={
            "id": str(book["id"]),
            "sku_id": str(row["id"]),
            **values,
            "size": "A4",
            "binding": "right",
            "sheets": 40,
            "paper": "kraft-110gsm",
            "publication": "awaiting_real_photographs",
        },
        browser_rendering_verified=False,
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", required=True)
    parser.add_argument("--folder", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    manifest = json.loads((args.folder / "manifest.json").read_text())
    with Session(engine) as db:
        result = verify(db, args.base.rstrip("/"), manifest)
    args.output.write_text(
        json.dumps(result, ensure_ascii=False, indent=2, default=str)
    )
    print(
        "Verified 4 independent products, 12 priced variants, 24 public images and the draft A4 book"
    )


if __name__ == "__main__":
    main()
