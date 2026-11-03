import base64
import hashlib
import unicodedata
from datetime import datetime
from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response
from pydantic import AliasChoices, BaseModel, ConfigDict, Field, computed_field, model_validator
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.contexts.customer.attachment_formats import media_type, validate_attachment
from nilart.contexts.customer.notifications import notify
from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.contexts.identity.presentation.router import failure
from nilart.shared.database import session_dependency
from nilart.shared.outbox import enqueue

router = APIRouter(prefix="/api/v1/account/support", tags=["support-attachments"])
admin_router = APIRouter(prefix="/api/v1/admin/support", tags=["support-attachments"])
COLUMNS = "id,ticket_id,file_name,size,sha256,created_at"


class Attachment(BaseModel):
    id: UUID
    ticket_id: UUID
    file_name: str
    size: int
    sha256: str
    created_at: datetime

    @computed_field
    @property
    def media_type(self) -> str:
        return media_type(self.file_name)


class Upload(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    file_name: str = Field(min_length=1, max_length=200)
    content_base64: str = Field(min_length=1, max_length=6990508, validation_alias=AliasChoices("content_base64", "png_base64"))

    @model_validator(mode="after")
    def basename(self):
        if self.file_name in {".", ".."} or any(c in "/\\" or unicodedata.category(c).startswith("C") for c in self.file_name):
            raise ValueError("Printable filename required")
        media_type(self.file_name)
        return self


def ticket(db, id, owner=None, lock=False):
    return db.execute(text("SELECT * FROM customer_records WHERE kind='ticket' AND id=:id "
                           "AND (CAST(:owner AS uuid) IS NULL OR account_id=CAST(:owner AS uuid))" + (" FOR UPDATE" if lock else "")),
                      {"id": id, "owner": owner}).mappings().first()


def listing(db, id):
    return [dict(row) for row in db.execute(text("SELECT " + COLUMNS + " FROM support_attachments WHERE ticket_id=:id ORDER BY created_at,id"), {"id": id}).mappings()]


@router.get("/{id}/attachments", response_model=list[Attachment])
def list_owned(id: UUID, request: Request, db: Session = Depends(session_dependency),
               principal: Principal = Depends(require_permission("account.read_self"))):
    return listing(db, id) if ticket(db, id, principal.account_id) else failure(request, "ticket_not_found", 404)


@admin_router.get("/{id}/attachments", response_model=list[Attachment])
def list_staff(id: UUID, request: Request, db: Session = Depends(session_dependency),
               principal: Principal = Depends(require_permission("support.manage"))):
    return listing(db, id) if ticket(db, id) else failure(request, "ticket_not_found", 404)


@router.put("/{id}/attachments/{attachment_id}", response_model=Attachment)
def upload(id: UUID, attachment_id: UUID, body: Upload, request: Request,
           db: Session = Depends(session_dependency),
           principal: Principal = Depends(require_permission("account.write_self"))):
    return save_attachment(id, attachment_id, body, request, db, principal, False)


@admin_router.put("/{id}/attachments/{attachment_id}", response_model=Attachment)
def upload_staff(id: UUID, attachment_id: UUID, body: Upload, request: Request,
                 db: Session = Depends(session_dependency),
                 principal: Principal = Depends(require_permission("support.manage"))):
    return save_attachment(id, attachment_id, body, request, db, principal, True)


def save_attachment(id, attachment_id, body, request, db, principal, staff):
    actor, denied = write_access(request, db, principal, "support.manage" if staff else "account.write_self")
    if denied is not None:
        return denied
    if not staff and not SqlIdentityRepository(db).principal(actor.id, lock=True).allows("account.read_self"):
        return failure(request, "permission_denied", 403)
    if staff:
        parent = ticket(db, id)
        if not parent:
            return failure(request, "ticket_not_found", 404)
        # Match customer mutation order before locking the shared conversation.
        db.execute(text("SELECT id FROM identity_accounts WHERE id=:owner FOR UPDATE"), {"owner": parent["account_id"]})
    row = ticket(db, id, None if staff else actor.id, True)
    if not row:
        return failure(request, "ticket_not_found", 404)
    try:
        content = base64.b64decode(body.content_base64, validate=True)
        validate_attachment(body.file_name, content)
    except ValueError:
        return failure(request, "invalid_attachment", 422)
    previous = db.execute(text("SELECT * FROM support_attachments WHERE id=:id"), {"id": attachment_id}).mappings().first()
    if previous:
        if previous["ticket_id"] != id or previous["account_id"] != row["account_id"] or previous["file_name"] != body.file_name or bytes(previous["content"]) != content:
            return failure(request, "attachment_conflict", 409)
        return {key: previous[key] for key in COLUMNS.split(",")}
    if row["data"]["status"] == "closed":
        return failure(request, "ticket_closed", 409)
    if db.execute(text("SELECT count(*) FROM support_attachments WHERE ticket_id=:id"), {"id": id}).scalar_one() >= 5:
        return failure(request, "attachment_limit", 409)
    saved = db.execute(text("INSERT INTO support_attachments(id,ticket_id,account_id,file_name,content,sha256,size) "
                            "VALUES(:id,:ticket,:owner,:name,:content,:hash,:size) ON CONFLICT(id) DO NOTHING RETURNING " + COLUMNS),
                       {"id": attachment_id, "ticket": id, "owner": row["account_id"], "name": body.file_name,
                        "content": content, "hash": hashlib.sha256(content).hexdigest(), "size": len(content)}).mappings().first()
    if not saved:
        return failure(request, "attachment_conflict", 409)
    db.execute(text("UPDATE customer_records SET data=jsonb_set(data,'{status}',CAST(:status AS jsonb)),version=version+1,updated_at=now() WHERE id=:id"), {"id": id, "status": '"awaiting_customer"' if staff else '"awaiting_reply"'})
    if staff:
        notify(db, row["account_id"], event=f"support.attachment_added:{attachment_id}", category="support",
               title_fa="پیوست تازه از پشتیبانی", title_en="New support attachment",
               reference="ticket_id", id=id)
    SqlAccountManagement(db).audit(actor.id, str(row["account_id"]), "support.attachment_added", {"ticket_id": str(id), "attachment_id": str(attachment_id)}, "Staff attached a private support file" if staff else "Customer attached a private support file")
    enqueue(db, "support.attachment_added", {"ticket_id": str(id), "attachment_id": str(attachment_id), "account_id": str(row["account_id"])})
    db.commit()
    return dict(saved)


def content_response(db, ticket_id, attachment_id, request):
    row = db.execute(text("SELECT * FROM support_attachments WHERE ticket_id=:ticket AND id=:id"), {"ticket": ticket_id, "id": attachment_id}).mappings().first()
    if not row:
        return failure(request, "attachment_not_found", 404)
    content = bytes(row["content"])
    if len(content) != row["size"] or hashlib.sha256(content).hexdigest() != row["sha256"]:
        return failure(request, "attachment_integrity_error", 503)
    return Response(content, media_type=media_type(row["file_name"]), headers={"Content-Disposition": "attachment; filename=\"attachment." + row["file_name"].rsplit(".", 1)[-1].lower() + "\"; filename*=UTF-8''" + quote(row["file_name"], safe=""), "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox; default-src 'none'"})


@router.get("/{id}/attachments/{attachment_id}/content")
def download_owned(id: UUID, attachment_id: UUID, request: Request, db: Session = Depends(session_dependency),
                   principal: Principal = Depends(require_permission("account.read_self"))):
    if not ticket(db, id, principal.account_id):
        return failure(request, "ticket_not_found", 404)
    return content_response(db, id, attachment_id, request)


@admin_router.get("/{id}/attachments/{attachment_id}/content")
def download_staff(id: UUID, attachment_id: UUID, request: Request, db: Session = Depends(session_dependency),
                   principal: Principal = Depends(require_permission("support.manage"))):
    if not ticket(db, id):
        return failure(request, "ticket_not_found", 404)
    return content_response(db, id, attachment_id, request)
