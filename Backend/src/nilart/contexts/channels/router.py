import hashlib
import hmac
import json
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.encoders import jsonable_encoder
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.bootstrap.settings import settings
from nilart.contexts.channels.adapters import ChannelError, adapter
from nilart.contexts.channels.catalog import preview
from nilart.contexts.channels.models import (
    Channel,
    Config,
    ListingCommand,
    Reconcile,
    SettingsCommand,
    SyncCommand,
)
from nilart.contexts.channels.service import channel, enqueue_sync, listing, owned_product
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.shared.database import session_dependency

router = APIRouter(prefix="/api/v1/admin/channels", tags=["sales-channels"])
webhook_router = APIRouter(prefix="/api/v1/integrations", tags=["marketplace-webhooks"])


def fail(code, status=409):
    raise HTTPException(
        status_code=status, detail={"code": code}, headers={"Cache-Control": "no-store"}
    )


def access(request, db, principal, permission="identity.manage"):
    actor, denied = write_access(request, db, principal, permission)
    if denied is not None:
        raise HTTPException(status_code=denied.status_code, detail=json.loads(denied.body))
    return actor


def config_output(row):
    return dict(
        code=row["code"],
        version=row["version"],
        content=Config.model_validate(row["config"]).model_dump(mode="json"),
        adapter_ready=row["code"] == "basalam",
        transport_enabled=settings.basalam_enabled if row["code"] == "basalam" else False,
        credentials_configured=bool(settings.basalam_token) if row["code"] == "basalam" else False,
        webhook_secret_configured=bool(settings.basalam_webhook_secret)
        if row["code"] == "basalam"
        else False,
        webhook_url=settings.public_origin + "/api/v1/integrations/" + row["code"] + "/webhook",
        updated_at=row["updated_at"].isoformat(),
    )


def listing_output(row):
    return jsonable_encoder(dict(row))


@router.get("")
def configs(
    response: Response,
    db: Session = Depends(session_dependency),
    principal=Depends(require_permission("catalog.manage")),
):
    response.headers["Cache-Control"] = "no-store"
    return [
        config_output(r)
        for r in db.execute(text("SELECT * FROM sales_channels ORDER BY code")).mappings()
    ]


@router.put("/{code}/settings/{key}")
def save_settings(
    code: Channel,
    key: UUID,
    body: SettingsCommand,
    request: Request,
    db: Session = Depends(session_dependency),
    principal=Depends(require_permission("identity.manage")),
):
    actor = access(request, db, principal)
    db.execute(text("SELECT pg_advisory_xact_lock(78214,60)"))
    intent = body.model_dump(mode="json")
    old = (
        db.execute(text("SELECT * FROM channel_settings_receipts WHERE id=:id"), dict(id=key))
        .mappings()
        .first()
    )
    if old:
        if (
            old["channel"] != code
            or str(old["actor_id"]) != str(actor.id)
            or old["intent"] != intent
        ):
            fail("channel_command_conflict")
        return old["result"]
    current = channel(db, code)
    if current["version"] != body.expected_version:
        fail("channel_settings_version_conflict")
    if body.content.mode == "live":
        if code != "basalam":
            fail("channel_adapter_not_implemented")
        try:
            adapter(code)
        except ChannelError as e:
            fail(e.code)
        if not body.content.vendor_id:
            fail("channel_vendor_required")
        if not settings.basalam_webhook_secret:
            fail("channel_webhook_secret_required")
    if Config.model_validate(current["config"]).vendor_id != body.content.vendor_id and db.scalar(
        text(
            "SELECT 1 WHERE EXISTS (SELECT 1 FROM channel_listings WHERE channel=:code AND external_product_id IS NOT NULL) OR EXISTS (SELECT 1 FROM channel_orders WHERE channel=:code) OR EXISTS (SELECT 1 FROM channel_operations WHERE channel=:code AND state IN ('queued','sending','unknown'))"
        ),
        dict(code=code),
    ):
        fail("channel_vendor_change_requires_review")
    row = (
        db.execute(
            text(
                "UPDATE sales_channels SET config=CAST(:content AS jsonb),version=version+1,actor_id=:actor,live_since=CASE WHEN :live AND live_since IS NULL THEN now() ELSE live_since END,updated_at=now() WHERE code=:code RETURNING *"
            ),
            dict(
                content=json.dumps(intent["content"]),
                actor=actor.id,
                code=code,
                live=body.content.mode == "live",
            ),
        )
        .mappings()
        .one()
    )
    result = config_output(row)
    db.execute(
        text(
            "INSERT INTO channel_settings_receipts(id,channel,actor_id,intent,result) VALUES(:id,:channel,:actor,CAST(:intent AS jsonb),CAST(:result AS jsonb))"
        ),
        dict(
            id=key,
            channel=code,
            actor=actor.id,
            intent=json.dumps(intent),
            result=json.dumps(result, default=str),
        ),
    )
    SqlAccountManagement(db).audit(
        actor.id,
        actor.id,
        "channel.settings_saved",
        dict(channel=code, version=row["version"], operation_id=str(key)),
        body.reason,
    )
    db.commit()
    return result


@router.get("/{code}/listings")
def listings(
    code: Channel,
    response: Response,
    db: Session = Depends(session_dependency),
    principal=Depends(require_permission("catalog.manage")),
):
    response.headers["Cache-Control"] = "no-store"
    return dict(
        items=[
            listing_output(r)
            for r in db.execute(
                text(
                    "SELECT * FROM channel_listings WHERE channel=:code ORDER BY updated_at DESC LIMIT 500"
                ),
                dict(code=code),
            ).mappings()
        ],
        skus=[
            dict(r)
            for r in db.execute(
                text(
                    "SELECT s.id,s.product_id,s.code,p.title_fa,p.title_en FROM catalog_skus s JOIN catalog_products p ON p.id=s.product_id WHERE p.published AND s.published ORDER BY p.slug,s.code LIMIT 1000"
                )
            ).mappings()
        ],
    )


@router.put("/{code}/listings/{id}/commands/{key}")
def save_listing(
    code: Channel,
    id: UUID,
    key: UUID,
    body: ListingCommand,
    request: Request,
    db: Session = Depends(session_dependency),
    principal=Depends(require_permission("catalog.manage")),
):
    actor = access(request, db, principal, "catalog.manage")
    db.execute(text("SELECT pg_advisory_xact_lock(78214,60)"))
    intent = body.model_dump(mode="json")
    old = (
        db.execute(text("SELECT * FROM channel_listing_receipts WHERE id=:id"), dict(id=key))
        .mappings()
        .first()
    )
    if old:
        if (
            old["listing_id"] != id
            or str(old["actor_id"]) != str(actor.id)
            or old["intent"] != intent
        ):
            fail("channel_command_conflict")
        return old["result"]
    current = (
        db.execute(text("SELECT * FROM channel_listings WHERE id=:id FOR UPDATE"), dict(id=id))
        .mappings()
        .first()
    )
    if (current["version"] if current else 0) != body.expected_version or (
        current
        and (current["channel"] != code or str(current["sku_id"]) != str(body.content.sku_id))
    ):
        fail("channel_listing_version_conflict")
    if db.scalar(
        text(
            "SELECT 1 FROM channel_operations WHERE listing_id=:id AND state IN ('queued','sending','unknown')"
        ),
        dict(id=id),
    ):
        fail("channel_operation_pending")
    if not db.scalar(
        text("SELECT id FROM catalog_skus WHERE id=:id"), dict(id=body.content.sku_id)
    ):
        fail("channel_sku_not_found", 404)
    duplicate = db.scalar(
        text("SELECT id FROM channel_listings WHERE channel=:code AND sku_id=:sku AND id<>:id"),
        dict(code=code, sku=body.content.sku_id, id=id),
    )
    if duplicate:
        fail("channel_sku_already_mapped")
    if body.content.external_product_id:
        db.commit()
        try:
            c = Config.model_validate(channel(db, code)["config"])
            remote = adapter(code).product(body.content.external_product_id)
            owned_product(remote, c.vendor_id, body.content.external_product_id)
        except ChannelError as e:
            fail(e.code)
        db.execute(text("SELECT pg_advisory_xact_lock(78214,60)"))
        latest = db.execute(
            text("SELECT version FROM channel_listings WHERE id=:id FOR UPDATE"), dict(id=id)
        ).scalar()
        if (latest or 0) != body.expected_version:
            fail("channel_listing_version_conflict")
    try:
        row = (
            db.execute(
                text("""INSERT INTO channel_listings(id,channel,sku_id,version,content,external_product_id,external_variation_id)
          VALUES(:id,:code,:sku,1,CAST(:content AS jsonb),:external,:variation)
          ON CONFLICT(id) DO UPDATE SET version=channel_listings.version+1,content=excluded.content,external_product_id=excluded.external_product_id,external_variation_id=excluded.external_variation_id,last_error=NULL,updated_at=now() RETURNING *"""),
                dict(
                    id=id,
                    code=code,
                    sku=body.content.sku_id,
                    content=json.dumps(intent["content"]),
                    external=body.content.external_product_id,
                    variation=body.content.external_variation_id,
                ),
            )
            .mappings()
            .one()
        )
    except Exception:
        db.rollback()
        fail("channel_mapping_conflict")
    result = listing_output(row)
    db.execute(
        text(
            "INSERT INTO channel_listing_receipts(id,listing_id,actor_id,intent,result) VALUES(:id,:listing,:actor,CAST(:intent AS jsonb),CAST(:result AS jsonb))"
        ),
        dict(
            id=key,
            listing=id,
            actor=actor.id,
            intent=json.dumps(intent),
            result=json.dumps(result, default=str),
        ),
    )
    SqlAccountManagement(db).audit(
        actor.id,
        actor.id,
        "channel.listing_saved",
        dict(channel=code, listing_id=str(id), version=row["version"]),
        body.reason,
    )
    db.commit()
    return result


@router.get("/{code}/listings/{id}/preview")
def plan(
    code: Channel,
    id: UUID,
    response: Response,
    db: Session = Depends(session_dependency),
    principal=Depends(require_permission("catalog.manage")),
):
    response.headers["Cache-Control"] = "no-store"
    try:
        row = listing(db, id)
        if row["channel"] != code:
            fail("channel_listing_not_found", 404)
        return preview(db, row, channel(db, code))
    except ChannelError as e:
        fail(e.code)


@router.put("/{code}/listings/{id}/sync/{key}")
def sync(
    code: Channel,
    id: UUID,
    key: UUID,
    body: SyncCommand,
    request: Request,
    db: Session = Depends(session_dependency),
    principal=Depends(require_permission("catalog.manage")),
):
    actor = access(request, db, principal, "catalog.manage")
    if not SqlIdentityRepository(db).principal(actor.id, lock=True).allows("pricing.publish"):
        fail("permission_denied", 403)
    if not body.confirmed:
        fail("channel_confirmation_required", 422)
    db.execute(text("SELECT pg_advisory_xact_lock(78214,60)"))
    try:
        row = listing(db, id)
        if row["channel"] != code:
            fail("channel_listing_not_found", 404)
        result = enqueue_sync(db, row, channel(db, code), actor.id, key, body.fingerprint)
        db.commit()
        return result
    except ChannelError as e:
        fail(e.code)


@router.post("/{code}/connection")
def connection(
    code: Channel,
    request: Request,
    db: Session = Depends(session_dependency),
    principal=Depends(require_permission("identity.manage")),
):
    access(request, db, principal)
    c = Config.model_validate(channel(db, code)["config"])
    db.commit()
    try:
        value = adapter(code).me()
        vendor = value.get("vendor") or {}
        if type(vendor.get("id")) is not int:
            raise ChannelError("channel_vendor_required")
        if c.vendor_id and vendor["id"] != c.vendor_id:
            raise ChannelError("channel_vendor_mismatch")
        return dict(
            connected=True,
            vendor_id=vendor["id"],
            identifier=vendor.get("identifier", ""),
            title=vendor.get("title", ""),
        )
    except ChannelError as e:
        fail(e.code)


@router.post("/{code}/category/{category_id}")
def category_data(
    code: Channel,
    category_id: int,
    request: Request,
    db: Session = Depends(session_dependency),
    principal=Depends(require_permission("catalog.manage")),
):
    access(request, db, principal, "catalog.manage")
    db.commit()
    if category_id < 1:
        fail("invalid_category", 422)
    try:
        provider = adapter(code)
        return dict(
            category=provider.category(category_id), attributes=provider.attributes(category_id)
        )
    except ChannelError as e:
        fail(e.code)


@router.post("/{code}/reference-data")
def references(
    code: Channel,
    request: Request,
    db: Session = Depends(session_dependency),
    principal=Depends(require_permission("catalog.manage")),
):
    access(request, db, principal, "catalog.manage")
    config = Config.model_validate(channel(db, code)["config"])
    db.commit()
    try:
        provider = adapter(code)
        me = provider.me()
        if (me.get("vendor") or {}).get("id") != config.vendor_id:
            raise ChannelError("channel_vendor_mismatch")
        tree = provider.categories()
        categories = []

        def walk(nodes, parent="", depth=0):
            if depth > 15 or not isinstance(nodes, list):
                return
            for node in nodes:
                if not isinstance(node, dict):
                    continue
                title = (
                    parent + " / " + str(node.get("title", ""))
                    if parent
                    else str(node.get("title", ""))
                )
                if type(node.get("id")) is int and not node.get("children"):
                    categories.append(dict(id=node["id"], title=title))
                walk(node.get("children"), title, depth + 1)

        walk(tree.get("data"))
        products = provider.products(config.vendor_id)
        return dict(
            categories=categories,
            products=[
                dict(
                    id=p["id"],
                    title=p.get("title") or p.get("name") or str(p["id"]),
                    sku=p.get("sku"),
                )
                for p in products.get("data", [])
                if type(p.get("id")) is int
            ],
        )
    except ChannelError as error:
        fail(error.code)


@router.get("/{code}/activity")
def activity(
    code: Channel,
    response: Response,
    db: Session = Depends(session_dependency),
    principal=Depends(require_permission("catalog.manage")),
):
    response.headers["Cache-Control"] = "no-store"
    return dict(
        operations=[
            dict(r)
            for r in db.execute(
                text(
                    "SELECT id,listing_id,kind,state,error_code,result,created_at,updated_at FROM channel_operations WHERE channel=:code ORDER BY created_at DESC LIMIT 100"
                ),
                dict(code=code),
            ).mappings()
        ],
        orders=[
            dict(r)
            for r in db.execute(
                text(
                    "SELECT id,external_id,status,issue,provider_updated_at,snapshot FROM channel_orders WHERE channel=:code ORDER BY updated_at DESC LIMIT 100"
                ),
                dict(code=code),
            ).mappings()
        ]
        if principal.allows("orders.read_all")
        else [],
        inbox=[
            dict(r)
            for r in db.execute(
                text(
                    "SELECT id,state,error_code,created_at,processed_at FROM channel_inbox WHERE channel=:code ORDER BY created_at DESC LIMIT 50"
                ),
                dict(code=code),
            ).mappings()
        ],
    )


@router.post("/{code}/operations/{key}/reconcile")
def reconcile(
    code: Channel,
    key: UUID,
    body: Reconcile,
    request: Request,
    db: Session = Depends(session_dependency),
    principal=Depends(require_permission("catalog.manage")),
):
    actor = access(request, db, principal, "catalog.manage")
    op = (
        db.execute(
            text("SELECT * FROM channel_operations WHERE id=:id AND channel=:code"),
            dict(id=key, code=code),
        )
        .mappings()
        .first()
    )
    if not op or op["state"] not in ("sending", "unknown"):
        fail("channel_reconciliation_unavailable")
    c = Config.model_validate(channel(db, code)["config"])
    db.commit()
    try:
        remote = owned_product(
            adapter(code).product(body.external_product_id), c.vendor_id, body.external_product_id
        )
        if remote.get("sku") != op["intent"]["sku_code"]:
            raise ChannelError("channel_product_identity_mismatch")
    except ChannelError as e:
        fail(e.code)
    db.execute(text("SELECT pg_advisory_xact_lock(78214,60)"))
    old = db.scalar(
        text(
            "SELECT id FROM channel_listings WHERE channel=:code AND external_product_id=:external AND id<>:id"
        ),
        dict(code=code, external=body.external_product_id, id=op["listing_id"]),
    )
    if old:
        fail("channel_mapping_conflict")
    db.execute(
        text(
            "UPDATE channel_listings SET external_product_id=:external,version=version+1,last_error=NULL,updated_at=now() WHERE id=:id"
        ),
        dict(id=op["listing_id"], external=body.external_product_id),
    )
    db.execute(
        text(
            "UPDATE channel_operations SET state='succeeded',result=CAST(:result AS jsonb),error_code=NULL,updated_at=now() WHERE id=:id AND state IN ('sending','unknown')"
        ),
        dict(
            id=key,
            result=json.dumps(dict(external_product_id=body.external_product_id, reconciled=True)),
        ),
    )
    SqlAccountManagement(db).audit(
        actor.id,
        actor.id,
        "channel.operation_reconciled",
        dict(channel=code, operation_id=str(key), external_product_id=body.external_product_id),
        body.reason,
    )
    db.commit()
    return dict(reconciled=True)


@router.post("/{code}/webhook-registration")
def register_hook(
    code: Channel,
    request: Request,
    db: Session = Depends(session_dependency),
    principal=Depends(require_permission("identity.manage")),
):
    access(request, db, principal)
    c = Config.model_validate(channel(db, code)["config"])
    db.commit()
    if not settings.public_origin.startswith("https://") or not settings.basalam_webhook_secret:
        fail("channel_public_https_required")
    if c.mode == "disabled":
        fail("channel_disabled")
    try:
        provider = adapter(code)
        if (provider.me().get("vendor") or {}).get("id") != c.vendor_id:
            raise ChannelError("channel_vendor_mismatch")
        result = provider.register_webhook(
            settings.public_origin + "/api/v1/integrations/" + code + "/webhook",
            settings.basalam_webhook_secret.get_secret_value(),
        )
        return dict(registered=True, id=result.get("id"))
    except ChannelError as e:
        fail(e.code)


@webhook_router.post("/{code}/webhook")
async def receive(code: Channel, request: Request, db: Session = Depends(session_dependency)):
    secret = (
        settings.basalam_webhook_secret.get_secret_value()
        if code == "basalam" and settings.basalam_webhook_secret
        else ""
    )
    if not secret or not hmac.compare_digest(
        request.headers.get("authorization", ""), "Bearer " + secret
    ):
        fail("webhook_unauthorized", 401)
    c = channel(db, code)
    if Config.model_validate(c["config"]).mode == "disabled":
        fail("channel_disabled", 410)
    try:
        length = int(request.headers.get("content-length", "0"))
        if length > 131072:
            fail("webhook_too_large", 413)
        raw = await request.body()
        if len(raw) > 131072:
            fail("webhook_too_large", 413)
        payload = json.loads(raw)
        if not isinstance(payload, dict):
            fail("webhook_invalid", 422)
    except (ValueError, TypeError):
        fail("webhook_invalid", 422)
    digest = hashlib.sha256(
        json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    db.execute(
        text(
            "INSERT INTO channel_inbox(id,channel,digest,payload) VALUES(:id,:code,:digest,CAST(:payload AS jsonb)) ON CONFLICT(channel,digest) DO NOTHING"
        ),
        dict(id=uuid4(), code=code, digest=digest, payload=json.dumps(payload)),
    )
    db.commit()
    return {"received": True}
