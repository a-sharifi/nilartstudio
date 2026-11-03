#!/usr/bin/env python3
"""Audited, resumable owner image import/publication. Run inside the API image.

No product, price, stock, dimensions or sale availability is written. Sources
remain private. Publish only after visually reviewing the exported contact sheets.
"""

import argparse
import base64
import hashlib
import json
from pathlib import Path
from types import SimpleNamespace
from uuid import UUID, uuid4, uuid5

from nilart.contexts.catalog.presentation import profiles
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.media import router as media
from nilart.contexts.mockups import service
from nilart.contexts.mockups.models import RunInput, Template
from nilart.shared.database import engine
from sqlalchemy import text
from sqlalchemy.orm import Session
from starlette.requests import Request

NS = service.NAMESPACE
REQUEST = Request({"type": "http", "headers": []})
REASON = "Owner-approved real-photo product image project; image-only update; preserve commerce and original print files"
ALIASES = {
    "gorbe/notebook": ["cat-ruled", "cat-ruled-hard"],
    "gorbe/sketchbook": ["cats-sketchbook-127gsm"],
    "roh/notebook": ["notebook-ghosts"],
}


def actor(db):
    for id in db.scalars(
        text(
            "SELECT account_id FROM identity_account_roles WHERE role='admin' ORDER BY account_id"
        )
    ):
        p = SqlIdentityRepository(db).principal(id)
        if p.allows("catalog.manage") and p.allows("content.manage"):
            return SimpleNamespace(id=id)
    raise RuntimeError("An existing authorized administrator is required")


def require_dict(value):
    if not isinstance(value, dict):
        raise RuntimeError(
            value.body.decode() if hasattr(value, "body") else "Command rejected"
        )
    return value


def mapping(db, item):
    spec = item["spec"]
    design = spec["design"]
    kind = spec["notebook_type"]
    collection = db.scalar(
        text("SELECT id FROM catalog_collections WHERE slug=:slug"),
        dict(
            slug="custom-notebook-portfolio" if spec["group"] == "personal" else design
        ),
    )
    if collection is None:
        raise RuntimeError("Existing collection missing: " + design)
    target = dict(product_id=None, sku_id=None, collection_id=str(collection))
    if spec["group"] == "personal":
        return target, "none"
    product = db.scalar(
        text("SELECT id FROM catalog_products WHERE slug=:slug"),
        dict(slug=f"{design}-{kind}"),
    )
    if not product:
        for slug in ALIASES.get(f"{design}/{kind}", []):
            product = db.scalar(
                text("SELECT id FROM catalog_products WHERE slug=:slug"),
                dict(slug=slug),
            )
            if product:
                break
    if not product:
        return target, "none"
    target["product_id"] = str(product)
    code = f"NIL-{design.upper()}-{kind.upper()}-{spec['size']}-{spec['paper'].upper()}"
    sku = db.scalar(
        text("SELECT id FROM catalog_skus WHERE product_id=:product AND code=:code"),
        dict(product=product, code=code),
    )
    # Legacy local models sometimes explicitly describe 50/100 sheets, so never
    # attach the owner's new 40-sheet pictures to those incompatible variants.
    if sku is None and kind == "notebook":
        document = (
            db.scalar(
                text(
                    "SELECT document FROM catalog_product_presentations WHERE product_id=:id"
                ),
                dict(id=product),
            )
            or {}
        )
        matches = [
            c["code"]
            for c in document.get("option_combinations", [])
            if c.get("selections", {}).get("size") == spec["size"]
            and c.get("selections", {}).get("sheets", "80") == "80"
        ]
        if len(matches) == 1:
            sku = db.scalar(
                text("SELECT id FROM catalog_skus WHERE product_id=:id AND code=:code"),
                dict(id=product, code=matches[0]),
            )
    if sku:
        target["sku_id"] = str(sku)
    return target, "sku" if sku else "none"


def import_bundle(db, who, folder):
    manifest = json.loads((folder / "manifest.json").read_text())
    if (
        len(manifest["sets"]) != 220
        or sum(len(x["templates"]) for x in manifest["sets"]) != 484
    ):
        raise ValueError("Unexpected matrix")
    references = {}
    for name, item in manifest["assets"].items():
        file = folder / item["file"]
        if file.parent.resolve() != folder.resolve():
            raise ValueError("Unsafe source path")
        data = file.read_bytes()
        if hashlib.sha256(data).hexdigest() != item["sha256"]:
            raise ValueError("Source hash mismatch: " + name)
        aid = uuid5(NS, "source:" + item["sha256"])
        rid = uuid5(aid, "private-v1")
        old = (
            db.execute(text("SELECT * FROM media_assets WHERE id=:id"), dict(id=aid))
            .mappings()
            .first()
        )
        if old:
            if (
                old["purpose"] != "mockup_source"
                or old["sha256"] != item["sha256"]
                or old["version"] != 1
                or old["published_revision"]
            ):
                raise RuntimeError("Existing private source changed: " + name)
        else:
            body = media.Upload(
                expected_version=0,
                action="draft",
                purpose="mockup_source",
                metadata=media.Metadata(
                    title_fa=name[:200],
                    title_en=name[:200],
                    notes="Private immutable display-resolution source; "
                    + item["role"],
                ),
                file_name=file.name,
                content_base64=base64.b64encode(data).decode(),
                reason=REASON,
            )
            require_dict(media.save_record(db, who, aid, rid, body, REQUEST))
        references[name] = dict(asset_id=str(aid), revision_id=str(rid))
    template_ids = {}
    for name, item in manifest["templates"].items():
        content = Template.model_validate(
            {
                **item,
                "photo": references[item["photo"]],
                "occlusion": references[item["occlusion"]]
                if item.get("occlusion")
                else None,
            }
        )
        tid = uuid5(NS, "template:" + name)
        old = (
            db.execute(
                text("SELECT * FROM mockup_templates WHERE id=:id"), dict(id=tid)
            )
            .mappings()
            .first()
        )
        if not old or old["content"] != content.model_dump(mode="json"):
            key = uuid5(tid, service.fingerprint(content.model_dump(mode="json")))
            service.save_template(
                db, who, tid, key, old["version"] if old else 0, content, REASON
            )
        template_ids[name] = str(tid)
    report = []
    for item in manifest["sets"]:
        target, attach = mapping(db, item)
        sources = {
            k: references[v] if isinstance(v, str) and v in references else v
            for k, v in item["sources"].items()
        }
        old = (
            db.execute(
                text("SELECT * FROM mockup_sets WHERE set_key=:key"),
                dict(key=item["key"]),
            )
            .mappings()
            .first()
        )
        body = RunInput.model_validate(
            dict(
                expected_version=old["version"] if old else 0,
                spec=item["spec"],
                sources=sources,
                templates={
                    view: template_ids[name] for view, name in item["templates"].items()
                },
                target=target,
                attach_to=attach,
                reason=REASON,
            )
        )
        result = service.create_run(db, who, uuid4(), body)
        report.append(
            dict(
                key=item["key"],
                set_id=str(result["set_id"]),
                run_id=str(result["id"]),
                status=result["status"],
                target=target,
                attach_to=attach,
            )
        )
    return dict(imported=len(report), private_source_names=len(references), sets=report)


def status(db):
    rows = (
        db.execute(
            text(
                "SELECT s.id,s.set_key,s.version,s.spec,s.target,s.published_run,r.id run_id,r.status,r.error,r.fingerprint,r.outputs,r.inputs FROM mockup_sets s LEFT JOIN LATERAL(SELECT * FROM mockup_runs WHERE set_id=s.id ORDER BY created_at DESC LIMIT 1) r ON true ORDER BY s.set_key"
            )
        )
        .mappings()
        .all()
    )
    return dict(
        total=len(rows),
        published=sum(bool(r["published_run"]) for r in rows),
        states={
            state: sum(r["status"] == state for r in rows)
            for state in ["queued", "rendering", "ready", "failed"]
        },
        sets=[service.safe(dict(r)) for r in rows],
    )


def publish(db, who, keys):
    result = []
    for key in keys:
        row = (
            db.execute(
                text("SELECT * FROM mockup_sets WHERE set_key=:key"), dict(key=key)
            )
            .mappings()
            .one()
        )
        run = (
            db.execute(
                text(
                    "SELECT * FROM mockup_runs WHERE set_id=:id ORDER BY created_at DESC LIMIT 1"
                ),
                dict(id=row["id"]),
            )
            .mappings()
            .one()
        )
        if row["published_run"] == run["id"]:
            result.append(dict(key=key, status="already_published"))
            continue
        if run["status"] != "ready":
            raise RuntimeError("Not ready: " + key)
        profile = run["inputs"].get("profile")
        version = None
        if profile:
            version = profiles.record(db, profile["kind"], UUID(profile["id"]))[
                "version"
            ]
        command = service.publish_set(
            db,
            who,
            row["id"],
            uuid4(),
            row["version"],
            "publish",
            run["id"],
            REASON,
            REQUEST,
            version,
        )
        result.append(dict(key=key, **command))
    return dict(published=len(result), sets=result)


def product_covers(db, who):
    updated = []
    # Choose a representative A5, preserving published specifications and retaining
    # historical revisions. All individual variants still have their own gallery.
    rows = (
        db.execute(
            text(
                "SELECT s.*,r.outputs FROM mockup_sets s JOIN mockup_runs r ON r.id=s.published_run WHERE s.spec->>'size'='A5' AND (s.spec->>'notebook_type'='notebook' OR s.spec->>'paper'='drawing-cream-127gsm') ORDER BY s.set_key"
            )
        )
        .mappings()
        .all()
    )
    groups = {}
    for row in rows:
        targets = []
        if row["target"].get("product_id"):
            targets.append(("products", UUID(row["target"]["product_id"])))
        if row["target"].get("collection_id"):
            targets.append(("collections", UUID(row["target"]["collection_id"])))
        # Explicit additional legacy side-bound product, no SKU/specification change.
        if (
            row["spec"]["design"] == "gorbe"
            and row["spec"]["notebook_type"] == "notebook"
        ):
            extra = db.scalar(
                text("SELECT id FROM catalog_products WHERE slug='cat-ruled-hard'")
            )
            if extra:
                targets.append(("products", extra))
        for target in targets:
            gallery = groups.setdefault(target, [])
            for output in row["outputs"]:
                if output["format"] != "png":
                    continue
                # Collections show one front per design/type, never hundreds of files.
                if target[0] == "collections" and output["view"] != "front":
                    continue
                # A legacy 50/100-sheet product cannot inherit a printed 40-sheet
                # back. Its sheet-neutral front is safe; canonical 40-sheet sets
                # remain visible as explicit previews in the commissions gallery.
                if (
                    target[0] == "products"
                    and row["spec"]["notebook_type"] == "sketchbook"
                    and not row["target"].get("sku_id")
                    and output["view"] != "front"
                ):
                    continue
                revision = db.scalar(
                    text("SELECT published_revision FROM media_assets WHERE id=:id"),
                    dict(id=output["asset_id"]),
                )
                image = dict(
                    asset_id=output["asset_id"],
                    revision_id=str(revision),
                    alt_fa=output["alt_fa"],
                    alt_en=output["alt_en"],
                )
                if image not in gallery:
                    gallery.append(image)
    for (kind, id), gallery in groups.items():
        old = profiles.record(db, kind, id)
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
        content = profiles.Content.model_validate(old["content"] or {})
        if content.model_dump(mode="json")["gallery"] == gallery:
            continue
        body = profiles.Command(
            expected_version=old["version"],
            action="publish",
            content=profiles.Content.model_validate(
                {**content.model_dump(mode="json"), "gallery": gallery}
            ),
            reason=REASON,
        )
        require_dict(profiles.save_record(db, who, kind, id, uuid4(), body, REQUEST))
        updated.append(dict(kind=kind, id=str(id), images=len(gallery)))
    return dict(updated=updated)


def export(db, folder):
    import io

    from PIL import Image, ImageDraw

    folder.mkdir(parents=True, exist_ok=True)
    report = status(db)
    (folder / "report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2)
    )
    tiles = []
    for item in report["sets"]:
        if item["status"] != "ready":
            continue
        for output in item["outputs"]:
            if output["format"] != "png":
                continue
            data = db.scalar(
                text("SELECT content FROM media_blobs WHERE sha256=:sha"),
                dict(sha=output["sha256"]),
            )
            if hashlib.sha256(bytes(data)).hexdigest() != output["sha256"]:
                raise RuntimeError("Output hash mismatch")
            image = Image.open(io.BytesIO(bytes(data)))
            alpha = image.getchannel("A")
            if image.size != (1600, 1600) or alpha.getpixel((0, 0)) != 0:
                raise RuntimeError("Output geometry/transparency failed")
            name = item["set_key"].replace("/", "-") + "-" + output["view"] + ".png"
            (folder / name).write_bytes(data)
            bg = Image.new("RGB", image.size, "#eee8dc")
            bg.paste(image, mask=alpha)
            bg.thumbnail((260, 260))
            tile = Image.new("RGB", (280, 300), "white")
            tile.paste(bg, ((280 - bg.width) // 2, 0))
            ImageDraw.Draw(tile).text(
                (6, 266),
                item["set_key"].replace("/", " ")[:48] + "\n" + output["view"],
                fill="black",
            )
            tiles.append(tile)
    for start in range(0, len(tiles), 30):
        chunk = tiles[start : start + 30]
        out = Image.new("RGB", (280 * 6, 300 * ((len(chunk) + 5) // 6)), "#e7e1d5")
        for i, tile in enumerate(chunk):
            out.paste(tile, ((i % 6) * 280, (i // 6) * 300))
        out.save(folder / f"contact-{start // 30 + 1:02}.jpg", quality=90)
    return dict(exported_positions=len(tiles), contact_sheets=(len(tiles) + 29) // 30)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "action",
        choices=[
            "import",
            "status",
            "publish",
            "covers",
            "export",
            "render",
            "retry",
            "refresh-template",
        ],
    )
    p.add_argument("--folder", type=Path)
    p.add_argument("--reviewed-keys", type=Path)
    p.add_argument("--output", type=Path)
    p.add_argument(
        "--template", help="Reviewed template name whose runtime calibration changed"
    )
    a = p.parse_args()
    with Session(engine) as db:
        who = actor(db)
        if a.action == "import":
            result = import_bundle(db, who, a.folder)
        elif a.action == "status":
            result = status(db)
        elif a.action == "publish":
            if not a.reviewed_keys:
                raise ValueError("Explicit visually reviewed set keys are required")
            result = publish(db, who, json.loads(a.reviewed_keys.read_text()))
        elif a.action == "covers":
            result = product_covers(db, who)
        elif a.action == "export":
            result = export(db, a.folder)
        elif a.action == "refresh-template":
            if not a.template:
                raise ValueError("An explicit template is required")
            id = uuid5(NS, "template:" + a.template)
            row = (
                db.execute(
                    text("SELECT * FROM mockup_templates WHERE id=:id"), dict(id=id)
                )
                .mappings()
                .one()
            )
            result = service.save_template(
                db,
                who,
                id,
                uuid4(),
                row["version"],
                Template.model_validate(row["content"]),
                REASON
                + "; refresh calibrated typography after enabling mandatory RAQM shaping",
            )
        elif a.action == "retry":
            service.lock(db)
            ids = []
            for row in db.execute(
                text("SELECT id,inputs FROM mockup_runs WHERE status='failed'")
            ).mappings():
                if not service.stale(db, row["inputs"]):
                    ids.append(row["id"])
            for id in ids:
                db.execute(
                    text(
                        "UPDATE mockup_runs SET status='queued',attempts=0,error='',lease_until=NULL WHERE id=:id"
                    ),
                    dict(id=id),
                )
                service.audit(
                    db, who, "mockup.render_retried", dict(run_id=str(id)), REASON
                )
            db.commit()
            result = dict(retried=len(ids))
        else:
            ids = list(
                db.scalars(
                    text(
                        "SELECT id FROM mockup_runs WHERE status='queued' ORDER BY created_at"
                    )
                )
            )
            db.rollback()
            for id in ids:
                service.process_run(engine, id)
            result = status(db)
    value = json.dumps(result, ensure_ascii=False, indent=2, default=str)
    if a.output:
        a.output.write_text(value)
    else:
        print(value)


if __name__ == "__main__":
    main()
