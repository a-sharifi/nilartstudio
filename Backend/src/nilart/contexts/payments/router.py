import hmac
import json
from datetime import UTC, datetime
from decimal import Decimal
from typing import Literal, NoReturn
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.bootstrap.settings import settings
from nilart.contexts.basket.router import identity, output, owned
from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository
from nilart.contexts.identity.infrastructure.secrets import token_digest
from nilart.contexts.payments.gateway import (
    BASE,
    GatewayRejected,
    GatewayUnknown,
    ZarinpalSandbox,
    rial,
)
from nilart.shared.database import session_dependency
from nilart.shared.outbox import enqueue

router = APIRouter(prefix='/api/v1/payments', tags=['sandbox-payments'])


def fail(code, status=400) -> NoReturn:
    raise HTTPException(status, detail={'code': code}, headers={'Cache-Control': 'no-store'})


def gateway():
    if settings.payment_mode != 'zarinpal_sandbox' or settings.environment != 'development':
        fail('sandbox_unavailable', 503)
    return ZarinpalSandbox(settings.zarinpal_merchant_id)


def actor(request, db):
    if request.headers.get('origin') != settings.public_origin:
        fail('origin_invalid', 403)
    account = identity(request, db, True)
    if not account:
        fail('unauthenticated', 401)
    if not SqlIdentityRepository(db).principal(account.id, lock=True).allows('account.write_self'):
        fail('permission_denied', 403)
    csrf = request.headers.get('x-csrf-token', '')
    if not csrf or len(csrf) > 128 or not hmac.compare_digest(token_digest(csrf), account.csrf_hash):
        fail('csrf_invalid', 403)
    return account


def event(db, row, name):
    enqueue(db, 'sandbox.payment.' + name, {'payment_id': str(row['id']), 'order_id': str(row['order_id']), 'sandbox': True, 'account_id': str(row['account_id']), 'amount_rial': str(row['amount_rial']), 'status': name})


def result(row):
    return {'id': str(row['id']), 'order_id': str(row['order_id']), 'status': row['status'], 'reference': row['reference'],
            'amount_rial': str(row['amount_rial']), 'sandbox': True,
            'gateway_url': f"{BASE}/pg/StartPay/{row['authority']}" if row['authority'] and row['status'] in ('pending', 'cancelled', 'failed') else None}


class PaymentOutput(BaseModel):
    id: UUID
    order_id: UUID
    status: Literal['requesting', 'pending', 'paid', 'cancelled', 'failed', 'unknown']
    reference: str | None
    amount_rial: str
    sandbox: Literal[True]
    gateway_url: str | None


class PaymentConfig(BaseModel):
    enabled: bool
    sandbox: Literal[True]


class PaymentStart(BaseModel):
    command_id: UUID
    basket_version: int = Field(ge=0)
    address_id: UUID
    language: Literal['fa', 'en'] = 'fa'
    sandbox_confirmed: Literal[True]
    expected_total: str = Field(pattern=r'^\d{1,12}(?:\.\d{1,7})?$')


@router.get('/config', response_model=PaymentConfig)
def config(response: Response):
    response.headers['Cache-Control'] = 'no-store'
    return {'enabled': settings.environment == 'development' and settings.payment_mode == 'zarinpal_sandbox', 'sandbox': True}


@router.post('/sandbox/checkout', response_model=PaymentOutput)
def checkout(body: PaymentStart, request: Request, response: Response, db: Session = Depends(session_dependency)):
    provider = gateway()
    account = actor(request, db)
    previous = db.execute(text('SELECT * FROM sandbox_payments WHERE account_id=:owner AND command_id=:command'), {'owner': account.id, 'command': body.command_id}).mappings().first()
    if previous:
        response.headers['Cache-Control'] = 'no-store'
        return result(previous)
    basket = owned(request, db, account, True)
    if not basket or basket['version'] != body.basket_version:
        fail('stale_basket', 409)
    existing = db.execute(text('SELECT * FROM sandbox_payments WHERE basket_id=:id AND basket_version=:version'), {'id': basket['id'], 'version': basket['version']}).mappings().first()
    if existing:
        return result(existing)
    current = output(request, db, basket, account)
    if not current['lines'] or any(row['issue'] for row in current['lines']):
        fail('basket_requires_review', 409)
    if Decimal(current['totals']['total']) != Decimal(body.expected_total):
        fail('price_changed', 409)
    try:
        amount = rial(current['totals']['total'])
    except ValueError:
        fail('unsupported_gateway_amount')
    address = db.execute(text("SELECT data FROM customer_records WHERE id=:id AND account_id=:owner AND kind='address' FOR SHARE"), {'id': body.address_id, 'owner': account.id}).scalar()
    if not address:
        fail('address_unavailable', 409)
    payment_id, order_id = uuid4(), uuid4()
    items = []
    for line in current['lines']:
        q, item = line['quote'], line['item']
        items.append({'id': str(uuid4()), 'title_fa': q['name'][0], 'title_en': q['name'][1], 'sku': str(item['item_id']),
                      'options_fa': ' · '.join(pair[0] for pair in q.get('options', [])) + (' · '+str(q['frame'][0]) if q.get('frame') else ''), 'options_en': ' · '.join(pair[1] for pair in q.get('options', [])) + (' · '+str(q['frame'][1]) if q.get('frame') else ''),
                      'quantity': item['quantity'], 'unit_amount': q['unit'], 'discount_amount': '0', 'delivery': 'physical', 'returnable': False})
    snapshot = {'reference': 'SANDBOX-' + str(payment_id)[:8].upper(), 'currency': 'IRT', 'items': items, 'shipping_amount': '0', 'tax_amount': '0',
                'total_amount': current['totals']['total'], 'recipient': address['name'], 'address': '، '.join(address[k] for k in ('province', 'city', 'street', 'postal')), 'receipt': None}
    state: dict[str, object] = {'payment': 'pending', 'fulfillment': 'on_hold', 'delivered': {}, 'return_until': None, 'refunded_amount': '0'}
    db.execute(text('INSERT INTO customer_orders(id,account_id,source_id,snapshot,state,sandbox) VALUES(:id,:owner,:source,CAST(:snapshot AS jsonb),CAST(:state AS jsonb),true)'),
               {'id': order_id, 'owner': account.id, 'source': payment_id, 'snapshot': json.dumps(snapshot), 'state': json.dumps(state)})
    db.execute(text("INSERT INTO sandbox_payments(id,account_id,basket_id,basket_version,command_id,order_id,amount_rial,status,language) VALUES(:id,:owner,:basket,:version,:command,:order,:amount,'requesting',:language)"),
               {'id': payment_id, 'owner': account.id, 'basket': basket['id'], 'version': basket['version'], 'command': body.command_id, 'order': order_id, 'amount': amount, 'language': body.language})
    row = db.execute(text('SELECT * FROM sandbox_payments WHERE id=:id'), {'id': payment_id}).mappings().one()
    event(db, row, 'created')
    db.commit()
    try:
        authority = provider.request(amount, f'{settings.public_origin}/api/v1/payments/sandbox/callback/{payment_id}')
        status = 'pending'
    except GatewayRejected:
        authority, status = None, 'failed'
    except GatewayUnknown:
        authority, status = None, 'unknown'
    row = db.execute(text('UPDATE sandbox_payments SET authority=:authority,status=:status,updated_at=now() WHERE id=:id RETURNING *'), {'id': payment_id, 'authority': authority, 'status': status}).mappings().one()
    if status != 'pending':
        db.execute(text("UPDATE customer_orders SET state=jsonb_set(state,'{payment}',to_jsonb(CAST(:state AS text))) WHERE id=:id"), {'state': 'failed' if status == 'failed' else 'verification', 'id': order_id})
    event(db, row, status)
    db.commit()
    response.headers['Cache-Control'] = 'no-store'
    return result(row)


def reconcile(db, row, provider):
    if row['status'] == 'paid':
        return row
    try:
        reference = provider.verify(row['amount_rial'], row['authority'])
        status = 'paid'
    except GatewayRejected:
        reference, status = None, 'failed'
    except GatewayUnknown:
        reference, status = None, 'unknown'
    row = db.execute(text('UPDATE sandbox_payments SET status=:status,reference=:reference,updated_at=now() WHERE id=:id RETURNING *'), {'id': row['id'], 'status': status, 'reference': reference}).mappings().one()
    db.execute(text("UPDATE customer_orders SET state=jsonb_set(state,'{payment}',to_jsonb(CAST(:state AS text))),version=version+1,updated_at=now() WHERE id=:id"), {'id': row['order_id'], 'state': 'paid' if status == 'paid' else 'verification' if status == 'unknown' else 'failed'})
    # Leave fulfillment on hold: sandbox payments create no stock movements or real shipments.
    if status == 'paid':
        snapshot = db.execute(text('SELECT snapshot FROM customer_orders WHERE id=:id'), {'id': row['order_id']}).scalar_one()
        receipt = {'number': 'SANDBOX-ZP-' + reference, 'issued_at': datetime.now(UTC).isoformat(), 'paid_amount': snapshot['total_amount']}
        db.execute(text("UPDATE customer_orders SET snapshot=jsonb_set(snapshot,'{receipt}',CAST(:receipt AS jsonb)) WHERE id=:id"), {'id': row['order_id'], 'receipt': json.dumps(receipt)})
        # Only remove purchased contents when the basket has not changed during payment.
        db.execute(text("UPDATE shopping_baskets SET lines='[]'::jsonb,version=version+1,updated_at=now() WHERE id=:id AND version=:version"), {'id': row['basket_id'], 'version': row['basket_version']})
    event(db, row, status)
    return row


@router.get('/sandbox/callback/{id}')
def callback(id: UUID, request: Request, db: Session = Depends(session_dependency)):
    provider = gateway()
    row = db.execute(text('SELECT * FROM sandbox_payments WHERE id=:id FOR UPDATE'), {'id': id}).mappings().first()
    if not row or not row['authority'] or request.query_params.get('Authority') != row['authority']:
        fail('invalid_callback', 400)
    if row['status'] != 'paid':
        if request.query_params.get('Status') == 'OK':
            row = reconcile(db, row, provider)
        else:
            db.execute(text("UPDATE sandbox_payments SET status='cancelled',updated_at=now() WHERE id=:id"), {'id': id})
            db.execute(text("UPDATE customer_orders SET state=jsonb_set(state,'{payment}','\"failed\"'::jsonb),version=version+1,updated_at=now() WHERE id=:id"), {'id': row['order_id']})
            event(db, row, 'cancelled')
    db.commit()
    return RedirectResponse(f"/{row['language']}/payment/result?id={id}", status_code=303, headers={'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer'})


@router.get('/sandbox/{id}', response_model=PaymentOutput)
def status(id: UUID, request: Request, response: Response, db: Session = Depends(session_dependency)):
    account = identity(request, db)
    if not account:
        fail('unauthenticated', 401)
    row = db.execute(text('SELECT * FROM sandbox_payments WHERE id=:id AND account_id=:owner'), {'id': id, 'owner': account.id}).mappings().first()
    if not row:
        fail('payment_not_found', 404)
    response.headers['Cache-Control'] = 'no-store'
    return result(row)


@router.post('/sandbox/{id}/verify', response_model=PaymentOutput)
def verify(id: UUID, request: Request, response: Response, db: Session = Depends(session_dependency)):
    provider = gateway()
    account = actor(request, db)
    row = db.execute(text('SELECT * FROM sandbox_payments WHERE id=:id AND account_id=:owner FOR UPDATE'), {'id': id, 'owner': account.id}).mappings().first()
    if not row or not row['authority']:
        fail('payment_not_found', 404)
    row = reconcile(db, row, provider)
    db.commit()
    response.headers['Cache-Control'] = 'no-store'
    return result(row)
