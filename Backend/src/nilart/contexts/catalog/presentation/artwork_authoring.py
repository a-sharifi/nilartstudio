"""Artwork drafts/publication for originals, SKU-backed prints and licensed digital editions."""

import json
from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from nilart.contexts.business.router import Strict
from nilart.contexts.catalog.presentation.bundle_authoring import (
    BundleError,
    GalleryImage,
    validate_dependencies,
)
from nilart.contexts.catalog.presentation.bundle_authoring import Content as BundleContent
from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.contexts.identity.presentation.router import failure
from nilart.shared.database import session_dependency
from nilart.shared.outbox import enqueue

router = APIRouter(prefix="/api/v1/admin/catalog/artworks", tags=["artwork-authoring"])


class Content(Strict):
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=160)
    title_fa: str = Field(min_length=1, max_length=240)
    title_en: str = Field(min_length=1, max_length=240)
    description_fa: str = Field(default="", max_length=10000)
    description_en: str = Field(default="", max_length=10000)
    artist_fa: str = Field(min_length=1, max_length=200)
    artist_en: str = Field(min_length=1, max_length=200)
    medium: Literal["colored-pencil", "oil", "acrylic", "mixed-media"]
    style: Literal["landscape", "abstract"]
    width_cm: float = Field(ge=1, le=10000)
    height_cm: float = Field(ge=1, le=10000)
    edition: Literal["original", "print", "digital"]
    linked_sku_id: UUID | None = None
    price_amount: str | None = Field(
        default=None, pattern=r"^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,2})?$"
    )
    weight_grams: int | None = Field(default=None, strict=True, ge=1, le=100000000)
    returnable: bool | None = Field(default=None, strict=True)
    license_fa: str = Field(default="", max_length=10000)
    license_en: str = Field(default="", max_length=10000)
    image_credit: str = Field(min_length=1, max_length=1000)
    frame_fa: str | None = Field(default=None, max_length=200)
    frame_en: str | None = Field(default=None, max_length=200)
    gallery: list[GalleryImage] = Field(default_factory=list, max_length=30)

    @model_validator(mode="after")
    def valid(self):
        if len({g.asset_id for g in self.gallery}) != len(self.gallery):
            raise ValueError("Duplicate image")
        if self.edition != "print" and self.linked_sku_id is not None:
            raise ValueError("Only prints reference a stock SKU")
        if self.edition == "digital" and self.weight_grams is not None:
            raise ValueError("Digital editions have no shipping weight")
        if self.edition == "print" and self.price_amount is not None:
            raise ValueError("Print price belongs to its SKU")
        return self


class Command(Strict):
    expected_version: int = Field(strict=True, ge=0, le=2147483646)
    action: Literal["draft", "publish", "unpublish"]
    content: Content
    reason: str = Field(min_length=5, max_length=1000)


class Record(BaseModel):
    id: UUID
    title_fa: str
    title_en: str
    slug: str
    version: int
    content: Content | None
    published_revision: UUID | None
    published: bool


class Receipt(BaseModel):
    id: UUID
    artwork_id: UUID
    actor_id: UUID
    version: int
    intent: Command
    result: Record
    created_at: datetime


class Page(BaseModel):
    items: list[Record]
    next_cursor: UUID | None


def read_record(db, id):
    r = (
        db.execute(
            text(
                "SELECT a.id,a.slug,a.title_fa,a.title_en,a.published,COALESCE(d.version,0) AS version,d.content,d.published_revision FROM catalog_artworks a LEFT JOIN catalog_artwork_documents d ON d.id=a.id WHERE a.id=:id"
            ),
            {"id": id},
        )
        .mappings()
        .first()
    )
    return dict(r) if r else None


@router.get("", response_model=Page)
def listing(
    q: str = Query("", max_length=200),
    cursor: UUID | None = None,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("catalog.manage")),
):
    ids = list(
        db.scalars(
            text(
                "SELECT id FROM catalog_artworks WHERE (:q='' OR strpos(lower(concat_ws(' ',slug,title_fa,title_en)),lower(CAST(:q AS text)))>0) AND (CAST(:cursor AS uuid) IS NULL OR id>:cursor) ORDER BY id LIMIT 26"
            ),
            {"q": q.strip(), "cursor": cursor},
        )
    )
    return dict(
        items=[read_record(db, id) for id in ids[:25]],
        next_cursor=ids[24] if len(ids) > 25 else None,
    )


@router.get("/{id}", response_model=Record)
def read(
    id: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("catalog.manage")),
):
    return read_record(db, id) or failure(request, "artwork_not_found", 404)


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
                "SELECT * FROM catalog_artwork_revisions WHERE artwork_id=:id AND (CAST(:before AS integer) IS NULL OR version<:before) ORDER BY version DESC LIMIT 20"
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
            text(
                "SELECT * FROM catalog_artwork_revisions WHERE artwork_id=:id AND id=:key AND actor_id=:actor"
            ),
            {"id": id, "key": key, "actor": principal.account_id},
        )
        .mappings()
        .first()
    )
    return dict(row) if row else failure(request, "artwork_receipt_not_found", 404)


def validate(db, c, publish):
    # Reuse approved immutable media validation; private print files never enter a gallery.
    validate_dependencies(
        db,
        BundleContent(
            slug=c.slug,
            title_fa=c.title_fa,
            title_en=c.title_en,
            discount_amount="0",
            gallery=c.gallery,
        ),
        False,
    )
    if not publish:
        return
    if not c.gallery or c.returnable is None:
        raise BundleError("artwork_configuration_incomplete")
    if c.edition == "print":
        row = (
            db.execute(
                text(
                    "SELECT s.price_amount,s.currency,p.content FROM catalog_skus s JOIN catalog_products product ON product.id=s.product_id JOIN catalog_profiles p ON p.kind='skus' AND p.entity_id=s.id JOIN catalog_profile_revisions r ON r.id=p.published_revision WHERE s.id=:id AND s.published=true AND product.published=true"
                ),
                {"id": c.linked_sku_id},
            )
            .mappings()
            .first()
        )
        if (
            not row
            or row["price_amount"] is None
            or row["currency"] != "IRT"
            or row["price_amount"] != row["price_amount"].quantize(Decimal(".01"))
        ):
            raise BundleError("artwork_print_sku_unavailable")
        # Use the approved revision, never an unpublished profile head.
        profile = db.scalar(
            text(
                "SELECT r.intent->'content' FROM catalog_profiles p JOIN catalog_profile_revisions r ON r.id=p.published_revision WHERE p.kind='skus' AND p.entity_id=:id"
            ),
            {"id": c.linked_sku_id},
        )
        if profile["delivery"] != "physical" or profile["weight_grams"] is None:
            raise BundleError("artwork_print_profile_incomplete")
    elif c.price_amount is None:
        raise BundleError("artwork_price_required")
    if c.edition == "original" and c.weight_grams is None:
        raise BundleError("artwork_weight_required")
    if c.edition == "digital" and (not c.license_fa or not c.license_en or c.returnable):
        raise BundleError("artwork_digital_license_required")


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
    db.execute(text("SELECT pg_advisory_xact_lock(78214,37)"))
    db.execute(text("SELECT pg_advisory_xact_lock(78214,21)"))
    intent = body.model_dump(mode="json")
    prior = (
        db.execute(text("SELECT * FROM catalog_artwork_revisions WHERE id=:key"), {"key": key})
        .mappings()
        .first()
    )
    if prior:
        if (
            prior["artwork_id"] == id
            and str(prior["actor_id"]) == str(actor.id)
            and prior["intent"] == intent
        ):
            return dict(prior)
        return failure(request, "artwork_command_conflict", 409)
    current = read_record(db, id)
    if (current["version"] if current else 0) != body.expected_version:
        return failure(request, "artwork_version_conflict", 409)
    # Once an original has financial/stock history, its kind and linked source cannot be rewritten.
    published_content = db.scalar(
        text(
            "SELECT intent->'content' FROM catalog_artwork_revisions WHERE artwork_id=:id AND intent->>'action'='publish' ORDER BY version DESC LIMIT 1"
        ),
        {"id": id},
    )
    if (
        current
        and not published_content
        and body.content.edition != "original"
        and db.scalar(
            text("SELECT artwork_id FROM catalog_artwork_details WHERE artwork_id=:id"), {"id": id}
        )
    ):
        return failure(request, "artwork_edition_immutable", 409)
    if published_content and (
        published_content["edition"] != body.content.edition
        or published_content.get("linked_sku_id") != intent["content"]["linked_sku_id"]
    ):
        return failure(request, "artwork_edition_immutable", 409)
    try:
        if body.action != "unpublish":
            validate(db, body.content, body.action == "publish")
        c = body.content
        if current is None:
            db.execute(
                text(
                    "INSERT INTO catalog_artworks(id,slug,title_fa,title_en,description_fa,description_en,published) VALUES(:id,:slug,:fa,:en,:dfa,:den,false)"
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
        if body.action == "publish":
            db.execute(
                text(
                    "UPDATE catalog_artworks SET slug=:slug,title_fa=:fa,title_en=:en,description_fa=:dfa,description_en=:den,published=true WHERE id=:id"
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
            price = c.price_amount or format(
                db.scalar(
                    text("SELECT price_amount FROM catalog_skus WHERE id=:id"),
                    {"id": c.linked_sku_id},
                ).normalize(),
                "f",
            )
            image = c.gallery[0]
            details = {
                k: intent["content"][k]
                for k in [
                    "artist_fa",
                    "artist_en",
                    "medium",
                    "style",
                    "width_cm",
                    "height_cm",
                    "edition",
                    "linked_sku_id",
                    "weight_grams",
                    "returnable",
                    "license_fa",
                    "license_en",
                    "image_credit",
                    "frame_fa",
                    "frame_en",
                    "gallery",
                ]
            }
            details.update(
                price_amount=price,
                currency="IRT",
                stock=0,
                image_url=f"/api/v1/media/{image.asset_id}/versions/{image.revision_id}/content",
                image_source="",
                sample=False,
            )
            db.execute(
                text(
                    "INSERT INTO catalog_artwork_details(artwork_id,document) VALUES(:id,CAST(:document AS jsonb)) ON CONFLICT(artwork_id) DO UPDATE SET document=EXCLUDED.document"
                ),
                {"id": id, "document": json.dumps(details)},
            )
        elif body.action == "unpublish":
            db.execute(text("UPDATE catalog_artworks SET published=false WHERE id=:id"), {"id": id})
        version = body.expected_version + 1
        published = (
            key
            if body.action == "publish"
            else None
            if body.action == "unpublish"
            else current["published_revision"]
            if current
            else None
        )
        result = dict(
            id=str(id),
            slug=c.slug,
            title_fa=c.title_fa,
            title_en=c.title_en,
            version=version,
            content=intent["content"],
            published_revision=str(published) if published else None,
            published=body.action == "publish"
            or (body.action == "draft" and bool(current and current["published"])),
        )
        db.execute(
            text(
                "INSERT INTO catalog_artwork_documents(id,version,content) VALUES(:id,:version,CAST(:content AS jsonb)) ON CONFLICT(id) DO UPDATE SET version=:version,content=EXCLUDED.content"
            ),
            {"id": id, "version": version, "content": json.dumps(intent["content"])},
        )
        row = (
            db.execute(
                text(
                    "INSERT INTO catalog_artwork_revisions(id,artwork_id,actor_id,version,intent,result) VALUES(:key,:id,:actor,:version,CAST(:intent AS jsonb),CAST(:result AS jsonb)) RETURNING *"
                ),
                dict(
                    key=key,
                    id=id,
                    actor=actor.id,
                    version=version,
                    intent=json.dumps(intent),
                    result=json.dumps(result),
                ),
            )
            .mappings()
            .one()
        )
        db.execute(
            text("UPDATE catalog_artwork_documents SET published_revision=:revision WHERE id=:id"),
            {"id": id, "revision": published},
        )
        SqlAccountManagement(db).audit(
            actor.id,
            actor.id,
            "catalog.artwork_saved",
            dict(
                artwork_id=str(id),
                operation_id=str(key),
                before=json.loads(json.dumps(current, default=str)),
                after=result,
            ),
            body.reason,
        )
        enqueue(
            db,
            "catalog.artwork_saved",
            dict(artwork_id=str(id), revision_id=str(key), version=version, action=body.action),
        )
        db.commit()
        return dict(row)
    except BundleError as exc:
        db.rollback()
        return failure(request, str(exc), 409)
    except IntegrityError:
        db.rollback()
        return failure(request, "artwork_identity_conflict", 409)
    except Exception:
        db.rollback()
        raise
