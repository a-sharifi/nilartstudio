"""Version checks, private inputs, durable jobs and atomic reviewed publication."""

import base64
import hashlib
import json
import logging
from types import SimpleNamespace
from uuid import UUID, uuid5

from sqlalchemy import text
from sqlalchemy.orm import Session
from starlette.requests import Request

from nilart.contexts.catalog.presentation import profiles
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.media import router as media

from .models import MediaRef, RunInput, Sources, Spec, Template
from .renderer import decode, fingerprint, render

NAMESPACE = UUID("d45d5ef0-7778-4bc0-aed7-275f6481576e")
logger = logging.getLogger("nilart.mockups")


class MockupError(Exception):
    def __init__(self, code, status=409):
        self.code, self.status = code, status
        super().__init__(code)


def safe(value):
    return json.loads(json.dumps(value, default=str))


def lock(db):
    db.execute(text("SELECT pg_advisory_xact_lock(78214,62)"))


def audit(db, actor, action, change, reason):
    SqlAccountManagement(db).audit(actor.id, actor.id, action, safe(change), reason)


def receipt(db, key, actor, kind, entity_id, intent):
    prior = (
        db.execute(text("SELECT * FROM mockup_commands WHERE id=:id"), {"id": key})
        .mappings()
        .first()
    )
    if prior and (
        str(prior["actor_id"]) != str(actor.id)
        or prior["kind"] != kind
        or prior["entity_id"] != entity_id
        or prior["intent"] != intent
    ):
        raise MockupError("mockup_operation_conflict")
    return prior["result"] if prior else None


def command(db, key, actor, kind, entity_id, intent, result):
    db.execute(
        text(
            "INSERT INTO mockup_commands(id,actor_id,kind,entity_id,intent,result) VALUES(:id,:actor,:kind,:entity,CAST(:intent AS jsonb),CAST(:result AS jsonb))"
        ),
        dict(
            id=key,
            actor=actor.id,
            kind=kind,
            entity=entity_id,
            intent=json.dumps(intent),
            result=json.dumps(safe(result)),
        ),
    )


def asset(db, ref: MediaRef):
    row = (
        db.execute(
            text("""SELECT v.*,b.content,b.size,a.version AS head_version FROM media_asset_versions v
      JOIN media_assets a ON a.id=v.asset_id JOIN media_blobs b ON b.sha256=v.sha256
      WHERE v.asset_id=:id AND v.revision_id=:revision AND a.purpose IN ('mockup_source','public_image')
      AND v.purpose=a.purpose"""),
            dict(id=ref.asset_id, revision=ref.revision_id),
        )
        .mappings()
        .first()
    )
    if not row:
        raise MockupError("mockup_source_not_found", 422)
    data = bytes(row["content"])
    if len(data) != row["size"] or hashlib.sha256(data).hexdigest() != row["sha256"]:
        raise MockupError("mockup_source_integrity_error", 503)
    return row


def refs(value):
    if isinstance(value, dict):
        if "asset_id" in value and "revision_id" in value:
            yield MediaRef.model_validate(value)
        else:
            for item in value.values():
                yield from refs(item)
    elif isinstance(value, list):
        for item in value:
            yield from refs(item)


def save_template(db, actor, template_id, key, expected, content, reason):
    lock(db)
    intent = dict(expected_version=expected, content=content.model_dump(mode="json"), reason=reason)
    old = receipt(db, key, actor, "template", template_id, intent)
    if old:
        return old
    current = (
        db.execute(text("SELECT * FROM mockup_templates WHERE id=:id"), {"id": template_id})
        .mappings()
        .first()
    )
    if (current["version"] if current else 0) != expected:
        raise MockupError("mockup_template_version_conflict")
    for ref in refs(intent["content"]):
        decode(bytes(asset(db, ref)["content"]))
    result = dict(id=str(template_id), version=expected + 1, content=intent["content"])
    db.execute(
        text("""INSERT INTO mockup_templates(id,version,content) VALUES(:id,:version,CAST(:content AS jsonb))
      ON CONFLICT(id) DO UPDATE SET version=EXCLUDED.version,content=EXCLUDED.content,updated_at=now()"""),
        dict(id=template_id, version=expected + 1, content=json.dumps(intent["content"])),
    )
    command(db, key, actor, "template", template_id, intent, result)
    audit(db, actor, "mockup.template_saved", result, reason)
    db.commit()
    return result


def get_run(db, run_id):
    row = (
        db.execute(text("SELECT * FROM mockup_runs WHERE id=:id"), dict(id=run_id))
        .mappings()
        .first()
    )
    if not row:
        raise MockupError("mockup_run_not_found", 404)
    result = dict(row)
    result["stale"] = stale(db, row["inputs"])
    return result


def stale(db, inputs):
    for tid, data in inputs["templates"].items():
        current = (
            db.execute(
                text("SELECT version,content FROM mockup_templates WHERE id=:id"), dict(id=tid)
            )
            .mappings()
            .first()
        )
        if (
            not current
            or current["version"] != data["version"]
            or not current["content"].get("active")
        ):
            return True
    for ref in refs([inputs["sources"], inputs["templates"]]):
        try:
            row = asset(db, ref)
        except MockupError:
            return True
        if row["version"] != row["head_version"]:
            return True
    return False


def create_run(db, actor, key, body: RunInput):
    lock(db)
    spec = body.spec
    set_id = uuid5(NAMESPACE, spec.key)
    intent = {"action": "render", **body.model_dump(mode="json")}
    previous = receipt(db, key, actor, "set", set_id, intent)
    if previous:
        return get_run(db, UUID(previous["run_id"]))
    current = (
        db.execute(text("SELECT * FROM mockup_sets WHERE id=:id"), dict(id=set_id))
        .mappings()
        .first()
    )
    if (current["version"] if current else 0) != body.expected_version:
        raise MockupError("mockup_set_version_conflict")
    target = body.target
    if target.sku_id:
        parent = db.scalar(
            text("SELECT product_id FROM catalog_skus WHERE id=:id"), dict(id=target.sku_id)
        )
        if parent is None or parent != target.product_id:
            raise MockupError("mockup_target_mismatch", 422)
    for field, table in [
        ("product_id", "catalog_products"),
        ("collection_id", "catalog_collections"),
    ]:
        value = getattr(target, field)
        if value and not db.scalar(text(f"SELECT id FROM {table} WHERE id=:id"), dict(id=value)):
            raise MockupError("mockup_target_not_found", 422)
    templates = {}
    for view, tid in body.templates.items():
        row = (
            db.execute(text("SELECT * FROM mockup_templates WHERE id=:id"), dict(id=tid))
            .mappings()
            .first()
        )
        if not row:
            raise MockupError("mockup_template_missing", 422)
        t = Template.model_validate(row["content"])
        if (
            not t.active
            or t.binding != spec.binding
            or t.notebook_type != spec.notebook_type
            or t.view != view
        ):
            raise MockupError("mockup_template_binding_mismatch", 422)
        templates[str(tid)] = dict(version=row["version"], content=t.model_dump(mode="json"))
    source_value = body.sources.model_dump(mode="json")
    source_digests = {
        f"{r.asset_id}/{r.revision_id}": asset(db, r)["sha256"]
        for r in refs([source_value, templates])
    }
    inputs = dict(
        spec=spec.model_dump(mode="json"),
        sources=source_value,
        templates=templates,
        views={v: str(tid) for v, tid in body.templates.items()},
        target=target.model_dump(mode="json"),
        attach_to=body.attach_to,
        source_digests=source_digests,
    )
    if body.attach_to != "none":
        kind = "skus" if body.attach_to == "sku" else "products"
        entity_id = target.sku_id if kind == "skus" else target.product_id
        inputs["profile"] = dict(
            kind=kind, id=str(entity_id), version=profiles.record(db, kind, entity_id)["version"]
        )
    digest = fingerprint({k: v for k, v in inputs.items() if k != "profile"})
    cached = (
        db.execute(
            text("SELECT id,status FROM mockup_runs WHERE set_id=:id AND fingerprint=:fp"),
            dict(id=set_id, fp=digest),
        )
        .mappings()
        .first()
    )
    if cached:
        command(db, key, actor, "set", set_id, intent, dict(run_id=str(cached["id"])))
        db.commit()
        return get_run(db, cached["id"])
    version = body.expected_version + 1
    db.execute(
        text("""INSERT INTO mockup_sets(id,set_key,version,spec,target) VALUES(:id,:key,:version,CAST(:spec AS jsonb),CAST(:target AS jsonb))
      ON CONFLICT(id) DO UPDATE SET version=EXCLUDED.version,spec=EXCLUDED.spec,target=EXCLUDED.target,updated_at=now()"""),
        dict(
            id=set_id,
            key=spec.key,
            version=version,
            spec=json.dumps(inputs["spec"]),
            target=json.dumps(inputs["target"]),
        ),
    )
    db.execute(
        text(
            "INSERT INTO mockup_runs(id,set_id,actor_id,intent,inputs,fingerprint,status) VALUES(:id,:set,:actor,CAST(:intent AS jsonb),CAST(:inputs AS jsonb),:fp,'queued')"
        ),
        dict(
            id=key,
            set=set_id,
            actor=actor.id,
            intent=json.dumps(intent),
            inputs=json.dumps(inputs),
            fp=digest,
        ),
    )
    command(db, key, actor, "set", set_id, intent, dict(run_id=str(key)))
    audit(
        db,
        actor,
        "mockup.render_requested",
        dict(set_id=str(set_id), run_id=str(key), fingerprint=digest),
        body.reason,
    )
    db.commit()
    return get_run(db, key)


def process_run(engine, run_id):
    """Short claim/read and save transactions; no database lock during CPU work."""
    with Session(engine) as db:
        row = (
            db.execute(
                text("""UPDATE mockup_runs SET status='rendering',attempts=attempts+1,
          lease_until=now()+interval '10 minutes',updated_at=now() WHERE id=:id AND attempts<3
          AND (status='queued' OR (status='rendering' AND lease_until<now())) RETURNING *"""),
                dict(id=run_id),
            )
            .mappings()
            .first()
        )
        if not row:
            db.rollback()
            return False
        inputs, attempt, actor_id = row["inputs"], row["attempts"], row["actor_id"]
        db.commit()
        try:
            principal = SqlIdentityRepository(db).principal(actor_id)
            if not principal.allows("content.manage") or not principal.allows("catalog.manage"):
                raise MockupError("mockup_permission_revoked", 403)
            if stale(db, inputs):
                raise MockupError("mockup_inputs_changed")
            blobs = {
                f"{r.asset_id}/{r.revision_id}": bytes(asset(db, r)["content"])
                for r in refs([inputs["sources"], inputs["templates"]])
            }
            db.rollback()

            def fetch(ref):
                return blobs[f"{ref.asset_id}/{ref.revision_id}"]

            spec, sources = (
                Spec.model_validate(inputs["spec"]),
                Sources.model_validate(inputs["sources"]),
            )
            rendered = []
            for view in spec.views:
                template = Template.model_validate(
                    inputs["templates"][inputs["views"][view]]["content"]
                )
                rendered.append((view, render(spec, template, sources, fetch)))
            lock(db)
            current = (
                db.execute(
                    text("SELECT * FROM mockup_runs WHERE id=:id FOR UPDATE"), dict(id=run_id)
                )
                .mappings()
                .one()
            )
            if current["attempts"] != attempt or current["status"] != "rendering":
                db.rollback()
                return False
            outputs = []
            for view, formats in rendered:
                for format_name, data in formats.items():
                    aid = uuid5(NAMESPACE, current["fingerprint"] + ":" + view + ":" + format_name)
                    rid = uuid5(aid, "render-v1")
                    fa = {"front": "نمای جلو", "back": "نمای پشت", "inside": "صفحات داخلی"}[view]
                    en = {"front": "Front", "back": "Back", "inside": "Inside pages"}[view]
                    alt_fa, alt_en = (
                        f"{spec.title_fa}، {spec.size}، {PAPER_LABEL(spec)} — {fa}",
                        f"{spec.title_en}, {spec.size}, {spec.notebook_type} — {en}",
                    )
                    from nilart.contexts.mockups.renderer import VERSION

                    body = media.Upload(
                        expected_version=0,
                        action="draft",
                        purpose="public_image",
                        metadata=media.Metadata(
                            title_fa=alt_fa[:200],
                            title_en=alt_en[:200],
                            alt_fa=alt_fa,
                            alt_en=alt_en,
                            sku_id=inputs["target"].get("sku_id"),
                            notes=f"Generated real-photo preview; {VERSION}; {current['fingerprint']}",
                        ),
                        file_name=f"{spec.design}-{spec.size}-{view}.{'png' if format_name == 'png' else 'jpg'}",
                        content_base64=base64.b64encode(data).decode(),
                        reason="Deterministic real-photo image render",
                    )
                    saved = media.save_record(
                        db,
                        SimpleNamespace(id=actor_id),
                        aid,
                        rid,
                        body,
                        Request({"type": "http", "headers": []}),
                        commit=False,
                    )
                    if not isinstance(saved, dict):
                        raise MockupError("mockup_output_save_failed", 503)
                    outputs.append(
                        dict(
                            view=view,
                            format=format_name,
                            asset_id=str(aid),
                            revision_id=str(rid),
                            sha256=hashlib.sha256(data).hexdigest(),
                            alt_fa=alt_fa,
                            alt_en=alt_en,
                        )
                    )
            db.execute(
                text(
                    "UPDATE mockup_runs SET status='ready',outputs=CAST(:outputs AS jsonb),error='',lease_until=NULL,updated_at=now() WHERE id=:id"
                ),
                dict(id=run_id, outputs=json.dumps(outputs)),
            )
            db.commit()
            return True
        except Exception as exc:
            db.rollback()
            code = (
                exc.code
                if isinstance(exc, MockupError)
                else str(exc)
                if isinstance(exc, ValueError)
                else "mockup_render_failed"
            )
            if not isinstance(exc, (MockupError, ValueError)):
                logger.exception("Mockup render failed: %s", run_id)
            db.execute(
                text(
                    "UPDATE mockup_runs SET status='failed',error=:error,lease_until=NULL,updated_at=now() WHERE id=:id AND attempts=:attempt"
                ),
                dict(id=run_id, error=code[:200], attempt=attempt),
            )
            db.commit()
            return False


def PAPER_LABEL(spec):
    from .models import PAPERS

    return PAPERS[spec.paper][0]


def publish_set(
    db, actor, set_id, key, expected, action, run_id, reason, request, expected_profile_version=None
):
    lock(db)
    intent = dict(
        expected_version=expected,
        action=action,
        run_id=str(run_id) if run_id else None,
        reason=reason,
        expected_profile_version=expected_profile_version,
    )
    prior = receipt(db, key, actor, "set", set_id, intent)
    if prior:
        return prior
    row = (
        db.execute(text("SELECT * FROM mockup_sets WHERE id=:id FOR UPDATE"), dict(id=set_id))
        .mappings()
        .first()
    )
    if not row:
        raise MockupError("mockup_set_not_found", 404)
    if row["version"] != expected:
        raise MockupError("mockup_set_version_conflict")
    run = None
    if action == "unpublish" and row["published_run"]:
        withdrawn = db.execute(
            text("SELECT outputs FROM mockup_runs WHERE id=:id"), dict(id=row["published_run"])
        ).scalar_one()
        for output in withdrawn:
            aid = UUID(output["asset_id"])
            a = (
                db.execute(text("SELECT * FROM media_assets WHERE id=:id"), dict(id=aid))
                .mappings()
                .one()
            )
            if a["published_revision"] is not None:
                body = media.Upload(
                    expected_version=a["version"],
                    action="unpublish",
                    purpose="public_image",
                    metadata=media.Metadata.model_validate(a["metadata"]),
                    file_name=a["file_name"],
                    reason=reason,
                )
                result = media.save_record(
                    db, actor, aid, uuid5(key, str(aid)), body, request, commit=False
                )
                if not isinstance(result, dict):
                    raise MockupError("mockup_media_withdrawal_conflict")
    if action != "unpublish":
        run = get_run(db, run_id)
        if run["set_id"] != set_id or run["status"] != "ready":
            raise MockupError("mockup_render_not_ready")
        if run["inputs"]["spec"] != row["spec"]:
            raise MockupError("mockup_spec_changed")
        if run["inputs"]["target"] != row["target"]:
            raise MockupError("mockup_target_changed")
        if action != "rollback" and run["stale"]:
            raise MockupError("mockup_inputs_changed")
        if {o["view"] for o in run["outputs"] if o["format"] == "png"} != set(
            Spec.model_validate(row["spec"]).views
        ):
            raise MockupError("mockup_outputs_incomplete")
        gallery = []
        for output in run["outputs"]:
            aid = UUID(output["asset_id"])
            a = (
                db.execute(text("SELECT * FROM media_assets WHERE id=:id"), dict(id=aid))
                .mappings()
                .one()
            )
            if a["sha256"] != output["sha256"]:
                raise MockupError("mockup_output_changed")
            body = media.Upload(
                expected_version=a["version"],
                action="publish",
                purpose="public_image",
                metadata=media.Metadata.model_validate(a["metadata"]),
                file_name=a["file_name"],
                reason=reason,
            )
            saved = media.save_record(
                db, actor, aid, uuid5(key, str(aid)), body, request, commit=False
            )
            if not isinstance(saved, dict):
                raise MockupError("mockup_media_publish_conflict")
            if output["format"] == "png":
                gallery.append(
                    dict(
                        asset_id=str(aid),
                        revision_id=str(saved["revision_id"]),
                        alt_fa=output["alt_fa"],
                        alt_en=output["alt_en"],
                    )
                )
        profile = run["inputs"].get("profile")
        if profile:
            kind, entity_id = profile["kind"], UUID(profile["id"])
            current = profiles.record(db, kind, entity_id)
            version = (
                profile["version"] if expected_profile_version is None else expected_profile_version
            )
            if current["version"] != version:
                raise MockupError("mockup_profile_version_conflict")
            published = (
                db.scalar(
                    text("SELECT intent->'content' FROM catalog_profile_revisions WHERE id=:id"),
                    dict(id=current["published_revision"]),
                )
                if current["published_revision"]
                else None
            )
            if current["content"] and current["content"] != published and current["version"] > 0:
                raise MockupError("mockup_profile_has_unpublished_changes")
            content = profiles.Content.model_validate(
                {**(current["content"] or {}), "gallery": gallery}
            )
            body = profiles.Command(
                expected_version=version, action="publish", content=content, reason=reason
            )
            saved = profiles.save_record(
                db, actor, kind, entity_id, uuid5(key, "profile"), body, request, commit=False
            )
            if not isinstance(saved, dict):
                raise MockupError("mockup_profile_publish_conflict")
    result = dict(
        id=str(set_id),
        version=expected + 1,
        published_run=str(run_id) if action != "unpublish" else None,
    )
    db.execute(
        text(
            "UPDATE mockup_sets SET version=:version,published_run=:run,updated_at=now() WHERE id=:id"
        ),
        dict(id=set_id, version=expected + 1, run=run_id if action != "unpublish" else None),
    )
    command(db, key, actor, "set", set_id, intent, result)
    audit(db, actor, "mockup.set_" + action, result, reason)
    db.commit()
    return result
