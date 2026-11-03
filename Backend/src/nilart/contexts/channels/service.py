"""Durable, reviewable sync operations; ambiguous creates require reconciliation."""

import json
from uuid import uuid4

from sqlalchemy import text

from nilart.contexts.channels.adapters import ChannelError, adapter
from nilart.contexts.channels.catalog import image_record, preview
from nilart.contexts.channels.models import Config, Listing
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement


def channel(db, code):
    row = (
        db.execute(text("SELECT * FROM sales_channels WHERE code=:code"), dict(code=code))
        .mappings()
        .first()
    )
    if not row:
        raise ChannelError("channel_not_found")
    return row


def listing(db, id):
    row = (
        db.execute(text("SELECT * FROM channel_listings WHERE id=:id"), dict(id=id))
        .mappings()
        .first()
    )
    if not row:
        raise ChannelError("channel_listing_not_found")
    return row


def owned_product(remote, vendor_id, product_id=None):
    if not isinstance(remote, dict) or (remote.get("vendor") or {}).get("id") != vendor_id:
        raise ChannelError("channel_vendor_mismatch")
    if (
        type(remote.get("id")) is not int
        or remote["id"] < 1
        or (product_id and remote["id"] != product_id)
    ):
        raise ChannelError("channel_product_identity_mismatch")
    return remote


def enqueue_sync(db, row, config_row, actor, key, expected):
    intent = preview(db, row, config_row)
    prior = (
        db.execute(text("SELECT * FROM channel_operations WHERE id=:id"), dict(id=key))
        .mappings()
        .first()
    )
    if prior:
        if (
            prior["listing_id"] != row["id"]
            or prior["intent"]["fingerprint"] != expected
            or str(prior["actor_id"]) != str(actor)
        ):
            raise ChannelError("channel_command_conflict")
        return dict(prior)
    if not intent["ready"] or intent["fingerprint"] != expected:
        raise ChannelError("channel_preview_changed")
    if Config.model_validate(config_row["config"]).mode != "live":
        raise ChannelError("channel_live_mode_required")
    adapter(row["channel"])
    if db.scalar(
        text(
            "SELECT 1 FROM channel_operations WHERE listing_id=:id AND state IN ('queued','sending','unknown')"
        ),
        dict(id=row["id"]),
    ):
        raise ChannelError("channel_operation_pending")
    return dict(
        db.execute(
            text(
                "INSERT INTO channel_operations(id,channel,listing_id,kind,actor_id,intent,state) VALUES(:id,:channel,:listing,'product_sync',:actor,CAST(:intent AS jsonb),'queued') RETURNING *"
            ),
            dict(
                id=key,
                channel=row["channel"],
                listing=row["id"],
                actor=actor,
                intent=json.dumps(intent),
            ),
        )
        .mappings()
        .one()
    )


def run_operation(db, id):
    operation = (
        db.execute(text("SELECT * FROM channel_operations WHERE id=:id FOR UPDATE"), dict(id=id))
        .mappings()
        .one()
    )
    if operation["state"] != "queued":
        db.commit()
        return
    config_row = channel(db, operation["channel"])
    config = Config.model_validate(config_row["config"])
    row = listing(db, operation["listing_id"])
    intent = operation["intent"]
    from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository

    principal = SqlIdentityRepository(db).principal(operation["actor_id"])
    try:
        if not principal.allows("catalog.manage") or not principal.allows("pricing.publish"):
            raise ChannelError("permission_denied")
        if (
            config.mode != "live"
            or preview(db, row, config_row)["fingerprint"] != intent["fingerprint"]
        ):
            raise ChannelError("channel_preview_changed")
        provider = adapter(operation["channel"])
    except ChannelError as exc:
        db.execute(
            text(
                "UPDATE channel_operations SET state='superseded',error_code=:code,updated_at=now() WHERE id=:id"
            ),
            dict(id=id, code=exc.code),
        )
        db.commit()
        return
    db.execute(
        text("UPDATE channel_operations SET state='sending',updated_at=now() WHERE id=:id"),
        dict(id=id),
    )
    db.commit()
    result = None
    error = None
    state = "succeeded"
    try:
        # Verify authenticated shop identity on every operation; never publish into a supplied foreign shop.
        identity = provider.me()
        if (identity.get("vendor") or {}).get("id") != config.vendor_id:
            raise ChannelError("channel_vendor_mismatch")
        payload = dict(intent["payload"])
        external = intent["external_product_id"]
        variation = intent["external_variation_id"]
        if external:
            owned_product(provider.product(external), config.vendor_id, external)
        # Media only comes from reviewed published immutable local assets; URLs are never fetched.
        if intent["images"] and (not external or (config.sync_products and not variation)):
            media_ids = []
            for item in intent["images"]:
                with db.begin_nested():
                    media = image_record(
                        db,
                        next(
                            g
                            for g in Listing.model_validate(row["content"]).gallery
                            if str(g.asset_id) == item["asset_id"]
                        ),
                    )
                    if not media or media["sha256"] != item["sha256"]:
                        raise ChannelError("gallery_not_published")
                db.commit()
                cached = (row.get("uploaded_images") or {}).get(media["sha256"])
                uploaded = (
                    {"id": cached}
                    if cached
                    else provider.upload(media["file_name"], media["content"])
                )
                if type(uploaded.get("id")) not in (int, str) or not str(uploaded["id"]).isdigit():
                    raise ChannelError("channel_invalid_response", uncertain=True)
                media_ids.append(int(uploaded["id"]))
                db.execute(
                    text(
                        "UPDATE channel_listings SET uploaded_images=uploaded_images || CAST(:entry AS jsonb) WHERE id=:id"
                    ),
                    dict(id=row["id"], entry=json.dumps({media["sha256"]: int(uploaded["id"])})),
                )
                db.commit()
            payload.update(photo=media_ids[0], photos=media_ids)
        remote = (
            provider.update(external, payload, variation)
            if external
            else provider.create(config.vendor_id, payload)
        )
        if (
            not isinstance(remote, dict)
            or type(remote.get("id")) is not int
            or (external and remote["id"] != external)
        ):
            raise ChannelError("channel_invalid_response", uncertain=True)
        # Read-after-write is required before acknowledging; an ambiguous result never auto-retries.
        checked = owned_product(provider.product(remote["id"]), config.vendor_id, remote["id"])
        if not variation:
            expected = {k: payload[k] for k in ("primary_price", "stock", "sku") if k in payload}
            actual = {
                "primary_price": checked.get("primary_price"),
                "stock": checked.get("inventory"),
                "sku": checked.get("sku"),
            }
            if any(actual[k] != v for k, v in expected.items()):
                raise ChannelError("channel_remote_verification_required", uncertain=True)
        else:
            variants = (
                checked.get("variations") or checked.get("variants") or checked.get("variant") or []
            )
            actual = next((v for v in variants if v.get("id") == variation), {})
            if any(
                actual.get(k, actual.get("inventory") if k == "stock" else None) != payload[k]
                for k in ("stock", "primary_price", "sku")
                if k in payload
            ):
                raise ChannelError("channel_remote_verification_required", uncertain=True)
        result = dict(external_product_id=remote["id"], verified=True)
    except ChannelError as exc:
        error = exc.code
        state = "unknown" if exc.uncertain else "failed"
    except Exception:
        # This operation may already have reached the provider. No raw remote body/secret enters logs.
        error = "channel_result_unknown"
        state = "unknown"
    changed = db.execute(
        text(
            "UPDATE channel_operations SET state=:state,result=CAST(:result AS jsonb),error_code=:error,updated_at=now() WHERE id=:id AND state='sending'"
        ),
        dict(id=id, state=state, result=json.dumps(result), error=error),
    )
    if not changed.rowcount:
        db.commit()
        return
    if state == "succeeded":
        db.execute(
            text(
                "UPDATE channel_listings SET version=version+CASE WHEN external_product_id IS NULL THEN 1 ELSE 0 END,content=jsonb_set(content,'{external_product_id}',to_jsonb(CAST(:external AS bigint))),external_product_id=:external,last_applied_fingerprint=:fingerprint,last_error=NULL,updated_at=now() WHERE id=:id"
            ),
            dict(
                id=row["id"],
                external=result["external_product_id"],
                fingerprint=intent["fingerprint"],
            ),
        )
    else:
        db.execute(
            text("UPDATE channel_listings SET last_error=:error WHERE id=:id"),
            dict(id=row["id"], error=error),
        )
    SqlAccountManagement(db).audit(
        operation["actor_id"],
        operation["actor_id"],
        "channel.operation_finished",
        dict(operation_id=str(id), channel=operation["channel"], state=state, error=error),
        "Persisted marketplace synchronization result",
    )
    db.commit()


def tick(db):
    """Bounded polling supplements webhooks, and observes all catalogue/stock writer paths."""
    if not db.scalar(text("SELECT to_regclass('sales_channels')")):
        return
    configs = (
        db.execute(
            text(
                "SELECT * FROM sales_channels WHERE config->>'mode' IN ('preview','live') ORDER BY code"
            )
        )
        .mappings()
        .all()
    )
    for c in configs:
        config = Config.model_validate(c["config"])
        if c["code"] != "basalam" or not c["actor_id"]:
            continue
        try:
            provider = adapter(c["code"])
        except ChannelError:
            continue
        if not config.vendor_id:
            continue
        from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository

        principal = SqlIdentityRepository(db).principal(c["actor_id"])
        if not principal.allows("identity.manage") or not principal.allows("catalog.manage"):
            continue
        if config.import_orders:
            from nilart.contexts.channels.orders import ingest

            try:
                parcels = provider.parcels(config.vendor_id, cursor=c["poll_cursor"])
                if not isinstance(parcels.get("data"), list):
                    raise ChannelError("channel_invalid_response")
                ids = {
                    p["id"]
                    for p in parcels["data"]
                    if isinstance(p, dict) and type(p.get("id")) is int
                }
                ids.update(
                    db.scalars(
                        text(
                            "SELECT external_id FROM channel_orders WHERE channel=:code AND status IN ('processing','needs_review','preview') ORDER BY checked_at LIMIT 10"
                        ),
                        dict(code=c["code"]),
                    ).all()
                )
                for pid in sorted(ids)[:60]:
                    try:
                        ingest(db, c, provider.parcel(pid))
                        db.commit()
                    except ChannelError:
                        db.rollback()
                cursor = parcels.get("next_cursor")
                if cursor is not None and (not isinstance(cursor, str) or len(cursor) > 4096):
                    raise ChannelError("channel_invalid_response")
                db.execute(
                    text("UPDATE sales_channels SET poll_cursor=:cursor WHERE code=:code"),
                    dict(cursor=cursor, code=c["code"]),
                )
                db.execute(
                    text(
                        "UPDATE channel_inbox SET state='processed',processed_at=now() WHERE channel=:code AND state='received'"
                    ),
                    dict(code=c["code"]),
                )
                db.commit()
            except ChannelError:
                db.rollback()
        if config.mode == "live":
            rows = (
                db.execute(
                    text(
                        "SELECT * FROM channel_listings WHERE channel=:code AND external_product_id IS NOT NULL AND last_error IS NULL ORDER BY updated_at LIMIT 50"
                    ),
                    dict(code=c["code"]),
                )
                .mappings()
                .all()
            )
            for row in rows:
                plan = preview(db, row, c)
                if plan["ready"] and plan["fingerprint"] != row["last_applied_fingerprint"]:
                    try:
                        enqueue_sync(db, row, c, c["actor_id"], uuid4(), plan["fingerprint"])
                        db.commit()
                    except ChannelError:
                        db.rollback()
            for id in db.scalars(
                text(
                    "SELECT id FROM channel_operations WHERE channel=:code AND state='queued' ORDER BY created_at LIMIT 10"
                ),
                dict(code=c["code"]),
            ).all():
                run_operation(db, id)
