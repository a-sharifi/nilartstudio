#!/usr/bin/env python3
"""Prepare original transparent bookmark/sticker display derivatives, no new art."""

import argparse
import base64
import hashlib
import io
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--source", type=Path, required=True)
    p.add_argument("--output", type=Path, required=True)
    a = p.parse_args()
    a.output.mkdir(parents=True, exist_ok=True)
    assets = []
    tiles = []
    for kind in ["bookmark", "sticker"]:
        for slug, fa, en in [
            ("gorbe", "گربه", "Cats"),
            ("gav", "گاو", "Cows"),
            ("roh", "روح", "Ghosts"),
            ("qolche", "غولچه", "Qolche"),
        ]:
            file = (
                (
                    a.source
                    / "bookmarks/concepts"
                    / f"{slug}-3-color-poses-{'v4' if slug == 'qolche' else 'v3'}-branded.png"
                )
                if kind == "bookmark"
                else a.source
                / "stickers/revised-no-logo/png"
                / f"{slug}-shock-transparent.png"
            )
            original = file.read_bytes()
            sha = hashlib.sha256(original).hexdigest()
            with Image.open(file) as photo:
                photo = ImageOps.exif_transpose(photo).convert("RGBA")
                if photo.getchannel("A").getextrema()[0] != 0:
                    raise ValueError(
                        "Expected original transparent atlas: " + str(file)
                    )
                for pose in range(1, 4):
                    region = (
                        round((pose - 1) * photo.width / 3),
                        0,
                        round(pose * photo.width / 3),
                        photo.height,
                    )
                    image = photo.crop(region)
                    if kind == "sticker":
                        svg = (
                            a.source
                            / "stickers/revised-no-logo/cut"
                            / f"{slug}-{pose:02}-artwork.svg"
                        )
                        tree = ET.parse(svg)
                        embedded = next(
                            e for e in tree.iter() if e.tag.endswith("image")
                        )
                        actual = Image.open(
                            io.BytesIO(
                                base64.b64decode(
                                    embedded.attrib["href"].split(",", 1)[1]
                                )
                            )
                        ).convert("RGBA")
                        plane = next(
                            e
                            for e in tree.iter()
                            if e.tag.endswith("clipPath")
                            and e.attrib.get("id") == "silhouette"
                        )
                        path = next(iter(plane)).attrib["d"]
                        if re.search(r"[A-KN-Ya-kn-y]", path):
                            raise ValueError("Review non-polygon silhouette")
                        numbers = [
                            float(v) for v in re.findall(r"-?\d+(?:\.\d+)?", path)
                        ]
                        x, y, w, h = [
                            float(embedded.attrib[k])
                            for k in ["x", "y", "width", "height"]
                        ]
                        points = [
                            (
                                (numbers[i] - x) * actual.width / w,
                                (numbers[i + 1] - y) * actual.height / h,
                            )
                            for i in range(0, len(numbers), 2)
                        ]
                        mask = Image.new("L", actual.size)
                        ImageDraw.Draw(mask).polygon(points, fill=255)
                        from PIL import ImageChops

                        actual.putalpha(
                            ImageChops.multiply(actual.getchannel("A"), mask)
                        )
                        image = actual
                        region = mask.getbbox()
                    bounds = (
                        image.getchannel("A")
                        .point(lambda x: 255 if x > 8 else 0)
                        .getbbox()
                    )
                    if not bounds:
                        raise ValueError("Empty original pose")
                    image = ImageOps.contain(
                        image.crop(bounds), (1320, 1320), Image.Resampling.LANCZOS
                    )
                    out = Image.new("RGBA", (1600, 1600))
                    out.alpha_composite(
                        image, ((1600 - image.width) // 2, (1600 - image.height) // 2)
                    )
                    name = f"{slug}-{kind}-{pose}.png"
                    out.save(a.output / name, optimize=True)
                    fa_title = f"{'نشانک' if kind == 'bookmark' else 'استیکر'} {fa} — طرح {pose}"
                    en_title = f"{en} {kind} — design {pose}"
                    assets.append(
                        dict(
                            kind=kind,
                            design=slug,
                            pose=pose,
                            file=name,
                            sha256=hashlib.sha256(
                                (a.output / name).read_bytes()
                            ).hexdigest(),
                            source=str(file.relative_to(a.source)),
                            source_sha256=sha,
                            source_region=list(region),
                            title_fa=fa_title,
                            title_en=en_title,
                        )
                    )
                    bg = Image.new("RGBA", out.size, "#eee8dc")
                    bg.alpha_composite(out)
                    bg.thumbnail((240, 240))
                    tile = Image.new("RGB", (260, 280), "white")
                    tile.paste(bg.convert("RGB"), (10, 0))
                    ImageDraw.Draw(tile).text(
                        (10, 250), f"{slug} {kind} {pose}", fill="black"
                    )
                    tiles.append(tile)
            if hashlib.sha256(file.read_bytes()).hexdigest() != sha:
                raise RuntimeError("Original changed")
    sheet = Image.new("RGB", (260 * 6, 280 * 4), "#eee8dc")
    for i, tile in enumerate(tiles):
        sheet.paste(tile, ((i % 6) * 260, (i // 6) * 280))
    sheet.save(a.output / "contact.jpg", quality=90)
    (a.output / "manifest.json").write_text(
        json.dumps(dict(assets=assets), ensure_ascii=False, indent=2)
    )
    print("Prepared 12 bookmark and 12 sticker poses from original RGBA atlases.")


if __name__ == "__main__":
    main()
