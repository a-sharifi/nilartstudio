"""Recorded cash events. Purchase receipt, invoice, payment and revenue stay distinct."""

import json
from datetime import date, datetime
from decimal import Decimal, localcontext
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from nilart.contexts.business.router import Strict
from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.contexts.identity.presentation.router import failure
from nilart.contexts.inventory.router import Number
from nilart.shared.database import session_dependency
from nilart.shared.outbox import enqueue
from nilart.shared.tabular_export import table_response

router = APIRouter(prefix="/api/v1/admin/finance", tags=["operational-finance"])
Kind = Literal[
    "opening",
    "receipt",
    "payment",
    "expense",
    "transfer",
    "supplier_payment",
    "supplier_refund",
    "supplier_opening_payment",
    "supplier_opening_refund",
    "reversal",
]


class AccountContent(Strict):
    code: str = Field(pattern=r"^[A-Z0-9][A-Z0-9_-]{0,79}$")
    title_fa: str = Field(min_length=1, max_length=200)
    title_en: str = Field(min_length=1, max_length=200)
    kind: Literal["cash", "bank"]
    active: bool = Field(strict=True)


class AccountCommand(Strict):
    expected_version: int = Field(strict=True, ge=0, le=2147483646)
    content: AccountContent
    opening_amount: Number | None = None
    opening_date: date | None = None
    reason: str = Field(min_length=1, max_length=1000)

    @model_validator(mode="after")
    def opening_only(self):
        if (self.expected_version == 0) != (self.opening_amount is not None) or (
            self.expected_version == 0
        ) != (self.opening_date is not None):
            raise ValueError("An explicit opening amount belongs only to account creation")
        return self


class DocumentCommand(Strict):
    kind: Literal[
        "receipt",
        "payment",
        "expense",
        "transfer",
        "supplier_payment",
        "supplier_refund",
        "supplier_opening_payment",
        "supplier_opening_refund",
        "reversal",
    ]
    document_number: str = Field(min_length=1, max_length=100)
    document_date: date
    amount: Number | None = None
    source_account_id: UUID | None = None
    target_account_id: UUID | None = None
    expected_versions: dict[UUID, Annotated[int, Field(strict=True)]] = Field(
        min_length=1, max_length=2
    )
    purchase_id: UUID | None = None
    expected_purchase_version: int | None = Field(default=None, strict=True, ge=1)
    opening_event_id: UUID | None = None
    expected_opening_settlement_version: int | None = Field(
        default=None, strict=True, ge=0, le=2147483646
    )
    reverses_id: UUID | None = None
    description: str = Field(min_length=1, max_length=2000)
    supporting_reference: str = Field(min_length=1, max_length=500)
    category: str = Field(default="", max_length=100)
    reason: str = Field(min_length=1, max_length=1000)

    @model_validator(mode="after")
    def valid(self):
        if any(
            type(v) is not int or not 1 <= v <= 2147483646 for v in self.expected_versions.values()
        ):
            raise ValueError("Expected account versions required")
        if self.kind == "reversal":
            if (
                self.reverses_id is None
                or any(
                    v is not None
                    for v in (
                        self.amount,
                        self.source_account_id,
                        self.target_account_id,
                        self.purchase_id,
                        self.expected_purchase_version,
                    )
                )
                or self.category
            ):
                raise ValueError("Reversal derives all financial allocations from its source")
            if (self.opening_event_id is None) != (
                self.expected_opening_settlement_version is None
            ):
                raise ValueError("Opening reversal requires both opening and settlement versions")
            return self
        if self.reverses_id is not None or self.amount is None or Decimal(self.amount) <= 0:
            raise ValueError("Positive explicit amount required")
        outgoing = self.kind in {
            "payment",
            "expense",
            "supplier_payment",
            "supplier_opening_payment",
            "transfer",
        }
        incoming = self.kind in {
            "receipt",
            "supplier_refund",
            "supplier_opening_refund",
            "transfer",
        }
        if outgoing != (self.source_account_id is not None) or incoming != (
            self.target_account_id is not None
        ):
            raise ValueError("Invalid source/target accounts")
        ids = {v for v in (self.source_account_id, self.target_account_id) if v is not None}
        if len(ids) != (2 if self.kind == "transfer" else 1) or set(self.expected_versions) != ids:
            raise ValueError("Versions must identify every affected account exactly")
        supplier = self.kind in {"supplier_payment", "supplier_refund"}
        if supplier != (self.purchase_id is not None) or supplier != (
            self.expected_purchase_version is not None
        ):
            raise ValueError("Supplier allocation needs an explicit purchase/version")
        opening = self.kind in {"supplier_opening_payment", "supplier_opening_refund"}
        if opening != (self.opening_event_id is not None) or opening != (
            self.expected_opening_settlement_version is not None
        ):
            raise ValueError(
                "Opening settlement needs an explicit opening event and settlement version"
            )
        if self.kind == "expense" and not self.category:
            raise ValueError("Expense category required")
        if self.kind != "expense" and self.category:
            raise ValueError("Only operating expenses have an expense category")
        return self


class Account(BaseModel):
    id: UUID
    code: str
    title_fa: str
    title_en: str
    kind: Literal["cash", "bank"]
    active: bool
    currency: Literal["IRT"]
    balance: str
    version: int


class Line(BaseModel):
    account_id: UUID
    code: str
    delta: str
    balance_after: str
    account_version: int


class Document(BaseModel):
    id: UUID
    kind: Kind
    effect_kind: Kind
    document_number: str
    document_date: date
    amount: str
    currency: Literal["IRT"]
    description: str
    supporting_reference: str
    category: str
    reverses_id: UUID | None
    reversed_by: UUID | None
    purchase_id: UUID | None
    allocation_amount: str | None
    opening_supplier_id: UUID | None = None
    opening_event_id: UUID | None = None
    opening_allocation_amount: str | None = None
    opening_settlement_version: int | None = None
    actor_id: UUID
    created_at: datetime
    lines: list[Line]


class Result(BaseModel):
    accounts: list[Account]
    document: Document | None


class Receipt(BaseModel):
    id: UUID
    actor_id: UUID
    area: Literal["account", "document"]
    target_id: UUID
    intent: dict
    result: Result
    created_at: datetime


class Accounts(BaseModel):
    items: list[Account]
    next_cursor: UUID | None


class Documents(BaseModel):
    items: list[Document]
    next_cursor: UUID | None


class Balance(BaseModel):
    purchase_id: UUID
    supplier_id: UUID
    supplier_name_fa: str
    supplier_name_en: str
    document_number: str
    purchase_status: str
    purchase_version: int
    liability: str
    paid_net: str
    outstanding: str
    currency: Literal["IRT"] = "IRT"


class Balances(BaseModel):
    items: list[Balance]
    next_cursor: UUID | None


class FinanceError(Exception):
    pass


def fmt(value):
    return format(value, "f")


def account(row):
    return {**dict(row), "balance": fmt(row["balance"])}


def document(db, id):
    row = (
        db.execute(
            text(
                "SELECT d.*,r.id AS reversed_by,a.purchase_id,a.amount AS allocation_amount,o.supplier_id AS opening_supplier_id,o.opening_event_id,o.amount AS opening_allocation_amount,o.version AS opening_settlement_version FROM finance_documents d LEFT JOIN finance_documents r ON r.reverses_id=d.id LEFT JOIN finance_allocations a ON a.document_id=d.id LEFT JOIN finance_opening_allocations o ON o.document_id=d.id WHERE d.id=:id"
            ),
            dict(id=id),
        )
        .mappings()
        .first()
    )
    if not row:
        return None
    lines = (
        db.execute(
            text(
                "SELECT l.*,l.account_code AS code FROM finance_lines l WHERE l.document_id=:id ORDER BY l.account_id"
            ),
            dict(id=id),
        )
        .mappings()
        .all()
    )
    return {
        **dict(row),
        "amount": fmt(row["amount"]),
        "allocation_amount": fmt(row["allocation_amount"])
        if row["allocation_amount"] is not None
        else None,
        "opening_allocation_amount": fmt(row["opening_allocation_amount"])
        if row["opening_allocation_amount"] is not None
        else None,
        "lines": [
            {**dict(line), "delta": fmt(line["delta"]), "balance_after": fmt(line["balance_after"])}
            for line in lines
        ],
    }


def paid(db, purchase):
    return db.scalar(
        text("SELECT coalesce(sum(amount),0) FROM finance_allocations WHERE purchase_id=:id"),
        dict(id=purchase),
    )


def receipt_or_conflict(db, key, actor, area, target, intent):
    row = (
        db.execute(text("SELECT * FROM finance_commands WHERE id=:id"), dict(id=key))
        .mappings()
        .first()
    )
    if row and not (
        str(row["actor_id"]) == str(actor.id)
        and row["area"] == area
        and row["target_id"] == target
        and row["intent"] == intent
    ):
        raise FinanceError("finance_command_conflict")
    return dict(row) if row else None


def finish(db, key, actor, area, target, intent, accounts, doc, reason):
    result = Result(accounts=[account(r) for r in accounts], document=doc).model_dump(mode="json")
    row = (
        db.execute(
            text(
                "INSERT INTO finance_commands(id,actor_id,area,target_id,intent,result) VALUES(:id,:actor,:area,:target,CAST(:intent AS jsonb),CAST(:result AS jsonb)) RETURNING *"
            ),
            dict(
                id=key,
                actor=actor.id,
                area=area,
                target=target,
                intent=json.dumps(intent),
                result=json.dumps(result),
            ),
        )
        .mappings()
        .one()
    )
    payload = dict(command_id=str(key), target_id=str(target), area=area)
    SqlAccountManagement(db).audit(actor.id, actor.id, "finance.recorded", payload, reason)
    enqueue(db, "finance.recorded", payload)
    db.commit()
    return dict(row)


def insert_document(
    db,
    id,
    actor,
    kind,
    effect,
    number,
    on,
    amount,
    description,
    reference,
    category="",
    reverses=None,
):
    db.execute(
        text(
            "INSERT INTO finance_documents(id,kind,effect_kind,document_number,document_date,amount,currency,description,supporting_reference,category,reverses_id,actor_id) VALUES(:id,:kind,:effect,:number,:on,:amount,'IRT',:description,:reference,:category,:reverses,:actor)"
        ),
        dict(
            id=id,
            kind=kind,
            effect=effect,
            number=number,
            on=on,
            amount=amount,
            description=description,
            reference=reference,
            category=category,
            reverses=reverses,
            actor=actor,
        ),
    )


@router.get("/accounts", response_model=Accounts)
def accounts(
    q: str = Query("", max_length=200),
    active: bool | None = None,
    cursor: UUID | None = None,
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("finance.read")),
):
    rows = (
        db.execute(
            text(
                "SELECT * FROM finance_accounts WHERE (:q='' OR strpos(lower(concat_ws(' ',code,title_fa,title_en)),lower(CAST(:q AS text)))>0) AND (CAST(:active AS boolean) IS NULL OR active=:active) AND (CAST(:cursor AS uuid) IS NULL OR id>:cursor) ORDER BY id LIMIT :limit"
            ),
            dict(q=q.strip(), active=active, cursor=cursor, limit=limit + 1),
        )
        .mappings()
        .all()
    )
    return dict(
        items=[account(r) for r in rows[:limit]],
        next_cursor=rows[limit - 1]["id"] if len(rows) > limit else None,
    )


@router.get("/documents", response_model=Documents)
def documents(
    q: str = Query("", max_length=200),
    kind: Kind | None = None,
    account_id: UUID | None = None,
    cursor: UUID | None = None,
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("finance.read")),
):
    rows = (
        db.execute(
            text(
                "SELECT id FROM finance_documents d WHERE (:q='' OR strpos(lower(concat_ws(' ',document_number,description,supporting_reference)),lower(CAST(:q AS text)))>0) AND (CAST(:kind AS text) IS NULL OR kind=:kind) AND (CAST(:account AS uuid) IS NULL OR EXISTS(SELECT 1 FROM finance_lines l WHERE l.document_id=d.id AND l.account_id=:account)) AND (CAST(:cursor AS uuid) IS NULL OR id>:cursor) ORDER BY id LIMIT :limit"
            ),
            dict(q=q.strip(), kind=kind, account=account_id, cursor=cursor, limit=limit + 1),
        )
        .scalars()
        .all()
    )
    return dict(
        items=[document(db, id) for id in rows[:limit]],
        next_cursor=rows[limit - 1] if len(rows) > limit else None,
    )


@router.get("/documents/{id}", response_model=Document)
def detail(
    id: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("finance.read")),
):
    return document(db, id) or failure(request, "finance_document_not_found", 404)


@router.get("/commands/{id}", response_model=Receipt)
def receipt(
    id: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("finance.write")),
):
    # A writer can recover their own receipt without acquiring general finance-read access.
    row = (
        db.execute(
            text("SELECT * FROM finance_commands WHERE id=:id AND actor_id=:actor"),
            dict(id=id, actor=principal.account_id),
        )
        .mappings()
        .first()
    )
    return dict(row) if row else failure(request, "finance_command_not_found", 404)


@router.put("/accounts/{id}/commands/{key}", response_model=Receipt)
def save_account(
    id: UUID,
    key: UUID,
    body: AccountCommand,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("finance.write")),
):
    actor, denied = write_access(request, db, principal, "finance.write")
    if denied is not None:
        return denied
    db.execute(text("SELECT pg_advisory_xact_lock(78214,40)"))
    intent = body.model_dump(mode="json")
    try:
        prior = receipt_or_conflict(db, key, actor, "account", id, intent)
        if prior:
            return prior
        current = (
            db.execute(text("SELECT * FROM finance_accounts WHERE id=:id FOR UPDATE"), dict(id=id))
            .mappings()
            .first()
        )
        if (current["version"] if current else 0) != body.expected_version:
            raise FinanceError("finance_version_conflict")
        content = body.content.model_dump()
        if current and (
            current["kind"] != content["kind"]
            or (not content["active"] and current["balance"] != 0)
        ):
            raise FinanceError("finance_account_state_conflict")
        if not current and not content["active"]:
            raise FinanceError("finance_account_state_conflict")
        params = dict(
            id=id,
            **content,
            version=body.expected_version + 1,
            balance=Decimal(body.opening_amount or "0"),
        )
        if current:
            row = (
                db.execute(
                    text(
                        "UPDATE finance_accounts SET code=:code,title_fa=:title_fa,title_en=:title_en,active=:active,version=:version WHERE id=:id RETURNING *"
                    ),
                    params,
                )
                .mappings()
                .one()
            )
            doc = None
        else:
            row = (
                db.execute(
                    text(
                        "INSERT INTO finance_accounts(id,code,title_fa,title_en,kind,active,currency,balance,version) VALUES(:id,:code,:title_fa,:title_en,:kind,:active,'IRT',:balance,:version) RETURNING *"
                    ),
                    params,
                )
                .mappings()
                .one()
            )
            insert_document(
                db,
                key,
                actor.id,
                "opening",
                "opening",
                content["code"],
                body.opening_date,
                params["balance"],
                body.reason,
                "Explicit counted opening balance",
            )
            db.execute(
                text(
                    "INSERT INTO finance_lines(document_id,account_id,account_code,delta,balance_after,account_version) VALUES(:doc,:account,:code,:value,:value,1)"
                ),
                dict(doc=key, account=id, code=content["code"], value=params["balance"]),
            )
            doc = document(db, key)
        return finish(db, key, actor, "account", id, intent, [row], doc, body.reason)
    except FinanceError as exc:
        db.rollback()
        return failure(request, str(exc), 409)
    except IntegrityError:
        db.rollback()
        return failure(request, "finance_account_code_conflict", 409)
    except Exception:
        db.rollback()
        raise


@router.put("/documents/{id}", response_model=Receipt)
def post_document(
    id: UUID,
    body: DocumentCommand,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("finance.write")),
):
    actor, denied = write_access(request, db, principal, "finance.write")
    if denied is not None:
        return denied
    if body.opening_event_id is not None and not SqlIdentityRepository(db).principal(
        actor.id, lock=True
    ).allows("finance.read"):
        return failure(request, "permission_denied", 403)
    db.execute(text("SELECT pg_advisory_xact_lock(78214,40)"))
    intent = body.model_dump(mode="json")
    # Preserve the exact canonical intent of commands saved before opening settlements.
    for field in ("opening_event_id", "expected_opening_settlement_version"):
        if intent[field] is None:
            intent.pop(field)

    try:
        prior = receipt_or_conflict(db, id, actor, "document", id, intent)
        if prior:
            return prior
        with localcontext() as ctx:
            ctx.prec = 60
            purchase = None
            allocation = None
            opening_supplier = None
            opening_event = None
            opening_allocation = None
            opening_version = None
            if body.kind == "reversal":
                original = document(db, body.reverses_id)
                if (
                    not original
                    or original["kind"] == "reversal"
                    or original["reversed_by"] is not None
                ):
                    raise FinanceError("finance_reversal_conflict")
                deltas = {
                    str(line["account_id"]): -Decimal(line["delta"]) for line in original["lines"]
                }
                if set(deltas) != {str(k) for k in body.expected_versions}:
                    raise FinanceError("finance_version_conflict")
                amount = Decimal(original["amount"])
                effect = original["effect_kind"]
                purchase = original["purchase_id"]
                allocation = (
                    -Decimal(original["allocation_amount"])
                    if original["allocation_amount"] is not None
                    else None
                )
            else:
                amount = Decimal(body.amount)
                effect = body.kind
                deltas = {}
                if body.source_account_id:
                    deltas[str(body.source_account_id)] = -amount
                if body.target_account_id:
                    deltas[str(body.target_account_id)] = amount
                purchase = body.purchase_id
                if purchase:
                    allocation = amount if body.kind == "supplier_payment" else -amount
            if body.kind == "reversal" and original["opening_supplier_id"]:
                opening_supplier = original["opening_supplier_id"]
                opening_allocation = -Decimal(original["opening_allocation_amount"])
            elif body.kind in {"supplier_opening_payment", "supplier_opening_refund"}:
                opening_supplier = db.scalar(
                    text("SELECT supplier_id FROM supplier_opening_events WHERE id=:id"),
                    {"id": body.opening_event_id},
                )
                if not opening_supplier:
                    raise FinanceError("finance_opening_not_configured")
                opening_allocation = amount if body.kind == "supplier_opening_payment" else -amount
            if opening_supplier:
                if (
                    not SqlIdentityRepository(db)
                    .principal(actor.id, lock=True)
                    .allows("finance.read")
                ):
                    db.rollback()
                    return failure(request, "permission_denied", 403)
                opening_event = (
                    db.execute(
                        text(
                            "SELECT * FROM supplier_opening_events WHERE supplier_id=:id ORDER BY version DESC LIMIT 1"
                        ),
                        {"id": opening_supplier},
                    )
                    .mappings()
                    .one()
                )
                totals = (
                    db.execute(
                        text(
                            "SELECT coalesce(sum(amount),0) AS paid,coalesce(max(version),0) AS version FROM finance_opening_allocations WHERE supplier_id=:id"
                        ),
                        {"id": opening_supplier},
                    )
                    .mappings()
                    .one()
                )
                if (
                    opening_event["id"] != body.opening_event_id
                    or totals["version"] != body.expected_opening_settlement_version
                ):
                    raise FinanceError("finance_opening_version_conflict")
                if body.document_date <= opening_event["as_of_date"]:
                    raise FinanceError("finance_opening_date_invalid")
                if body.kind == "reversal" and body.document_date < original["document_date"]:
                    raise FinanceError("finance_opening_date_invalid")
                due = opening_event["amount"] - totals["paid"]
                if body.kind == "supplier_opening_payment" and (due <= 0 or amount > due):
                    raise FinanceError("finance_opening_payment_exceeds_due")
                if body.kind == "supplier_opening_refund" and (due >= 0 or amount > -due):
                    raise FinanceError("finance_opening_refund_exceeds_credit")
                if body.kind == "reversal":
                    source_amount = db.scalar(
                        text("SELECT amount FROM supplier_opening_events WHERE id=:id"),
                        {"id": original["opening_event_id"]},
                    )
                    after_paid = totals["paid"] + opening_allocation
                    original_paid = Decimal(original["opening_allocation_amount"])
                    if (
                        source_amount > 0
                        and original_paid > 0
                        and after_paid < min(Decimal(0), opening_event["amount"])
                    ) or (
                        source_amount < 0
                        and original_paid < 0
                        and after_paid > max(Decimal(0), opening_event["amount"])
                    ):
                        raise FinanceError("finance_opening_reverse_dependents_first")
                opening_version = totals["version"] + 1
            elif body.kind == "reversal" and body.opening_event_id is not None:
                raise FinanceError("finance_opening_version_conflict")
            if purchase:
                db.execute(text("SELECT pg_advisory_xact_lock(78214,38)"))
                invoice = (
                    db.execute(
                        text("SELECT * FROM procurement_purchases WHERE id=:id FOR UPDATE"),
                        dict(id=purchase),
                    )
                    .mappings()
                    .first()
                )
                if not invoice or (
                    body.kind != "reversal" and invoice["version"] != body.expected_purchase_version
                ):
                    raise FinanceError("finance_purchase_version_conflict")
                net = paid(db, purchase)
                liability = Decimal(invoice["state"]["liability"])
                if body.kind == "supplier_payment" and (
                    invoice["status"] != "posted" or amount > liability - net
                ):
                    raise FinanceError("finance_payment_exceeds_due")
                if body.kind == "supplier_refund" and (
                    invoice["status"] == "draft" or amount > net - liability
                ):
                    raise FinanceError("finance_refund_exceeds_credit")
                if net + allocation < 0:
                    raise FinanceError("finance_reverse_dependent_refunds_first")
            changed = []
            for aid in sorted(deltas):
                row = (
                    db.execute(
                        text("SELECT * FROM finance_accounts WHERE id=:id FOR UPDATE"), dict(id=aid)
                    )
                    .mappings()
                    .first()
                )
                expected = body.expected_versions.get(UUID(aid))
                if not row or row["version"] != expected:
                    raise FinanceError("finance_version_conflict")
                if not row["active"]:
                    raise FinanceError("finance_account_inactive")
                value = row["balance"] + deltas[aid]
                if value < 0:
                    raise FinanceError("finance_insufficient_balance")
                if value >= Decimal("1e18"):
                    raise FinanceError("finance_capacity_exceeded")
                changed.append(
                    db.execute(
                        text(
                            "UPDATE finance_accounts SET balance=:balance,version=version+1 WHERE id=:id RETURNING *"
                        ),
                        dict(id=aid, balance=value),
                    )
                    .mappings()
                    .one()
                )
            insert_document(
                db,
                id,
                actor.id,
                body.kind,
                effect,
                body.document_number,
                body.document_date,
                amount,
                body.description,
                body.supporting_reference,
                original["category"] if body.kind == "reversal" else body.category,
                body.reverses_id,
            )
            for row in changed:
                db.execute(
                    text(
                        "INSERT INTO finance_lines(document_id,account_id,account_code,delta,balance_after,account_version) VALUES(:doc,:account,:code,:delta,:balance,:version)"
                    ),
                    dict(
                        doc=id,
                        account=row["id"],
                        code=row["code"],
                        delta=deltas[str(row["id"])],
                        balance=row["balance"],
                        version=row["version"],
                    ),
                )
            if purchase:
                db.execute(
                    text(
                        "INSERT INTO finance_allocations(document_id,purchase_id,amount) VALUES(:doc,:purchase,:amount)"
                    ),
                    dict(doc=id, purchase=purchase, amount=allocation),
                )
            if opening_supplier:
                db.execute(
                    text(
                        "INSERT INTO finance_opening_allocations(document_id,supplier_id,opening_event_id,amount,version) VALUES(:doc,:supplier,:event,:amount,:version)"
                    ),
                    dict(
                        doc=id,
                        supplier=opening_supplier,
                        event=opening_event["id"],
                        amount=opening_allocation,
                        version=opening_version,
                    ),
                )
            return finish(
                db, id, actor, "document", id, intent, changed, document(db, id), body.reason
            )
    except FinanceError as exc:
        db.rollback()
        return failure(request, str(exc), 409)
    except IntegrityError:
        db.rollback()
        return failure(request, "finance_document_conflict", 409)
    except Exception:
        db.rollback()
        raise


@router.get("/balances", response_model=Balances)
def balances(
    q: str = Query("", max_length=200),
    supplier_id: UUID | None = None,
    cursor: UUID | None = None,
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("finance.read")),
):
    rows = (
        db.execute(
            text(
                "SELECT p.id,p.supplier_id,p.status,p.version,p.content,p.state,coalesce(a.paid,0) AS paid FROM procurement_purchases p LEFT JOIN (SELECT purchase_id,sum(amount) AS paid FROM finance_allocations GROUP BY purchase_id) a ON a.purchase_id=p.id WHERE (p.status='posted' OR coalesce(a.paid,0)<>0) AND (:q='' OR strpos(lower(concat_ws(' ',p.content->>'document_number',p.content->>'supplier_name_fa',p.content->>'supplier_name_en')),lower(CAST(:q AS text)))>0) AND (CAST(:supplier AS uuid) IS NULL OR p.supplier_id=:supplier) AND (CAST(:cursor AS uuid) IS NULL OR p.id>:cursor) ORDER BY p.id LIMIT :limit"
            ),
            dict(q=q.strip(), supplier=supplier_id, cursor=cursor, limit=limit + 1),
        )
        .mappings()
        .all()
    )
    return dict(
        items=[
            dict(
                purchase_id=r["id"],
                supplier_id=r["supplier_id"],
                supplier_name_fa=r["content"]["supplier_name_fa"],
                supplier_name_en=r["content"]["supplier_name_en"],
                document_number=r["content"]["document_number"],
                purchase_status=r["status"],
                purchase_version=r["version"],
                liability=r["state"]["liability"],
                paid_net=fmt(r["paid"]),
                outstanding=fmt(Decimal(r["state"]["liability"]) - r["paid"]),
            )
            for r in rows[:limit]
        ],
        next_cursor=rows[limit - 1]["id"] if len(rows) > limit else None,
    )


class Cashflow(BaseModel):
    from_date: date
    to_date: date
    currency: Literal["IRT"] = "IRT"
    inflow: str
    outflow: str
    net: str
    operating_expenses: str


@router.get("/cashflow", response_model=Cashflow)
def cashflow(
    from_date: date,
    to_date: date,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("finance.read")),
):
    if from_date > to_date:
        return failure(request, "finance_date_range_invalid", 422)
    row = (
        db.execute(
            text(
                "SELECT coalesce(sum(CASE WHEN l.delta>0 THEN l.delta ELSE 0 END),0) AS incoming,coalesce(sum(CASE WHEN l.delta<0 THEN -l.delta ELSE 0 END),0) AS outgoing,coalesce(sum(CASE WHEN d.effect_kind='expense' THEN -l.delta ELSE 0 END),0) AS expenses FROM finance_lines l JOIN finance_documents d ON d.id=l.document_id WHERE d.effect_kind NOT IN ('opening','transfer') AND d.document_date BETWEEN :start AND :end"
            ),
            dict(start=from_date, end=to_date),
        )
        .mappings()
        .one()
    )
    return dict(
        from_date=from_date,
        to_date=to_date,
        inflow=fmt(row["incoming"]),
        outflow=fmt(row["outgoing"]),
        net=fmt(row["incoming"] - row["outgoing"]),
        operating_expenses=fmt(row["expenses"]),
    )


@router.get("/export")
def export(
    from_date: date,
    to_date: date,
    request: Request,
    format: Literal["csv", "xlsx"] = "csv",
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("finance.export")),
):
    if from_date > to_date:
        return failure(request, "finance_date_range_invalid", 422)
    rows = (
        db.execute(
            text(
                "SELECT d.id,d.kind,d.document_number,d.document_date,d.currency,d.supporting_reference,d.reverses_id,d.description,l.account_code AS code,l.delta,l.balance_after,f.purchase_id FROM finance_documents d JOIN finance_lines l ON l.document_id=d.id JOIN finance_accounts a ON a.id=l.account_id LEFT JOIN finance_allocations f ON f.document_id=d.id WHERE d.document_date BETWEEN :start AND :end ORDER BY d.document_date,d.id,a.id LIMIT 10001"
            ),
            dict(start=from_date, end=to_date),
        )
        .mappings()
        .all()
    )
    if len(rows) > 10000:
        return failure(request, "finance_export_narrow_range", 409)

    columns = [
        "document_id",
        "kind",
        "document_number",
        "date",
        "currency",
        "account_code",
        "delta",
        "balance_after",
        "purchase_id",
        "reverses_id",
        "supporting_reference",
        "description",
        "filter_from",
        "filter_to",
    ]
    values = [
        [
            r["id"],
            r["kind"],
            r["document_number"],
            r["document_date"],
            r["currency"],
            r["code"],
            fmt(r["delta"]),
            fmt(r["balance_after"]),
            r["purchase_id"],
            r["reverses_id"],
            r["supporting_reference"],
            r["description"],
            from_date,
            to_date,
        ]
        for r in rows
    ]
    return table_response(
        columns, values, f"finance-{from_date}-{to_date}", format, numeric_columns=(6, 7)
    )


@router.get("/accounts/{id}", response_model=Account)
def account_detail(
    id: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("finance.read")),
):
    row = (
        db.execute(text("SELECT * FROM finance_accounts WHERE id=:id"), dict(id=id))
        .mappings()
        .first()
    )
    return account(row) if row else failure(request, "finance_account_not_found", 404)
