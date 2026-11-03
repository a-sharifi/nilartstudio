#!/usr/bin/env python3
"""Publish reviewed original poses and exact-component bundle compositions.

Uses existing audited writers; preserves all commerce, quantity and delivery
fields. Missing products get manageable draft media, never invented listings.
"""

import argparse
import base64
import hashlib
import io
import json
from pathlib import Path
from types import SimpleNamespace
from uuid import UUID, uuid4, uuid5

from nilart.contexts.catalog.presentation import bundle_authoring as bundles
from nilart.contexts.catalog.presentation import profiles
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.media import router as media
from nilart.shared.database import engine
from PIL import Image, ImageOps
from sqlalchemy import text
from sqlalchemy.orm import Session
from starlette.requests import Request

NS = UUID("a5e3f0b9-8c70-46e1-9c94-98b6daa23c53")
REASON = "Owner-approved original product display images and exact-component bundle composition; all prices, counts, stock and delivery preserved"
REQUEST = Request({"type": "http", "headers": []})
ALIASES = {
    "gorbe/bookmark": ["cat-bookmark"],
    "love/bookmark": ["bookmark-love"],
}


def require(value):
    if not isinstance(value, dict):
        raise RuntimeError(value.body.decode())
    return value


def save_image(db, actor, data, name, fa, en, publish, sku=None):
    sha = hashlib.sha256(data).hexdigest()
    id = uuid5(NS, name + ":" + sha)
    key = uuid5(id, "publish" if publish else "draft")
    current = (
        db.execute(text("SELECT * FROM media_assets WHERE id=:id"), dict(id=id))
        .mappings()
        .first()
    )
    if current:
        if current["sha256"] != sha:
            raise RuntimeError("Existing derivative changed")
        if not publish or current["published_revision"]:
            return dict(
                asset_id=str(id),
                revision_id=str(current["published_revision"] or key),
                alt_fa=fa,
                alt_en=en,
            )
    body = media.Upload(
        expected_version=current["version"] if current else 0,
        action="publish" if publish else "draft",
        purpose="public_image",
        metadata=media.Metadata(
            title_fa=fa,
            title_en=en,
            alt_fa=fa,
            alt_en=en,
            sku_id=sku,
            notes="Original artwork, display derivative; no concept or print guide",
        ),
        file_name=name + ".png",
        content_base64=None if current else base64.b64encode(data).decode(),
        reason=REASON,
    )
    saved = require(media.save_record(db, actor, id, key, body, REQUEST))
    return dict(
        asset_id=str(id), revision_id=str(saved["revision_id"]), alt_fa=fa, alt_en=en
    )


def gallery(db, actor, kind, id, images):
    old = profiles.record(db, kind, id)
    content = profiles.Content.model_validate(old["content"] or {})
    published = (
        db.scalar(
            text(
                "SELECT intent->'content' FROM catalog_profile_revisions WHERE id=:id"
            ),
            dict(id=old["published_revision"]),
        )
        if old["published_revision"]
        else None
    )
    if old["version"] > 0 and old["content"] != published:
        raise RuntimeError("Unreviewed profile draft: " + str(id))
    if content.model_dump(mode="json")["gallery"] == images:
        return
    next = profiles.Content.model_validate(
        {**content.model_dump(mode="json"), "gallery": images}
    )
    require(
        profiles.save_record(
            db,
            actor,
            kind,
            id,
            uuid4(),
            profiles.Command(
                expected_version=old["version"],
                action="publish",
                content=next,
                reason=REASON,
            ),
            REQUEST,
        )
    )


def poses(db, actor, folder):
    manifest = json.loads((folder / "manifest.json").read_text())
    report = []
    groups = {}
    for item in manifest["assets"]:
        data = (folder / item["file"]).read_bytes()
        if hashlib.sha256(data).hexdigest() != item["sha256"]:
            raise RuntimeError("Display source mismatch")
        kind, slug = item["kind"], item["design"]
        p = (
            db.execute(
                text("SELECT id,published FROM catalog_products WHERE slug=:slug"),
                dict(
                    slug=f"{slug}-switch-sticker"
                    if kind == "sticker"
                    else f"{slug}-{kind}"
                ),
            )
            .mappings()
            .first()
        )
        if p is None:
            for alias in ALIASES.get(f"{slug}/{kind}", []):
                p = (
                    db.execute(
                        text(
                            "SELECT id,published FROM catalog_products WHERE slug=:slug"
                        ),
                        dict(slug=alias),
                    )
                    .mappings()
                    .first()
                )
                if p:
                    break
        sku = (
            db.scalar(
                text(
                    "SELECT id FROM catalog_skus WHERE code=:code AND product_id=:product"
                ),
                dict(
                    code=f"NIL-{slug.upper()}-{kind.upper()}-{item['pose']}",
                    product=p["id"],
                ),
            )
            if p
            else None
        )
        public = bool(p and p["published"])
        image = save_image(
            db,
            actor,
            data,
            item["file"][:-4],
            item["title_fa"],
            item["title_en"],
            public,
            sku,
        )
        if public:
            groups.setdefault(p["id"], []).append(image)
            if sku:
                gallery(db, actor, "skus", sku, [image])
        report.append(
            dict(
                **item,
                **image,
                product_id=str(p["id"]) if p else None,
                sku_id=str(sku) if sku else None,
                status="published" if public else "prepared_draft",
                next_action=None
                if public
                else "No matching sellable product exists; media ready in admin library.",
            )
        )
    for id, images in groups.items():
        gallery(db, actor, "products", id, images)
    return report


def image_bytes(db, image):
    return bytes(
        db.scalar(
            text(
                "SELECT b.content FROM media_asset_versions v JOIN media_blobs b ON b.sha256=v.sha256 WHERE v.asset_id=:id AND v.revision_id=:revision"
            ),
            dict(id=image["asset_id"], revision=image["revision_id"]),
        )
    )


def bundle_images(db, actor, publish=True, folder=None):
    report = []
    for slug in ["gorbe", "gav", "roh", "qolche", "love"]:
        row = (
            db.execute(
                text("SELECT id FROM catalog_bundles WHERE slug=:slug AND published"),
                dict(slug=slug + "-bundle"),
            )
            .mappings()
            .first()
        )
        if not row:
            report.append(
                dict(
                    slug=slug + "-bundle",
                    status="not_present",
                    next_action="No corresponding owner bundle in this environment.",
                )
            )
            continue
        current = bundles.get_record(db, row["id"])
        if current["legacy"] or not current["content"]:
            report.append(dict(slug=slug + "-bundle", status="legacy_unconfigured"))
            continue
        content = bundles.Content.model_validate(current["content"])
        original = content.model_dump(mode="json")
        objects = []
        images = []
        for component in content.components:
            sku = (
                db.execute(
                    text("SELECT product_id,code FROM catalog_skus WHERE id=:id"),
                    dict(id=component.sku_id),
                )
                .mappings()
                .one()
            )
            product_id = sku["product_id"]
            profile = profiles.record(db, "skus", component.sku_id)
            if not profile["published_revision"] or not (profile["content"] or {}).get(
                "gallery"
            ):
                profile = profiles.record(db, "products", product_id)
            if not profile["published_revision"] or not (profile["content"] or {}).get(
                "gallery"
            ):
                raise RuntimeError(
                    "No approved component photograph for " + str(component.sku_id)
                )
            image = profile["content"]["gallery"][0]
            photo = Image.open(io.BytesIO(image_bytes(db, image))).convert("RGBA")
            photo = photo.crop(photo.getchannel("A").getbbox())
            if component.quantity > 6:
                raise RuntimeError("Bundle layout needs review for large quantities")
            objects.extend(
                [(photo, "BOOKMARK" in sku["code"].upper())] * component.quantity
            )
            images.append(image)
        if not objects or len(objects) > 6:
            raise RuntimeError("Unsupported exact bundle composition")
        canvas = Image.new("RGBA", (1600, 1600))
        cell = 1400 // len(objects)
        for index, (photo, bookmark) in enumerate(objects):
            # Bookmarks are physically smaller than A5 notebooks. Do not enlarge
            # them to notebook size or add packaging that isn't in the bundle.
            photo = ImageOps.contain(
                photo, (cell - 24, 760 if bookmark else 1200), Image.Resampling.LANCZOS
            )
            canvas.alpha_composite(
                photo,
                (
                    100 + index * cell + (cell - photo.width) // 2,
                    800 - photo.height // 2,
                ),
            )
        out = io.BytesIO()
        canvas.save(out, "PNG", optimize=True)
        if folder:
            folder.mkdir(parents=True, exist_ok=True)
            (folder / (slug + "-bundle.png")).write_bytes(out.getvalue())
        primary = save_image(
            db,
            actor,
            out.getvalue(),
            slug + "-bundle-components",
            content.title_fa + " — اجزای پکیج",
            content.title_en + " — included items",
            publish,
        )
        next_gallery = [primary] + [
            g for i, g in enumerate(images) if g not in images[:i]
        ]
        if not publish:
            report.append(
                dict(
                    slug=content.slug,
                    status="preview_draft",
                    component_count=len(objects),
                    gallery=next_gallery,
                    non_image_content_unchanged=True,
                )
            )
            continue
        if original["gallery"] == next_gallery:
            report.append(dict(slug=content.slug, status="already_published"))
            continue
        updated = bundles.Content.model_validate({**original, "gallery": next_gallery})
        if updated.model_dump(mode="json", exclude={"gallery"}) != content.model_dump(
            mode="json", exclude={"gallery"}
        ):
            raise RuntimeError("Commerce content changed")
        require(
            bundles.save_record(
                db,
                actor,
                row["id"],
                uuid4(),
                bundles.Command(
                    expected_version=current["version"],
                    action="publish",
                    content=updated,
                    reason=REASON,
                ),
                REQUEST,
            )
        )
        report.append(
            dict(
                slug=content.slug,
                status="published",
                component_count=len(objects),
                gallery=next_gallery,
                non_image_content_unchanged=True,
            )
        )
    return report


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--folder", type=Path, required=True)
    p.add_argument("--bundles", action="store_true")
    p.add_argument("--preview-bundles", type=Path)
    p.add_argument("--reviewed", action="store_true")
    p.add_argument("--output", type=Path, required=True)
    a = p.parse_args()
    if not a.reviewed:
        raise ValueError("Review the original-pose contact sheet before publication")
    with Session(engine) as db:
        id = db.scalar(
            text(
                "SELECT account_id FROM identity_account_roles WHERE role='admin' ORDER BY account_id LIMIT 1"
            )
        )
        actor = SimpleNamespace(id=id)
        principal = SqlIdentityRepository(db).principal(id)
        if not all(
            principal.allows(p)
            for p in ["content.manage", "catalog.manage", "pricing.publish"]
        ):
            raise RuntimeError("Authorized existing admin required")
        report = dict(
            poses=poses(db, actor, a.folder),
            bundles=bundle_images(
                db, actor, publish=not bool(a.preview_bundles), folder=a.preview_bundles
            )
            if a.bundles or a.preview_bundles
            else [],
        )
    a.output.write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print("Product media publication recorded in", str(a.output))


if __name__ == "__main__":
    main()
