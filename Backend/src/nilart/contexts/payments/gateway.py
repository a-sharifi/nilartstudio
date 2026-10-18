"""Zarinpal v4 sandbox only. Never log gateway payloads or credentials."""
import json
import re
from decimal import Decimal
from urllib.request import Request, urlopen

BASE = 'https://sandbox.zarinpal.com'


class GatewayUnknown(Exception):
    pass


class GatewayRejected(Exception):
    pass


def rial(toman: str) -> int:
    value = Decimal(toman) * 10
    if not value.is_finite() or value != value.to_integral_value() or not 1000 <= value <= 1_000_000_000_000:
        raise ValueError('unsupported_gateway_amount')
    return int(value)


class ZarinpalSandbox:
    def __init__(self, merchant):
        self.merchant = merchant

    def post(self, action, body):
        payload = json.dumps({'merchant_id': self.merchant, **body}).encode()
        request = Request(f'{BASE}/pg/v4/payment/{action}.json', data=payload, headers={'Content-Type': 'application/json', 'User-Agent': 'NilArt-Sandbox/1.0'})
        try:
            with urlopen(request, timeout=8) as response:
                result = json.load(response)
            data = result.get('data')
            if not isinstance(data, dict) or not isinstance(data.get('code'), int):
                raise GatewayRejected()
            return data
        except GatewayRejected:
            raise
        except Exception as exc:
            raise GatewayUnknown() from exc

    def request(self, amount, callback):
        data = self.post('request', {'amount': amount, 'currency': 'IRR', 'callback_url': callback, 'description': 'NilArt SANDBOX test order — no real purchase'})
        if data['code'] != 100 or not re.fullmatch(r'[A-Za-z0-9]{20,80}', str(data.get('authority', ''))):
            raise GatewayRejected()
        return data['authority']

    def verify(self, amount, authority):
        data = self.post('verify', {'amount': amount, 'authority': authority})
        if data['code'] not in (100, 101):
            raise GatewayRejected()
        reference = str(data.get('ref_id', ''))
        if not reference.isdigit() or int(reference) <= 0:
            raise GatewayUnknown()
        return reference
