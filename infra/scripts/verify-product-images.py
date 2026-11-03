#!/usr/bin/env python3
"""Read-only published image verification and real mandala-photo review export."""

import argparse
import hashlib
import io
import json
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.shared.database import engine
from nilart.contexts.catalog.presentation import artwork_authoring, profiles
from nilart.contexts.mockups.models import Spec


def get(base, path):
    with urllib.request.urlopen(base + path, timeout=30) as r:
        return r.read()


def verify(db, base, full):
    items = []
    cursor = ""
    while True:
        page = json.loads(
            get(
                base,
                "/api/v1/catalog/image-sets?"
                + urllib.parse.urlencode(dict(limit=48, cursor=cursor)),
            )
        )
        items.extend(page["items"])
        cursor = page["next_cursor"]
        if not cursor:
            break
    if len(items) != 220 or len({x["key"] for x in items}) != 220:
        raise RuntimeError("Public image-set coverage is incomplete")
    rows = {
        str(r["id"]): r
        for r in db.execute(
            text(
                "SELECT s.*,r.outputs,r.inputs FROM mockup_sets s JOIN mockup_runs r ON r.id=s.published_run"
            )
        ).mappings()
    }
    checked = []
    positions = 0
    blob_hashes = set()
    for item in items:
        spec = Spec.model_validate(item["spec"])
        row = rows[item["id"]]
        if item["key"] != spec.key or [g["view"] for g in item["images"]] != spec.views:
            raise RuntimeError("Wrong spec or gallery ordering")
        png = {o["view"]: o for o in row["outputs"] if o["format"] == "png"}
        for image in item["images"]:
            output = png[image["view"]]
            if image["asset_id"] != output["asset_id"]:
                raise RuntimeError("Public asset mismatch")
            photo = Image.open(io.BytesIO(get(base, image["url"] + "?thumbnail=true")))
            if photo.format not in ["WEBP", "JPEG", "PNG"] or max(photo.size) > 480:
                raise RuntimeError("Invalid public thumbnail")
            positions += 1
        if row["inputs"]["attach_to"] == "sku":
            sku_id = row["inputs"]["target"]["sku_id"]
            profile = profiles.record(db, "skus", sku_id)
            published = db.scalar(
                text(
                    "SELECT intent->'content' FROM catalog_profile_revisions WHERE id=:id"
                ),
                dict(id=profile["published_revision"]),
            )
            if [g["asset_id"] for g in published["gallery"]] != [
                g["asset_id"] for g in item["images"]
            ]:
                raise RuntimeError("SKU gallery does not match its selected set")
        if full:
            for output in row["outputs"]:
                if output["sha256"] in blob_hashes:
                    continue
                blob_hashes.add(output["sha256"])
                data = bytes(
                    db.scalar(
                        text("SELECT content FROM media_blobs WHERE sha256=:sha"),
                        dict(sha=output["sha256"]),
                    )
                )
                if (
                    hashlib.sha256(data).hexdigest() != output["sha256"]
                    or len(data) > 5 * 1024 * 1024
                ):
                    raise RuntimeError("Output integrity/size failure")
                image = Image.open(io.BytesIO(data))
                image.load()
                if image.size != (1600, 1600):
                    raise RuntimeError("Incorrect output dimensions")
                if output["format"] == "png":
                    if (
                        image.mode != "RGBA"
                        or image.getpixel((0, 0))[3] != 0
                        or image.getchannel("A").getextrema() != (0, 255)
                    ):
                        raise RuntimeError("Incorrect PNG transparency")
                elif image.convert("RGB").getpixel((0, 0)) != (255, 255, 255):
                    raise RuntimeError("JPEG background is not white")
        checked.append(
            dict(
                key=item["key"],
                id=item["id"],
                preview_only=item["preview_only"],
                images=len(item["images"]),
                product_slug=item["product_slug"],
                views=spec.views,
                binding=spec.binding,
                run_id=str(row["published_run"]),
            )
        )
    if positions != 484:
        raise RuntimeError("Wrong gallery-position count")
    private = list(
        db.execute(
            text("SELECT id FROM media_assets WHERE purpose='mockup_source'")
        ).scalars()
    )
    for id in private:
        try:
            get(base, f"/api/v1/media/{id}/content")
        except urllib.error.HTTPError as e:
            if e.code != 404:
                raise
        else:
            raise RuntimeError("A private source is publicly accessible")
    try:
        get(base, "/api/v1/admin/mockups/templates")
    except urllib.error.HTTPError as e:
        if e.code not in [401, 403]:
            raise
    else:
        raise RuntimeError("Admin access requires authentication")
    return dict(
        public_sets=len(items),
        positions=positions,
        private_sources_checked=len(private),
        preview_only_sets=sum(x["preview_only"] for x in checked),
        unique_output_blobs_checked=len(blob_hashes),
        sets=checked,
    )


def mandalas(db, folder):
    folder.mkdir(parents=True, exist_ok=True)
    tiles = []
    report = []
    rows = (
        db.execute(
            text(
                "SELECT id,slug FROM catalog_artworks WHERE slug LIKE 'mandala-%' AND published ORDER BY slug"
            )
        )
        .mappings()
        .all()
    )
    for row in rows:
        record = artwork_authoring.read_record(db, row["id"])
        if not record["published_revision"]:
            raise RuntimeError("Artwork publication missing")
        content = record["content"]
        gallery = content["gallery"]
        if not gallery:
            raise RuntimeError("Mandala photograph missing")
        photo = gallery[0]
        blob = (
            db.execute(
                text(
                    "SELECT b.content,b.sha256 FROM media_asset_versions v JOIN media_blobs b ON b.sha256=v.sha256 WHERE v.asset_id=:id AND v.revision_id=:revision"
                ),
                dict(id=photo["asset_id"], revision=photo["revision_id"]),
            )
            .mappings()
            .one()
        )
        data = bytes(blob["content"])
        image = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
        image.thumbnail((360, 360), Image.Resampling.LANCZOS)
        tile = Image.new("RGB", (380, 400), "#eee8dc")
        tile.paste(image, ((380 - image.width) // 2, (360 - image.height) // 2))
        ImageDraw.Draw(tile).text((12, 375), row["slug"], fill="black")
        tiles.append(tile)
        report.append(
            dict(
                id=str(row["id"]),
                slug=row["slug"],
                image=photo,
                sha256=blob["sha256"],
                bytes=len(data),
                kind="existing_real_photograph",
                action="read_only_verification",
            )
        )
    if len(rows) != 40:
        raise RuntimeError(f"Expected 40 owner mandala photographs; found {len(rows)}")
    for start in range(0, len(tiles), 20):
        chunk = tiles[start : start + 20]
        sheet = Image.new("RGB", (380 * 5, 400 * 4), "#eee8dc")
        for i, tile in enumerate(chunk):
            sheet.paste(tile, ((i % 5) * 380, (i // 5) * 400))
        sheet.save(folder / f"mandalas-{start // 20 + 1}.jpg", quality=92)
    (folder / "mandalas.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2)
    )
    return dict(photographs=len(report), contact_sheets=2, records=report)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("action", choices=["verify", "mandalas"])
    p.add_argument("--base", default="http://127.0.0.1:8000")
    p.add_argument("--full", action="store_true")
    p.add_argument("--folder", type=Path)
    p.add_argument("--output", type=Path, required=True)
    a = p.parse_args()
    with Session(engine) as db:
        db.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY"))
        result = (
            verify(db, a.base, a.full)
            if a.action == "verify"
            else mandalas(db, a.folder)
        )
    a.output.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print("Read-only verification saved:", str(a.output))


if __name__ == "__main__":
    main()
