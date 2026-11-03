"""Owner catalogue commands must be exact, scoped and safe to resume after sales."""

import hashlib
import importlib.util
import io
import json
from decimal import Decimal
from pathlib import Path
from types import SimpleNamespace
from uuid import UUID, uuid4

from PIL import Image
from sqlalchemy import text
from starlette.requests import Request
from test_identity_otp_postgres import flow as flow
from test_simple_commerce_postgres import setup

from nilart.contexts.catalog.infrastructure.authoring import SqlCatalogAuthoringRepository
from nilart.contexts.inventory.router import RecordedCommand
from nilart.contexts.inventory.service import apply_adjustment


def script():
    path = Path(__file__).parents[2] / "infra/scripts/prepare-book-and-switch-catalog.py"
    spec = importlib.util.spec_from_file_location("book_switch_owner_setup", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_mandala_is_a_new_right_bound_A4_book_and_resume_never_restocks_consumed_units(flow):
    client, db, sentinel, owner = setup(flow)
    module = script()
    actor = SimpleNamespace(id=UUID(owner))
    repo = SqlCatalogAuthoringRepository(db)
    original = (
        db.execute(text("SELECT * FROM catalog_skus WHERE id=:id"), dict(id=sentinel))
        .mappings()
        .one()
    )
    result = module.configure_mandala(db, repo, actor, module.mandala(db, repo, actor))
    book = result["product"]
    id = UUID(book["sku_id"])
    row = (
        db.execute(text("SELECT price_amount,currency FROM catalog_skus WHERE id=:id"), dict(id=id))
        .mappings()
        .one()
    )
    assert row["price_amount"] == 900000 and row["currency"] == "IRT"
    stock = (
        db.execute(
            text("SELECT * FROM inventory_positions WHERE kind='sku' AND reference_id=:id"),
            dict(id=id),
        )
        .mappings()
        .one()
    )
    assert stock["quantity"] == 10 and stock["value"] == 5500000
    assert (
        db.scalar(text("SELECT unit_cost FROM simple_variant_costs WHERE sku_id=:id"), dict(id=id))
        == 550000
    )
    profile = (
        db.execute(
            text("SELECT * FROM catalog_profiles WHERE kind='skus' AND entity_id=:id"), dict(id=id)
        )
        .mappings()
        .one()
    )
    assert profile["published_revision"] is None and profile["content"]["gallery"] == []
    assert book["binding"] == "right" and book["size"] == "A4" and book["paper"] == "kraft-110gsm"
    assert book["pending"] == [
        "owner_real_cover_and_inside_page_photos",
        "review_and_publication_after_photos",
    ]
    assert (
        db.scalar(text("SELECT published FROM catalog_products WHERE id=:id"), dict(id=book["id"]))
        is False
    )
    moved = apply_adjustment(
        db,
        actor,
        Request({"type": "http", "headers": []}),
        uuid4(),
        RecordedCommand(
            kind="sku",
            reference_id=id,
            expected_version=stock["version"],
            action="decrease",
            quantity="2",
            reason="Two units consumed in a real sale simulation",
        ),
    )
    assert isinstance(moved, dict)
    movement_count = db.scalar(text("SELECT count(*) FROM inventory_movements"))
    module.configure_mandala(db, repo, actor, module.mandala(db, repo, actor))
    assert (
        db.scalar(
            text("SELECT quantity FROM inventory_positions WHERE kind='sku' AND reference_id=:id"),
            dict(id=id),
        )
        == 8
    )
    assert db.scalar(text("SELECT count(*) FROM inventory_movements")) == movement_count
    assert (
        db.execute(text("SELECT * FROM catalog_skus WHERE id=:id"), dict(id=sentinel))
        .mappings()
        .one()
        == original
    )


def test_switch_stickers_are_independent_single_unit_products_with_installed_and_art_only_views(
    flow, tmp_path
):
    client, db, sentinel, owner = setup(flow)
    module = script()
    actor = SimpleNamespace(id=UUID(owner))
    repo = SqlCatalogAuthoringRepository(db)
    original = (
        db.execute(text("SELECT * FROM catalog_skus WHERE id=:id"), dict(id=sentinel))
        .mappings()
        .one()
    )
    assets = []
    for design in ["gorbe", "gav", "roh", "qolche"]:
        for pose in range(1, 4):
            image = Image.new("RGBA", (128, 128), (100 + pose * 20, 30, 70, 255))
            output = io.BytesIO()
            image.save(output, "PNG")
            data = output.getvalue()
            normal = f"{design}-sticker-{pose}.png"
            installed = f"{design}-sticker-{pose}-installed.png"
            (tmp_path / normal).write_bytes(data)
            (tmp_path / installed).write_bytes(data)
            assets.append(
                dict(
                    kind="sticker",
                    design=design,
                    pose=pose,
                    file=normal,
                    installed_file=installed,
                    sha256=hashlib.sha256(data).hexdigest(),
                    installed_sha256=hashlib.sha256(data).hexdigest(),
                    title_fa=f"طرح {pose}",
                    title_en=f"Design {pose}",
                    dimensions_cm=[13, 17],
                )
            )
    (tmp_path / "manifest.json").write_text(json.dumps(dict(assets=assets)))
    result = module.configure_switches(
        db, repo, actor, module.switches(db, repo, actor, tmp_path), tmp_path
    )
    assert result["category"]["published"] is True and len(result["products"]) == 4
    for product in result["products"]:
        assert (
            product["slug"].endswith("-switch-sticker")
            and product["published"]
            and len(product["variants"]) == 3
        )
        for variant in product["variants"]:
            id = UUID(variant["sku_id"])
            row = (
                db.execute(
                    text("SELECT price_amount,currency,published FROM catalog_skus WHERE id=:id"),
                    dict(id=id),
                )
                .mappings()
                .one()
            )
            assert row["price_amount"] == 50000 and row["currency"] == "IRT" and row["published"]
            position = (
                db.execute(
                    text(
                        "SELECT quantity,value FROM inventory_positions WHERE kind='sku' AND reference_id=:id"
                    ),
                    dict(id=id),
                )
                .mappings()
                .one()
            )
            assert position["quantity"] == Decimal(1) and position["value"] == Decimal(10000)
            assert (
                db.scalar(
                    text("SELECT unit_cost FROM simple_variant_costs WHERE sku_id=:id"), dict(id=id)
                )
                == 10000
            )
            content = db.scalar(
                text("SELECT content FROM catalog_profiles WHERE kind='skus' AND entity_id=:id"),
                dict(id=id),
            )
            assert (
                len(content["gallery"]) == 2
                and "socket not included" in content["gallery"][0]["alt_en"]
            )
            assert content["delivery"] == "physical" and content["weight_estimated"] is True
    count = db.scalar(text("SELECT count(*) FROM inventory_movements"))
    module.configure_switches(db, repo, actor, module.switches(db, repo, actor, tmp_path), tmp_path)
    assert db.scalar(text("SELECT count(*) FROM inventory_movements")) == count
    assert (
        db.execute(text("SELECT * FROM catalog_skus WHERE id=:id"), dict(id=sentinel))
        .mappings()
        .one()
        == original
    )
