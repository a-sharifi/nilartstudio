import hashlib
import hmac
import json
from datetime import UTC, datetime
from decimal import localcontext
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.bootstrap.settings import settings
from nilart.contexts.basket.catalog import quote
from nilart.contexts.basket.domain import Command, Item, amount, toman
from nilart.contexts.identity.infrastructure.secrets import new_session_token, token_digest
from nilart.contexts.identity.presentation.router import session_account
from nilart.shared.database import session_dependency

router = APIRouter(prefix="/api/v1/basket", tags=["basket"])
COOKIE = "nilart_basket"


class BasketPart(BaseModel):
    sku_id: str
    quantity: int
    name: tuple[str, str]
    unit: str
    slug: str


class BasketQuote(BaseModel):
    slug: str
    name: tuple[str, str]
    selection: dict[str, str]
    options: list[tuple[str, str]] = []
    unit: str
    base: str
    saving: str
    parts: list[BasketPart]
    media: Literal["product", "bundle", "artwork"]
    image: str | None = None
    artist: tuple[str, str] | None = None
    size: str | None = None
    frame: tuple[str | None, str | None] | None = None


class BasketLineOutput(BaseModel):
    id: str
    item: Item
    accepted_unit: str
    quote: BasketQuote
    issue: Literal["price", "unavailable"] | None = None


class BasketTotals(BaseModel):
    base: str
    discount: str
    total: str
    currency: Literal["IRT"]
    count: int


class BasketOutput(BaseModel):
    version: int
    owner: Literal["guest", "account"]
    lines: list[BasketLineOutput]
    totals: BasketTotals
    csrf_token: str | None = None
    guest_available: bool = False
    checkout_enabled: Literal[False] = False


def error(code, status=400):
    raise HTTPException(status_code=status, detail={"code": code}, headers={"Cache-Control": "no-store"})


def identity(request, db, lock=False):
    if not request.cookies.get("nilart_session"):
        return None
    account = session_account(request, db, lock=lock)
    if not account:
        error("unauthenticated", 401)
    return account


def guest(request, db, lock=False):
    token = request.cookies.get(COOKIE, "")
    if not 40 <= len(token) <= 128:
        return None
    return db.execute(text("SELECT * FROM shopping_baskets WHERE token_hash=:token AND account_id IS NULL AND updated_at>now()-interval '30 days'" + (" FOR UPDATE" if lock else "")), {"token": token_digest(token)}).mappings().first()


def owned(request, db, account, lock=False):
    if account:
        return db.execute(text("SELECT * FROM shopping_baskets WHERE account_id=:owner" + (" FOR UPDATE" if lock else "")), {"owner": account.id}).mappings().first()
    return guest(request, db, lock)


def output(request, db, row, account, csrf=None):
    with localcontext() as context:
        context.prec = 64
        return _output(request, db, row, account, csrf)


def _output(request, db, row, account, csrf=None):
    lines, base, saving = [], toman("0", "IRT"), toman("0", "IRT")
    for saved in row["lines"] if row else []:
        item = Item.model_validate(saved["item"])
        try:
            current = quote(db, item)
            issue = "price" if current["unit"] != saved["accepted_unit"] else None
        except ValueError:
            current, issue = saved["quote"], "unavailable"
        lines.append({**saved, "quote": current, "issue": issue})
        if issue is None:
            base += toman(current["base"], "IRT") * item.quantity
            saving += toman(current["saving"], "IRT") * item.quantity
    source = guest(request,db) if account else None
    return {"version": row["version"] if row else 0, "owner": "account" if account else "guest", "lines": lines,
            "totals": {"base": amount(base), "discount": amount(saving), "total": amount(base-saving), "currency": "IRT", "count": sum(part["item"]["quantity"] for part in lines)},
            "csrf_token": csrf, "guest_available": bool(source and source["lines"]), "checkout_enabled": False}


@router.get("", response_model=BasketOutput, response_model_exclude_none=True)
def read(request: Request, response: Response, db: Session = Depends(session_dependency)):
    response.headers["Cache-Control"] = "no-store"
    account = identity(request, db)
    return output(request, db, owned(request, db, account), account)


@router.post("/bootstrap", response_model=BasketOutput, response_model_exclude_none=True)
def bootstrap(request: Request, response: Response, db: Session = Depends(session_dependency)):
    if request.headers.get("origin") != settings.public_origin:
        error("origin_invalid", 403)
    account = identity(request, db, True)
    token, csrf = None, None
    if account:
        db.execute(text("INSERT INTO shopping_baskets(id,account_id) VALUES (:id,:owner) ON CONFLICT (account_id) WHERE account_id IS NOT NULL DO NOTHING"), {"id": uuid4(), "owner": account.id})
    else:
        row = guest(request, db, True)
        csrf = new_session_token()
        if row:
            db.execute(text("UPDATE shopping_baskets SET csrf_hash=:csrf WHERE id=:id"), {"csrf": token_digest(csrf), "id": row["id"]})
        else:
            token = new_session_token()
            db.execute(text("INSERT INTO shopping_baskets(id,token_hash,csrf_hash) VALUES (:id,:token,:csrf)"), {"id": uuid4(), "token": token_digest(token), "csrf": token_digest(csrf)})
    db.commit()
    if token:
        response.set_cookie(COOKIE, token, httponly=True, secure=settings.environment != "development", samesite="lax", max_age=2592000, path="/")
        # The cookie is not on the current request until the next HTTP call.
        row = db.execute(text("SELECT * FROM shopping_baskets WHERE token_hash=:token"), {"token": token_digest(token)}).mappings().first()
    else:
        row = owned(request, db, account)
    response.headers["Cache-Control"] = "no-store"
    return output(request, db, row, account, csrf)


@router.post("/commands", response_model=BasketOutput, response_model_exclude_none=True)
def command(body: Command, request: Request, response: Response, db: Session = Depends(session_dependency)):
    if request.headers.get("origin") != settings.public_origin:
        error("origin_invalid", 403)
    account = identity(request, db, True)
    row = owned(request, db, account, True)
    if row is None:
        error("basket_unavailable", 409)
    expected = account.csrf_hash if account else row["csrf_hash"]
    csrf = request.headers.get("x-csrf-token", "")
    if not csrf or len(csrf)>128 or not hmac.compare_digest(token_digest(csrf), expected or ""):
        error("csrf_invalid", 403)
    payload = hashlib.sha256(json.dumps(body.model_dump(mode="json", exclude={"version", "command_id"}), sort_keys=True).encode()).hexdigest()
    previous = db.execute(text("SELECT payload_hash FROM shopping_basket_commands WHERE basket_id=:id AND command_id=:command"), {"id": row["id"], "command": body.command_id}).scalar()
    if previous:
        if previous != payload:
            error("idempotency_conflict", 409)
        response.headers["Cache-Control"] = "no-store"
        return output(request, db, row, account)
    if row["version"] != body.version:
        error("stale_basket", 409)
    lines = list(row["lines"])

    def add(item, accepted=None):
        current = quote(db, item)
        key = item.key()
        if item.kind == "artwork" and any(line["item"]["kind"] == "artwork" and line["item"]["item_id"] == str(item.item_id) and line["id"] != key for line in lines):
            raise ValueError("artwork_already_added")
        existing = next((line for line in lines if line["id"] == key), None)
        if existing:
            item = Item.model_validate({**item.model_dump(), "quantity": existing["item"]["quantity"]+item.quantity})
            current = quote(db, item)
            lines.remove(existing)
        lines.append({"id": key, "item": item.model_dump(mode="json"), "accepted_unit": existing["accepted_unit"] if existing else accepted or current["unit"], "quote": current})
        if len(lines)>40:
            raise ValueError("basket_limit")

    try:
        if body.action == "add":
            if body.item is None:
                raise ValueError("item_required")
            add(body.item, amount(toman(body.expected_unit,"IRT")) if body.expected_unit is not None else None)
        elif body.action == "clear":
            lines = []
        elif body.action == "merge":
            if account is None:
                error("unauthenticated", 401)
            source = guest(request, db, True)
            if source:
                for line in source["lines"]:
                    add(Item.model_validate(line["item"]), line["accepted_unit"])
                db.execute(text("INSERT INTO shopping_basket_commands(basket_id,command_id,payload_hash,version) SELECT :target,command_id,payload_hash,:version FROM shopping_basket_commands WHERE basket_id=:source ON CONFLICT DO NOTHING"), {"target":row["id"], "source":source["id"], "version":row["version"]+1})
                db.execute(text("UPDATE shopping_baskets SET lines='[]',version=version+1,updated_at=now() WHERE id=:id"), {"id": source["id"]})
        else:
            existing = next((line for line in lines if line["id"] == body.line_id), None)
            if existing is None:
                raise ValueError("line_not_found")
            if body.action == "replace":
                if body.item is None or body.item.kind != existing["item"]["kind"]:
                    raise ValueError("invalid_selection")
                lines.remove(existing)
                add(body.item, amount(toman(body.expected_unit,"IRT")) if body.expected_unit is not None else None)
            elif body.action == "remove":
                lines.remove(existing)
            else:
                item = Item.model_validate({**existing["item"], "quantity": body.quantity}) if body.action == "quantity" else Item.model_validate(existing["item"])
                current = quote(db, item)
                existing["item"] = item.model_dump(mode="json")
                existing["quote"] = current
                if body.action == "accept":
                    if body.expected_unit is None or toman(body.expected_unit,"IRT") != toman(current["unit"],"IRT"):
                        error("price_changed", 409)
                    existing["accepted_unit"] = current["unit"]
        db.execute(text("UPDATE shopping_baskets SET lines=CAST(:lines AS jsonb),version=version+1,updated_at=:now WHERE id=:id"), {"id": row["id"], "lines": json.dumps(lines), "now": datetime.now(UTC)})
        db.execute(text("INSERT INTO shopping_basket_commands(basket_id,command_id,payload_hash,version) VALUES (:id,:command,:hash,:version)"), {"id": row["id"], "command": body.command_id, "hash": payload, "version": row["version"]+1})
        db.commit()
    except ValueError as exc:
        db.rollback()
        error(str(exc).split("\n")[0])
    response.headers["Cache-Control"] = "no-store"
    return output(request, db, owned(request, db, account), account)
