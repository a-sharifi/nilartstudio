"""Build deterministic channel intents from the canonical catalogue and available stock."""

import hashlib
import json
from decimal import ROUND_CEILING, Decimal
from io import BytesIO
from math import ceil

from PIL import Image
from sqlalchemy import text

from nilart.contexts.channels.adapters import ChannelError
from nilart.contexts.channels.models import Config, Listing


def fingerprint(value):
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":"), default=str).encode()
    ).hexdigest()


def channel_price(amount, currency, config):
    base = Decimal(amount) / (10 if currency == "IRR" else 1)
    step = Decimal(config.rounding_toman)
    return (base * (1 + Decimal(config.markup_percent) / 100) / step).to_integral_value(
        rounding=ROUND_CEILING
    ) * step


def image_record(db, image):
    return (
        db.execute(
            text("""SELECT v.file_name,v.sha256,b.content,b.size FROM media_assets a
      JOIN media_asset_versions v ON v.asset_id=a.id AND v.revision_id=:revision
      JOIN media_blobs b ON b.sha256=v.sha256
      WHERE a.id=:id AND a.purpose='public_image' AND a.published_revision IS NOT NULL
      AND v.purpose='public_image' AND v.action='publish' """),
            dict(id=image.asset_id, revision=image.revision_id),
        )
        .mappings()
        .first()
    )


def preview(db, row, channel_row):
    content = Listing.model_validate(row["content"])
    config = Config.model_validate(channel_row["config"])
    source = (
        db.execute(
            text("""SELECT s.*,p.published AS product_published,p.title_fa,p.title_en,p.description_fa,
      p.slug,sp.published_revision,r.intent->'content' AS profile,
      i.quantity,i.reserved,i.version AS stock_version
      FROM catalog_skus s JOIN catalog_products p ON p.id=s.product_id
      LEFT JOIN catalog_profiles sp ON sp.kind='skus' AND sp.entity_id=s.id
      LEFT JOIN catalog_profile_revisions r ON r.id=sp.published_revision
      LEFT JOIN inventory_positions i ON i.kind='sku' AND i.reference_id=s.id WHERE s.id=:id"""),
            dict(id=content.sku_id),
        )
        .mappings()
        .first()
    )
    if not source:
        raise ChannelError("channel_sku_not_found")
    config_version = channel_row["version"]
    issues = []
    warnings = []
    external = row["external_product_id"]
    variation = row["external_variation_id"]
    stopped = not content.active or not source["published"] or not source["product_published"]
    profile = source["profile"] or {}
    available = max(
        0, int((source["quantity"] or 0) - (source["reserved"] or 0)) - config.stock_buffer
    )
    if config.stock_cap is not None:
        available = min(available, config.stock_cap)
    if stopped:
        available = 0
    price = (
        channel_price(source["price_amount"], source["currency"], config)
        if source["price_amount"] is not None
        else None
    )
    title = content.title.strip() or source["title_fa"]
    description = content.description.strip() or source["description_fa"]
    if source["code"].upper().startswith("TEST-"):
        issues.append("catalogue_test_data")
    if row["channel"] != "basalam":
        issues.append("channel_adapter_not_implemented")
    if stopped and not external:
        issues.append("listing_inactive")
    preparation = (
        content.preparation_days
        if content.preparation_days is not None
        else config.preparation_days
    )
    packaging = (
        content.packaging_weight_grams
        if content.packaging_weight_grams is not None
        else config.packaging_weight_grams
    )
    images = []
    if not stopped:
        if price is None:
            issues.append("price_missing")
        if not title or len(title) > 120:
            issues.append("title_required")
        if not description or len(description) > 5000:
            issues.append("description_required")
        if not content.category_id:
            issues.append("category_required")
        if preparation is None:
            issues.append("preparation_required")
        if not packaging:
            issues.append("packaging_weight_required")
        if profile.get("delivery") != "physical" or not profile.get("weight_grams"):
            issues.append("physical_profile_required")
        if any(not profile.get(k) for k in ("length_cm", "width_cm", "height_cm")):
            issues.append("dimensions_required")
        if source["quantity"] is None:
            issues.append("inventory_opening_required")
        if not content.gallery:
            issues.append("gallery_required")
        if not content.images_reviewed:
            issues.append("images_review_required")
        for image in content.gallery:
            record = image_record(db, image)
            if not record:
                issues.append("gallery_not_published")
                continue
            try:
                with Image.open(BytesIO(record["content"])) as photo:
                    w, h = photo.size
                    fmt = photo.format
                if (
                    fmt not in ("JPEG", "PNG")
                    or min(w, h) < 600
                    or max(w, h) > 2500
                    or record["size"] > 5 * 1024 * 1024
                ):
                    issues.append("image_profile_not_ready")
                if w != h:
                    (issues if row["channel"] == "digikala" else warnings).append(
                        "square_image_required"
                        if row["channel"] == "digikala"
                        else "square_image_recommended"
                    )
                images.append(
                    dict(
                        **image.model_dump(mode="json"), sha256=record["sha256"], width=w, height=h
                    )
                )
            except Exception:
                issues.append("invalid_image")
        if profile.get("weight_estimated"):
            warnings.append("shipping_weight_estimated")
        if not content.brand:
            warnings.append("brand_attribute_missing")
    body = {}
    if stopped:
        body = {"stock": 0, **({"status": 3790} if not variation else {})}
    else:
        body = dict(
            name=title,
            description=description,
            category_id=content.category_id,
            status=2976,
            preparation_days=preparation,
            weight=profile.get("weight_grams"),
            package_weight=(profile.get("weight_grams") or 0) + (packaging or 0),
            primary_price=int(price * 10) if price is not None else None,
            stock=available,
            sku=source["code"],
            keywords=content.keywords,
            product_attribute=[
                {
                    "attribute_id": a.property_id,
                    "value": a.value or None,
                    "selected_values": a.selected_values or None,
                }
                for a in content.attributes
            ],
            packaging_dimensions={
                k: ceil(float(profile.get(k + "_cm") or 0) + 2)
                for k in ("length", "width", "height")
            },
            is_wholesale=False,
            virtual=False,
            unit_quantity=1,
            unit_type=6304,
        )
        if content.barcode:
            body["barcode"] = content.barcode
        if content.video_id:
            body["video"] = content.video_id
        if content.brand:
            body["attributes"] = [{"key": "برند", "value": content.brand}]
        if external:
            if not config.sync_products:
                body = {k: v for k, v in body.items() if k == "stock"}
            if not config.sync_stock:
                body.pop("stock", None)
            if variation:
                body = {k: v for k, v in body.items() if k in ("primary_price", "stock", "sku")}
        elif not config.sync_products:
            issues.append("product_sync_disabled")
    if not body:
        issues.append("no_sync_fields")
    net = None
    if (
        price is not None
        and config.commission_percent is not None
        and config.installment_percent is not None
    ):
        net = format(
            price
            * (
                1 - (Decimal(config.commission_percent) + Decimal(config.installment_percent)) / 100
            ),
            ".2f",
        )
    plan = dict(
        listing_id=str(row["id"]),
        listing_version=row["version"],
        channel=row["channel"],
        settings_version=config_version,
        external_product_id=external,
        external_variation_id=variation,
        sku_id=str(content.sku_id),
        sku_code=source["code"],
        site_price=str(source["price_amount"]) if source["price_amount"] is not None else None,
        site_currency=source["currency"],
        channel_price_toman=format(price, "f") if price is not None else None,
        estimated_net_toman=net,
        available=available,
        payload=body,
        images=images,
        issues=sorted(set(issues)),
        warnings=sorted(set(warnings)),
        source_revision=str(source["published_revision"]) if source["published_revision"] else None,
        stock_version=source["stock_version"],
        reserved=str(source["reserved"]) if source["reserved"] is not None else None,
    )
    plan["ready"] = not plan["issues"]
    plan["fingerprint"] = fingerprint(plan)
    return plan
