"""Explicit, versioned media/specifications and SKU delivery metadata.

Profile publication is separate from catalogue identity/price/stock publication.
Legacy entries remain unconfigured until staff enter and publish their values.
"""

import json
from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.contexts.business.router import Strict
from nilart.contexts.catalog.presentation.bundle_authoring import GalleryImage
from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.contexts.identity.presentation.router import failure
from nilart.shared.database import session_dependency
from nilart.shared.outbox import enqueue

Kind = Literal["products", "skus", "collections"]
router = APIRouter(prefix="/api/v1/admin/catalog/profiles", tags=["catalog-profiles"])
public_router = APIRouter(prefix="/api/v1/catalog/profiles", tags=["catalog-profiles"])
# Fixed allowlist, never interpolate request-provided SQL identifiers.
TABLES = {
    "products": "catalog_products",
    "skus": "catalog_skus",
    "collections": "catalog_collections",
}


class Specification(Strict):
    label_fa: str = Field(min_length=1, max_length=160)
    label_en: str = Field(min_length=1, max_length=160)
    value_fa: str = Field(min_length=1, max_length=1000)
    value_en: str = Field(min_length=1, max_length=1000)


class Content(Strict):
    specifications: list[Specification] = Field(default_factory=list, max_length=50)
    gallery: list[GalleryImage] = Field(default_factory=list, max_length=30)
    delivery: Literal["physical", "digital"] | None = None
    weight_grams: int | None = Field(default=None, strict=True, ge=1, le=100000000)
    returnable: bool | None = None
    length_cm: float | None = Field(default=None, gt=0, le=300)
    width_cm: float | None = Field(default=None, gt=0, le=300)
    height_cm: float | None = Field(default=None, gt=0, le=300)
    weight_estimated: bool = Field(default=False, strict=True)

    @model_validator(mode="after")
    def valid(self):
        if len({g.asset_id for g in self.gallery}) != len(self.gallery):
            raise ValueError("Duplicate gallery asset")
        if self.delivery == "digital" and self.weight_grams is not None:
            raise ValueError("Digital delivery cannot have shipping weight")
        return self


class Command(Strict):
    expected_version: int = Field(strict=True, ge=0, le=2147483646)
    action: Literal["draft", "publish", "unpublish"]
    content: Content
    reason: str = Field(min_length=5, max_length=1000)


class Record(BaseModel):
    kind: Kind
    entity_id: UUID
    version: int
    content: Content | None
    published_revision: UUID | None


class Receipt(BaseModel):
    id: UUID
    kind: Kind
    entity_id: UUID
    actor_id: UUID
    version: int
    intent: Command
    result: Record
    created_at: datetime


def entity(db, kind, id, *, public=False):
    row = (
        db.execute(text(f"SELECT id,published FROM {TABLES[kind]} WHERE id=:id"), {"id": id})
        .mappings()
        .first()
    )
    if not row or (public and not row["published"]):
        return False
    if public and kind == "skus":
        return bool(
            db.scalar(
                text(
                    "SELECT p.published FROM catalog_skus s JOIN catalog_products p ON p.id=s.product_id WHERE s.id=:id"
                ),
                {"id": id},
            )
        )
    return True


def record(db, kind, id):
    row = (
        db.execute(
            text("SELECT * FROM catalog_profiles WHERE kind=:kind AND entity_id=:id"),
            {"kind": kind, "id": id},
        )
        .mappings()
        .first()
    )
    return (
        dict(row)
        if row
        else dict(kind=kind, entity_id=id, version=0, content=None, published_revision=None)
    )


@router.get("/{kind}/{id}", response_model=Record)
def read(
    kind: Kind,
    id: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("catalog.manage")),
):
    if not entity(db, kind, id):
        return failure(request, "profile_entity_not_found", 404)
    return record(db, kind, id)


@router.get("/{kind}/{id}/history", response_model=list[Receipt])
def history(
    kind: Kind,
    id: UUID,
    before: int | None = Query(default=None, ge=1),
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("catalog.manage")),
):
    return list(
        db.execute(
            text(
                "SELECT * FROM catalog_profile_revisions WHERE kind=:kind AND entity_id=:id AND (CAST(:before AS integer) IS NULL OR version<:before) ORDER BY version DESC LIMIT 20"
            ),
            {"kind": kind, "id": id, "before": before},
        ).mappings()
    )


@router.get("/{kind}/{id}/commands/{key}", response_model=Receipt)
def receipt(
    kind: Kind,
    id: UUID,
    key: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("catalog.manage")),
):
    row = (
        db.execute(
            text(
                "SELECT * FROM catalog_profile_revisions WHERE kind=:kind AND entity_id=:id AND id=:key AND actor_id=:actor"
            ),
            {"kind": kind, "id": id, "key": key, "actor": principal.account_id},
        )
        .mappings()
        .first()
    )
    return dict(row) if row else failure(request, "profile_receipt_not_found", 404)


def validate(db, kind, body):
    c = body.content
    if kind != "skus" and (
        c.delivery is not None
        or c.weight_grams is not None
        or c.returnable is not None
        or any(getattr(c, k) is not None for k in ("length_cm", "width_cm", "height_cm"))
    ):
        return "profile_sku_fields_only"
    if body.action == "unpublish":
        return None
    from nilart.contexts.business.router import current_settings

    _, settings, _ = current_settings(db)
    active_methods = [m for m in settings.shipping_methods if m.active]
    flat_shipping = bool(active_methods) and all(
        m.carrier == "manual" and Decimal(m.per_kg_amount) == 0 and m.maximum_weight_grams is None
        for m in active_methods
    )
    if body.action == "publish" and (
        (
            not c.gallery
            and not (kind == "skus" and c.delivery is not None and c.returnable is not None)
        )
        or (
            kind == "skus"
            and c.delivery is not None
            and (
                c.returnable is None
                or (c.delivery == "physical" and c.weight_grams is None and not flat_shipping)
            )
        )
    ):
        return "profile_configuration_incomplete"
    for g in c.gallery:
        approved = db.scalar(
            text(
                "SELECT a.id FROM media_assets a JOIN media_asset_versions v ON v.asset_id=a.id WHERE a.id=:id AND v.revision_id=:revision AND a.purpose='public_image' AND v.purpose='public_image' AND v.action='publish' AND a.published_revision IS NOT NULL FOR SHARE OF a"
            ),
            {"id": g.asset_id, "revision": g.revision_id},
        )
        if not approved:
            return "profile_gallery_not_approved"
    return None


@router.put("/{kind}/{id}/commands/{key}", response_model=Receipt)
def save(
    kind: Kind,
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
    return save_record(db, actor, kind, id, key, body, request)


def save_record(db, actor, kind, id, key, body, request):
    db.execute(text("SELECT pg_advisory_xact_lock(78214,37)"))
    db.execute(text("SELECT pg_advisory_xact_lock(78214,21)"))
    intent = body.model_dump(mode="json")
    prior = (
        db.execute(text("SELECT * FROM catalog_profile_revisions WHERE id=:key"), {"key": key})
        .mappings()
        .first()
    )
    if prior:
        if (
            prior["kind"] == kind
            and prior["entity_id"] == id
            and str(prior["actor_id"]) == str(actor.id)
            and prior["intent"] == intent
        ):
            return dict(prior)
        return failure(request, "profile_command_conflict", 409)
    if not entity(db, kind, id):
        return failure(request, "profile_entity_not_found", 404)
    current = record(db, kind, id)
    if current["version"] != body.expected_version:
        return failure(request, "profile_version_conflict", 409)
    error = validate(db, kind, body)
    if error:
        return failure(request, error, 409)
    version = body.expected_version + 1
    published = (
        key
        if body.action == "publish"
        else None
        if body.action == "unpublish"
        else current["published_revision"]
    )
    result = dict(
        kind=kind,
        entity_id=str(id),
        version=version,
        content=intent["content"],
        published_revision=str(published) if published else None,
    )
    try:
        db.execute(
            text(
                "INSERT INTO catalog_profiles(kind,entity_id,version,content) VALUES(:kind,:id,:version,CAST(:content AS jsonb)) ON CONFLICT(kind,entity_id) DO UPDATE SET version=:version,content=EXCLUDED.content"
            ),
            {"kind": kind, "id": id, "version": version, "content": json.dumps(intent["content"])},
        )
        row = (
            db.execute(
                text(
                    "INSERT INTO catalog_profile_revisions(id,kind,entity_id,actor_id,version,intent,result) VALUES(:key,:kind,:id,:actor,:version,CAST(:intent AS jsonb),CAST(:result AS jsonb)) RETURNING *"
                ),
                {
                    "key": key,
                    "kind": kind,
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
            text(
                "UPDATE catalog_profiles SET published_revision=:revision WHERE kind=:kind AND entity_id=:id"
            ),
            {"revision": published, "kind": kind, "id": id},
        )
        SqlAccountManagement(db).audit(
            actor.id,
            actor.id,
            "catalog.profile_saved",
            dict(
                kind=kind,
                entity_id=str(id),
                before=json.loads(json.dumps(current, default=str)),
                after=result,
                operation_id=str(key),
            ),
            body.reason,
        )
        enqueue(
            db,
            "catalog.profile_saved",
            dict(
                kind=kind,
                entity_id=str(id),
                revision_id=str(key),
                version=version,
                action=body.action,
            ),
        )
        db.commit()
        return dict(row)
    except Exception:
        db.rollback()
        raise


@public_router.get("/{kind}/{id}", response_model=Content)
def public(kind: Kind, id: UUID, request: Request, db: Session = Depends(session_dependency)):
    if not entity(db, kind, id, public=True):
        return failure(request, "profile_not_found", 404)
    content = db.scalar(
        text(
            "SELECT r.intent->'content' FROM catalog_profiles p JOIN catalog_profile_revisions r ON r.id=p.published_revision AND r.kind=p.kind AND r.entity_id=p.entity_id WHERE p.kind=:kind AND p.entity_id=:id"
        ),
        {"kind": kind, "id": id},
    )
    if content is None:
        return failure(request, "profile_not_found", 404)
    c = Content.model_validate(content)
    # Revocation also removes gallery references. Immutable content URLs enforce the same check.
    c.gallery = [
        g
        for g in c.gallery
        if db.scalar(
            text(
                "SELECT id FROM media_assets WHERE id=:id AND purpose='public_image' AND published_revision IS NOT NULL"
            ),
            {"id": g.asset_id},
        )
    ]
    return c
