"""Admin rendering controls and bounded published derivative galleries."""

from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.contexts.identity.presentation.router import failure
from nilart.shared.database import session_dependency

from . import service
from .models import RunInput, Strict, Template

router = APIRouter(prefix="/api/v1/admin/mockups", tags=["product-mockups"])
public_router = APIRouter(prefix="/api/v1/catalog/image-sets", tags=["published-product-images"])


class TemplateCommand(Strict):
    expected_version: int = Field(strict=True, ge=0)
    content: Template
    reason: str = Field(min_length=5, max_length=1000)


class SetCommand(Strict):
    expected_version: int = Field(strict=True, ge=1)
    action: Literal["publish", "rollback", "unpublish"]
    run_id: UUID | None = None
    expected_profile_version: int | None = Field(default=None, strict=True, ge=0)
    reason: str = Field(min_length=5, max_length=1000)


def access(request, db, principal):
    actor, denied = write_access(request, db, principal, "content.manage")
    if denied is not None:
        return actor, denied
    if not SqlIdentityRepository(db).principal(actor.id, lock=True).allows("catalog.manage"):
        return None, failure(request, "permission_denied", 403)
    return actor, None


def perform(db, request, fn):
    try:
        return fn()
    except service.MockupError as exc:
        db.rollback()
        return failure(request, exc.code, exc.status)
    except ValueError:
        db.rollback()
        return failure(request, "mockup_input_invalid", 422)
    except Exception:
        db.rollback()
        raise


@router.get("/templates")
def templates(
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("content.manage")),
):
    return {
        "items": [
            dict(r)
            for r in db.execute(
                text("SELECT * FROM mockup_templates ORDER BY id LIMIT 100")
            ).mappings()
        ]
    }


@router.get("/templates/{id}/history")
def template_history(
    id: UUID,
    before: int | None = Query(None, ge=1),
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("content.manage")),
):
    return {
        "items": [
            dict(r)
            for r in db.execute(
                text(
                    "SELECT id,result,created_at FROM mockup_commands WHERE kind='template' AND entity_id=:id AND (CAST(:before AS integer) IS NULL OR (result->>'version')::int<:before) ORDER BY (result->>'version')::int DESC LIMIT 20"
                ),
                dict(id=id, before=before),
            ).mappings()
        ]
    }


@router.put("/templates/{id}/commands/{key}")
def save_template(
    id: UUID,
    key: UUID,
    body: TemplateCommand,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("content.manage")),
):
    actor, denied = access(request, db, principal)
    if denied is not None:
        return denied
    return perform(
        db,
        request,
        lambda: service.save_template(
            db, actor, id, key, body.expected_version, body.content, body.reason
        ),
    )


@router.put("/runs/{key}")
def create(
    key: UUID,
    body: RunInput,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("content.manage")),
):
    actor, denied = access(request, db, principal)
    if denied is not None:
        return denied
    return perform(db, request, lambda: service.create_run(db, actor, key, body))


@router.get("/runs/{id}")
def run(
    id: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("content.manage")),
):
    return perform(db, request, lambda: service.get_run(db, id))


@router.post("/runs/{id}/retry")
def retry(
    id: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("content.manage")),
):
    actor, denied = access(request, db, principal)
    if denied is not None:
        return denied

    def apply():
        service.lock(db)
        item = service.get_run(db, id)
        if item["status"] == "queued":
            return item
        if item["status"] != "failed" or item["stale"]:
            raise service.MockupError("mockup_retry_requires_new_inputs")
        db.execute(
            text(
                "UPDATE mockup_runs SET status='queued',attempts=0,error='',lease_until=NULL,updated_at=now() WHERE id=:id"
            ),
            dict(id=id),
        )
        service.audit(
            db,
            actor,
            "mockup.render_retried",
            dict(run_id=str(id)),
            "Admin retried failed image generation",
        )
        db.commit()
        return service.get_run(db, id)

    return perform(db, request, apply)


@router.get("/commands/{key}")
def receipt(
    key: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("content.manage")),
):
    row = (
        db.execute(
            text("SELECT * FROM mockup_commands WHERE id=:id AND actor_id=:actor"),
            dict(id=key, actor=principal.account_id),
        )
        .mappings()
        .first()
    )
    return dict(row) if row else failure(request, "mockup_receipt_not_found", 404)


@router.get("/sets")
def sets(
    product_id: UUID | None = None,
    sku_id: UUID | None = None,
    group: Literal["collection", "personal"] | None = None,
    cursor: str = Query("", max_length=300),
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("content.manage")),
):
    rows = (
        db.execute(
            text("""SELECT s.*,r.id AS latest_run,r.status,r.error,r.outputs,r.inputs
      FROM mockup_sets s LEFT JOIN LATERAL(SELECT * FROM mockup_runs WHERE set_id=s.id ORDER BY created_at DESC LIMIT 1) r ON true
      WHERE (CAST(:product AS text) IS NULL OR s.target->>'product_id'=:product)
      AND (CAST(:sku AS text) IS NULL OR s.target->>'sku_id'=:sku)
      AND (CAST(:group AS text) IS NULL OR s.spec->>'group'=:group) AND s.set_key>:cursor ORDER BY s.set_key LIMIT :limit"""),
            dict(
                product=str(product_id) if product_id else None,
                sku=str(sku_id) if sku_id else None,
                group=group,
                cursor=cursor,
                limit=limit + 1,
            ),
        )
        .mappings()
        .all()
    )
    items = [
        {**dict(row), "stale": service.stale(db, row["inputs"]) if row["inputs"] else False}
        for row in rows[:limit]
    ]
    return dict(items=items, next_cursor=rows[limit - 1]["set_key"] if len(rows) > limit else None)


@router.get("/sets/{id}")
def detail(
    id: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("content.manage")),
):
    row = db.execute(text("SELECT * FROM mockup_sets WHERE id=:id"), dict(id=id)).mappings().first()
    if not row:
        return failure(request, "mockup_set_not_found", 404)
    runs = [
        dict(r)
        for r in db.execute(
            text(
                "SELECT id,status,fingerprint,outputs,error,inputs,created_at FROM mockup_runs WHERE set_id=:id ORDER BY created_at DESC LIMIT 20"
            ),
            dict(id=id),
        ).mappings()
    ]
    history = [
        dict(r)
        for r in db.execute(
            text(
                "SELECT id,result,created_at FROM mockup_commands WHERE kind='set' AND entity_id=:id AND intent->>'action' IN ('publish','rollback','unpublish') ORDER BY created_at DESC LIMIT 20"
            ),
            dict(id=id),
        ).mappings()
    ]
    return {**dict(row), "runs": runs, "history": history}


@router.put("/sets/{id}/commands/{key}")
def publish(
    id: UUID,
    key: UUID,
    body: SetCommand,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("content.manage")),
):
    actor, denied = access(request, db, principal)
    if denied is not None:
        return denied
    if body.action != "unpublish" and body.run_id is None:
        return failure(request, "mockup_run_required", 422)
    return perform(
        db,
        request,
        lambda: service.publish_set(
            db,
            actor,
            id,
            key,
            body.expected_version,
            body.action,
            body.run_id,
            body.reason,
            request,
            body.expected_profile_version,
        ),
    )


@router.get("/coverage")
def coverage(
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("content.manage")),
):
    rows = (
        db.execute(text("SELECT status,count(*) AS count FROM mockup_runs GROUP BY status"))
        .mappings()
        .all()
    )
    return dict(
        expected_sets=220,
        expected_positions=484,
        total_sets=db.scalar(text("SELECT count(*) FROM mockup_sets")),
        published_sets=db.scalar(
            text("SELECT count(*) FROM mockup_sets WHERE published_run IS NOT NULL")
        ),
        runs={r["status"]: r["count"] for r in rows},
    )


def public_item(db, row):
    inputs, outputs = row["inputs"], row["outputs"]
    spec, target = inputs["spec"], inputs["target"]
    sku_id, product_id, collection_id = (
        target.get("sku_id"),
        target.get("product_id"),
        target.get("collection_id"),
    )
    product = (
        db.execute(
            text("SELECT slug,published FROM catalog_products WHERE id=:id"), dict(id=product_id)
        )
        .mappings()
        .first()
        if product_id
        else None
    )
    collection_public = (
        db.scalar(
            text("SELECT published FROM catalog_collections WHERE id=:id"), dict(id=collection_id)
        )
        if collection_id
        else False
    )
    if not ((product and product["published"]) or collection_public):
        return None
    images = []
    for output in outputs:
        if output["format"] != "png":
            continue
        approved = db.scalar(
            text("""SELECT v.revision_id FROM media_asset_versions v JOIN media_assets a ON a.id=v.asset_id
          WHERE a.id=:id AND a.purpose='public_image' AND a.published_revision IS NOT NULL AND v.action='publish'
          AND v.purpose='public_image' AND v.sha256=:sha ORDER BY v.version DESC LIMIT 1"""),
            dict(id=output["asset_id"], sha=output["sha256"]),
        )
        if approved is None:
            return None
        images.append(
            dict(
                asset_id=output["asset_id"],
                revision_id=str(approved),
                view=output["view"],
                url=f"/api/v1/media/{output['asset_id']}/versions/{approved}/content",
                alt_fa=output["alt_fa"],
                alt_en=output["alt_en"],
            )
        )
    if len(images) != (3 if spec["notebook_type"] == "notebook" else 2):
        return None
    published_sku = (
        db.scalar(text("SELECT published FROM catalog_skus WHERE id=:id"), dict(id=sku_id))
        if sku_id
        else False
    )
    return dict(
        id=str(row["id"]),
        key=row["set_key"],
        spec=spec,
        images=images,
        product_id=str(product_id) if product and product["published"] else None,
        sku_id=str(sku_id) if published_sku and product and product["published"] else None,
        product_slug=product["slug"] if product and product["published"] else None,
        preview_only=not (published_sku and product and product["published"]),
    )


@public_router.get("")
def public_gallery(
    design: str = Query("", max_length=80),
    group: Literal["collection", "personal"] | None = None,
    notebook_type: Literal["notebook", "sketchbook"] | None = None,
    size: Literal["A3", "A4", "A5", "A6"] | None = None,
    paper: str = Query("", max_length=80),
    product_id: UUID | None = None,
    sku_id: UUID | None = None,
    cursor: str = Query("", max_length=300),
    limit: int = Query(12, ge=1, le=48),
    db: Session = Depends(session_dependency),
):
    rows = (
        db.execute(
            text("""SELECT s.id,s.set_key,r.inputs,r.outputs FROM mockup_sets s
      JOIN mockup_runs r ON r.id=s.published_run AND r.set_id=s.id AND r.status='ready'
      WHERE (:design='' OR r.inputs->'spec'->>'design'=:design)
      AND (CAST(:group AS text) IS NULL OR r.inputs->'spec'->>'group'=:group)
      AND (CAST(:kind AS text) IS NULL OR r.inputs->'spec'->>'notebook_type'=:kind)
      AND (CAST(:size AS text) IS NULL OR r.inputs->'spec'->>'size'=:size)
      AND (:paper='' OR r.inputs->'spec'->>'paper'=:paper)
      AND (CAST(:product AS text) IS NULL OR r.inputs->'target'->>'product_id'=:product)
      AND (CAST(:sku AS text) IS NULL OR r.inputs->'target'->>'sku_id'=:sku)
      AND s.set_key>:cursor ORDER BY s.set_key LIMIT 1000"""),
            dict(
                design=design,
                group=group,
                kind=notebook_type,
                size=size,
                paper=paper,
                product=str(product_id) if product_id else None,
                sku=str(sku_id) if sku_id else None,
                cursor=cursor,
            ),
        )
        .mappings()
        .all()
    )
    items = []
    for row in rows:
        value = public_item(db, row)
        if value:
            items.append(value)
        if len(items) > limit:
            break
    return dict(
        items=items[:limit], next_cursor=items[limit - 1]["key"] if len(items) > limit else None
    )
