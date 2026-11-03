#!/usr/bin/env python3
"""Prepare portable private image inputs from owner sources; never edit originals.

Run with PYTHONPATH=Backend/src. Render generation itself runs in the API worker.
"""

import argparse
import hashlib
import json
from pathlib import Path

from nilart.contexts.mockups.models import PAPERS, SIZES
from nilart.contexts.mockups.renderer import encode, ink_bounds
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

DESIGNS = [
    ("gorbe", "گربه", "Cats", "collection"),
    ("gav", "گاو", "Cows", "collection"),
    ("roh", "روح", "Ghosts", "collection"),
    ("qolche", "غولچه", "Qolche", "collection"),
    ("love", "لاو", "Love", "collection"),
    ("maryam-ali", "مریم و علی", "Maryam & Ali", "personal"),
    ("sadra-sepideh", "صدرا و سپیده", "Sadra & Sepideh", "personal"),
    ("mahsa", "مهسا", "Mahsa", "personal"),
    ("delvin", "دلوین", "Delvin", "personal"),
    ("rana-javad", "رعنا", "Rana", "personal"),
    ("sadi", "سعدی", "Saadi", "personal"),
]
MASTERS = {
    "notebook-front": {
        "file": "exec-aad03fac-1750-466d-880c-cf12534bfa3b.png",
        "kind": "notebook",
        "view": "front",
        "outline": [
            (173, 118),
            (961, 62),
            (996, 70),
            (1087, 1159),
            (1036, 1186),
            (1034, 1188),
            (213, 1210),
        ],
        "quads": [[(188, 132), (923, 79), (986, 1166), (228, 1188)]],
        "protect": (923, 0, 1254, 1254),
    },
    "notebook-back": {
        "file": "exec-7c4f559e-e65a-4f5c-92ae-162719972d27.png",
        "kind": "notebook",
        "view": "back",
        "outline": [
            (211, 61),
            (1075, 61),
            (1075, 1225),
            (208, 1225),
            (165, 1209),
            (165, 80),
            (211, 80),
        ],
        "quads": [[(257, 82), (1054, 82), (1054, 1203), (257, 1203)]],
        "protect": (0, 0, 257, 1254),
    },
    "notebook-inside": {
        "file": "exec-610811f3-f976-4f31-b020-270bc400495b.png",
        "kind": "notebook",
        "view": "inside",
        "outline": [(75, 197), (1188, 202), (1236, 1048), (16, 1046)],
        "quads": [
            [(96, 224), (589, 231), (576, 1020), (48, 1015)],
            [(677, 231), (1154, 224), (1200, 1017), (675, 1021)],
        ],
        "protect": (589, 0, 677, 1254),
    },
    "sketchbook-front": {
        "file": "exec-216a3ee3-06d5-4b31-9f0b-878c06556b7f.png",
        "kind": "sketchbook",
        "view": "front",
        "outline": [
            (195, 81),
            (235, 81),
            (235, 28),
            (1014, 28),
            (1014, 81),
            (1056, 81),
            (1056, 1226),
            (195, 1226),
        ],
        "quads": [[(213, 151), (1038, 151), (1038, 1204), (213, 1204)]],
        "protect": (0, 0, 1254, 151),
    },
}
MASTERS["sketchbook-back"] = {**MASTERS["sketchbook-front"], "view": "back"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--masters", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    assets, source_registry, templates, sets = {}, {}, {}, []

    def register(path, role):
        key = (
            str(path.relative_to(args.source))
            if path.is_relative_to(args.source)
            else str(path)
        )
        source_registry[key] = dict(
            sha256=hashlib.sha256(path.read_bytes()).hexdigest(), role=role
        )

    def add(name, im, source=None, role="artwork"):
        if name not in assets:
            im = ImageOps.exif_transpose(im).convert("RGBA")
            im.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
            data = encode(im)
            filename = hashlib.sha256(data).hexdigest() + ".png"
            (args.output / filename).write_bytes(data)
            assets[name] = dict(
                file=filename,
                sha256=hashlib.sha256(data).hexdigest(),
                role=role,
                size=list(im.size),
            )
        if source:
            register(source, role)
        return name

    def load(path):
        with Image.open(path) as im:
            return ImageOps.exif_transpose(im).convert("RGBA")

    def trim(im, size):
        # Explicit physical print-sheet trim, never a non-white bounding box.
        finished = SIZES[size]
        sheet = {
            "A3": SIZES["A3"],
            "A4": SIZES["A3"],
            "A5": SIZES["A4"],
            "A6": SIZES["A5"],
        }[size]
        fw, fh = im.width * finished[0] / sheet[0], im.height * finished[1] / sheet[1]
        return im.crop(
            (
                round((im.width - fw) / 2),
                round((im.height - fh) / 2),
                round((im.width + fw) / 2),
                round((im.height + fh) / 2),
            )
        )

    def remove_external_paper(im):
        # Only opaque print-sheet derivatives need this. Never colour-key an RGBA
        # character: its intentionally white fur/eyes remain completely intact.
        r, g, b = im.convert("RGB").split()
        white = ImageChops.darker(ImageChops.darker(r, g), b).point(
            lambda x: 255 if x >= 230 else 0
        )
        white = ImageChops.lighter(
            white, im.getchannel("A").point(lambda x: 255 if x == 0 else 0)
        )
        flooded = ImageOps.expand(white, border=1, fill=255)
        ImageDraw.floodfill(flooded, (0, 0), 128)
        mask = flooded.crop((1, 1, im.width + 1, im.height + 1)).point(
            lambda x: 0 if x == 128 else 255
        )
        out = im.copy()
        out.putalpha(ImageChops.multiply(mask, im.getchannel("A")))
        return out

    for name, config in MASTERS.items():
        path = args.masters / config["file"]
        im = load(path)
        if im.size != (1254, 1254):
            raise ValueError(f"Master geometry must be reviewed again: {name}")
        mask = Image.new("L", im.size)
        ImageDraw.Draw(mask).polygon(config["outline"], fill=255)
        alpha = ImageChops.multiply(im.getchannel("A"), mask)
        # Remove segmentation speckle/fringes from otherwise blank material/metal.
        pixels, ap = im.load(), alpha.load()
        for y in range(im.height):
            for x in range(im.width):
                r, g, b, _ = pixels[x, y]
                if max(r, g, b) - min(r, g, b) > 100 and max(r, g, b) > 215:
                    ap[x, y] = 0
        alpha = (
            alpha.point(lambda x: 255 if x > 210 else 0)
            .filter(ImageFilter.MinFilter(3))
            .filter(ImageFilter.GaussianBlur(0.35))
        )
        im.putalpha(alpha)
        box = alpha.getbbox()
        if box is None:
            raise ValueError("Empty master")
        cropped = im.crop(box)
        factor = min(1280 / cropped.width, 1280 / cropped.height)
        scaled = cropped.resize(
            (round(cropped.width * factor), round(cropped.height * factor)),
            Image.Resampling.LANCZOS,
        )
        dx, dy = (1600 - scaled.width) // 2, (1600 - scaled.height) // 2
        base = Image.new("RGBA", (1600, 1600))
        base.alpha_composite(scaled, (dx, dy))
        protect = Image.new("L", im.size)
        ImageDraw.Draw(protect).rectangle(config["protect"], fill=255)
        overlay = im.copy()
        overlay.putalpha(ImageChops.multiply(alpha, protect))
        overlay = overlay.crop(box).resize(scaled.size, Image.Resampling.LANCZOS)
        occlusion = Image.new("RGBA", base.size)
        occlusion.alpha_composite(overlay, (dx, dy))
        photo = add("template-" + name, base, path, "real-photo-template")
        protected = add("occlusion-" + name, occlusion, None, "binding-occlusion")
        quads = [
            {
                "points": [
                    [
                        (dx + (x - box[0]) * factor) / 1600,
                        (dy + (y - box[1]) * factor) / 1600,
                    ]
                    for x, y in q
                ]
            }
            for q in config["quads"]
        ]
        templates[name] = dict(
            title_fa=(
                "اسکچ‌بوک صحافی از بالا"
                if config["kind"] == "sketchbook"
                else "دفتر صحافی از کنار"
            )
            + " — "
            + config["view"],
            title_en=name.replace("-", " ").title(),
            notebook_type=config["kind"],
            binding="top" if config["kind"] == "sketchbook" else "side",
            view=config["view"],
            photo=photo,
            occlusion=protected,
            quads=quads,
            active=True,
        )
    logo_path = args.source / "branding/nil-logo/nil-main-with-website-transparent.png"
    logo = add("nil-logo", load(logo_path), logo_path, "logo")
    for slug, fa, en, group in DESIGNS:
        root = (
            args.source
            / "notebooks"
            / (slug if group == "collection" else "special-design/" + slug)
        )
        front_path = next(
            (
                root / "assets/covers" / name
                for name in ["front-character-transparent.png", "front-art.png"]
                if (root / "assets/covers" / name).exists()
            ),
            None,
        )
        print_sheet = front_path is None
        if front_path:
            front = load(front_path)
        else:
            source_size = "A4" if slug == "sadi" else "A5"
            front_path = next((root / source_size / "covers").glob("*front*.png"))
            front = trim(load(front_path), source_size)
        if print_sheet:
            front.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
        front_key = add(
            slug + "-front",
            remove_external_paper(front) if print_sheet else front,
            front_path,
            "front-artwork",
        )
        back_path = root / "assets/covers/back-art.png"
        if back_path.exists():
            back_art = load(back_path)
        else:
            existing = next(root.rglob("*back*.png"))
            existing_size = "A4" if "/A4/" in str(existing) else "A5"
            back_art = trim(load(existing), existing_size)
            back_art = back_art.crop(
                (0, 0, back_art.width, round(back_art.height * 0.70))
            )
            back_path = existing
        back_art_key = add(slug + "-back-art", back_art, back_path, "back-illustration")
        characters = sorted((root / "characters").glob("*.png"))
        if slug == "sadi":
            characters = [
                root / "assets/poet-corner.png",
                root / "assets/garden-corner.png",
            ]
        if not characters:
            characters = [back_path]
        motif_keys = []
        for i, path in enumerate(
            [characters[0], characters[min(1, len(characters) - 1)]]
        ):
            motif = load(path) if path != back_path else back_art
            motif_keys.append(
                add(
                    slug + f"-motif-{i}",
                    ink_bounds(motif),
                    path,
                    "inside-monochrome-motif",
                )
            )
        for size in SIZES:
            for kind, papers in [
                ("notebook", ["writing-paper"]),
                ("sketchbook", [p for p in PAPERS if p != "writing-paper"]),
            ]:
                for paper in papers:
                    sheets = 80 if kind == "notebook" else 40
                    src = dict(front=front_key, back_art=back_art_key, logo=logo)
                    back_print = (
                        root
                        / size
                        / "covers"
                        / ("notebook-80-leaves" if kind == "notebook" else "40-leaves")
                        / f"{slug}-{size}-back-{sheets}-{paper}.png"
                    )
                    if back_print.exists():
                        src["back_print"] = add(
                            f"{slug}-{size}-{paper}-back",
                            trim(load(back_print), size),
                            back_print,
                            "matching-back-print",
                        )
                    if kind == "notebook":
                        src.update(
                            inside_left=motif_keys[0],
                            inside_right=motif_keys[1],
                            inside_mode="motifs",
                        )
                    views = (
                        ["front", "back", "inside"]
                        if kind == "notebook"
                        else ["front", "back"]
                    )
                    sets.append(
                        dict(
                            key=f"{slug}/{kind}/{size}/{paper}/{sheets}",
                            spec=dict(
                                design=slug,
                                title_fa=fa,
                                title_en=en,
                                group=group,
                                notebook_type=kind,
                                size=size,
                                paper=paper,
                                sheets=sheets,
                                binding="side" if kind == "notebook" else "top",
                            ),
                            sources=src,
                            templates={view: kind + "-" + view for view in views},
                        )
                    )
    assert len(sets) == 220 and sum(len(s["templates"]) for s in sets) == 484
    manifest = dict(
        schema_version=1,
        assets=assets,
        templates=templates,
        sets=sets,
        sources=source_registry,
    )
    (args.output / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2)
    )
    print(
        json.dumps(
            dict(
                sets=len(sets),
                gallery_positions=484,
                private_inputs=len(assets),
                source_files=len(source_registry),
                output=str(args.output),
            ),
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
