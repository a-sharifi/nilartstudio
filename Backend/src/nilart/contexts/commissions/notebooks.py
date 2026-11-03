"""Notebook selection and portfolio use published catalogue/media, never print originals."""

import hashlib
import json
import re
from decimal import Decimal
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.shared.database import session_dependency

PORTFOLIO_ID = UUID("fb08c6fa-0620-4cc1-8bd4-47effb18342f")
router = APIRouter(prefix="/api/v1/catalog/notebook-designs", tags=["notebook-designs"])


def notebook(db, sku):
    row = (
        db.execute(
            text("""SELECT s.id,s.code,s.price_amount,s.currency,p.slug,p.title_fa,p.title_en
      FROM catalog_skus s JOIN catalog_products p ON p.id=s.product_id
      LEFT JOIN catalog_product_presentations d ON d.product_id=p.id AND d.published
      WHERE s.id=:id AND s.published AND p.published AND (d.document->>'kind'='book' OR EXISTS(SELECT 1 FROM catalog_product_categories pc JOIN catalog_categories c ON c.id=pc.category_id WHERE pc.product_id=p.id AND c.published AND c.slug IN ('notebooks','sketchbooks'))) FOR SHARE OF s,p"""),
            dict(id=sku),
        )
        .mappings()
        .first()
    )
    return dict(row) if row else None


@router.get("")
def listing(db: Session = Depends(session_dependency)):
    ids = db.scalars(
        text("""SELECT s.id FROM catalog_skus s JOIN catalog_products p ON p.id=s.product_id
      LEFT JOIN catalog_product_presentations d ON d.product_id=p.id AND d.published
      WHERE s.published AND p.published AND (d.document->>'kind'='book' OR EXISTS(SELECT 1 FROM catalog_product_categories pc JOIN catalog_categories c ON c.id=pc.category_id WHERE pc.product_id=p.id AND c.published AND c.slug IN ('notebooks','sketchbooks'))) ORDER BY p.slug,s.code""")
    ).all()
    choices = []
    for id in ids:
        row = notebook(db, id)
        from nilart.contexts.basket.catalog import product_quote, sku

        q = product_quote(db, sku(db, id)) if row["price_amount"] is not None else None
        choices.append(
            dict(
                id=str(id),
                code=row["code"],
                slug=row["slug"],
                title_fa=row["title_fa"],
                title_en=row["title_en"],
                options=q["options"] if q else [],
                base_amount=q["unit"] if q else None,
                size=(re.search(r"(?:^|-)(A[3456])(?:-|$)", row["code"]) or [None, ""])[1],
                notebook_type="sketchbook" if "sketchbook" in row["slug"] else "notebook",
                paper=(
                    q["options"][-1]
                    if q and len(q["options"]) > 1
                    else ["کاغذ تحریر", "Writing paper"]
                ),
                sheets=40 if "sketchbook" in row["slug"] else 80,
            )
        )
    content = db.scalar(
        text("""SELECT r.intent->'content' FROM catalog_profiles p
      JOIN catalog_profile_revisions r ON r.id=p.published_revision
      JOIN catalog_collections c ON c.id=p.entity_id AND c.published
      WHERE p.kind='collections' AND p.entity_id=:id"""),
        dict(id=PORTFOLIO_ID),
    )
    gallery = [
        g
        for g in (content or {}).get("gallery", [])
        if db.scalar(
            text(
                "SELECT 1 FROM media_assets WHERE id=:id AND purpose='public_image' AND published_revision IS NOT NULL"
            ),
            dict(id=g["asset_id"]),
        )
    ]
    return dict(notebooks=choices, portfolio_id=str(PORTFOLIO_ID), gallery=gallery)


def price_notebook(db, sku_id, technique):
    row = notebook(db, sku_id)
    if not row or row["price_amount"] is None or row["currency"] != "IRT":
        raise ValueError("notebook_unavailable")
    from nilart.contexts.marketing.service import effective_sale
    row['price_amount']=effective_sale(db,'sku',sku_id,row['price_amount'],row['currency'])
    fee = Decimal(500000 if technique == "digital" else 1500000)
    value = dict(
        sku_id=str(sku_id),
        technique=technique,
        base_amount=format(row["price_amount"], ".2f"),
        design_amount=format(fee, ".2f"),
        total_amount=format(row["price_amount"] + fee, ".2f"),
        currency="IRT",
        shipping_included=False,
    )
    value["fingerprint"] = hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()
    return value


@router.get("/{sku_id}/quote")
def price(
    sku_id: UUID, technique: Literal["digital", "pencil"], db: Session = Depends(session_dependency)
):
    try:
        return price_notebook(db, sku_id, technique)
    except ValueError:
        raise HTTPException(status_code=409, detail={"code": "notebook_unavailable"}) from None
