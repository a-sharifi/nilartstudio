"""Draft isolation and explicit publication of complete bundle definitions."""

import json
from collections import defaultdict
from datetime import datetime
from decimal import Decimal, DecimalException
from typing import Generic, Literal, TypeVar
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from nilart.contexts.business.router import Strict
from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.contexts.identity.presentation.router import failure
from nilart.shared.database import session_dependency
from nilart.shared.outbox import enqueue

router = APIRouter(prefix="/api/v1/admin/catalog/bundles", tags=["bundle-authoring"])


class GalleryImage(Strict):
    asset_id: UUID
    revision_id: UUID
    alt_fa: str = Field(min_length=1, max_length=500)
    alt_en: str = Field(min_length=1, max_length=500)


class Component(Strict):
    sku_id: UUID
    quantity: int = Field(strict=True, ge=1, le=10000)
    allowed_sku_ids: list[UUID] = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def valid(self):
        if (
            len(set(self.allowed_sku_ids)) != len(self.allowed_sku_ids)
            or self.sku_id not in self.allowed_sku_ids
        ):
            raise ValueError("Default SKU must be one of the distinct permitted choices")
        return self


class Content(Strict):
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=160)
    title_fa: str = Field(min_length=1, max_length=300)
    title_en: str = Field(min_length=1, max_length=300)
    description_fa: str = Field(default="", max_length=10000)
    description_en: str = Field(default="", max_length=10000)
    collection_ids: list[UUID] = Field(default_factory=list, max_length=100)
    components: list[Component] = Field(default_factory=list, max_length=50)
    gallery: list[GalleryImage] = Field(default_factory=list, max_length=30)
    discount_kind: Literal["fixed", "percent"] = "fixed"
    discount_amount: str = Field(pattern=r"^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,6})?$")
    packaging_cost: str | None = Field(
        default=None, pattern=r"^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,6})?$"
    )
    service_cost: str | None = Field(
        default=None, pattern=r"^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,6})?$"
    )
    allow_discount_stacking: bool = False

    @model_validator(mode="after")
    def valid(self):
        if self.discount_kind == "percent" and Decimal(self.discount_amount) > 100:
            raise ValueError("Percent must not exceed 100")
        if len(set(self.collection_ids)) != len(self.collection_ids) or len(
            {g.asset_id for g in self.gallery}
        ) != len(self.gallery):
            raise ValueError("Duplicate collection or gallery asset")
        choices = {}
        for part in self.components:
            prior = choices.setdefault(part.sku_id, set(part.allowed_sku_ids))
            if prior != set(part.allowed_sku_ids):
                raise ValueError("Repeated default SKU must share allowed choices")
        return self


class Command(Strict):
    expected_version: int = Field(strict=True, ge=0, le=2147483646)
    action: Literal["draft", "publish", "unpublish"]
    content: Content
    reason: str = Field(min_length=5, max_length=1000)


class Record(BaseModel):
    title_fa: str
    title_en: str
    slug: str
    id: UUID
    version: int
    content: Content | None
    published: bool
    published_revision: UUID | None
    legacy: bool = False


class Receipt(BaseModel):
    id: UUID
    bundle_id: UUID
    actor_id: UUID
    version: int
    intent: Command
    result: Record
    created_at: datetime


class Page(BaseModel):
    items: list[Record]
    next_cursor: UUID | None


class BundleError(Exception):
    pass


def get_record(db, id):
    row = (
        db.execute(
            text(
                "SELECT b.id,b.title_fa,b.title_en,b.slug,b.description_fa,b.description_en,b.published,d.version,d.content,d.published_revision FROM catalog_bundles b LEFT JOIN catalog_bundle_documents d ON d.id=b.id WHERE b.id=:id"
            ),
            {"id": id},
        )
        .mappings()
        .first()
    )
    content = row["content"] if row else None
    if row and row["version"] is None:
        try:
            presentation = (
                db.scalar(
                    text("SELECT document FROM catalog_bundle_presentations WHERE bundle_id=:id"),
                    {"id": id},
                )
                or {}
            )
            components = list(
                db.execute(
                    text(
                        "SELECT sku_id,quantity FROM catalog_bundle_components WHERE bundle_id=:id ORDER BY sku_id"
                    ),
                    {"id": id},
                ).mappings()
            )
            collections = list(
                db.scalars(
                    text("SELECT id FROM catalog_collections WHERE slug=:slug"),
                    {"slug": presentation.get("collection_slug", "")},
                )
            )
            discount = presentation.get("discount") or {"amount": "0", "currency": "IRT"}
            value = Decimal(discount["amount"]) / (
                10
                if discount.get("currency") == "IRR" and discount.get("kind", "fixed") == "fixed"
                else 1
            )
            content = dict(
                slug=row["slug"],
                title_fa=row["title_fa"],
                title_en=row["title_en"],
                description_fa=row["description_fa"],
                description_en=row["description_en"],
                collection_ids=[str(c) for c in collections],
                components=[
                    dict(
                        sku_id=str(c["sku_id"]),
                        quantity=c["quantity"],
                        allowed_sku_ids=next(
                            (
                                choice["allowed_sku_ids"]
                                for choice in presentation.get("component_choices", [])
                                if str(choice["component_sku_id"]) == str(c["sku_id"])
                            ),
                            [str(c["sku_id"])],
                        ),
                    )
                    for c in components
                ],
                gallery=[],
                discount_kind=discount.get("kind", "fixed"),
                discount_amount=format(value, "f"),
                packaging_cost=None,
                service_cost=None,
                allow_discount_stacking=presentation.get("allow_discount_stacking") or False,
            )
            content = Content.model_validate(content).model_dump(mode="json")
        except (ValueError, KeyError, TypeError, DecimalException):
            # Keep legacy identity readable; require an explicit reviewed replacement.
            content = None
    return (
        dict(
            id=id,
            title_fa=row["title_fa"],
            title_en=row["title_en"],
            slug=row["slug"],
            version=row["version"] or 0,
            content=content,
            published=row["published"],
            published_revision=row["published_revision"],
            legacy=row["version"] is None,
        )
        if row
        else None
    )


@router.get("", response_model=Page)
def listing(
    q: str = Query("", max_length=150),
    status: Literal["all", "draft", "published"] = "all",
    cursor: UUID | None = None,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("catalog.manage")),
):
    rows = list(
        db.scalars(
            text(
                "SELECT b.id FROM catalog_bundles b LEFT JOIN catalog_bundle_documents d ON d.id=b.id WHERE (:q='' OR strpos(lower(concat_ws(' ',coalesce(d.content->>'title_fa',b.title_fa),coalesce(d.content->>'title_en',b.title_en),coalesce(d.content->>'slug',b.slug))),lower(CAST(:q AS text)))>0) AND (:status='all' OR b.published=(:status='published')) AND (CAST(:cursor AS uuid) IS NULL OR b.id>:cursor) ORDER BY b.id LIMIT 26"
            ),
            {"q": q.strip(), "status": status, "cursor": cursor},
        )
    )
    return dict(
        items=[get_record(db, id) for id in rows[:25]],
        next_cursor=rows[24] if len(rows) > 25 else None,
    )


@router.get("/{id}", response_model=Record)
def detail(
    id: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("catalog.manage")),
):
    return get_record(db, id) or failure(request, "bundle_not_found", 404)


@router.get("/{id}/history", response_model=list[Receipt])
def history(
    id: UUID,
    before: int | None = Query(None, ge=1),
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("catalog.manage")),
):
    return list(
        db.execute(
            text(
                "SELECT * FROM catalog_bundle_revisions WHERE bundle_id=:id AND (CAST(:before AS int) IS NULL OR version<:before) ORDER BY version DESC LIMIT 20"
            ),
            {"id": id, "before": before},
        ).mappings()
    )


@router.get("/{id}/commands/{key}", response_model=Receipt)
def receipt(
    id: UUID,
    key: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("catalog.manage")),
):
    row = (
        db.execute(
            text("SELECT * FROM catalog_bundle_revisions WHERE bundle_id=:id AND id=:key"),
            {"id": id, "key": key},
        )
        .mappings()
        .first()
    )
    return dict(row) if row else failure(request, "bundle_receipt_not_found", 404)


def validate_dependencies(db, content, publish):
    refs = set(content.collection_ids)
    if refs:
        rows = list(
            db.execute(
                text(
                    "SELECT id,published FROM catalog_collections WHERE id=ANY(:ids) ORDER BY id FOR SHARE"
                ),
                {"ids": list(refs)},
            ).mappings()
        )
        if len(rows) != len(refs) or (publish and any(not r["published"] for r in rows)):
            raise BundleError("bundle_collection_unavailable")
    sku_ids = {id for c in content.components for id in c.allowed_sku_ids}
    rows = (
        list(
            db.execute(
                text(
                    "SELECT s.id,s.product_id,s.published,p.published AS product_published,s.price_amount,s.currency FROM catalog_skus s JOIN catalog_products p ON p.id=s.product_id WHERE s.id=ANY(:ids) ORDER BY p.id,s.id FOR SHARE OF p,s"
                ),
                {"ids": list(sku_ids)},
            ).mappings()
        )
        if sku_ids
        else []
    )
    skus = {r["id"]: r for r in rows}
    if len(rows) != len(sku_ids):
        raise BundleError("bundle_sku_unavailable")
    for c in content.components:
        if any(skus[id]["product_id"] != skus[c.sku_id]["product_id"] for id in c.allowed_sku_ids):
            raise BundleError("bundle_choices_wrong_product")
    if publish and any(
        not r["published"]
        or not r["product_published"]
        or r["price_amount"] is None
        or r["currency"] != "IRT"
        for r in rows
    ):
        raise BundleError("bundle_sku_unpublished_or_unpriced")
    for g in content.gallery:
        row = (
            db.execute(
                text(
                    "SELECT a.purpose,a.published_revision,v.action,v.purpose AS version_purpose FROM media_assets a JOIN media_asset_versions v ON v.asset_id=a.id WHERE a.id=:id AND v.revision_id=:revision FOR SHARE OF a"
                ),
                {"id": g.asset_id, "revision": g.revision_id},
            )
            .mappings()
            .first()
        )
        if (
            not row
            or row["purpose"] != "public_image"
            or row["version_purpose"] != "public_image"
            or row["action"] != "publish"
            or row["published_revision"] is None
        ):
            raise BundleError("bundle_gallery_not_approved")
    if publish and (
        not content.components
        or not content.collection_ids
        or not content.gallery
        or content.packaging_cost is None
        or content.service_cost is None
    ):
        raise BundleError("bundle_configuration_incomplete")


def publish_document(db, id, c):
    db.execute(
        text(
            "UPDATE catalog_bundles SET slug=:slug,title_fa=:fa,title_en=:en,description_fa=:dfa,description_en=:den,published=true WHERE id=:id"
        ),
        dict(
            id=id,
            slug=c.slug,
            fa=c.title_fa,
            en=c.title_en,
            dfa=c.description_fa,
            den=c.description_en,
        ),
    )
    quantities = defaultdict(int)
    for part in c.components:
        quantities[part.sku_id] += part.quantity
    db.execute(text("DELETE FROM catalog_bundle_components WHERE bundle_id=:id"), {"id": id})
    for sku, quantity in quantities.items():
        db.execute(
            text(
                "INSERT INTO catalog_bundle_components(bundle_id,sku_id,quantity) VALUES(:id,:sku,:quantity)"
            ),
            {"id": id, "sku": sku, "quantity": quantity},
        )
    collection = (
        db.execute(
            text("SELECT slug,title_fa,title_en FROM catalog_collections WHERE id=:id"),
            {"id": c.collection_ids[0]},
        )
        .mappings()
        .one()
    )
    choices = {str(part.sku_id): [str(s) for s in part.allowed_sku_ids] for part in c.components}
    doc = dict(
        intro=dict(fa=c.description_fa or c.title_fa, en=c.description_en or c.title_en),
        contents=dict(fa=c.description_fa or c.title_fa, en=c.description_en or c.title_en),
        collection_slug=collection["slug"],
        collection_title=dict(fa=collection["title_fa"], en=collection["title_en"]),
        sample=False,
        discount=dict(kind=c.discount_kind, amount=c.discount_amount, currency="IRT"),
        allow_discount_stacking=c.allow_discount_stacking,
        component_choices=[
            dict(component_sku_id=sku, allowed_sku_ids=ids) for sku, ids in choices.items()
        ],
    )
    db.execute(
        text(
            "INSERT INTO catalog_bundle_presentations(bundle_id,document,published) VALUES(:id,CAST(:doc AS jsonb),true) ON CONFLICT(bundle_id) DO UPDATE SET document=EXCLUDED.document,published=true"
        ),
        {"id": id, "doc": json.dumps(doc)},
    )


@router.put("/{id}/commands/{key}", response_model=Receipt)
def save(
    id: UUID,
    key: UUID,
    body: Command,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("catalog.manage")),
):
    actor, denied = write_access(request, db, principal, "catalog.manage")
    if denied is not None:
        return denied
    if body.action == "publish" and not SqlIdentityRepository(db).principal(
        actor.id, lock=True
    ).allows("pricing.publish"):
        return failure(request, "permission_denied", 403)
    return save_record(db, actor, id, key, body, request)


def save_record(db, actor, id, key, body, request):
    """Audited bundle writer shared by HTTP and owner-authorized media imports.

    The caller supplies an already-authorized actor. This retains all dependency,
    version, receipt and publication checks of the HTTP command.
    """
    # Match existing catalogue publication lock; media approval is locked before catalogue rows.
    db.execute(text("SELECT pg_advisory_xact_lock(78214,37)"))
    db.execute(text("SELECT pg_advisory_xact_lock(78214,21)"))
    intent = body.model_dump(mode="json")
    prior = (
        db.execute(text("SELECT * FROM catalog_bundle_revisions WHERE id=:key"), {"key": key})
        .mappings()
        .first()
    )
    if prior:
        if (
            prior["bundle_id"] == id
            and str(prior["actor_id"]) == str(actor.id)
            and prior["intent"] == intent
        ):
            return dict(prior)
        return failure(request, "bundle_command_conflict", 409)
    current = get_record(db, id)
    if (current["version"] if current else 0) != body.expected_version:
        return failure(request, "bundle_version_conflict", 409)
    try:
        if body.action != "unpublish":
            validate_dependencies(db, body.content, body.action == "publish")
        if current is None:
            db.execute(
                text(
                    "INSERT INTO catalog_bundles(id,slug,title_fa,title_en,description_fa,description_en,published) VALUES(:id,:slug,:fa,:en,:dfa,:den,false)"
                ),
                dict(
                    id=id,
                    slug=body.content.slug,
                    fa=body.content.title_fa,
                    en=body.content.title_en,
                    dfa=body.content.description_fa,
                    den=body.content.description_en,
                ),
            )
        if body.action == "publish":
            publish_document(db, id, body.content)
        elif body.action == "unpublish":
            db.execute(text("UPDATE catalog_bundles SET published=false WHERE id=:id"), {"id": id})
            db.execute(
                text("UPDATE catalog_bundle_presentations SET published=false WHERE bundle_id=:id"),
                {"id": id},
            )
        version = body.expected_version + 1
        published_revision = (
            key
            if body.action == "publish"
            else None
            if body.action == "unpublish"
            else current["published_revision"]
            if current
            else None
        )
        db.execute(
            text(
                "INSERT INTO catalog_bundle_documents(id,version,content,published_revision) VALUES(:id,:version,CAST(:content AS jsonb),NULL) ON CONFLICT(id) DO UPDATE SET version=:version,content=EXCLUDED.content"
            ),
            {"id": id, "version": version, "content": json.dumps(intent["content"])},
        )
        result = dict(
            id=str(id),
            title_fa=body.content.title_fa,
            title_en=body.content.title_en,
            slug=body.content.slug,
            version=version,
            content=intent["content"],
            published=body.action == "publish"
            or (body.action == "draft" and bool(current and current["published"])),
            published_revision=str(published_revision) if published_revision else None,
            legacy=False,
        )
        row = (
            db.execute(
                text(
                    "INSERT INTO catalog_bundle_revisions(id,bundle_id,actor_id,version,intent,result) VALUES(:key,:id,:actor,:version,CAST(:intent AS jsonb),CAST(:result AS jsonb)) RETURNING *"
                ),
                {
                    "key": key,
                    "id": id,
                    "actor": actor.id,
                    "version": version,
                    "intent": json.dumps(intent),
                    "result": json.dumps(result),
                },
            )
            .mappings()
            .one()
        )
        db.execute(
            text("UPDATE catalog_bundle_documents SET published_revision=:revision WHERE id=:id"),
            {"revision": published_revision, "id": id},
        )
        SqlAccountManagement(db).audit(
            actor.id,
            actor.id,
            "catalog.bundle_saved",
            dict(
                bundle_id=str(id),
                revision_id=str(key),
                version=version,
                before=json.loads(json.dumps(current, default=str)),
                after=result,
            ),
            body.reason,
        )
        enqueue(
            db,
            "catalog.bundle_saved",
            dict(bundle_id=str(id), revision_id=str(key), version=version, action=body.action),
        )
        db.commit()
        return dict(row)
    except BundleError as exc:
        db.rollback()
        return failure(request, str(exc), 409)
    except IntegrityError:
        db.rollback()
        return failure(request, "bundle_slug_or_command_conflict", 409)
    except Exception:
        db.rollback()
        raise


class SKUChoice(BaseModel):
    id: UUID
    product_id: UUID
    code: str
    published: bool
    amount: str | None
    currency: Literal["IRT", "IRR"] | None
    title_fa: str
    title_en: str


class CollectionChoice(BaseModel):
    id: UUID
    slug: str
    title_fa: str
    title_en: str
    published: bool


class MediaChoice(BaseModel):
    id: UUID
    revision_id: UUID
    title_fa: str
    title_en: str
    alt_fa: str
    alt_en: str


Choice = TypeVar("Choice")


class Choices(BaseModel, Generic[Choice]):
    items: list[Choice]
    next_cursor: UUID | None


@router.get("/choices/skus", response_model=Choices[SKUChoice])
def sku_choices(
    q: str = Query("", max_length=150),
    cursor: UUID | None = None,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("catalog.manage")),
):
    rows = list(
        db.execute(
            text(
                "SELECT s.id,s.product_id,s.code,s.published,s.price_amount::text AS amount,s.currency,p.title_fa,p.title_en FROM catalog_skus s JOIN catalog_products p ON p.id=s.product_id WHERE (:q='' OR strpos(lower(concat_ws(' ',s.id::text,s.code,p.title_fa,p.title_en)),lower(CAST(:q AS text)))>0) AND (CAST(:cursor AS uuid) IS NULL OR s.id>:cursor) ORDER BY s.id LIMIT 26"
            ),
            {"q": q.strip(), "cursor": cursor},
        ).mappings()
    )
    return dict(
        items=[dict(r) for r in rows[:25]], next_cursor=rows[24]["id"] if len(rows) > 25 else None
    )


@router.get("/choices/collections", response_model=Choices[CollectionChoice])
def collection_choices(
    q: str = Query("", max_length=150),
    cursor: UUID | None = None,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("catalog.manage")),
):
    rows = list(
        db.execute(
            text(
                "SELECT id,slug,title_fa,title_en,published FROM catalog_collections WHERE (:q='' OR strpos(lower(concat_ws(' ',slug,title_fa,title_en)),lower(CAST(:q AS text)))>0) AND (CAST(:cursor AS uuid) IS NULL OR id>:cursor) ORDER BY id LIMIT 26"
            ),
            {"q": q.strip(), "cursor": cursor},
        ).mappings()
    )
    return dict(
        items=[dict(r) for r in rows[:25]], next_cursor=rows[24]["id"] if len(rows) > 25 else None
    )


@router.get("/choices/media", response_model=Choices[MediaChoice])
def media_choices(
    q: str = Query("", max_length=150),
    cursor: UUID | None = None,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("catalog.manage")),
):
    rows = list(
        db.execute(
            text(
                "SELECT a.id,v.revision_id,v.metadata->>'title_fa' AS title_fa,v.metadata->>'title_en' AS title_en,v.metadata->>'alt_fa' AS alt_fa,v.metadata->>'alt_en' AS alt_en FROM media_assets a JOIN media_asset_versions v ON v.revision_id=a.published_revision WHERE a.purpose='public_image' AND v.action='publish' AND (:q='' OR strpos(lower(concat_ws(' ',v.metadata->>'title_fa',v.metadata->>'title_en')),lower(CAST(:q AS text)))>0) AND (CAST(:cursor AS uuid) IS NULL OR a.id>:cursor) ORDER BY a.id LIMIT 26"
            ),
            {"q": q.strip(), "cursor": cursor},
        ).mappings()
    )
    return dict(
        items=[dict(r) for r in rows[:25]], next_cursor=rows[24]["id"] if len(rows) > 25 else None
    )


public_router = APIRouter(prefix="/api/v1/catalog/bundles", tags=["bundle-gallery"])


class PublicGalleryImage(BaseModel):
    url: str
    alt_fa: str
    alt_en: str


@public_router.get("/{slug}/gallery", response_model=list[PublicGalleryImage])
def public_gallery(slug: str, request: Request, db: Session = Depends(session_dependency)):
    from nilart.contexts.catalog.infrastructure.bundles import VISIBLE

    row = (
        db.execute(
            text(
                "SELECT r.intent FROM catalog_bundles b JOIN catalog_bundle_documents d ON d.id=b.id JOIN catalog_bundle_revisions r ON r.id=d.published_revision WHERE b.slug=:slug AND "
                + VISIBLE
            ),
            {"slug": slug},
        )
        .mappings()
        .first()
    )
    if not row:
        return failure(request, "bundle_gallery_not_found", 404)
    gallery = []
    for g in row["intent"]["content"]["gallery"]:
        approved = db.scalar(
            text(
                "SELECT a.id FROM media_assets a JOIN media_asset_versions v ON v.asset_id=a.id WHERE a.id=:id AND v.revision_id=:revision AND a.published_revision IS NOT NULL AND a.purpose='public_image' AND v.action='publish' AND v.purpose='public_image'"
            ),
            {"id": g["asset_id"], "revision": g["revision_id"]},
        )
        if approved:
            gallery.append(
                dict(
                    url=f"/api/v1/media/{g['asset_id']}/versions/{g['revision_id']}/content",
                    alt_fa=g["alt_fa"],
                    alt_en=g["alt_en"],
                )
            )
    return gallery


class Availability(BaseModel):
    unlimited: bool = False
    configured: bool
    capacity: str | None


@public_router.get(
    "/{slug}/availability", response_model=Availability, response_model_exclude_defaults=True
)
def availability(
    slug: str,
    request: Request,
    choices: str = Query("{}", max_length=10000),
    db: Session = Depends(session_dependency),
):
    from pydantic import TypeAdapter, ValidationError

    from nilart.contexts.basket.catalog import quote
    from nilart.contexts.basket.domain import Item
    from nilart.contexts.catalog.infrastructure.bundles import VISIBLE

    try:
        selected = TypeAdapter(dict[UUID, UUID]).validate_json(choices)
        if len(selected) > 50:
            raise ValueError("Too many selections")
        id = db.scalar(
            text("SELECT b.id FROM catalog_bundles b WHERE b.slug=:slug AND " + VISIBLE),
            {"slug": slug},
        )
        if id is None:
            return failure(request, "bundle_not_found", 404)
        value = quote(db, Item(kind="bundle", item_id=id, quantity=1, choices=selected))
        demand = defaultdict(int)
        for part in value["parts"]:
            profile = db.scalar(
                text(
                    "SELECT r.intent->'content'->>'delivery' FROM catalog_profiles p JOIN catalog_profile_revisions r ON r.id=p.published_revision WHERE p.kind='skus' AND p.entity_id=:id"
                ),
                {"id": part["sku_id"]},
            )
            if profile == "digital":
                continue
            demand[UUID(part["sku_id"])] += part["quantity"]
        if not demand:
            return dict(configured=True, capacity=None, unlimited=True)
        rows = list(
            db.execute(
                text(
                    "SELECT reference_id,quantity-reserved AS available FROM inventory_positions WHERE kind='sku' AND reference_id=ANY(:ids)"
                ),
                {"ids": list(demand)},
            ).mappings()
        )
        if len(rows) != len(demand):
            return dict(configured=False, capacity=None)
        capacity = min(int(row["available"] // demand[row["reference_id"]]) for row in rows)
        return dict(configured=True, capacity=str(capacity))
    except (ValueError, ValidationError):
        return failure(request, "bundle_selection_invalid", 409)
