import json
from datetime import UTC, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response
from pydantic import Field, model_validator
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.contexts.business.router import Strict
from nilart.contexts.catalog.presentation.bundle_authoring import (
    BundleError,
    GalleryImage,
    validate_dependencies,
)
from nilart.contexts.catalog.presentation.bundle_authoring import (
    Content as BundleContent,
)
from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.contexts.identity.presentation.router import failure
from nilart.contexts.marketing.service import current
from nilart.shared.database import session_dependency

router = APIRouter(prefix="/api/v1/admin/promotions", tags=["promotions"])
public_router = APIRouter(prefix="/api/v1/promotions", tags=["storefront-promotions"])


class Banner(Strict):
    tone: Literal["terracotta", "sage", "ink"] = "terracotta"
    active: bool = False
    text_fa: str = Field(default="", max_length=300)
    text_en: str = Field(default="", max_length=300)
    code: str = Field(default="", pattern=r"^(?:[A-Z0-9][A-Z0-9_-]{0,79})?$")
    link: str = Field(default="/fa/shop", max_length=300, pattern=r"^/[a-zA-Z0-9/\-?=&%#_]*$")
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    gallery: list[GalleryImage] = Field(default_factory=list, max_length=1)

    @model_validator(mode="after")
    def dates(self):
        if self.link.startswith("//"):
            raise ValueError("Only local site links are allowed")
        for value in [self.starts_at, self.ends_at]:
            if value and value.tzinfo is None:
                raise ValueError("Timezone required")
        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            raise ValueError("Invalid date range")
        if self.active and not self.text_fa:
            raise ValueError("Banner text required")
        return self


class Sale(Strict):
    kind: Literal["sku", "artwork"]
    target_id: UUID
    title: str = Field(min_length=1, max_length=200)
    sale_amount: str = Field(pattern=r"^[1-9][0-9]{0,11}$")
    starts_at: datetime
    ends_at: datetime
    active: bool = False

    @model_validator(mode="after")
    def dates(self):
        if (
            self.starts_at.tzinfo is None
            or self.ends_at.tzinfo is None
            or self.ends_at <= self.starts_at
        ):
            raise ValueError("Invalid timezone-aware sale dates")
        return self


class BannerSlide(Banner):
    id: UUID


class Content(Strict):
    banner: Banner = Field(default_factory=Banner)
    banners: list[BannerSlide] = Field(default_factory=list, max_length=9)
    sales: list[Sale] = Field(default_factory=list, max_length=200)

    @model_validator(mode="after")
    def distinct(self):
        if len({b.id for b in self.banners}) != len(self.banners):
            raise ValueError("Banner identifiers must be unique")
        if len({(s.kind, s.target_id) for s in self.sales}) != len(self.sales):
            raise ValueError("One sale per item")
        return self


class Save(Strict):
    expected_version: int = Field(strict=True, ge=0)
    content: Content
    reason: str = Field(min_length=5, max_length=1000)


@router.get("")
def read(
    response: Response,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("catalog.manage")),
):
    version, c = current(db)
    response.headers["Cache-Control"] = "no-store"
    return dict(version=version, content=Content.model_validate(c).model_dump(mode="json"))


@router.get("/choices")
def choices(
    response: Response,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("catalog.manage")),
):
    response.headers["Cache-Control"] = "no-store"
    return [
        {**dict(r), "amount": format(r["amount"], "f") if r["amount"] is not None else None}
        for r in db.execute(
            text("""SELECT s.id,'sku' kind,concat(p.title_fa,' — ',s.code) title,s.price_amount amount,s.currency FROM catalog_skus s JOIN catalog_products p ON p.id=s.product_id WHERE s.published AND p.published
    UNION ALL SELECT a.id,'artwork' kind,a.title_fa title,CAST(d.document->>'price_amount' AS numeric) amount,d.document->>'currency' currency FROM catalog_artworks a JOIN catalog_artwork_details d ON d.artwork_id=a.id WHERE a.published ORDER BY title LIMIT 1000""")
        ).mappings()
    ]


@router.put("/{key}")
def save(
    key: UUID,
    body: Save,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("catalog.manage")),
):
    actor, denied = write_access(request, db, principal, "catalog.manage")
    if denied is not None:
        return denied
    if body.content.sales and not SqlIdentityRepository(db).principal(actor.id, lock=True).allows(
        "pricing.publish"
    ):
        return failure(request, "permission_denied", 403)
    db.execute(text("SELECT pg_advisory_xact_lock(78214,62)"))
    content = body.content.model_dump(mode="json")
    prior = (
        db.execute(text("SELECT * FROM marketing_revisions WHERE id=:id"), dict(id=key))
        .mappings()
        .first()
    )
    if prior:
        if (
            str(prior["actor_id"]) != str(actor.id)
            or Content.model_validate(prior["content"]).model_dump(mode="json") != content
            or prior["expected_version"] != body.expected_version
            or prior["reason"] != body.reason
        ):
            return failure(request, "promotion_command_conflict", 409)
        return dict(
            version=prior["version"],
            content=Content.model_validate(prior["content"]).model_dump(mode="json"),
        )
    version, _ = current(db)
    if version != body.expected_version:
        return failure(request, "promotion_version_conflict", 409)
    try:
        for banner in [body.content.banner, *body.content.banners]:
            validate_dependencies(
                db,
                BundleContent(
                    slug="marketing-banner",
                    title_fa="بنر",
                    title_en="Banner",
                    discount_amount="0",
                    gallery=banner.gallery,
                ),
                False,
            )
    except BundleError:
        return failure(request, "promotion_image_unavailable", 409)
    for sale in body.content.sales:
        if sale.kind == "sku":
            row = (
                db.execute(
                    text(
                        "SELECT s.price_amount amount,s.currency FROM catalog_skus s JOIN catalog_products p ON p.id=s.product_id WHERE s.id=:id AND s.published AND p.published FOR SHARE OF s,p"
                    ),
                    dict(id=sale.target_id),
                )
                .mappings()
                .first()
            )
        else:
            row = (
                db.execute(
                    text(
                        "SELECT CAST(d.document->>'price_amount' AS numeric) amount,d.document->>'currency' currency FROM catalog_artworks a JOIN catalog_artwork_details d ON d.artwork_id=a.id WHERE a.id=:id AND a.published FOR SHARE OF a,d"
                    ),
                    dict(id=sale.target_id),
                )
                .mappings()
                .first()
            )
        if (
            not row
            or row["amount"] is None
            or Decimal(sale.sale_amount)
            >= (row["amount"] / 10 if row["currency"] == "IRR" else row["amount"])
        ):
            return failure(request, "promotion_price_invalid", 422)
    params = dict(
        id=key,
        actor=actor.id,
        expected=version,
        version=version + 1,
        content=json.dumps(content),
        reason=body.reason,
    )
    db.execute(
        text(
            "INSERT INTO marketing_settings(id,version,content) VALUES(1,:version,CAST(:content AS jsonb)) ON CONFLICT(id) DO UPDATE SET version=:version,content=EXCLUDED.content,updated_at=now()"
        ),
        params,
    )
    db.execute(
        text(
            "INSERT INTO marketing_revisions(id,actor_id,expected_version,version,content,reason) VALUES(:id,:actor,:expected,:version,CAST(:content AS jsonb),:reason)"
        ),
        params,
    )
    SqlAccountManagement(db).audit(
        actor.id, actor.id, "promotions.saved", dict(version=version + 1), body.reason
    )
    db.commit()
    return dict(version=version + 1, content=content)


def visible_banner(db, banner, now):
    visible = (
        banner.active
        and (not banner.starts_at or banner.starts_at <= now)
        and (not banner.ends_at or now < banner.ends_at)
    )
    if banner.code and visible:
        from zoneinfo import ZoneInfo

        from nilart.contexts.discounts.router import Resource

        row = db.scalar(
            text("SELECT content FROM discount_rules WHERE code=:code"), dict(code=banner.code)
        )
        rule = Resource.model_validate(row) if row else None
        today = now.astimezone(ZoneInfo("Asia/Tehran")).date()
        visible = bool(rule and rule.active and rule.valid_from <= today <= rule.valid_to)
        if visible and rule.total_limit is not None:
            used = db.scalar(
                text(
                    "SELECT count(*) FROM discount_usage u JOIN discount_rules r ON r.id=u.discount_id WHERE r.code=:code AND u.state IN ('reserved','redeemed')"
                ),
                dict(code=banner.code),
            )
            visible = used < rule.total_limit
    if banner.gallery and visible:
        g = banner.gallery[0]
        visible = bool(
            db.scalar(
                text("""SELECT a.id FROM media_assets a
          JOIN media_asset_versions v ON v.asset_id=a.id AND v.revision_id=:revision
          WHERE a.id=:id AND a.purpose='public_image' AND a.published_revision IS NOT NULL
          AND v.action='publish' AND v.purpose='public_image'"""),
                dict(id=g.asset_id, revision=g.revision_id),
            )
        )
    return visible


@public_router.get("")
def public(response: Response, db: Session = Depends(session_dependency)):
    _, raw = current(db)
    content = Content.model_validate(raw)
    now = datetime.now(UTC)
    response.headers["Cache-Control"] = "no-store"
    # Preserve the original response for older storefront clients during deployment.
    first = (
        content.banner.model_dump(mode="json") if visible_banner(db, content.banner, now) else None
    )
    slides = [dict(id="primary", **first)] if first else []
    slides.extend(b.model_dump(mode="json") for b in content.banners if visible_banner(db, b, now))
    return dict(banner=first, banners=slides)


@public_router.get("/sales")
def public_sales(response: Response, db: Session = Depends(session_dependency)):
    from nilart.contexts.marketing.service import effective_sale

    _, data = current(db)
    result = []
    response.headers["Cache-Control"] = "no-store"
    for sale in data.get("sales", []):
        if not sale["active"]:
            continue
        if sale["kind"] == "sku":
            row = (
                db.execute(
                    text(
                        "SELECT s.price_amount amount,s.currency FROM catalog_skus s JOIN catalog_products p ON p.id=s.product_id WHERE s.id=:id AND s.published AND p.published"
                    ),
                    dict(id=sale["target_id"]),
                )
                .mappings()
                .first()
            )
        else:
            row = (
                db.execute(
                    text(
                        "SELECT CAST(d.document->>'price_amount' AS numeric) amount,d.document->>'currency' currency FROM catalog_artworks a JOIN catalog_artwork_details d ON d.artwork_id=a.id WHERE a.id=:id AND a.published"
                    ),
                    dict(id=sale["target_id"]),
                )
                .mappings()
                .first()
            )
        if not row or row["amount"] is None:
            continue
        amount = effective_sale(db, sale["kind"], sale["target_id"], row["amount"], row["currency"])
        if amount < row["amount"]:
            result.append(
                dict(
                    kind=sale["kind"],
                    target_id=sale["target_id"],
                    original_amount=str(
                        row["amount"] / 10 if row["currency"] == "IRR" else row["amount"]
                    ),
                    sale_amount=str(amount / 10 if row["currency"] == "IRR" else amount),
                )
            )
    return result


@public_router.get("/home-offers")
def home_offers(response: Response, db: Session = Depends(session_dependency)):
    """Only current offers with a published identity and available stock; no private costs."""
    from nilart.contexts.catalog.infrastructure.artwork_availability import live_details
    from nilart.contexts.catalog.presentation.router import cover

    active = public_sales(response, db)
    _, content = current(db)
    descriptions = {(s["kind"], s["target_id"]): s for s in content.get("sales", [])}
    results = []
    for sale in active:
        if len(results) == 12:
            break
        if sale["kind"] == "sku":
            row = (
                db.execute(
                    text("""SELECT s.id,s.code,s.product_id,p.slug,p.title_fa,p.title_en,
              m.snapshot AS option_snapshot FROM catalog_skus s
              JOIN catalog_products p ON p.id=s.product_id
              JOIN inventory_positions i ON i.kind='sku' AND i.reference_id=s.id
              LEFT JOIN catalog_sku_option_mappings m ON m.sku_id=s.id
              WHERE s.id=:id AND s.published AND p.published AND i.quantity-i.reserved>0"""),
                    dict(id=sale["target_id"]),
                )
                .mappings()
                .first()
            )
            if not row:
                continue
            image = cover(db, "skus", row["id"]) or cover(db, "products", row["product_id"])
            snapshot = row["option_snapshot"] or {}
            chosen = {
                v["option_id"]: v["value_id"]
                for v in snapshot.get("combination", {}).get("selections", [])
            }
            labels = {
                lang: " · ".join(
                    v["title_" + lang]
                    for o in sorted(snapshot.get("options", []), key=lambda o: o["order"])
                    for v in o["values"]
                    if chosen.get(o["id"]) == v["id"]
                )
                for lang in ["fa", "en"]
            }
            results.append(
                dict(
                    **sale,
                    slug=row["slug"],
                    title_fa=row["title_fa"],
                    title_en=row["title_en"],
                    variant_fa=labels["fa"] or row["code"],
                    variant_en=labels["en"] or row["code"],
                    image_url=image.get("image_url"),
                    ends_at=descriptions[(sale["kind"], sale["target_id"])]["ends_at"],
                )
            )
        else:
            row = (
                db.execute(
                    text("""SELECT a.id,a.slug,a.title_fa,a.title_en,d.document FROM catalog_artworks a
              JOIN catalog_artwork_details d ON d.artwork_id=a.id WHERE a.id=:id AND a.published"""),
                    dict(id=sale["target_id"]),
                )
                .mappings()
                .first()
            )
            if not row:
                continue
            details = live_details(db, row["id"], row["document"])
            if not details or details.get("sample", True) or details.get("stock", 0) <= 0:
                continue
            # Print editions can have a live SKU price. Verify its effective artwork discount.
            if Decimal(str(details.get("price_amount", 0))) / (
                10 if details.get("currency") == "IRR" else 1
            ) != Decimal(sale["sale_amount"]):
                continue
            results.append(
                dict(
                    **sale,
                    slug=row["slug"],
                    title_fa=row["title_fa"],
                    title_en=row["title_en"],
                    variant_fa="",
                    variant_en="",
                    image_url=details.get("image_url"),
                    ends_at=descriptions[(sale["kind"], sale["target_id"])]["ends_at"],
                )
            )
    return results
