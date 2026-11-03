"""Customer-owned panel records. No fixture orders or financial state."""

import json
import unicodedata
from typing import Any, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.domain.rules import normalize_phone
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.contexts.identity.presentation.router import failure
from nilart.shared.database import session_dependency
from nilart.shared.outbox import enqueue

router = APIRouter(prefix="/api/v1/account/panel", tags=["customer-panel"])
Kind = Literal["address", "preferences", "favorite", "ticket", "message", "notification"]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Address(Strict):
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(max_length=30)
    province: str = Field(min_length=1, max_length=100)
    city: str = Field(min_length=1, max_length=100)
    street: str = Field(min_length=5, max_length=1000)
    postal: str = Field(pattern=r"^\d{10}$")
    label: str = Field(max_length=80)
    default: bool = Field(strict=True)

    @model_validator(mode="after")
    def phone_valid(self):
        self.phone = normalize_phone("+98" + self.phone if len(self.phone) == 10 and self.phone.startswith("9") else self.phone)[3:]
        return self


class Preferences(Strict):
    language: Literal["fa", "en"]
    choices: dict[str, dict[str, bool]]

    @model_validator(mode="after")
    def channels_valid(self):
        if set(self.choices) != {
            "order",
            "delivery",
            "proposal",
            "artwork",
            "files",
            "support",
        } or any(
            set(choice) != {"inApp", "sms"} or choice["sms"] for choice in self.choices.values()
        ):
            raise ValueError("Unsupported channels")
        return self


class Favorite(Strict):
    kind: Literal["product", "bundle", "artwork"]
    target_id: UUID


class Ticket(Strict):
    topic: Literal["general", "account", "product", "commission", "technical", "other"]
    subject: str = Field(min_length=1, max_length=160)
    body: str = Field(min_length=1, max_length=10000)
    request_id: UUID
    order_id: UUID | None = None
    line_id: UUID | None = None

    @model_validator(mode="after")
    def order_required_for_item(self):
        if self.line_id and not self.order_id:
            raise ValueError("Order required for an item")
        return self


class Message(Strict):
    ticket_id: UUID
    body: str = Field(min_length=1, max_length=10000)
    request_id: UUID


class Write(Strict):
    version: int = Field(ge=0, strict=True)
    data: dict


class Record(BaseModel):
    id: UUID
    kind: Kind
    data: dict
    version: int
    created_at: str
    updated_at: str
    catalog: dict | None = None


class Page(BaseModel):
    items: list[Record]
    next_cursor: UUID | None


MODELS: dict[str, type[BaseModel]] = {
    "address": Address,
    "preferences": Preferences,
    "favorite": Favorite,
    "ticket": Ticket,
    "message": Message,
}


def rows(db, owner, kind, cursor=None, limit=50, ticket_id=None, q="", status=None, read_filter=None, category=None, favorite_type=None):
    if kind == "favorite" and q:
        clauses = [f"(r.data->>'kind'='{entity}' AND EXISTS (SELECT 1 FROM {table} c "
                   "WHERE c.id::text=r.data->>'target_id' AND c.published=true "
                   "AND strpos(translate(lower(concat_ws(' ',c.title_fa,c.title_en)),'يك','یک'),:q)>0))"
                   for entity, table in (("product", "catalog_products"), ("bundle", "catalog_bundles"), ("artwork", "catalog_artworks"))]
        return db.execute(text("SELECT r.* FROM customer_records r WHERE r.account_id=:owner AND r.kind='favorite' "
                               "AND (CAST(:type AS text) IS NULL OR r.data->>'kind'=:type) "
                               "AND (CAST(:cursor AS uuid) IS NULL OR r.id>CAST(:cursor AS uuid)) AND (" + " OR ".join(clauses) + ") ORDER BY r.id LIMIT :limit"),
                          {"owner": owner, "type": favorite_type, "cursor": cursor, "limit": limit,
                           "q": unicodedata.normalize("NFKC", q).lower().replace("ي", "ی").replace("ك", "ک")}).mappings().all()
    return (
        db.execute(
            text(
                "SELECT * FROM customer_records WHERE account_id=:owner AND kind=:kind AND (CAST(:type AS text) IS NULL OR data->>'kind'=:type) AND (:q='' OR strpos(lower(concat_ws(' ',data->>'subject',data->>'body',data->>'title_fa',data->>'title_en')),lower(CAST(:q AS text)))>0) AND (CAST(:read AS text) IS NULL OR (CASE WHEN data->>'read'='true' THEN 'read' ELSE 'unread' END)=:read) AND (CAST(:category AS text) IS NULL OR data->>'category'=:category) AND (CAST(:status AS text) IS NULL OR data->>'status'=:status) AND (CAST(:ticket AS text) IS NULL OR data->>'ticket_id'=CAST(:ticket AS text)) AND (CAST(:cursor AS uuid) IS NULL OR id>CAST(:cursor AS uuid)) ORDER BY id LIMIT :limit"
            ),
            {"owner": owner, "kind": kind, "cursor": cursor, "limit": limit, "ticket": str(ticket_id) if ticket_id else None, "q": q, "status": status, "read": read_filter, "category": category, "type": favorite_type},
        )
        .mappings()
        .all()
    )


def output(row):
    return {
        key: (row[key].isoformat() if key.endswith("_at") else row[key])
        for key in ["id", "kind", "data", "version", "created_at", "updated_at"]
    }


def audit(db, actor, kind, id, action):
    # Safe change summary deliberately excludes private addresses and message text.
    SqlAccountManagement(db).audit(
        actor,
        actor,
        "customer." + action,
        {"kind": kind, "record_id": str(id)},
        "Customer panel action",
    )
    enqueue(
        db,
        "customer.record_changed",
        {"account_id": str(actor), "record_id": str(id), "kind": kind, "action": action},
    )


def owned(db, owner, kind, id, lock=False):
    return (
        db.execute(
            text(
                "SELECT * FROM customer_records WHERE account_id=:owner AND kind=:kind AND id=:id"
                + (" FOR UPDATE" if lock else "")
            ),
            {"owner": owner, "kind": kind, "id": id},
        )
        .mappings()
        .first()
    )


def insert(db, owner, kind, data):
    id = uuid4()
    db.execute(
        text(
            "INSERT INTO customer_records(id,account_id,kind,data) VALUES(:id,:owner,:kind,CAST(:data AS jsonb))"
        ),
        {"id": id, "owner": owner, "kind": kind, "data": json.dumps(data)},
    )
    return id


@router.get("/summary")
def summary(
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("account.read_self")),
):
    values = (
        db.execute(
            text(
                "SELECT kind,count(*) AS total FROM customer_records WHERE account_id=:owner GROUP BY kind"
            ),
            {"owner": principal.account_id},
        )
        .mappings()
        .all()
    )
    counts = {row["kind"]: row["total"] for row in values}
    unread = db.execute(
        text(
            "SELECT count(*) FROM customer_records WHERE account_id=:owner AND kind='notification' AND data->>'read'='false'"
        ),
        {"owner": principal.account_id},
    ).scalar_one()
    return {
        "favorites": counts.get("favorite", 0),
        "addresses": counts.get("address", 0),
        "tickets": counts.get("ticket", 0),
        "unread_notifications": unread,
    }


@router.get("/{kind}", response_model=Page)
def list_records(
    kind: Kind,
    request: Request,
    cursor: UUID | None = None,
    ticket_id: UUID | None = None,
    q: str = Query("", max_length=200),
    status: Literal["submitted", "awaiting_reply", "awaiting_customer", "closed"] | None = None,
    read_filter: Literal["read", "unread"] | None = None,
    category: Literal["account", "order", "delivery", "proposal", "artwork", "files", "support"] | None = None,
    favorite_type: Literal["product", "bundle", "artwork"] | None = None,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("account.read_self")),
):
    if (q.strip() and kind not in {"ticket", "notification", "favorite"}) or (status and kind != "ticket") or ((read_filter or category) and kind != "notification") or (favorite_type and kind != "favorite"):
        return failure(request, "invalid_ticket_filter", 422)
    if kind == "favorite" and cursor and not owned(db, principal.account_id, kind, cursor):
        return failure(request, "record_not_found", 404)
    if ticket_id:
        if kind != "message":
            return failure(request, "invalid_ticket_filter", 422)
        if not owned(db, principal.account_id, "ticket", ticket_id):
            return failure(request, "record_not_found", 404)
        if cursor:
            anchor = owned(db, principal.account_id, "message", cursor)
            if not anchor or anchor["data"].get("ticket_id") != str(ticket_id):
                return failure(request, "record_not_found", 404)
    result = rows(db, principal.account_id, kind, cursor, limit + 1, ticket_id, q.strip(), status, read_filter, category, favorite_type)
    items = [output(row) for row in result[:limit]]
    if kind == "favorite":
        for item in items:
            table = {
                "product": "catalog_products",
                "bundle": "catalog_bundles",
                "artwork": "catalog_artworks",
            }[item["data"]["kind"]]
            public = (
                db.execute(
                    text(
                        f"SELECT slug,title_fa,title_en FROM {table} WHERE id=:id AND published=true"
                    ),
                    {"id": item["data"]["target_id"]},
                )
                .mappings()
                .first()
            )
            item["catalog"] = dict(public) if public else None
    return {"items": items, "next_cursor": result[limit - 1]["id"] if len(result) > limit else None}


@router.get("/{kind}/{id}", response_model=Record)
def detail(
    kind: Kind,
    id: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("account.read_self")),
):
    row = owned(db, principal.account_id, kind, id)
    return output(row) if row else failure(request, "record_not_found", 404)


@router.put("/{kind}/{id}", response_model=Record)
def write(
    kind: Kind,
    id: UUID,
    body: Write,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("account.write_self")),
):
    actor, denied = write_access(request, db, principal, "account.write_self")
    if denied is not None:
        return denied
    # Session/account lock serializes this owner's defaults and idempotent submissions.
    row = owned(db, actor.id, kind, id, True)
    if row and body.version != row["version"]:
        return failure(request, "record_version_conflict", 409)
    if not row and body.version != 0:
        return failure(request, "record_not_found", 404)
    if kind == "notification":
        if not row:
            return failure(request, "record_not_found", 404)
        if body.data != {"read": True}:
            return failure(request, "validation_error", 422)
        data = {**row["data"], "read": True}
    else:
        if kind not in MODELS:
            return failure(request, "immutable_record", 409)
        try:
            data = MODELS[kind].model_validate(body.data).model_dump(mode="json", exclude_none=True)
        except ValueError:
            return failure(request, "validation_error", 422)
        if row and kind in {"ticket", "message", "favorite"}:
            previous = {
                key: value for key, value in row["data"].items() if key not in {"status", "author"}
            }
            if previous != data:
                return failure(request, "immutable_record", 409)
            return output(row)
        if kind == "preferences":
            existing = rows(db, actor.id, kind)
            if existing and existing[0]["id"] != id:
                return failure(request, "record_version_conflict", 409)
        if kind == "address" and data["default"]:
            db.execute(
                text(
                    "UPDATE customer_records SET data=jsonb_set(data,'{default}','false'),version=version+1,updated_at=now() WHERE account_id=:owner AND kind='address' AND id<>:id AND data->>'default'='true'"
                ),
                {"owner": actor.id, "id": id},
            )
        if kind == "ticket" and data.get("order_id"):
            if not SqlIdentityRepository(db).principal(actor.id, lock=True).allows("orders.read_self"):
                return failure(request, "permission_denied", 403)
            order = db.execute(text("SELECT snapshot FROM customer_orders WHERE id=:id AND account_id=:owner"),
                               {"id": data["order_id"], "owner": actor.id}).scalar()
            if not order:
                return failure(request, "order_not_found", 404)
            if data.get("line_id") and not any(line["id"] == data["line_id"] for line in order["items"]):
                return failure(request, "order_item_not_found", 404)
        if kind == "favorite":
            table = {
                "product": "catalog_products",
                "bundle": "catalog_bundles",
                "artwork": "catalog_artworks",
            }[data["kind"]]
            exists = db.execute(
                text(f"SELECT 1 FROM {table} WHERE id=:id AND published=true"),
                {"id": data["target_id"]},
            ).first()
            if not exists:
                return failure(request, "catalog_item_not_found", 404)
            existing = (
                db.execute(
                    text(
                        "SELECT * FROM customer_records WHERE account_id=:owner AND kind='favorite' AND data->>'kind'=:kind AND data->>'target_id'=:target"
                    ),
                    {"owner": actor.id, "kind": data["kind"], "target": data["target_id"]},
                )
                .mappings()
                .first()
            )
            if existing:
                return output(existing)
        if kind in {"ticket", "message"}:
            existing = (
                db.execute(
                    text(
                        "SELECT * FROM customer_records WHERE account_id=:owner AND kind IN ('ticket','message') AND data->>'request_id'=:key"
                    ),
                    {"owner": actor.id, "key": data["request_id"]},
                )
                .mappings()
                .first()
            )
            if existing:
                comparison = {
                    key: value
                    for key, value in existing["data"].items()
                    if key not in {"status", "author"}
                }
                return (
                    output(existing)
                    if comparison == data and existing["kind"] == kind
                    else failure(request, "idempotency_conflict", 409)
                )
            if kind == "message":
                parent = owned(db, actor.id, "ticket", data["ticket_id"], True)
                if not parent:
                    return failure(request, "record_not_found", 404)
                if parent["data"]["status"] == "closed":
                    return failure(request, "ticket_closed", 409)
                data["author"] = "customer"
                db.execute(
                    text(
                        "UPDATE customer_records SET data=jsonb_set(data,'{status}','\"awaiting_reply\"'),version=version+1,updated_at=now() WHERE id=:id"
                    ),
                    {"id": data["ticket_id"]},
                )
            else:
                data["status"] = "submitted"
                insert(
                    db,
                    actor.id,
                    "notification",
                    {
                        "read": False,
                        "category": "support",
                        "title_fa": "تیکت پشتیبانی ثبت شد",
                        "title_en": "Support ticket submitted",
                        "ticket_id": str(id),
                    },
                )
    if row:
        db.execute(
            text(
                "UPDATE customer_records SET data=CAST(:data AS jsonb),version=version+1,updated_at=now() WHERE id=:id AND account_id=:owner"
            ),
            {"id": id, "owner": actor.id, "data": json.dumps(data)},
        )
    else:
        # IDs are globally unique. A foreign collision is a safe not-found response.
        exists = db.execute(text("SELECT 1 FROM customer_records WHERE id=:id"), {"id": id}).first()
        if exists:
            db.rollback()
            return failure(request, "record_not_found", 404)
        db.execute(
            text(
                "INSERT INTO customer_records(id,account_id,kind,data) VALUES(:id,:owner,:kind,CAST(:data AS jsonb))"
            ),
            {"id": id, "owner": actor.id, "kind": kind, "data": json.dumps(data)},
        )
    audit(db, actor.id, kind, id, "saved")
    result = output(owned(db, actor.id, kind, id))
    db.commit()
    return result


@router.delete("/{kind}/{id}", status_code=204)
def remove(
    kind: Kind,
    id: UUID,
    request: Request,
    version: int = Query(ge=0),
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("account.write_self")),
):
    actor, denied = write_access(request, db, principal, "account.write_self")
    if denied is not None:
        return denied
    if kind not in {"address", "favorite"}:
        return failure(request, "immutable_record", 409)
    row = owned(db, actor.id, kind, id, True)
    if row:
        if row["version"] != version:
            return failure(request, "record_version_conflict", 409)
        db.execute(
            text("DELETE FROM customer_records WHERE id=:id AND account_id=:owner"),
            {"id": id, "owner": actor.id},
        )
        audit(db, actor.id, kind, id, "deleted")
        db.commit()


class TicketState(Strict):
    version: int = Field(ge=0, strict=True)
    status: Literal["closed", "submitted"]


@router.put("/tickets/{id}/state", response_model=Record)
def ticket_state(
    id: UUID,
    body: TicketState,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("account.write_self")),
):
    actor, denied = write_access(request, db, principal, "account.write_self")
    if denied is not None:
        return denied
    row = owned(db, actor.id, "ticket", id, True)
    if not row:
        return failure(request, "record_not_found", 404)
    if row["version"] != body.version:
        return failure(request, "record_version_conflict", 409)
    data = {**row["data"], "status": body.status}
    db.execute(
        text(
            "UPDATE customer_records SET data=CAST(:data AS jsonb),version=version+1,updated_at=now() WHERE id=:id"
        ),
        {"id": id, "data": json.dumps(data)},
    )
    audit(db, actor.id, "ticket", id, "saved")
    result = output(owned(db, actor.id, "ticket", id))
    db.commit()
    return result


admin_router = APIRouter(prefix="/api/v1/admin/customer", tags=["customer-support"])


@admin_router.get("/tickets", response_model=Page)
def support_inbox(
    cursor: UUID | None = None,
    status: Literal["submitted", "awaiting_reply", "awaiting_customer", "closed"] | None = None,
    limit: int = Query(50, ge=1, le=100),
    q: str | None = Query(None, min_length=1, max_length=100),
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("support.manage")),
):
    term = q.strip() if q else ""
    pattern = "%" + term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%" if term else None
    result = (
        db.execute(
            text(
                "SELECT * FROM customer_records WHERE kind='ticket' AND (CAST(:status AS text) IS NULL OR data->>'status'=:status) AND (CAST(:query AS text) IS NULL OR data->>'subject' ILIKE :query) AND (CAST(:cursor AS uuid) IS NULL OR id>CAST(:cursor AS uuid)) ORDER BY id LIMIT :limit"
            ),
            {"cursor": cursor, "status": status, "query": pattern, "limit": limit + 1},
        )
        .mappings()
        .all()
    )
    return {
        "items": [output(row) for row in result[:limit]],
        "next_cursor": result[limit - 1]["id"] if len(result) > limit else None,
    }


class StaffReply(Strict):
    version: int = Field(ge=0, strict=True)
    body: str = Field(min_length=1, max_length=10000)
    request_id: UUID


@admin_router.get("/tickets/{id}", response_model=Record)
def staff_ticket(id: UUID, request: Request, db: Session = Depends(session_dependency),
                 principal: Principal = Depends(require_permission("support.manage"))):
    row = db.execute(text("SELECT * FROM customer_records WHERE kind='ticket' AND id=:id"),
                     {"id": id}).mappings().first()
    return output(row) if row else failure(request, "record_not_found", 404)


@admin_router.get("/tickets/{id}/messages", response_model=Page)
def staff_messages(id: UUID, request: Request, cursor: UUID | None = None, request_id: UUID | None = None,
                   limit: int = Query(50, ge=1, le=100), db: Session = Depends(session_dependency),
                   principal: Principal = Depends(require_permission("support.manage"))):
    owner = db.scalar(text("SELECT account_id FROM customer_records WHERE kind='ticket' AND id=:id"), {"id": id})
    if owner is None:
        return failure(request, "record_not_found", 404)
    params = {"owner": owner, "ticket": str(id), "cursor": cursor, "limit": limit + 1, "request_key": str(request_id) if request_id else None}
    stamp = None
    if cursor is not None:
        stamp = db.scalar(text("SELECT created_at FROM customer_records WHERE id=:cursor AND account_id=:owner "
                               "AND kind='message' AND data->>'ticket_id'=:ticket"), params)
        if stamp is None:
            return failure(request, "record_not_found", 404)
    params["stamp"] = stamp
    rows = db.execute(text("SELECT * FROM customer_records WHERE account_id=:owner AND kind='message' "
        "AND data->>'ticket_id'=:ticket AND (CAST(:request_key AS text) IS NULL OR data->>'request_id'=:request_key) "
        "AND (CAST(:stamp AS timestamptz) IS NULL OR "
        "(created_at,id)>(CAST(:stamp AS timestamptz),CAST(:cursor AS uuid))) ORDER BY created_at,id LIMIT :limit"),
        params).mappings().all()
    return {"items": [output(row) for row in rows[:limit]],
            "next_cursor": rows[limit - 1]["id"] if len(rows) > limit else None}


@admin_router.post("/tickets/{id}/reply", response_model=Record)
def staff_reply(
    id: UUID,
    body: StaffReply,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("support.manage")),
):
    actor, denied = write_access(request, db, principal, "support.manage")
    if denied is not None:
        return denied
    row = (
        db.execute(
            text("SELECT * FROM customer_records WHERE kind='ticket' AND id=:id FOR UPDATE"),
            {"id": id},
        )
        .mappings()
        .first()
    )
    if not row:
        return failure(request, "record_not_found", 404)
    payload = {
        "ticket_id": str(id),
        "body": body.body,
        "request_id": str(body.request_id),
        "author": "support",
    }
    prior = (
        db.execute(
            text(
                "SELECT * FROM customer_records WHERE account_id=:owner AND kind='message' AND data->>'request_id'=:key"
            ),
            {"owner": row["account_id"], "key": str(body.request_id)},
        )
        .mappings()
        .first()
    )
    if prior:
        return (
            output(prior)
            if prior["data"] == payload
            else failure(request, "idempotency_conflict", 409)
        )
    if row["version"] != body.version:
        return failure(request, "record_version_conflict", 409)
    if row["data"]["status"] == "closed":
        return failure(request, "ticket_closed", 409)
    message_id = insert(db, row["account_id"], "message", payload)
    prefs = rows(db, row["account_id"], "preferences")
    if not prefs or prefs[0]["data"]["choices"]["support"]["inApp"]:
        insert(
            db,
            row["account_id"],
            "notification",
            {
                "read": False,
                "category": "support",
                "title_fa": "پاسخ تازه پشتیبانی",
                "title_en": "New support reply",
                "ticket_id": str(id),
            },
        )
    db.execute(
        text(
            "UPDATE customer_records SET data=jsonb_set(data,'{status}','\"awaiting_customer\"'),version=version+1,updated_at=now() WHERE id=:id"
        ),
        {"id": id},
    )
    SqlAccountManagement(db).audit(
        actor.id,
        str(row["account_id"]),
        "customer.support_reply",
        {"record_id": str(id), "message_id": str(message_id)},
        "Staff support reply",
    )
    enqueue(
        db,
        "customer.record_changed",
        {
            "account_id": str(row["account_id"]),
            "record_id": str(message_id),
            "kind": "message",
            "action": "saved",
        },
    )
    result = output(owned(db, row["account_id"], "message", message_id))
    db.commit()
    return result


class StaffTicketState(TicketState):
    reason: str = Field(min_length=1, max_length=1000)


@admin_router.put("/tickets/{id}/state", response_model=Record)
def staff_ticket_state(
    id: UUID,
    body: StaffTicketState,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("support.manage")),
):
    actor, denied = write_access(request, db, principal, "support.manage")
    if denied is not None:
        return denied
    row = db.execute(
        text("SELECT * FROM customer_records WHERE kind='ticket' AND id=:id FOR UPDATE"),
        {"id": id},
    ).mappings().first()
    if not row:
        return failure(request, "record_not_found", 404)
    if row["version"] != body.version:
        return failure(request, "record_version_conflict", 409)
    before = row["data"]["status"]
    if (before == "closed") == (body.status == "closed"):
        return failure(request, "invalid_ticket_transition", 409)
    db.execute(
        text("UPDATE customer_records SET data=jsonb_set(data,'{status}',CAST(:status AS jsonb)),"
             "version=version+1,updated_at=now() WHERE id=:id"),
        {"id": id, "status": json.dumps(body.status)},
    )
    SqlAccountManagement(db).audit(
        actor.id, str(row["account_id"]), "customer.support_state",
        {"record_id": str(id), "before": before, "after": body.status,
         "previous_version": row["version"], "version": row["version"] + 1},
        body.reason,
    )
    enqueue(db, "customer.record_changed", {
        "account_id": str(row["account_id"]), "record_id": str(id),
        "kind": "ticket", "action": "saved",
    })
    result = output(owned(db, row["account_id"], "ticket", id))
    db.commit()
    return result


class SupportAudit(BaseModel):
    id: UUID
    actor_id: UUID | None
    created_at: str
    action: Literal["customer.support_reply", "customer.support_state"]
    reason: str
    changes: dict[str, Any]


class SupportAuditPage(BaseModel):
    items: list[SupportAudit]
    next_cursor: UUID | None


@admin_router.get("/tickets/{id}/audits", response_model=SupportAuditPage)
def staff_ticket_audits(
    id: UUID, request: Request, cursor: UUID | None = None,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("support.manage")),
):
    owner = db.scalar(text("SELECT account_id FROM customer_records WHERE kind='ticket' AND id=:id"), {"id": id})
    if owner is None:
        return failure(request, "record_not_found", 404)
    params = {"owner": owner, "record": str(id), "cursor": cursor, "limit": limit + 1}
    scope = "account_id=:owner AND changes->>'record_id'=:record AND action IN ('customer.support_reply','customer.support_state')"
    stamp = None
    if cursor is not None:
        stamp = db.scalar(text(f"SELECT created_at FROM identity_audits WHERE {scope} AND id=:cursor"), params)
        if stamp is None:
            return failure(request, "record_not_found", 404)
    params["stamp"] = stamp
    rows = db.execute(text(f"SELECT id,actor_id,created_at,action,reason,changes FROM identity_audits WHERE {scope} "
        "AND (CAST(:stamp AS timestamptz) IS NULL OR (created_at,id)<(CAST(:stamp AS timestamptz),CAST(:cursor AS uuid))) "
        "ORDER BY created_at DESC,id DESC LIMIT :limit"), params).mappings().all()
    return {"items": [{**row, "created_at": row["created_at"].isoformat()} for row in rows[:limit]],
            "next_cursor": rows[limit - 1]["id"] if len(rows) > limit else None}


class TicketSummary(BaseModel):
    total_tickets: int
    statuses: dict[str, int]


@admin_router.get("/ticket-summary", response_model=TicketSummary)
def ticket_summary(db: Session = Depends(session_dependency),
                   principal: Principal = Depends(require_permission("support.manage"))):
    rows = db.execute(text("SELECT data->>'status' AS status,count(*) AS count FROM customer_records WHERE kind='ticket' GROUP BY data->>'status'")).mappings().all()
    statuses = {row["status"]: row["count"] for row in rows}
    return {"total_tickets": sum(statuses.values()), "statuses": statuses}
