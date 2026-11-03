from io import BytesIO
from uuid import uuid4

import pytest
from PIL import Image
from pydantic import ValidationError

from nilart.contexts.mockups.models import MediaRef, Sources, Spec, Template
from nilart.contexts.mockups.renderer import (
    back_layout,
    coefficients,
    decode,
    fingerprint,
    page_layout,
    render,
)


def spec(kind="sketchbook", **changes):
    return Spec(
        design="gorbe",
        title_fa="گربه",
        title_en="Cats",
        group="collection",
        notebook_type=kind,
        size="A5",
        paper="writing-paper" if kind == "notebook" else "kraft-coffee-100gsm",
        sheets=80 if kind == "notebook" else 40,
        binding="side" if kind == "notebook" else "top",
        **changes,
    )


def png(image):
    buffer = BytesIO()
    image.save(buffer, "PNG")
    return buffer.getvalue()


def fixture(view="front", kind="sketchbook"):
    blobs = {}

    def add(im):
        ref = MediaRef(asset_id=uuid4(), revision_id=uuid4())
        blobs[str(ref.asset_id)] = png(im)
        return ref

    base = Image.new("RGBA", (200, 200), (0, 0, 0, 0))
    base.paste((190, 160, 120, 255), (20, 20, 180, 180))
    photo = add(base)
    art = Image.new("RGBA", (70, 100), (0, 0, 0, 0))
    art.paste((255, 255, 255, 255), (15, 25, 45, 70))
    front = add(art)
    ink = Image.new("RGB", (100, 140), "white")
    ink.paste((0, 0, 0), (30, 30, 70, 80))
    back = add(ink)
    s = Sources(
        front=front,
        back_print=back,
        inside_left=back if kind == "notebook" else None,
        inside_right=back if kind == "notebook" else None,
    )
    quads = [{"points": [(0.2, 0.2), (0.8, 0.2), (0.8, 0.8), (0.2, 0.8)]}]
    if view == "inside":
        quads = [
            {"points": [(0.15, 0.2), (0.45, 0.2), (0.45, 0.8), (0.15, 0.8)]},
            {"points": [(0.55, 0.2), (0.85, 0.2), (0.85, 0.8), (0.55, 0.8)]},
        ]
    t = Template(
        title_fa="قالب",
        title_en="Template",
        notebook_type=kind,
        binding="top" if kind == "sketchbook" else "side",
        view=view,
        photo=photo,
        quads=quads,
    )
    return spec(kind), t, s, lambda ref: blobs[str(ref.asset_id)]


def test_original_opaque_white_is_kept_and_external_alpha_is_real():
    s, t, inputs, fetch = fixture()
    original = fetch(inputs.front)
    result = render(s, t, inputs, fetch)
    im = decode(result["png"])
    assert im.getpixel((0, 0))[3] == 0
    assert im.getpixel((100, 100)) == (255, 255, 255, 255)
    assert im.getpixel((45, 45)) == (190, 160, 120, 255)
    assert fetch(inputs.front) == original
    assert render(s, t, inputs, fetch) == result
    with Image.open(BytesIO(result["jpeg"])) as white:
        assert min(white.getpixel((0, 0))) > 245


def test_white_back_margin_does_not_turn_kraft_white():
    s, t, inputs, fetch = fixture("back")
    im = decode(render(s, t, inputs, fetch)["png"])
    assert im.getpixel((45, 45)) == (190, 160, 120, 255)
    assert max(im.getpixel((100, 90))[:3]) < 10
    assert im.getpixel((0, 0))[3] == 0


@pytest.mark.parametrize("size", ["A3", "A4", "A5", "A6"])
def test_each_size_has_correct_binding_and_page_count(size):
    for kind in ["notebook", "sketchbook"]:
        value = spec(kind).model_dump()
        value["size"] = size
        parsed = Spec.model_validate(value)
        assert len(parsed.views) == (3 if kind == "notebook" else 2)
        assert parsed.binding == ("side" if kind == "notebook" else "top")
        assert parsed.sheets == (80 if kind == "notebook" else 40)


def test_wrong_binding_and_unexpected_sketchbook_inside_are_rejected():
    s, t, inputs, fetch = fixture()
    with pytest.raises(ValidationError):
        Spec.model_validate({**s.model_dump(), "binding": "side"})
    with pytest.raises(ValidationError):
        Template.model_validate({**t.model_dump(), "view": "inside"})
    wrong = t.model_copy(update={"binding": "side"})
    with pytest.raises(ValueError, match="mismatch"):
        render(s, wrong, inputs, fetch)


def test_page_motifs_move_to_opposite_outer_corners_without_mirroring():
    motif = Image.new("RGBA", (80, 80), "white")
    motif.paste("black", (5, 10, 25, 70))
    left = page_layout(motif, spec("notebook"), "left")
    right = page_layout(motif, spec("notebook"), "right")
    assert left.getpixel((35, left.height - 80))[:3] == (0, 0, 0)
    assert min(right.getpixel((right.width - 100, right.height - 80))[:3]) < 10
    assert min(left.getpixel((left.width - 50, left.height - 80))[:3]) > 200


def test_inside_spread_is_only_available_for_notebooks_and_outputs_are_opaque():
    s, t, inputs, fetch = fixture("inside", "notebook")
    im = decode(render(s, t, inputs, fetch)["png"])
    assert im.getpixel((70, 80))[3] == 255 and im.getpixel((140, 80))[3] == 255
    assert im.getpixel((0, 0))[3] == 0


def test_back_labels_use_actual_size_without_modifying_source():
    art = Image.new("RGBA", (100, 100), "white")
    art.paste("black", (20, 20, 80, 80))
    before = png(art)
    out = back_layout(art, spec())
    assert out.height > out.width and png(art) == before
    assert fingerprint({"spec": spec().model_dump()}) != fingerprint(
        {"spec": spec("notebook").model_dump()}
    )


def test_invalid_bytes_and_degenerate_template_planes_are_rejected():
    with pytest.raises(ValueError):
        decode(b"not a photo")
    with pytest.raises(ValueError):
        coefficients([(0, 0)] * 4, [(0, 0)] * 4)


def test_missing_text_shaping_cannot_silently_render_different_typography(monkeypatch):
    from nilart.contexts.mockups import renderer

    monkeypatch.setattr(renderer.features, "check", lambda name: False)
    with pytest.raises(ValueError, match="persian_text_shaping_unavailable"):
        renderer.font(24)
