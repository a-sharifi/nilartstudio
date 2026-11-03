import base64
import binascii
import hmac
from datetime import datetime
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.bootstrap.settings import settings
from nilart.contexts.commissions.references import ReferenceImage, decode_reference, save_references
from nilart.contexts.commissions.repository import SqlCommissionRepository, SubmissionConflict
from nilart.contexts.commissions.reviews import publish_review
from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.infrastructure.secrets import token_digest
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.contexts.identity.presentation.router import failure, session_account
from nilart.shared.database import session_dependency
from nilart.shared.outbox import enqueue

router = APIRouter(prefix="/api/v1/account/commissions", tags=["commissions"])


class CommissionBrief(BaseModel):
    model_config = ConfigDict(extra="forbid")
    submission_id: UUID
    notebook_pricing_fingerprint: str | None = Field(default=None, pattern=r"^[a-f0-9]{64}$")
    notebook_technique: Literal["digital", "pencil"] | None = None
    notebook_sku_id: UUID | None = None
    notebook_design: Literal["custom_cover", "digital_cover"] | None = None
    idea: str = Field(min_length=1, max_length=4000)
    changes: str = Field(max_length=2000)
    style: str = Field(min_length=1, max_length=300)
    size: str = Field(min_length=1, max_length=300)
    execution: Literal["digital", "handmade"]
    input_kind: Literal["idea", "image"] = "idea"
    primary_reference: UUID | None = None
    references: list[ReferenceImage] = Field(default_factory=list, max_length=3)

    @model_validator(mode="after")
    def nonblank(self):
        if any(not value.strip() for value in [self.idea, self.style, self.size]):
            raise ValueError("Required commission details are blank")
        if (self.notebook_sku_id is None) != (self.notebook_design is None):
            raise ValueError("Notebook and design type are required together")
        ids = [image.id for image in self.references]
        if (
            len(ids) != len(set(ids))
            or (ids and self.primary_reference not in ids)
            or (not ids and self.primary_reference is not None)
            or (self.input_kind == "image" and not ids)
        ):
            raise ValueError("Invalid reference selection")
        return self


class CommissionReceipt(BaseModel):
    id: UUID
    created_at: datetime
    status: Literal["awaiting_review"]


@router.post("", response_model=CommissionReceipt)
def submit(
    body: CommissionBrief,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("account.write_self")),
):
    if request.headers.get("origin") != settings.public_origin:
        return failure(request, "origin_invalid", 403)
    account = session_account(request, db, lock=True)
    if not account:
        return failure(request, "unauthenticated", 401)
    current = SqlIdentityRepository(db).principal(account.id, lock=True)
    if account.id != principal.account_id or not current.allows("account.write_self"):
        return failure(request, "permission_denied", 403)
    csrf = request.headers.get("X-CSRF-Token", "")
    if (
        not csrf
        or len(csrf) > 128
        or not hmac.compare_digest(token_digest(csrf), account.csrf_hash)
    ):
        return failure(request, "csrf_invalid", 403)
    try:
        decoded = [decode_reference(image) for image in body.references]
    except Exception:
        return failure(request, "invalid_reference", 422)
    brief = body.model_dump(
        mode="json",
        exclude={
            "submission_id",
            "references",
            "input_kind",
            "primary_reference",
            "notebook_sku_id",
            "notebook_design",
            "notebook_pricing_fingerprint",
            "notebook_technique",
        },
    )
    if body.notebook_sku_id:
        from nilart.contexts.commissions.notebooks import notebook

        old = db.scalar(
            text(
                "SELECT brief FROM commission_requests WHERE account_id=:owner AND submission_id=:id"
            ),
            dict(owner=account.id, id=body.submission_id),
        )
        if not old and (not body.notebook_pricing_fingerprint or not body.notebook_technique):
            return failure(request, "notebook_pricing_required", 422)
        previous = (old or {}).get("notebook")
        if (
            previous
            and previous["sku_id"] == str(body.notebook_sku_id)
            and previous["design"] == body.notebook_design
        ):
            brief["notebook"] = previous
        else:
            target = notebook(db, body.notebook_sku_id)
            if not target:
                return failure(request, "notebook_unavailable", 409)
            brief["notebook"] = dict(
                sku_id=str(body.notebook_sku_id),
                design=body.notebook_design,
                code=target["code"],
                slug=target["slug"],
                title_fa=target["title_fa"],
                title_en=target["title_en"],
                pricing="awaiting_quote",
                base_amount=str(target["price_amount"])
                if target["price_amount"] is not None
                else None,
                currency=target["currency"],
            )
    if body.notebook_pricing_fingerprint:
        if not body.notebook_sku_id or not body.notebook_technique:
            return failure(request, "notebook_pricing_required", 422)
        from nilart.contexts.commissions.notebooks import price_notebook

        frozen = (previous or {}).get("quote")
        if (
            frozen
            and frozen.get("fingerprint") == body.notebook_pricing_fingerprint
            and frozen.get("technique") == body.notebook_technique
        ):
            quote = frozen
        else:
            try:
                quote = price_notebook(db, body.notebook_sku_id, body.notebook_technique)
            except ValueError:
                return failure(request, "notebook_unavailable", 409)
            if quote["fingerprint"] != body.notebook_pricing_fingerprint:
                return failure(request, "notebook_price_changed", 409)
        brief["notebook"]["quote"] = quote
        brief["notebook"]["pricing"] = "payment_required"
    # Keep historical text-only request receipts byte-for-byte compatible.
    if decoded:
        brief.update(
            input_kind=body.input_kind,
            primary_reference=str(body.primary_reference),
            references=[metadata for metadata, _ in decoded],
        )
    try:
        receipt = SqlCommissionRepository(db).submit(account.id, body.submission_id, brief)
        save_references(db, receipt["id"], decoded)
    except SubmissionConflict:
        db.rollback()
        return failure(request, "submission_conflict", 409)
    db.commit()
    return receipt


class ArtworkRecord(BaseModel):
    id: UUID
    number: int
    note: str
    created_at: datetime
    action: Literal["approve", "revise"] | None
    details: str | None
    decided_at: datetime | None


class CommissionRecord(BaseModel):
    id: UUID
    brief: dict
    status: Literal[
        "awaiting_review",
        "in_progress",
        "awaiting_customer",
        "revision_requested",
        "approved",
        "cancelled",
    ]
    version: int
    created_at: datetime
    updated_at: datetime
    revision_allowance: int | None
    agreement: str | None
    artwork: list[ArtworkRecord]


class CommissionPage(BaseModel):
    items: list[CommissionRecord]
    next_cursor: UUID | None


def owned(db, owner, id, lock=False):
    return (
        db.execute(
            text(
                "SELECT * FROM commission_requests WHERE account_id=:owner AND id=:id"
                + (" FOR UPDATE" if lock else "")
            ),
            {"owner": owner, "id": id},
        )
        .mappings()
        .first()
    )


def record(db, row):
    data = {
        key: row[key]
        for key in (
            "id",
            "brief",
            "status",
            "version",
            "created_at",
            "updated_at",
            "revision_allowance",
            "agreement",
        )
    }
    data["artwork"] = [
        dict(item)
        for item in db.execute(
            text(
                "SELECT a.id,a.number,a.note,a.created_at,d.action,d.details,d.created_at AS decided_at "
                "FROM commission_artwork_versions a LEFT JOIN commission_artwork_decisions d ON d.artwork_id=a.id "
                "WHERE a.commission_id=:id ORDER BY a.number DESC"
            ),
            {"id": row["id"]},
        ).mappings()
    ]
    return data


@router.get("", response_model=CommissionPage)
def history(
    request: Request,
    q: str = Query("", max_length=200),
    cursor: UUID | None = None,
    limit: int = Query(50, ge=1, le=100),
    status: Literal[
        "awaiting_review",
        "in_progress",
        "awaiting_customer",
        "revision_requested",
        "approved",
        "cancelled",
    ]
    | None = None,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("account.read_self")),
):
    anchor = owned(db, principal.account_id, cursor) if cursor else None
    if cursor and not anchor:
        return failure(request, "commission_not_found", 404)
    rows = (
        db.execute(
            text(
                "SELECT * FROM commission_requests WHERE account_id=:owner "
                "AND (CAST(:status AS text) IS NULL OR status=:status) "
                "AND (:q = '' OR strpos(lower(concat_ws(' ', brief->>'idea', brief->>'style', brief->>'size', brief->>'changes')), lower(CAST(:q AS text))) > 0) "
                "AND (CAST(:cursor AS uuid) IS NULL OR (created_at,id)<(:time,CAST(:cursor AS uuid))) "
                "ORDER BY created_at DESC,id DESC LIMIT :limit"
            ),
            {
                "owner": principal.account_id,
                "cursor": cursor,
                "status": status,
                "q": q.strip(),
                "time": anchor["created_at"] if anchor else None,
                "limit": limit + 1,
            },
        )
        .mappings()
        .all()
    )
    return {
        "items": [record(db, row) for row in rows[:limit]],
        "next_cursor": rows[limit - 1]["id"] if len(rows) > limit else None,
    }


@router.get("/{id}", response_model=CommissionRecord)
def detail(
    id: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("account.read_self")),
):
    row = owned(db, principal.account_id, id)
    return record(db, row) if row else failure(request, "commission_not_found", 404)


@router.get("/{id}/artwork/{artwork_id}/preview")
def preview(
    id: UUID,
    artwork_id: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("account.read_self")),
):
    if not owned(db, principal.account_id, id):
        return failure(request, "commission_not_found", 404)
    data = db.execute(
        text(
            "SELECT preview FROM commission_artwork_versions WHERE commission_id=:id AND id=:artwork"
        ),
        {"id": id, "artwork": artwork_id},
    ).scalar()
    if data is None:
        return failure(request, "artwork_not_found", 404)
    return Response(
        content=bytes(data),
        media_type="image/png",
        headers={
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "default-src 'none'",
            "Content-Disposition": 'inline; filename="artwork-preview.png"',
        },
    )


class ArtworkDecision(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    version: int = Field(strict=True, ge=0)
    artwork_id: UUID
    action: Literal["approve", "revise"]
    details: str = Field(max_length=1500)
    acknowledged: bool = Field(strict=True)

    @model_validator(mode="after")
    def valid_decision(self):
        if (
            not self.acknowledged
            or (self.action == "revise" and not self.details)
            or (self.action == "approve" and self.details)
        ):
            raise ValueError("Decision requires acknowledgement and appropriate feedback")
        return self


@router.put("/{id}/decisions/{decision_id}", response_model=CommissionRecord)
def decide(
    id: UUID,
    decision_id: UUID,
    body: ArtworkDecision,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("account.write_self")),
):
    actor, denied = write_access(request, db, principal, "account.write_self")
    if denied is not None:
        return denied
    if not SqlIdentityRepository(db).principal(actor.id, lock=True).allows("account.read_self"):
        return failure(request, "permission_denied", 403)
    row = owned(db, actor.id, id, True)
    if not row:
        return failure(request, "commission_not_found", 404)
    previous = (
        db.execute(
            text(
                "SELECT d.*,a.commission_id FROM commission_artwork_decisions d JOIN commission_artwork_versions a ON a.id=d.artwork_id WHERE d.id=:id"
            ),
            {"id": decision_id},
        )
        .mappings()
        .first()
    )
    if previous:
        if (
            previous["commission_id"] == id
            and previous["artwork_id"] == body.artwork_id
            and previous["action"] == body.action
            and previous["details"] == body.details
        ):
            return record(db, row)
        return failure(request, "decision_conflict", 409)
    current = db.execute(
        text(
            "SELECT id FROM commission_artwork_versions WHERE commission_id=:id ORDER BY number DESC LIMIT 1"
        ),
        {"id": id},
    ).scalar()
    if row["version"] != body.version or current != body.artwork_id:
        return failure(request, "commission_version_conflict", 409)
    if row["status"] != "awaiting_customer" or row["agreement"] is None:
        return failure(request, "decision_not_eligible", 409)
    used = db.execute(
        text(
            "SELECT count(*) FROM commission_artwork_decisions d JOIN commission_artwork_versions a ON a.id=d.artwork_id WHERE a.commission_id=:id AND d.action='revise'"
        ),
        {"id": id},
    ).scalar_one()
    if body.action == "revise" and (
        row["revision_allowance"] is None or used >= row["revision_allowance"]
    ):
        return failure(request, "revision_allowance_exhausted", 409)
    db.execute(
        text(
            "INSERT INTO commission_artwork_decisions(id,artwork_id,action,details) VALUES(:id,:artwork,:action,:details)"
        ),
        {
            "id": decision_id,
            "artwork": body.artwork_id,
            "action": body.action,
            "details": body.details,
        },
    )
    changed = (
        db.execute(
            text(
                "UPDATE commission_requests SET status=:status,version=version+1,updated_at=now() WHERE id=:id RETURNING *"
            ),
            {"id": id, "status": "approved" if body.action == "approve" else "revision_requested"},
        )
        .mappings()
        .one()
    )
    SqlAccountManagement(db).audit(
        actor.id,
        actor.id,
        "commissions.artwork_decision",
        {"commission_id": str(id), "artwork_id": str(body.artwork_id), "action": body.action},
        "Customer artwork review decision",
    )
    enqueue(
        db,
        "commissions.artwork_decision",
        {"commission_id": str(id), "artwork_id": str(body.artwork_id), "action": body.action},
    )
    db.commit()
    return record(db, changed)


admin_router = APIRouter(prefix="/api/v1/admin/commissions", tags=["commission-management"])


@admin_router.get("", response_model=CommissionPage)
def staff_history(
    request: Request,
    cursor: UUID | None = None,
    limit: int = Query(50, ge=1, le=100),
    q: str = Query("", max_length=200),
    status: Literal[
        "awaiting_review",
        "in_progress",
        "awaiting_customer",
        "revision_requested",
        "approved",
        "cancelled",
    ]
    | None = None,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("commissions.manage")),
):
    anchor = (
        db.execute(
            text("SELECT created_at FROM commission_requests WHERE id=:id"), {"id": cursor}
        ).scalar()
        if cursor
        else None
    )
    if cursor and anchor is None:
        return failure(request, "commission_not_found", 404)
    rows = (
        db.execute(
            text(
                "SELECT * FROM commission_requests WHERE "
                "(CAST(:status AS text) IS NULL OR status=:status) "
                "AND (:q = '' OR strpos(lower(concat_ws(' ', id::text, brief->>'idea', brief->>'style', brief->>'size', brief->>'changes')), lower(CAST(:q AS text))) > 0) "
                "AND (CAST(:cursor AS uuid) IS NULL OR (created_at,id)<(:time,CAST(:cursor AS uuid))) "
                "ORDER BY created_at DESC,id DESC LIMIT :limit"
            ),
            {
                "q": q.strip(),
                "status": status,
                "cursor": cursor,
                "time": anchor,
                "limit": limit + 1,
            },
        )
        .mappings()
        .all()
    )
    return {
        "items": [record(db, row) for row in rows[:limit]],
        "next_cursor": rows[limit - 1]["id"] if len(rows) > limit else None,
    }


@admin_router.get("/{id}", response_model=CommissionRecord)
def staff_detail(
    id: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("commissions.manage")),
):
    row = (
        db.execute(text("SELECT * FROM commission_requests WHERE id=:id"), {"id": id})
        .mappings()
        .first()
    )
    return record(db, row) if row else failure(request, "commission_not_found", 404)


@admin_router.get("/{id}/artwork/{artwork_id}/preview")
def staff_preview(
    id: UUID,
    artwork_id: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("commissions.manage")),
):
    data = db.execute(
        text(
            "SELECT preview FROM commission_artwork_versions WHERE commission_id=:id AND id=:artwork"
        ),
        {"id": id, "artwork": artwork_id},
    ).scalar()
    if data is None:
        return failure(request, "artwork_not_found", 404)
    return Response(
        content=bytes(data),
        media_type="image/png",
        headers={
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "default-src 'none'",
            "Content-Disposition": 'inline; filename="artwork-preview.png"',
        },
    )


class ReviewPublication(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    version: int = Field(strict=True, ge=0)
    preview_png: str = Field(min_length=1, max_length=6990508)
    note: str = Field(max_length=2000)
    agreement: str = Field(min_length=1, max_length=1000)
    revision_allowance: int = Field(strict=True, ge=0, le=100)
    accepted_terms_confirmed: bool = Field(strict=True)


@admin_router.put("/{id}/artwork/{artwork_id}", response_model=CommissionRecord)
def publish(
    id: UUID,
    artwork_id: UUID,
    body: ReviewPublication,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("commissions.manage")),
):
    actor, denied = write_access(request, db, principal, "commissions.manage")
    if denied is not None:
        return denied
    row = (
        db.execute(text("SELECT * FROM commission_requests WHERE id=:id FOR UPDATE"), {"id": id})
        .mappings()
        .first()
    )
    if not row:
        return failure(request, "commission_not_found", 404)
    if not body.accepted_terms_confirmed:
        return failure(request, "accepted_terms_required", 422)
    try:
        data = base64.b64decode(body.preview_png, validate=True)
        publish_review(
            db,
            id,
            actor=actor.id,
            expected_version=body.version,
            preview=data,
            note=body.note,
            agreement=body.agreement,
            revision_allowance=body.revision_allowance,
            artwork_id=artwork_id,
        )
    except (ValueError, binascii.Error):
        db.rollback()
        return failure(request, "review_publication_invalid", 409)
    saved = (
        db.execute(text("SELECT * FROM commission_requests WHERE id=:id"), {"id": id})
        .mappings()
        .one()
    )
    db.commit()
    return record(db, saved)


class CommissionSummary(BaseModel):
    total_commissions: int
    statuses: dict[str, int]


@admin_router.get("/overview/summary", response_model=CommissionSummary)
def commission_summary(
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("commissions.manage")),
):
    rows = (
        db.execute(text("SELECT status,count(*) AS count FROM commission_requests GROUP BY status"))
        .mappings()
        .all()
    )
    statuses = {row["status"]: row["count"] for row in rows}
    return {"total_commissions": sum(statuses.values()), "statuses": statuses}


def reference_content(db, request, commission_id, reference_id, owner=None):
    row = (
        db.execute(
            text(
                "SELECT r.content,r.media_type FROM commission_references r JOIN commission_requests c ON c.id=r.commission_id WHERE r.commission_id=:commission AND r.id=:reference AND (CAST(:owner AS uuid) IS NULL OR c.account_id=CAST(:owner AS uuid))"
            ),
            dict(commission=commission_id, reference=reference_id, owner=owner),
        )
        .mappings()
        .first()
    )
    if not row:
        return failure(request, "reference_not_found", 404)
    return Response(
        content=bytes(row["content"]),
        media_type=row["media_type"],
        headers={
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": "inline",
        },
    )


@router.get("/{id}/references/{reference_id}")
def owned_reference(
    id: UUID,
    reference_id: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("account.read_self")),
):
    return reference_content(db, request, id, reference_id, principal.account_id)


@admin_router.get("/{id}/references/{reference_id}")
def staff_reference(
    id: UUID,
    reference_id: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("commissions.manage")),
):
    return reference_content(db, request, id, reference_id)
