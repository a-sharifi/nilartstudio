import json
from uuid import uuid4

import pytest
from sqlalchemy import text
from test_basket import basket as basket
from test_basket import boot, migrate, mutate
from test_identity_otp_postgres import flow as flow
from test_identity_otp_postgres import register

from nilart.bootstrap.settings import settings
from nilart.contexts.payments.gateway import GatewayUnknown, ZarinpalSandbox, rial


def test_rial_is_exact_and_rejects_fractional_rials():
    assert rial('125000') == 1250000
    assert rial('100.1') == 1001
    with pytest.raises(ValueError):
        rial('100.01')


@pytest.fixture
def checkout(basket, monkeypatch):
    client, db, sms, ids = basket
    for name in ['0023_customer_orders.py', '0031_sandbox_payments.py']:
        migrate(db, name)
    monkeypatch.setattr(settings, 'payment_mode', 'zarinpal_sandbox')
    monkeypatch.setattr('nilart.contexts.identity.presentation.router.csrf_attempt_allowed', lambda *args: True)
    _, registered = register(client, sms)
    owner = registered.json()['account_id']
    address = uuid4()
    db.execute(text("INSERT INTO customer_records(id,account_id,kind,data) VALUES(:id,:owner,'address',CAST(:data AS jsonb))"), {'id': address, 'owner': owner, 'data': json.dumps({'name': 'Sandbox recipient', 'province': 'Test', 'city': 'Test', 'street': 'Sandbox only', 'postal': '1234567890'})})
    db.commit()
    boot(client)
    csrf = client.post('/api/v1/auth/session/csrf').json()['csrf_token']
    added = mutate(client, 0, csrf, item={'kind': 'product', 'item_id': ids['sku'], 'quantity': 2})
    assert added.status_code == 200, added.text
    body = {'command_id': str(uuid4()), 'basket_version': 1, 'address_id': str(address), 'language': 'en', 'sandbox_confirmed': True, 'expected_total': '200.2'}
    monkeypatch.setattr(ZarinpalSandbox, 'request', lambda self, amount, callback: 'A'+'1'*35)
    monkeypatch.setattr(ZarinpalSandbox, 'verify', lambda self, amount, authority: '123456789')
    return client, db, body


def start(client, body):
    csrf = client.post('/api/v1/auth/session/csrf').json()['csrf_token']
    return client.post('/api/v1/payments/sandbox/checkout', json=body, headers={'X-CSRF-Token': csrf})


def test_snapshot_callback_replay_and_owner_isolation(checkout):
    client, db, body = checkout
    response = start(client, body)
    assert response.status_code == 200, response.text
    payment = response.json()
    assert payment['amount_rial'] == '2002'
    assert payment['gateway_url'].startswith('https://sandbox.zarinpal.com/')
    assert start(client, body).json()['id'] == payment['id']
    before = db.scalar(text('SELECT count(*) FROM outbox_events'))
    callback = f"/api/v1/payments/sandbox/callback/{payment['id']}?Authority={'A'+'1'*35}&Status=OK"
    assert client.get(callback, follow_redirects=False).status_code == 303
    assert client.get(callback, follow_redirects=False).status_code == 303
    assert db.scalar(text('SELECT count(*) FROM customer_orders')) == 1
    assert db.scalar(text('SELECT count(*) FROM outbox_events')) == before+1
    row = db.execute(text('SELECT snapshot,state,sandbox FROM customer_orders')).mappings().one()
    assert row['sandbox'] is True
    assert row['snapshot']['total_amount'] == '200.2'
    assert row['snapshot']['receipt']['number'].startswith('SANDBOX-ZP-')
    assert row['state']['payment'] == 'paid'
    assert row['state']['fulfillment'] == 'on_hold'
    assert client.get('/api/v1/basket').json()['lines'] == []
    client.cookies.clear()
    assert client.get(f"/api/v1/payments/sandbox/{payment['id']}").status_code == 401


def test_protection_and_stale_totals(checkout):
    client, db, body = checkout
    assert client.post('/api/v1/payments/sandbox/checkout', json=body).status_code == 403
    assert start(client, {**body, 'expected_total': '1'}).status_code == 409
    assert start(client, {**body, 'basket_version': 0}).status_code == 409
    assert start(client, {**body, 'address_id': str(uuid4())}).status_code == 409
    assert db.scalar(text('SELECT count(*) FROM sandbox_payments')) == 0


def test_timeout_never_marks_paid_and_keeps_basket(checkout, monkeypatch):
    client, db, body = checkout
    payment = start(client, body).json()
    def uncertain(*args):
        raise GatewayUnknown()
    monkeypatch.setattr(ZarinpalSandbox, 'verify', uncertain)
    callback = f"/api/v1/payments/sandbox/callback/{payment['id']}?Authority={'A'+'1'*35}&Status=OK"
    assert client.get(callback, follow_redirects=False).status_code == 303
    assert client.get(f"/api/v1/payments/sandbox/{payment['id']}").json()['status'] == 'unknown'
    assert client.get('/api/v1/basket').json()['lines']
    monkeypatch.setattr(ZarinpalSandbox, 'verify', lambda *args: '789')
    assert client.get(callback, follow_redirects=False).status_code == 303
    assert client.get(f"/api/v1/payments/sandbox/{payment['id']}").json()['status'] == 'paid'


def test_invalid_origin_and_revoked_session(checkout):
    client, db, body = checkout
    csrf = client.post('/api/v1/auth/session/csrf').json()['csrf_token']
    assert client.post('/api/v1/payments/sandbox/checkout', json=body, headers={'Origin': 'https://foreign.example', 'X-CSRF-Token': csrf}).status_code == 403
    db.execute(text('UPDATE identity_accounts SET blocked=true'))
    db.commit()
    assert client.post('/api/v1/payments/sandbox/checkout', json=body, headers={'X-CSRF-Token': csrf}).status_code == 401
    assert db.scalar(text('SELECT count(*) FROM sandbox_payments')) == 0


def test_cancelled_callback_never_marks_order_paid(checkout):
    client, db, body = checkout
    payment = start(client, body).json()
    root = f"/api/v1/payments/sandbox/callback/{payment['id']}"
    assert client.get(root + '?Authority=invalid&Status=OK').status_code == 400
    response = client.get(root + '?Authority=' + 'A'+'1'*35 + '&Status=NOK', follow_redirects=False)
    assert response.status_code == 303
    assert db.scalar(text('SELECT status FROM sandbox_payments')) == 'cancelled'
    assert db.scalar(text("SELECT state->>'payment' FROM customer_orders")) == 'failed'
    assert client.get('/api/v1/basket').json()['lines']
