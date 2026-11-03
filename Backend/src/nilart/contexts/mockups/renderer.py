"""Deterministic original-art compositing on immutable real-photo templates."""

import hashlib
import json
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageOps, UnidentifiedImageError

from .models import PAPERS, SIZES, Spec, Template

VERSION = "real-photo-v1-top-bound"
LIMIT = 5 * 1024 * 1024
FONT = Path(__file__).with_name("data") / "YekanBakh-Regular.ttf"


def fingerprint(value):
    return hashlib.sha256(
        json.dumps(
            {"renderer": VERSION, **value},
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=False,
        ).encode()
    ).hexdigest()


def decode(data):
    if not 0 < len(data) <= LIMIT:
        raise ValueError("image_size_invalid")
    try:
        with Image.open(BytesIO(data), formats=["PNG", "JPEG"]) as im:
            if (
                im.width * im.height > 16_000_000
                or max(im.size) > 10000
                or getattr(im, "n_frames", 1) != 1
            ):
                raise ValueError("image_dimensions_invalid")
            im.load()
            return ImageOps.exif_transpose(im).convert("RGBA")
    except (OSError, UnidentifiedImageError, Image.DecompressionBombError) as exc:
        raise ValueError("image_decode_failed") from exc


def encode(im, white=False):
    output = BytesIO()
    if white:
        bg = Image.new("RGBA", im.size, "white")
        bg.alpha_composite(im)
        bg.convert("RGB").save(output, "JPEG", quality=90, optimize=True, progressive=True)
    else:
        im.save(output, "PNG", optimize=True)
    data = output.getvalue()
    if len(data) > LIMIT:
        raise ValueError("render_exceeds_media_limit")
    return data


def font(size):
    return ImageFont.truetype(str(FONT), size=size)


def contain(im, size, background=(255, 255, 255, 0)):
    out = Image.new("RGBA", size, background)
    im = ImageOps.contain(im, size, Image.Resampling.LANCZOS)
    out.alpha_composite(im, ((size[0] - im.width) // 2, (size[1] - im.height) // 2))
    return out


def ink_bounds(im):
    """Only art-only source margins; never infer a print-sheet trim this way."""
    white = Image.new("RGBA", im.size, "white")
    white.alpha_composite(im)
    mask = (
        ImageChops.difference(white.convert("RGB"), Image.new("RGB", im.size, "white"))
        .convert("L")
        .point(lambda x: 255 if x > 24 else 0)
    )
    box = mask.getbbox()
    return white.crop(box) if box else white


def back_layout(art, spec: Spec, logo=None):
    w, h = 900, round(900 * SIZES[spec.size][1] / SIZES[spec.size][0])
    out = Image.new("RGBA", (w, h), "white")
    art = ink_bounds(art)
    art = contain(art, (int(w * 0.88), int(h * 0.66)), "white")
    out.alpha_composite(art, (int(w * 0.06), int(h * 0.03)))
    d = ImageDraw.Draw(out)
    center = w / 2
    d.line((w * 0.39, h * 0.715, w * 0.61, h * 0.715), fill="#3c342d", width=2)
    d.text((center, h * 0.745), spec.size, font=font(33), fill="#292522", anchor="mm")
    dims = SIZES[spec.size]
    digits = str.maketrans("0123456789.", "۰۱۲۳۴۵۶۷۸۹٫")
    dimension = f"ابعاد: {dims[0] / 10:g} × {dims[1] / 10:g} سانتی‌متر".translate(digits)
    for label, y, fs in [
        (dimension, 0.795, 24),
        (f"{spec.sheets} برگ".translate(digits), 0.85, 31),
        (PAPERS[spec.paper][0], 0.905, 27),
    ]:
        d.text(
            (center, h * y),
            label,
            font=font(fs),
            fill="#292522",
            anchor="mm",
            direction="rtl",
            language="fa",
        )
    if logo is not None:
        mark = ImageOps.contain(logo, (int(w * 0.20), int(h * 0.09)), Image.Resampling.LANCZOS)
        out.alpha_composite(mark, (int(w * 0.05), int(h * 0.89)))
    return out


def page_layout(motif, spec: Spec, side):
    w, h = 900, round(900 * SIZES[spec.size][1] / SIZES[spec.size][0])
    out = Image.new("RGBA", (w, h), "white")
    # Existing monochrome characters only. White original details remain paper-white.
    m = ink_bounds(motif)
    m = ImageOps.grayscale(m.convert("RGB")).convert("RGBA")
    size_mm = {"A3": 65, "A4": 52, "A5": 40, "A6": 29}[spec.size]
    maximum = round(w * size_mm / SIZES[spec.size][0])
    m = ImageOps.contain(m, (maximum, maximum), Image.Resampling.LANCZOS)
    margin = round(w * 5 / SIZES[spec.size][0])
    mx = margin if side == "left" else w - margin - m.width
    my = h - margin - m.height
    draw = ImageDraw.Draw(out)
    spacing = w * 7 / SIZES[spec.size][0]
    y = w * 18 / SIZES[spec.size][0]
    while y < h - w * 20 / SIZES[spec.size][0]:
        left, right = w * 0.08, w * 0.92
        if y >= my - 12:
            if side == "left":
                left = mx + m.width + 18
            else:
                right = mx - 18
        draw.line((left, y, right, y), fill="#d3d4d4", width=1)
        y += spacing
    out.alpha_composite(m, (mx, my))
    draw.text(
        (w / 2, h - w * 10 / SIZES[spec.size][0]),
        "nilartstudio.ir",
        font=font(max(11, round(w * 0.021))),
        fill="#8a8580",
        anchor="mm",
    )
    return out


def coefficients(src, dst):
    """Eight-equation inverse homography, without a heavyweight runtime dependency."""
    matrix = []
    for (x, y), (u, v) in zip(dst, src, strict=True):
        matrix.extend(
            [[x, y, 1, 0, 0, 0, -u * x, -u * y, u], [0, 0, 0, x, y, 1, -v * x, -v * y, v]]
        )
    for col in range(8):
        pivot = max(range(col, 8), key=lambda i: abs(matrix[i][col]))
        matrix[col], matrix[pivot] = matrix[pivot], matrix[col]
        value = matrix[col][col]
        if abs(value) < 1e-10:
            raise ValueError("template_plane_degenerate")
        matrix[col] = [x / value for x in matrix[col]]
        for i in range(8):
            if i != col:
                scale = matrix[i][col]
                matrix[i] = [a - scale * b for a, b in zip(matrix[i], matrix[col], strict=True)]
    return tuple(row[-1] for row in matrix)


def project(base, art, quad, ink=False):
    dest = [(x * base.width, y * base.height) for x, y in quad.points]
    src = [(0, 0), (art.width, 0), (art.width, art.height), (0, art.height)]
    warped = art.transform(
        base.size, Image.Transform.PERSPECTIVE, coefficients(src, dest), Image.Resampling.BICUBIC
    )
    if ink:
        # White means unprinted kraft/paper. Blue logo and graphite are real source pixels.
        colour = ImageChops.multiply(base.convert("RGB"), warped.convert("RGB"))
        base.paste(
            colour, (0, 0), ImageChops.multiply(warped.getchannel("A"), base.getchannel("A"))
        )
    else:
        layer = Image.new("RGBA", base.size)
        layer.paste(warped, (0, 0))
        layer.putalpha(ImageChops.multiply(layer.getchannel("A"), base.getchannel("A")))
        base.alpha_composite(layer)


def render(spec: Spec, template: Template, sources, fetch):
    if (
        not template.active
        or template.notebook_type != spec.notebook_type
        or template.binding != spec.binding
        or template.view not in spec.views
    ):
        raise ValueError("template_binding_or_type_mismatch")
    base = decode(fetch(template.photo))
    base.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
    if template.view == "front":
        art = decode(fetch(sources.front))
        bbox = art.getchannel("A").getbbox()
        if bbox:
            art = art.crop(bbox)
        ratio = SIZES[spec.size][1] / SIZES[spec.size][0]
        # Transparent border is intentional cover clearance, never opaque white.
        canvas = Image.new("RGBA", (900, round(900 * ratio)))
        artwork = ImageOps.contain(
            art, (756, round(canvas.height * 0.83)), Image.Resampling.LANCZOS
        )
        canvas.alpha_composite(
            artwork, ((900 - artwork.width) // 2, (canvas.height - artwork.height) // 2)
        )
        project(base, canvas, template.quads[0])
    elif template.view == "back":
        if sources.back_print:
            art = decode(fetch(sources.back_print))
            x1, y1, x2, y2 = sources.back_crop
            art = art.crop(
                (
                    round(x1 * art.width),
                    round(y1 * art.height),
                    round(x2 * art.width),
                    round(y2 * art.height),
                )
            )
            bg = Image.new("RGBA", art.size, "white")
            bg.alpha_composite(art)
            art = bg
        else:
            art = back_layout(
                decode(fetch(sources.back_art)),
                spec,
                decode(fetch(sources.logo)) if sources.logo else None,
            )
        project(base, art, template.quads[0], ink=True)
    else:
        for side, ref, quad in zip(
            ["left", "right"],
            [sources.inside_left, sources.inside_right],
            template.quads,
            strict=True,
        ):
            if ref is None:
                raise ValueError("inside_source_missing")
            art = decode(fetch(ref))
            if sources.inside_mode == "motifs":
                art = page_layout(art, spec, side)
            else:
                bg = Image.new("RGBA", art.size, "white")
                bg.alpha_composite(art)
                art = bg
            project(base, art, quad, ink=True)
    if template.occlusion:
        mask = decode(fetch(template.occlusion))
        if mask.size != base.size:
            raise ValueError("occlusion_size_mismatch")
        base.alpha_composite(mask)
    return {"png": encode(base), "jpeg": encode(base, white=True)}
