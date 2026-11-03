from uuid import uuid4

from sqlalchemy import text
from test_basket import basket as basket
from test_basket import migrate
from test_identity_otp_postgres import flow as flow
from test_sandbox_payments import checkout as checkout
from test_sandbox_payments import start

from nilart.contexts.payments.gateway import GatewayUnknown, ZarinpalSandbox


def setup(checkout):
    client, db, body = checkout
    migrate(db, '0042_payment_inquiries.py')
    p = start(client, body).json()
    owner = db.scalar(text('SELECT account_id FROM sandbox_payments'))
    db.execute(text("INSERT INTO identity_account_roles(account_id,role) VALUES(:id,'admin')"), {'id': owner})
    db.commit()
    return client, db, p


def command(client, p, key=None, body=None):
    info = client.get('/api/v1/admin/payments').json()['items'][0]
    intent = body or {'reason': 'Gateway inquiry for unresolved sandbox payment', 'expected_version': info['version']}
    csrf = client.post('/api/v1/auth/session/csrf').json()['csrf_token']
    key = key or str(uuid4())
    response = client.put(f"/api/v1/admin/payments/{p['id']}/inquiries/{key}", json=intent, headers={'X-CSRF-Token': csrf})
    return response, key, intent


def test_inquiry_unknown_success_receipt_and_exact_replay(checkout, monkeypatch):
    client, db, p = setup(checkout)
    def unknown(*args):
        raise GatewayUnknown()
    monkeypatch.setattr(ZarinpalSandbox, 'verify', unknown)
    response, key, intent = command(client, p)
    assert response.status_code == 200, response.text
    r = response.json()
    assert r['before']['status'] == 'pending'
    assert r['result']['status'] == 'unknown'
    assert db.scalar(text("SELECT state->>'payment' FROM customer_orders")) == 'verification'
    assert command(client, p, key, intent)[0].json() == r
    assert client.get(f"/api/v1/admin/payments/{p['id']}/inquiries/{key}").json() == r
    assert command(client, p, key, {**intent, 'reason': 'Changed'})[0].status_code == 409
    monkeypatch.setattr(ZarinpalSandbox, 'verify', lambda *args: '777')
    assert command(client, p, body=intent)[0].status_code == 409
    second, _, _ = command(client, p)
    assert second.json()['result']['status'] == 'paid'
    assert db.scalar(text("SELECT state->>'fulfillment' FROM customer_orders")) == 'on_hold'
    assert db.scalar(text('SELECT count(*) FROM payment_inquiries')) == 2
    assert len(client.get(f"/api/v1/admin/payments/{p['id']}/inquiries").json()['items']) == 2
    assert command(client, p)[0].status_code == 409
    assert db.scalar(text('SELECT count(*) FROM payment_inquiries')) == 2
    assert client.get(f"/api/v1/admin/payments/{p['id']}/inquiries/{key}").json() == r


def test_independent_permissions_csrf_and_authority(checkout):
    client, db, p = setup(checkout)
    owner = db.scalar(text('SELECT account_id FROM sandbox_payments'))
    intent = {'reason': 'Review', 'expected_version': client.get('/api/v1/admin/payments').json()['items'][0]['version']}
    url = f"/api/v1/admin/payments/{p['id']}/inquiries/{uuid4()}"
    assert client.put(url, json=intent).status_code == 403
    db.execute(text("DELETE FROM identity_account_roles WHERE account_id=:id AND role='admin'"), {'id': owner})
    db.execute(text("INSERT INTO identity_account_roles(account_id,role) VALUES(:id,'finance')"), {'id': owner})
    db.commit()
    assert client.get('/api/v1/admin/payments').status_code == 200
    db.execute(text("INSERT INTO identity_permission_overrides VALUES(:id,'finance.write',false)"), {'id': owner})
    db.commit()
    assert command(client, p)[0].status_code == 403
    db.execute(text("DELETE FROM identity_permission_overrides WHERE account_id=:id"), {'id': owner})
    db.commit()
    db.execute(text("UPDATE sandbox_payments SET authority=NULL"))
    db.commit()
    assert command(client, p)[0].status_code == 409
    db.execute(text("DELETE FROM identity_account_roles WHERE account_id=:id AND role='finance'"), {'id': owner})
    db.commit()
    assert client.get('/api/v1/admin/payments').status_code == 403
    assert db.scalar(text('SELECT count(*) FROM payment_inquiries')) == 0


def test_malformed_gateway_is_uncertain(monkeypatch):
    import io

    import pytest
    class Response(io.BytesIO):
        pass
    monkeypatch.setattr('nilart.contexts.payments.gateway.urlopen', lambda *args, **kwargs: Response(b'{"data": [], "errors": {}}'))
    with pytest.raises(GatewayUnknown):
        ZarinpalSandbox('sandbox').verify(1000, 'authority')
