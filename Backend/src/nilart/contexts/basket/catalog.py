from decimal import localcontext

from sqlalchemy import text

from nilart.contexts.basket.domain import Item, amount, toman
from nilart.contexts.catalog.domain.artwork_details import ArtworkDetails


def sku(db, identity):
    row = db.execute(text("SELECT s.id,s.product_id,s.code,s.price_amount,s.currency,p.slug,p.title_fa,p.title_en,d.document "
        "FROM catalog_skus s JOIN catalog_products p ON p.id=s.product_id "
        "LEFT JOIN catalog_product_presentations d ON d.product_id=p.id AND d.published=true "
        "WHERE s.id=:id AND s.published=true AND p.published=true"), {"id": identity}).mappings().first()
    if not row:
        raise ValueError("item_unavailable")
    return row


def product_quote(db, row):
    selection = {}
    document = row["document"] or {}
    combination = next((part for part in document.get("option_combinations", []) if part["code"] == row["code"]), None)
    if combination:
        selection = combination["selections"]
    labels = []
    for group in document.get("option_groups", []):
        selected = next((choice for choice in group["choices"] if choice["value"] == selection.get(group["id"])), None)
        if selected:
            labels.append([group["label"]["fa"]+": "+selected["label"]["fa"], group["label"]["en"]+": "+selected["label"]["en"]])
    return {"slug": row["slug"], "name": [row["title_fa"], row["title_en"]], "options": labels, "selection": selection,
            "unit": amount(toman(row["price_amount"], row["currency"])), "parts": [], "base": amount(toman(row["price_amount"], row["currency"])), "saving": "0", "media": "product"}


def quote(db, item: Item):
    with localcontext() as context:
        context.prec = 64
        return _quote(db, item)


def _quote(db, item: Item):
    if item.kind == "product":
        if item.choices or item.framed:
            raise ValueError("invalid_selection")
        return product_quote(db, sku(db, item.item_id))
    if item.kind == "artwork":
        row = db.execute(text("SELECT a.slug,a.title_fa,a.title_en,d.document FROM catalog_artworks a JOIN catalog_artwork_details d ON d.artwork_id=a.id WHERE a.id=:id AND a.published=true"), {"id": item.item_id}).mappings().first()
        if not row:
            raise ValueError("item_unavailable")
        data = ArtworkDetails.model_validate(row["document"])
        if item.choices or item.quantity > 1 or not data.stock:
            raise ValueError("invalid_quantity")
        price = toman(data.price_amount, data.currency)
        if item.framed:
            if data.frame_price_amount is None or not data.framed_fa or not data.framed_en:
                raise ValueError("invalid_selection")
            price += toman(data.frame_price_amount, data.currency)
        return {"slug": row["slug"], "name": [row["title_fa"], row["title_en"]], "selection": {}, "unit": amount(price), "base": amount(price), "saving": "0", "parts": [], "media": "artwork", "image": data.image_url, "artist": [data.artist_fa, data.artist_en], "size": f"{data.width_cm} × {data.height_cm} cm", "frame": [data.framed_fa, data.framed_en] if item.framed else [data.frame_fa, data.frame_en]}
    row = db.execute(text("SELECT b.slug,b.title_fa,b.title_en,d.document FROM catalog_bundles b LEFT JOIN catalog_bundle_presentations d ON d.bundle_id=b.id AND d.published=true WHERE b.id=:id AND b.published=true"), {"id": item.item_id}).mappings().first()
    if not row or item.framed:
        raise ValueError("item_unavailable")
    components = db.execute(text("SELECT sku_id,quantity FROM catalog_bundle_components WHERE bundle_id=:id ORDER BY sku_id"), {"id": item.item_id}).mappings().all()
    if not components or set(map(str, item.choices)) - {str(part["sku_id"]) for part in components}:
        raise ValueError("invalid_selection")
    document = row["document"] or {}
    parts, base, selection, labels = [], toman("0", "IRT"), {}, []
    for part in components:
        original = sku(db, part["sku_id"])
        allowed = next((choice["allowed_sku_ids"] for choice in document.get("component_choices", []) if str(choice["component_sku_id"]) == str(part["sku_id"])), None)
        chosen = item.choices.get(part["sku_id"])
        if allowed is not None and (chosen is None or str(chosen) not in allowed):
            raise ValueError("invalid_selection")
        if allowed is None and chosen is not None and chosen != part["sku_id"]:
            raise ValueError("invalid_selection")
        selected = sku(db, chosen or part["sku_id"])
        if original["product_id"] != selected["product_id"]:
            raise ValueError("invalid_selection")
        value = product_quote(db, selected)
        selection.update(value["selection"])
        labels.extend(value["options"])
        base += toman(value["unit"], "IRT") * part["quantity"]
        parts.append({"sku_id": str(selected["id"]), "quantity": part["quantity"], "name": value["name"], "unit": value["unit"], "slug": value["slug"]})
    discount = document.get("discount")
    saving = min(base, toman(discount["amount"], discount["currency"])) if discount else toman("0", "IRT")
    return {"slug": row["slug"], "name": [row["title_fa"], row["title_en"]], "options": labels, "selection": selection, "unit": amount(base-saving), "base": amount(base), "saving": amount(saving), "parts": parts, "media": "bundle"}
