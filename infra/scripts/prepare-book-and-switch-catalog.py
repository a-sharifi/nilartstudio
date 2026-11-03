#!/usr/bin/env python3
"""Create owner-requested independent catalogue drafts, without invented commerce.

Run switches after the notebook image release; run mandala only after that work.
Existing artworks, products, SKU prices and inventory are never repurposed.
"""

import argparse
import importlib.util
import json
from datetime import date
from pathlib import Path
from types import SimpleNamespace
from uuid import UUID, uuid4, uuid5

from nilart.contexts.catalog.domain.authoring import EntryContent, EntryKind
from nilart.contexts.catalog.domain.options import OptionDocument
from nilart.contexts.catalog.infrastructure.authoring import (
    SqlCatalogAuthoringRepository,
)
from nilart.contexts.catalog.infrastructure.options import SqlOptionDraftRepository
from nilart.contexts.catalog.infrastructure.sku_authoring import (
    SqlSKUAuthoringRepository,
)
from nilart.contexts.catalog.infrastructure.sku_mappings import SqlSKUMappingRepository
from nilart.contexts.catalog.presentation import profiles
from nilart.contexts.finance import simple
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.shared.database import engine
from sqlalchemy import text
from sqlalchemy.orm import Session
from starlette.requests import Request

NS = UUID("ecda6188-19db-4866-b823-b4577d756b10")
REASON = "Owner approved independent switch/socket stickers: single, stock1, cost10000/sale50000 IRT per design; A4 right-bound Mandala book, 40 kraft110gsm sheets, stock10, cost550000/sale900000 IRT. Book publication awaits real photos."
REQUEST = Request({"type": "http", "headers": []})


def publish_entry(repo, db, kind, actor, row):
    if not row["published"]:
        row = repo.publish(kind, row["id"], actor.id, row["version"], True, REASON)
        db.commit()
    return row


def save_profile(db, actor, kind, id, content, action):
    old = profiles.record(db, kind, id)
    if old["content"] == content.model_dump(mode="json") and (
        action == "draft" or old["published_revision"]
    ):
        return
    if old["version"]:
        latest = db.scalar(
            text(
                "SELECT intent FROM catalog_profile_revisions WHERE kind=:kind AND entity_id=:id ORDER BY version DESC LIMIT 1"
            ),
            dict(kind=kind, id=id),
        )
        if latest and latest["reason"] != REASON:
            raise RuntimeError("Profile has manual changes; review separately")
    result = profiles.save_record(
        db,
        actor,
        kind,
        id,
        uuid4(),
        profiles.Command(
            expected_version=old["version"],
            action=action,
            content=content,
            reason=REASON,
        ),
        REQUEST,
    )
    if not isinstance(result, dict):
        raise RuntimeError(result.body.decode())


def options(db, actor, product, groups, codes):
    values = []
    for order, (name, fa, en, choices) in enumerate(groups):
        oid = uuid5(product["id"], name)
        values.append(
            dict(
                id=oid,
                title_fa=fa,
                title_en=en,
                order=order,
                values=[
                    dict(id=uuid5(oid, value), title_fa=vfa, title_en=ven, order=i)
                    for i, (value, vfa, ven) in enumerate(choices)
                ],
            )
        )
    combinations = []
    for code, selections in codes:
        combinations.append(
            dict(
                code=code,
                selections=[
                    dict(
                        option_id=uuid5(product["id"], name),
                        value_id=uuid5(uuid5(product["id"], name), value),
                    )
                    for name, value in selections.items()
                ],
            )
        )
    document = OptionDocument.model_validate(
        dict(options=values, combinations=combinations)
    ).snapshot()
    repo = SqlOptionDraftRepository(db)
    old = repo.read(product["id"])
    if old["version"]:
        if dict(options=old["options"], combinations=old["combinations"]) != document:
            raise RuntimeError("Existing option draft changed; review separately")
        return old
    result = repo.save(product["id"], actor.id, 0, document)
    db.commit()
    return result


def sku(db, actor, product, code, configuration):
    authoring = SqlSKUAuthoringRepository(db)
    id = db.scalar(
        text("SELECT id FROM catalog_skus WHERE code=:code"), dict(code=code)
    )
    if id:
        row = authoring.read(id)
        if row["product_id"] != product["id"]:
            raise RuntimeError("SKU code belongs to another product")
    else:
        row = authoring.create(product["id"], actor.id, code)
        db.commit()
        id = row["sku_id"]
    mapping = SqlSKUMappingRepository(db).read(id)
    if not mapping["mapping"]:
        SqlSKUMappingRepository(db).save(
            id,
            actor.id,
            mapping["version"],
            dict(
                configuration_id=UUID(configuration["configuration_id"]),
                configuration_version=configuration["version"],
                combination_code=code,
            ),
        )
        db.commit()
    elif not mapping["mapping"]["current"]:
        raise RuntimeError("SKU mapping is no longer current")
    return id


def initial_commerce(db, actor, id, cost, price, quantity):
    key = uuid5(NS, "confirmed-initial-commerce:" + str(id))
    body = simple.Edit(
        sku_id=id,
        kind="variant",
        cost_version=0,
        stock_version=0,
        price_version=0,
        unit_cost=str(cost),
        sale_price=str(price),
        quantity=quantity,
        document_date=date(2026, 11, 3),
        reason="Owner confirmed single switch stickers: cost10000 sale50000 stock1 per design; A4 Mandala book 40 sheets kraft110gsm: cost550000 sale900000 stock10; initial setup only, never reset consumed stock",
    )
    result = simple.save_record(db, actor, key, body, REQUEST)
    if not isinstance(result, dict):
        raise RuntimeError(result.body.decode())
    return dict(
        sku_id=str(id),
        cost_irt=cost,
        sale_irt=price,
        initial_quantity=quantity,
        initial_command=str(key),
    )


def ensure(repo, db, kind, actor, content):
    table = "catalog_products" if kind == EntryKind.PRODUCTS else "catalog_categories"
    id = db.scalar(
        text(f"SELECT id FROM {table} WHERE slug=:slug"), {"slug": content.slug}
    )
    if id:
        return repo.read(kind, id), False
    id = uuid5(NS, str(kind) + ":" + content.slug)
    result = repo.create(kind, id, actor.id, content, REASON)
    db.commit()
    return result, True


def restore_generic_stickers(db, actor):
    """Reverse only this image project's generic-sticker gallery replacement.

    Never rewind a profile with subsequent manual changes or a different reason.
    """
    restored = []
    project_reason = "Owner-approved original product display images and exact-component bundle composition; all prices, counts, stock and delivery preserved"
    for slug in ["cat-stickers", "sticker-cows"]:
        id = db.scalar(
            text("SELECT id FROM catalog_products WHERE slug=:slug"), {"slug": slug}
        )
        if not id:
            continue
        current = profiles.record(db, "products", id)
        latest = (
            db.execute(
                text("SELECT * FROM catalog_profile_revisions WHERE id=:id"),
                {"id": current["published_revision"]},
            )
            .mappings()
            .first()
        )
        if not latest or latest["intent"]["reason"] != project_reason:
            continue
        if current["content"] != latest["intent"]["content"]:
            raise RuntimeError(
                "Generic sticker profile has subsequent changes; manual review needed"
            )
        first = db.scalar(
            text(
                "SELECT min(version) FROM catalog_profile_revisions WHERE kind='products' AND entity_id=:id AND intent->>'reason'=:reason"
            ),
            {"id": id, "reason": project_reason},
        )
        old = (
            db.execute(
                text(
                    "SELECT * FROM catalog_profile_revisions WHERE kind='products' AND entity_id=:id AND version<:first ORDER BY version DESC LIMIT 1"
                ),
                {"id": id, "first": first},
            )
            .mappings()
            .first()
        )
        old_gallery = old["intent"]["content"]["gallery"] if old else []
        content = profiles.Content.model_validate(
            {**current["content"], "gallery": old_gallery}
        )
        body = profiles.Command(
            expected_version=current["version"],
            action="publish"
            if old and old["result"].get("published_revision")
            else "unpublish",
            content=content,
            reason=REASON
            + "; restore generic sticker gallery; switch products are separate",
        )
        value = profiles.save_record(db, actor, "products", id, uuid4(), body, REQUEST)
        if not isinstance(value, dict):
            raise RuntimeError(value.body.decode())
        restored.append(
            {
                "slug": slug,
                "images": len(old_gallery),
                "previous_version_retained": current["version"],
            }
        )
    return restored


def switches(db, repo, actor, folder):
    helper_path = Path(__file__).with_name("publish-other-product-images.py")
    spec = importlib.util.spec_from_file_location("owner_product_images", helper_path)
    helper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helper)
    manifest = json.loads((folder / "manifest.json").read_text())
    category, created = ensure(
        repo,
        db,
        EntryKind.CATEGORIES,
        actor,
        EntryContent(
            slug="switch-socket-stickers",
            title_fa="استیکر کلید و پریز",
            title_en="Switch & socket stickers",
            description_fa="طرح‌های تزئینی مخصوص کلید و پریز.",
            description_en="Decorative designs for switches and sockets.",
        ),
    )
    result = {
        "category": {
            "id": str(category["id"]),
            "slug": category["slug"],
            "created": created,
            "published": category["published"],
        },
        "products": [],
        "restored_generic_galleries": restore_generic_stickers(db, actor),
    }
    for slug, fa, en in [
        ("gorbe", "گربه", "Cats"),
        ("gav", "گاو", "Cows"),
        ("roh", "روح", "Ghosts"),
        ("qolche", "غولچه", "Qolche"),
    ]:
        collection = db.scalar(
            text("SELECT id FROM catalog_collections WHERE slug=:slug"), {"slug": slug}
        )
        product, created = ensure(
            repo,
            db,
            EntryKind.PRODUCTS,
            actor,
            EntryContent(
                slug=f"{slug}-switch-sticker",
                title_fa=f"استیکر کلید و پریز — {fa}",
                title_en=f"{en} — switch & socket stickers",
                description_fa=f"طرح‌های استیکر کلید و پریز از کالکشن {fa}. سه نمونهٔ طرح را در تصاویر ببینید.",
                description_en=f"Decorative switch and socket stickers from the {en} collection. Explore the three design examples.",
                category_ids=(category["id"],),
                collection_ids=(collection,) if collection else (),
            ),
        )
        images = []
        for item in manifest["assets"]:
            if item["kind"] != "sticker" or item["design"] != slug:
                continue
            data = (folder / item["file"]).read_bytes()
            import hashlib

            if hashlib.sha256(data).hexdigest() != item["sha256"]:
                raise RuntimeError("Reviewed sticker derivative changed")
            images.append(
                helper.save_image(
                    db,
                    actor,
                    data,
                    item["file"][:-4],
                    f"استیکر کلید و پریز {fa} — طرح {item['pose']}",
                    f"{en} switch sticker — design {item['pose']}",
                    True,
                )
            )
        if len(images) != 3:
            raise RuntimeError(
                "Each switch-sticker product requires three original poses"
            )
        profile = profiles.record(db, "products", product["id"])
        if profile["version"] == 0:
            content = profiles.Content(
                gallery=images,
                specifications=[
                    profiles.Specification(
                        label_fa="نوع محصول",
                        label_en="Product type",
                        value_fa="استیکر تزئینی کلید و پریز",
                        value_en="Decorative switch & socket sticker",
                    )
                ],
            )
            value = profiles.save_record(
                db,
                actor,
                "products",
                product["id"],
                uuid4(),
                profiles.Command(
                    expected_version=0, action="draft", content=content, reason=REASON
                ),
                REQUEST,
            )
            if not isinstance(value, dict):
                raise RuntimeError(value.body.decode())
        result["products"].append(
            {
                "id": str(product["id"]),
                "slug": product["slug"],
                "created": created,
                "published": product["published"],
                "images": 3,
                "pending": [
                    "single_or_pack",
                    "sale_price",
                    "unit_cost",
                    "stock",
                    "confirmed_dimensions_and_weight",
                ],
            }
        )
    return result


def mandala(db, repo, actor):
    category, created = ensure(
        repo,
        db,
        EntryKind.CATEGORIES,
        actor,
        EntryContent(
            slug="mandala-books",
            title_fa="کتاب ماندالا",
            title_en="Mandala books",
            description_fa="کتاب ماندالا با صحافی فنری.",
            description_en="Spiral-bound Mandala books.",
        ),
    )
    product, new = ensure(
        repo,
        db,
        EntryKind.PRODUCTS,
        actor,
        EntryContent(
            slug="mandala-spiral-book",
            title_fa="کتاب ماندالا — صحافی فنری",
            title_en="Mandala — spiral-bound book",
            description_fa="کتاب ماندالا با صحافی فنری از سمت راست.",
            description_en="A Mandala book with right-side spiral binding.",
            category_ids=(category["id"],),
        ),
    )
    profile = profiles.record(db, "products", product["id"])
    if profile["version"] == 0:
        content = profiles.Content(
            specifications=[
                profiles.Specification(
                    label_fa="صحافی",
                    label_en="Binding",
                    value_fa="فنری از سمت راست",
                    value_en="Right-side spiral binding",
                )
            ]
        )
        value = profiles.save_record(
            db,
            actor,
            "products",
            product["id"],
            uuid4(),
            profiles.Command(
                expected_version=0, action="draft", content=content, reason=REASON
            ),
            REQUEST,
        )
        if not isinstance(value, dict):
            raise RuntimeError(value.body.decode())
    return {
        "category": {
            "id": str(category["id"]),
            "slug": category["slug"],
            "created": created,
            "published": category["published"],
        },
        "product": {
            "id": str(product["id"]),
            "slug": product["slug"],
            "created": new,
            "published": product["published"],
            "binding": "right",
            "pending": [
                "owner_real_cover_and_inside_page_photos",
                "size",
                "page_or_sheet_count",
                "paper",
                "sale_price",
                "unit_cost",
                "stock",
            ],
        },
        "existing_artworks_untouched": True,
    }


def configure_switches(db, repo, actor, result, folder):
    import hashlib

    helper_path = Path(__file__).with_name("publish-other-product-images.py")
    module = importlib.util.spec_from_file_location("owner_product_images", helper_path)
    helper = importlib.util.module_from_spec(module)
    module.loader.exec_module(helper)
    manifest = json.loads((folder / "manifest.json").read_text())
    category = repo.read(EntryKind.CATEGORIES, UUID(result["category"]["id"]))
    category = publish_entry(repo, db, EntryKind.CATEGORIES, actor, category)
    result["category"]["published"] = True
    for entry in result["products"]:
        product = repo.read(EntryKind.PRODUCTS, UUID(entry["id"]))
        slug = product["slug"].split("-switch-sticker")[0]
        if product["id"] != uuid5(NS, "products:" + product["slug"]):
            raise RuntimeError("Existing unrelated product requires manual review")
        if not product["published"]:
            content = EntryContent(
                **{
                    k: product[k]
                    for k in [
                        "slug",
                        "title_fa",
                        "title_en",
                        "description_fa",
                        "description_en",
                        "collection_ids",
                        "category_ids",
                    ]
                }
            )
            content = EntryContent(
                **{
                    **content.__dict__,
                    "description_fa": "استیکر تزئینی کلید و پریز با سه طرح متفاوت. هر سفارش شامل یک استیکر با طرح انتخاب‌شده است؛ پریز در تصاویر فقط برای نمایش نصب است و همراه محصول ارسال نمی‌شود.",
                    "description_en": "Decorative switch and socket sticker in three designs. Each order contains one sticker in the selected design. The socket in the installation preview is a display prop and is not included.",
                }
            )
            product = repo.update(
                EntryKind.PRODUCTS,
                product["id"],
                actor.id,
                product["version"],
                content,
                REASON,
            )
            db.commit()
        configuration = options(
            db,
            actor,
            product,
            [
                (
                    "design",
                    "طرح",
                    "Design",
                    [(str(i), f"طرح {i}", f"Design {i}") for i in range(1, 4)],
                )
            ],
            [
                (f"NIL-{slug.upper()}-SWITCH-STICKER-{i}", {"design": str(i)})
                for i in range(1, 4)
            ],
        )
        items = sorted(
            [
                item
                for item in manifest["assets"]
                if item["kind"] == "sticker" and item["design"] == slug
            ],
            key=lambda x: x["pose"],
        )
        all_images = []
        variants = []
        for item in items:
            if not item.get("installed_file"):
                raise RuntimeError("Reviewed socket preview required")
            images = []
            for fkey, skey, fa, en in [
                (
                    "installed_file",
                    "installed_sha256",
                    "نمای نصب‌شده؛ پریز همراه کالا نیست",
                    "Installed preview; socket not included",
                ),
                ("file", "sha256", "تصویر خود استیکر", "Sticker artwork only"),
            ]:
                data = (folder / item[fkey]).read_bytes()
                if hashlib.sha256(data).hexdigest() != item[skey]:
                    raise RuntimeError("Reviewed image changed")
                images.append(
                    helper.save_image(
                        db,
                        actor,
                        data,
                        item[fkey][:-4],
                        item["title_fa"] + " — " + fa,
                        item["title_en"] + " — " + en,
                        True,
                    )
                )
            all_images.extend(images)
            code = f"NIL-{slug.upper()}-SWITCH-STICKER-{item['pose']}"
            id = sku(db, actor, product, code, configuration)
            stock = initial_commerce(db, actor, id, 10000, 50000, 1)
            width, height = item["dimensions_cm"]
            content = profiles.Content(
                gallery=images,
                specifications=[
                    profiles.Specification(
                        label_fa="تعداد در هر سفارش",
                        label_en="Quantity per order",
                        value_fa="یک استیکر؛ پریز همراه محصول نیست",
                        value_en="One sticker; socket not included",
                    ),
                    profiles.Specification(
                        label_fa="طرح",
                        label_en="Design",
                        value_fa=f"طرح {item['pose']}",
                        value_en=f"Design {item['pose']}",
                    ),
                ],
                delivery="physical",
                returnable=True,
                weight_grams=20,
                length_cm=round(max(width, height), 2),
                width_cm=round(min(width, height), 2),
                height_cm=0.05,
                weight_estimated=True,
            )
            save_profile(db, actor, "skus", id, content, "publish")
            variants.append(
                {**stock, "code": code, "profile": content.model_dump(mode="json")}
            )
        save_profile(
            db,
            actor,
            "products",
            product["id"],
            profiles.Content(
                gallery=all_images,
                specifications=[
                    profiles.Specification(
                        label_fa="نوع محصول",
                        label_en="Product type",
                        value_fa="استیکر کلید و پریز؛ فروش تکی",
                        value_en="Switch & socket sticker; sold individually",
                    )
                ],
            ),
            "publish",
        )
        product = publish_entry(
            repo,
            db,
            EntryKind.PRODUCTS,
            actor,
            repo.read(EntryKind.PRODUCTS, product["id"]),
        )
        authoring = SqlSKUAuthoringRepository(db)
        for item in variants:
            id = UUID(item["sku_id"])
            row = authoring.read(id)
            if not row["published"]:
                authoring.publication(id, actor.id, row["version"], True, REASON)
                db.commit()
        entry.update(
            published=True,
            images=6,
            variants=variants,
            pending=[],
            weight_note="20g per sticker and thickness are explicitly marked estimates; planar dimensions come from the original cut geometry.",
        )
    return result


def configure_mandala(db, repo, actor, result):
    product = repo.read(EntryKind.PRODUCTS, UUID(result["product"]["id"]))
    if product["id"] != uuid5(NS, "products:mandala-spiral-book"):
        raise RuntimeError("Existing unrelated book requires review")
    if not product["published"]:
        content = EntryContent(
            slug=product["slug"],
            title_fa="کتاب ماندالا A4 — ۴۰ برگ کرافت ۱۱۰ گرم",
            title_en="A4 Mandala book — 40 sheets, 110 gsm kraft",
            description_fa="کتاب ماندالا در اندازهٔ A4، با ۴۰ برگ کاغذ کرافت ۱۱۰ گرم و صحافی فنری از سمت راست.",
            description_en="A4 Mandala book with 40 sheets of 110 gsm kraft paper and right-side spiral binding.",
            category_ids=tuple(product["category_ids"]),
        )
        if any(
            product[k] != getattr(content, k)
            for k in ["title_fa", "title_en", "description_fa", "description_en"]
        ):
            product = repo.update(
                EntryKind.PRODUCTS,
                product["id"],
                actor.id,
                product["version"],
                content,
                REASON,
            )
            db.commit()
    code = "NIL-MANDALA-BOOK-A4-KRAFT-110GSM-40"
    configuration = options(
        db,
        actor,
        product,
        [
            ("size", "سایز", "Size", [("A4", "A4", "A4")]),
            (
                "paper",
                "کاغذ",
                "Paper",
                [("kraft-110gsm", "کرافت ۱۱۰ گرم", "Kraft 110 gsm")],
            ),
            ("sheets", "تعداد برگ", "Sheet count", [("40", "۴۰ برگ", "40 sheets")]),
        ],
        [(code, {"size": "A4", "paper": "kraft-110gsm", "sheets": "40"})],
    )
    id = sku(db, actor, product, code, configuration)
    stock = initial_commerce(db, actor, id, 550000, 900000, 10)
    specs = [
        profiles.Specification(
            label_fa="صحافی",
            label_en="Binding",
            value_fa="فنری از سمت راست",
            value_en="Right-side spiral binding",
        ),
        profiles.Specification(
            label_fa="اندازه",
            label_en="Size",
            value_fa="A4؛ ۲۱ × ۲۹٫۷ سانتی‌متر",
            value_en="A4; 21 × 29.7 cm",
        ),
        profiles.Specification(
            label_fa="کاغذ و تعداد برگ",
            label_en="Paper and sheet count",
            value_fa="۴۰ برگ کرافت ۱۱۰ گرم",
            value_en="40 sheets of 110 gsm kraft",
        ),
    ]
    old = profiles.record(db, "products", product["id"])
    if not old["published_revision"]:
        save_profile(
            db,
            actor,
            "products",
            product["id"],
            profiles.Content(specifications=specs),
            "draft",
        )
    old = profiles.record(db, "skus", id)
    if not old["version"]:
        save_profile(
            db,
            actor,
            "skus",
            id,
            profiles.Content(
                specifications=specs,
                delivery="physical",
                returnable=True,
                weight_grams=475,
                length_cm=29.7,
                width_cm=21,
                height_cm=1.13,
                weight_estimated=True,
            ),
            "draft",
        )
    result["product"].update(
        size="A4",
        sheets=40,
        paper="kraft-110gsm",
        **stock,
        code=code,
        weight_estimated_grams=475,
        pending=[
            "owner_real_cover_and_inside_page_photos",
            "review_and_publication_after_photos",
        ],
    )
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("part", choices=["switches", "mandala"])
    parser.add_argument("--folder", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    with Session(engine) as db:
        id = db.scalar(
            text(
                "SELECT account_id FROM identity_account_roles WHERE role='admin' ORDER BY account_id LIMIT 1"
            )
        )
        if not id:
            raise RuntimeError("Existing administrator required")
        principal = SqlIdentityRepository(db).principal(id)
        if not all(
            principal.allows(p)
            for p in [
                "catalog.manage",
                "content.manage",
                "inventory.manage",
                "pricing.publish",
            ]
        ):
            raise RuntimeError("Existing administrator permissions required")
        actor, repo = SimpleNamespace(id=id), SqlCatalogAuthoringRepository(db)
        result = (
            switches(db, repo, actor, args.folder)
            if args.part == "switches"
            else mandala(db, repo, actor)
        )
        result = (
            configure_switches(db, repo, actor, result, args.folder)
            if args.part == "switches"
            else configure_mandala(db, repo, actor, result)
        )
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print("Independent catalogue drafts recorded:", str(args.output))


if __name__ == "__main__":
    main()
