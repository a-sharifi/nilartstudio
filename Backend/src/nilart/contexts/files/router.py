import base64
import hashlib
import unicodedata
from datetime import datetime
from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.contexts.customer.notifications import notify
from nilart.contexts.files.access import ELIGIBLE, JOIN
from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.contexts.identity.presentation.router import failure
from nilart.contexts.orders.domain import OrderSnapshot, OrderState
from nilart.shared.database import session_dependency
from nilart.shared.outbox import enqueue

router = APIRouter(prefix="/api/v1/account/downloads", tags=["private-downloads"])
admin_router = APIRouter(prefix="/api/v1/admin/downloads", tags=["file-fulfillment"])
COLUMNS = "d.id,d.order_id,d.line_id,d.file_name,d.description,d.size,d.sha256,d.version,d.created_at,d.updated_at,o.snapshot->>'reference' AS order_reference"


class FileRecord(BaseModel):
    id: UUID
    order_id: UUID
    line_id: UUID
    file_name: str
    description: str
    size: int
    sha256: str
    version: int
    created_at: datetime
    updated_at: datetime
    order_reference: str


class Page(BaseModel):
    items: list[FileRecord]
    next_cursor: UUID | None


@router.get("", response_model=Page)
def library(
    request: Request,
    q: str = Query("", max_length=200),
    cursor: UUID | None = None,
    order_id: UUID | None = None,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("orders.read_self")),
):
    if (
        order_id
        and not db.execute(
            text("SELECT 1 FROM customer_orders WHERE id=:id AND account_id=:owner"),
            {"id": order_id, "owner": principal.account_id},
        ).first()
    ):
        return failure(request, "order_not_found", 404)
    anchor = (
        db.execute(
            text(
                "SELECT d.created_at"
                + JOIN
                + "WHERE o.account_id=:owner AND d.id=:cursor AND (CAST(:order AS uuid) IS NULL OR o.id=CAST(:order AS uuid))"
            ),
            {"owner": principal.account_id, "cursor": cursor, "order": order_id},
        ).scalar()
        if cursor
        else None
    )
    if cursor and not anchor:
        return failure(request, "file_not_found", 404)
    rows = (
        db.execute(
            text(
                "SELECT "
                + COLUMNS
                + JOIN
                + "WHERE o.account_id=:owner AND "
                + ELIGIBLE
                + " AND (:q = '' OR strpos(lower(concat_ws(' ',d.file_name,d.description,o.snapshot->>'reference')),lower(CAST(:q AS text))) > 0)"
                " AND (CAST(:order AS uuid) IS NULL OR o.id=CAST(:order AS uuid)) AND (CAST(:cursor AS uuid) IS NULL OR (d.created_at,d.id)<(:time,CAST(:cursor AS uuid))) ORDER BY d.created_at DESC,d.id DESC LIMIT :limit"
            ),
            {
                "owner": principal.account_id,
                "cursor": cursor,
                "order": order_id,
                "time": anchor,
                "q": q.strip(),
                "limit": limit + 1,
            },
        )
        .mappings()
        .all()
    )
    return {
        "items": [dict(row) for row in rows[:limit]],
        "next_cursor": rows[limit - 1]["id"] if len(rows) > limit else None,
    }


@router.get("/{id}/content")
def download(
    id: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("orders.read_self")),
):
    row = (
        db.execute(
            text(
                "SELECT d.file_name,d.content,d.size,d.sha256"
                + JOIN
                + "WHERE d.id=:id AND o.account_id=:owner AND "
                + ELIGIBLE
            ),
            {"id": id, "owner": principal.account_id},
        )
        .mappings()
        .first()
    )
    if not row:
        return failure(request, "file_not_found", 404)
    content = bytes(row["content"])
    if len(content) != row["size"] or hashlib.sha256(content).hexdigest() != row["sha256"]:
        return failure(request, "file_integrity_error", 503)
    return Response(
        content=content,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": "attachment; filename=\"download.bin\"; filename*=UTF-8''"
            + quote(row["file_name"], safe=""),
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "sandbox; default-src 'none'",
        },
    )


class StaffFile(FileRecord):
    active: bool


class StaffFilePage(BaseModel):
    items: list[StaffFile]
    next_cursor: UUID | None


@admin_router.get("", response_model=StaffFilePage)
def staff_library(
    order_id: UUID,
    request: Request,
    cursor: UUID | None = None,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("orders.read_all")),
):
    if not db.execute(text("SELECT 1 FROM customer_orders WHERE id=:id"), {"id": order_id}).first():
        return failure(request, "order_not_found", 404)
    anchor = (
        db.execute(
            text("SELECT created_at FROM customer_downloads WHERE id=:id AND order_id=:order"),
            {"id": cursor, "order": order_id},
        ).scalar()
        if cursor
        else None
    )
    if cursor and not anchor:
        return failure(request, "file_not_found", 404)
    rows = (
        db.execute(
            text(
                "SELECT "
                + COLUMNS
                + ",d.active"
                + JOIN
                + "WHERE d.order_id=:order AND (CAST(:cursor AS uuid) IS NULL OR (d.created_at,d.id)<(:time,CAST(:cursor AS uuid))) ORDER BY d.created_at DESC,d.id DESC LIMIT :limit"
            ),
            {"order": order_id, "cursor": cursor, "time": anchor, "limit": limit + 1},
        )
        .mappings()
        .all()
    )
    return {
        "items": [dict(row) for row in rows[:limit]],
        "next_cursor": rows[limit - 1]["id"] if len(rows) > limit else None,
    }


@admin_router.get("/{id}", response_model=StaffFile)
def staff_file(
    id: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("orders.read_all")),
):
    row = (
        db.execute(text("SELECT " + COLUMNS + ",d.active" + JOIN + "WHERE d.id=:id"), {"id": id})
        .mappings()
        .first()
    )
    return dict(row) if row else failure(request, "file_not_found", 404)


class Release(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    order_id: UUID
    line_id: UUID
    file_name: str = Field(min_length=1, max_length=200)
    description: str = Field(max_length=2000)
    content_base64: str = Field(min_length=1, max_length=22369624)

    @model_validator(mode="after")
    def safe_name(self):
        if self.file_name in {".", ".."} or any(
            character in "/\\" or unicodedata.category(character).startswith("C")
            for character in self.file_name
        ):
            raise ValueError("File name must be a printable basename")
        return self


def eligible_order(db, order, line_id):
    snapshot, state = (
        OrderSnapshot.model_validate(order["snapshot"]),
        OrderState.model_validate(order["state"]),
    )
    line = next((line for line in snapshot.items if line.id == line_id), None)
    if (
        not line
        or not (
            line.delivery == "digital"
            or any(c.delivery == "digital" for c in line.stock_components or [])
        )
        or state.payment != "paid"
        or state.fulfillment == "cancelled"
    ):
        return None
    if line.commission_id:
        approved = db.execute(
            text(
                "SELECT 1 FROM commission_requests WHERE id=:id AND account_id=:owner AND status='approved' FOR UPDATE"
            ),
            {"id": line.commission_id, "owner": order["account_id"]},
        ).first()
        if not approved:
            return None
    return line


@admin_router.put("/{id}", response_model=FileRecord)
def release(
    id: UUID,
    body: Release,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("fulfillment.manage")),
):
    actor, denied = write_access(request, db, principal, "fulfillment.manage")
    if denied is not None:
        return denied
    if not SqlIdentityRepository(db).principal(actor.id, lock=True).allows("orders.read_all"):
        return failure(request, "permission_denied", 403)
    order = (
        db.execute(
            text("SELECT * FROM customer_orders WHERE id=:id FOR UPDATE"), {"id": body.order_id}
        )
        .mappings()
        .first()
    )
    if not order:
        return failure(request, "order_not_found", 404)
    line = eligible_order(db, order, body.line_id)
    if not line:
        return failure(request, "file_release_not_eligible", 409)
    try:
        content = base64.b64decode(body.content_base64, validate=True)
    except ValueError:
        return failure(request, "invalid_file_content", 422)
    if not 1 <= len(content) <= 16 * 1024 * 1024:
        return failure(request, "invalid_file_size", 422)
    digest = hashlib.sha256(content).hexdigest()
    previous = (
        db.execute(text("SELECT * FROM customer_downloads WHERE id=:id"), {"id": id})
        .mappings()
        .first()
    )
    if previous:
        if (
            previous["order_id"] != body.order_id
            or previous["line_id"] != body.line_id
            or previous["file_name"] != body.file_name
            or previous["description"] != body.description
            or bytes(previous["content"]) != content
        ):
            return failure(request, "file_identity_conflict", 409)
        if not previous["active"]:
            return failure(request, "file_revoked", 409)
    else:
        db.execute(
            text(
                "INSERT INTO customer_downloads(id,order_id,line_id,commission_id,file_name,description,size,sha256,content) VALUES(:id,:order,:line,:commission,:name,:description,:size,:digest,:content)"
            ),
            {
                "id": id,
                "order": body.order_id,
                "line": body.line_id,
                "commission": line.commission_id,
                "name": body.file_name,
                "description": body.description,
                "size": len(content),
                "digest": digest,
                "content": content,
            },
        )
        SqlAccountManagement(db).audit(
            actor.id,
            order["account_id"],
            "files.released",
            {"file_id": str(id), "order_id": str(body.order_id)},
            "Staff released a private digital order file",
        )
        notify(
            db,
            order["account_id"],
            event=f"file_released:{id}",
            category="files",
            title_fa="فایل دیجیتال برای دانلود آماده است",
            title_en="Digital file ready to download",
            reference="file_id",
            id=id,
        )
        enqueue(
            db,
            "files.released",
            {
                "file_id": str(id),
                "order_id": str(body.order_id),
                "account_id": str(order["account_id"]),
            },
        )
    if not previous and order["snapshot"].get("checkout_terms"):
        state = OrderState.model_validate(order["state"])
        state.digital_delivered[line.id] = line.quantity
        if line.delivery == "digital":
            state.delivered[line.id] = line.quantity
        db.execute(
            text("UPDATE customer_orders SET state=CAST(:state AS jsonb) WHERE id=:id"),
            {"id": body.order_id, "state": state.model_dump_json()},
        )
        from nilart.contexts.fulfillment.service import derive_order

        updated = (
            db.execute(text("SELECT * FROM customer_orders WHERE id=:id"), {"id": body.order_id})
            .mappings()
            .one()
        )
        derive_order(db, updated)
    saved = (
        db.execute(text("SELECT " + COLUMNS + JOIN + "WHERE d.id=:id"), {"id": id}).mappings().one()
    )
    db.commit()
    return dict(saved)


class Revoke(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    version: int = Field(strict=True, ge=0)
    reason: str = Field(min_length=5, max_length=1000)


@admin_router.put("/{id}/revoke", response_model=FileRecord)
def revoke(
    id: UUID,
    body: Revoke,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("fulfillment.manage")),
):
    actor, denied = write_access(request, db, principal, "fulfillment.manage")
    if denied is not None:
        return denied
    if not SqlIdentityRepository(db).principal(actor.id, lock=True).allows("orders.read_all"):
        return failure(request, "permission_denied", 403)
    row = (
        db.execute(
            text("SELECT d.*,o.account_id" + JOIN + "WHERE d.id=:id FOR UPDATE OF d"), {"id": id}
        )
        .mappings()
        .first()
    )
    if not row:
        return failure(request, "file_not_found", 404)
    if row["active"] and row["version"] != body.version:
        return failure(request, "file_version_conflict", 409)
    if row["active"]:
        db.execute(
            text(
                "UPDATE customer_downloads SET active=false,version=version+1,updated_at=now() WHERE id=:id"
            ),
            {"id": id},
        )
        SqlAccountManagement(db).audit(
            actor.id, row["account_id"], "files.revoked", {"file_id": str(id)}, body.reason
        )
        notify(
            db,
            row["account_id"],
            event=f"file_revoked:{id}",
            category="files",
            title_fa="دسترسی به یک فایل دیجیتال لغو شد",
            title_en="Digital file access revoked",
            reference="file_id",
            id=id,
        )
        enqueue(db, "files.revoked", {"file_id": str(id), "account_id": str(row["account_id"])})
    saved = (
        db.execute(text("SELECT " + COLUMNS + JOIN + "WHERE d.id=:id"), {"id": id}).mappings().one()
    )
    db.commit()
    return dict(saved)
