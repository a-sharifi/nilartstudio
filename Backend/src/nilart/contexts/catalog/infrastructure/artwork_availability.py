"""Managed edition availability derives from its real source, never author-entered stock."""

from decimal import Decimal

from sqlalchemy import text


def live_details(db, id, document):
    if not document or document.get("sample", True):
        return document
    result = dict(document)
    gallery = [
        g
        for g in document.get("gallery", [])
        if db.scalar(
            text(
                "SELECT id FROM media_assets WHERE id=:id AND purpose='public_image' AND published_revision IS NOT NULL"
            ),
            {"id": g["asset_id"]},
        )
    ]
    result["gallery"] = gallery
    if not gallery:
        result["stock"] = 0
        return result
    g = gallery[0]
    result["image_url"] = f"/api/v1/media/{g['asset_id']}/versions/{g['revision_id']}/content"
    edition = document["edition"]
    if edition == "digital":
        result["stock"] = 1
    else:
        reference = document.get("linked_sku_id") if edition == "print" else id
        kind = "sku" if edition == "print" else "artwork"
        position = (
            db.execute(
                text(
                    "SELECT quantity,reserved FROM inventory_positions WHERE kind=:kind AND reference_id=:id"
                ),
                {"kind": kind, "id": reference},
            )
            .mappings()
            .first()
        )
        available = (
            max(Decimal(0), position["quantity"] - position["reserved"]) if position else Decimal(0)
        )
        result["stock"] = int(min(available, 100000))
        if edition == "original" and position and position["quantity"] > 1:
            result["stock"] = 0
        if edition == "print":
            sku = (
                db.execute(
                    text(
                        "SELECT s.price_amount,s.currency FROM catalog_skus s JOIN catalog_products p ON p.id=s.product_id WHERE s.id=:id AND s.published=true AND p.published=true"
                    ),
                    {"id": reference},
                )
                .mappings()
                .first()
            )
            if (
                not sku
                or sku["price_amount"] is None
                or sku["price_amount"] != sku["price_amount"].quantize(Decimal(".01"))
            ):
                result["stock"] = 0
            else:
                result.update(
                    price_amount=format(sku["price_amount"].normalize(), "f"),
                    currency=sku["currency"],
                )
    from nilart.contexts.marketing.service import effective_sale
    if result.get('price_amount') is not None:
        base=Decimal(str(result['price_amount']));price=effective_sale(db,'artwork',id,base,result.get('currency','IRT'))
        if price<base:result.update(original_price_amount=str(base),price_amount=str(price))
    return result
