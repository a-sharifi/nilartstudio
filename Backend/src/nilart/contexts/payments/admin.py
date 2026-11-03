"""Staff inquiry of recorded sandbox payments; never infer success or move stock."""
import json
from datetime import datetime
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.contexts.identity.presentation.router import failure
from nilart.contexts.payments.router import gateway, reconcile
from nilart.shared.database import session_dependency

router = APIRouter(prefix="/api/v1/admin/payments", tags=["payment-inquiries"])
Status = Literal["requesting", "pending", "paid", "cancelled", "failed", "unknown"]


class Payment(BaseModel):
    id: UUID
    order_id: UUID
    status: Status
    reference: str | None
    amount_rial: str
    sandbox: Literal[True] = True
    inquiry_available: bool
    version: int
    updated_at: datetime


class Page(BaseModel):
    items: list[Payment]
    next_cursor: UUID | None


class Command(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    expected_version: int = Field(ge=0, strict=True)
    reason: str = Field(min_length=1, max_length=1000)


class Inquiry(BaseModel):
    id: UUID
    payment_id: UUID
    actor_id: UUID
    intent: Command
    before: Payment
    result: Payment
    created_at: datetime


class History(BaseModel):
    items: list[Inquiry]
    next_cursor: UUID | None


def payment(row):
    return Payment(id=row['id'], order_id=row['order_id'], status=row['status'],
                   reference=row['reference'], amount_rial=str(row['amount_rial']),
                   inquiry_available=bool(row['authority']) and row['status'] != 'paid',
                   version=row['version'], updated_at=row['updated_at']).model_dump(mode='json')


def receipt(row):
    return {**row, 'created_at': row['created_at'].isoformat()}


@router.get("", response_model=Page)
def listing(response: Response, order_id: UUID | None = None, status: Status | None = None,
            cursor: UUID | None = None, db: Session = Depends(session_dependency),
            principal: Principal = Depends(require_permission("payments.read"))):
    response.headers['Cache-Control'] = 'no-store'
    rows = db.execute(text("SELECT * FROM sandbox_payments WHERE "
                           "(CAST(:order AS uuid) IS NULL OR order_id=:order) AND "
                           "(CAST(:status AS text) IS NULL OR status=:status) AND "
                           "(CAST(:cursor AS uuid) IS NULL OR (created_at,id)<(SELECT created_at,id FROM sandbox_payments WHERE id=:cursor)) ORDER BY created_at DESC,id DESC LIMIT 26"),
                      {'order': order_id, 'status': status, 'cursor': cursor}).mappings().all()
    return {'items': [payment(row) for row in rows[:25]],
            'next_cursor': rows[24]['id'] if len(rows) > 25 else None}


@router.get("/{id}/inquiries", response_model=History)
def history(id: UUID, response: Response, cursor: UUID | None = None,
            db: Session = Depends(session_dependency),
            principal: Principal = Depends(require_permission("payments.read"))):
    response.headers['Cache-Control'] = 'no-store'
    rows = db.execute(text("SELECT * FROM payment_inquiries WHERE payment_id=:id "
                           "AND (CAST(:cursor AS uuid) IS NULL OR (created_at,id)<(SELECT created_at,id FROM payment_inquiries WHERE id=:cursor AND payment_id=:id)) ORDER BY created_at DESC,id DESC LIMIT 21"),
                      {'id': id, 'cursor': cursor}).mappings().all()
    return {'items': [receipt(row) for row in rows[:20]],
            'next_cursor': rows[19]['id'] if len(rows) > 20 else None}


@router.get("/{id}/inquiries/{key}", response_model=Inquiry)
def saved(id: UUID, key: UUID, request: Request, response: Response,
          db: Session = Depends(session_dependency),
          principal: Principal = Depends(require_permission("payments.read"))):
    response.headers['Cache-Control'] = 'no-store'
    row = db.execute(text("SELECT * FROM payment_inquiries WHERE id=:key AND payment_id=:id AND actor_id=:actor"),
                     {'key': key, 'id': id, 'actor': principal.account_id}).mappings().first()
    return receipt(row) if row else failure(request, 'payment_inquiry_not_found', 404)


@router.put("/{id}/inquiries/{key}", response_model=Inquiry)
def inquire(id: UUID, key: UUID, body: Command, request: Request, response: Response,
            db: Session = Depends(session_dependency),
            principal: Principal = Depends(require_permission("payments.read"))):
    response.headers['Cache-Control'] = 'no-store'
    # Serialize operation keys as well as gateway callbacks/customer inquiries.
    db.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:key,42))"), {"key": str(key)})
    actor, denied = write_access(request, db, principal, 'finance.write')
    if denied is not None:
        return denied
    # write_access locks the current account, so the read grant cannot be revoked
    # between this check and the command commit.
    if not SqlIdentityRepository(db).principal(actor.id, lock=True).allows('payments.read'):
        return failure(request, 'permission_denied', 403)
    intent = body.model_dump(mode='json')
    old = db.execute(text("SELECT * FROM payment_inquiries WHERE id=:key"), {'key': key}).mappings().first()
    if old:
        if str(old['payment_id']) != str(id) or str(old['actor_id']) != str(actor.id) or old['intent'] != intent:
            return failure(request, 'payment_inquiry_key_conflict', 409)
        return receipt(old)
    row = db.execute(text("SELECT * FROM sandbox_payments WHERE id=:id FOR UPDATE"), {'id': id}).mappings().first()
    if not row:
        return failure(request, 'payment_not_found', 404)
    if row['version'] != body.expected_version:
        return failure(request, 'payment_inquiry_conflict', 409)
    if not row['authority'] or row['status'] == 'paid':
        return failure(request, 'payment_inquiry_unavailable', 409)
    before = payment(row)
    row = reconcile(db, row, gateway(row))
    result = payment(row)
    saved_row = db.execute(text('INSERT INTO payment_inquiries(id,payment_id,actor_id,intent,"before",result) '
                                'VALUES(:key,:id,:actor,CAST(:intent AS jsonb),CAST(:before AS jsonb),CAST(:result AS jsonb)) RETURNING *'),
                           {'key': key, 'id': id, 'actor': actor.id, 'intent': json.dumps(intent),
                            'before': json.dumps(before), 'result': json.dumps(result)}).mappings().one()
    db.commit()
    return receipt(saved_row)
