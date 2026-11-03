"""Sandbox gateway adapters. Never log gateway payloads or credentials."""

import json
import re
from decimal import Decimal
from urllib.request import Request, urlopen

BASE = "https://sandbox.zarinpal.com"


class GatewayUnknown(Exception):
    pass


class GatewayRejected(Exception):
    pass


def rial(toman: str) -> int:
    value = Decimal(toman) * 10
    if (
        not value.is_finite()
        or value != value.to_integral_value()
        or not 1000 <= value <= 1_000_000_000_000
    ):
        raise ValueError("unsupported_gateway_amount")
    return int(value)


class ZarinpalSandbox:
    def __init__(self, merchant):
        self.merchant = merchant

    def post(self, action, body):
        payload = json.dumps({"merchant_id": self.merchant, **body}).encode()
        request = Request(
            f"{BASE}/pg/v4/payment/{action}.json",
            data=payload,
            headers={"Content-Type": "application/json", "User-Agent": "NilArt-Sandbox/1.0"},
        )
        try:
            with urlopen(request, timeout=8) as response:
                result = json.load(response)
            data = result.get("data")
            if not isinstance(data, dict) or type(data.get("code")) is not int:
                raise GatewayUnknown()
            return data
        except GatewayRejected:
            raise
        except Exception as exc:
            raise GatewayUnknown() from exc

    def request(self, amount, callback):
        data = self.post(
            "request",
            {
                "amount": amount,
                "currency": "IRR",
                "callback_url": callback,
                "description": "NilArt SANDBOX test order — no real purchase",
            },
        )
        if data["code"] != 100 or not re.fullmatch(
            r"[A-Za-z0-9]{20,80}", str(data.get("authority", ""))
        ):
            raise GatewayRejected()
        return data["authority"]

    def verify(self, amount, authority):
        data = self.post("verify", {"amount": amount, "authority": authority})
        if data["code"] not in (100, 101):
            raise GatewayRejected()
        reference = str(data.get("ref_id", ""))
        if not reference.isdigit() or int(reference) <= 0:
            raise GatewayUnknown()
        return reference


ZIBAL_BASE = "https://gateway.zibal.ir"


class ZibalSandbox:
    """Official Zibal test merchant. All amounts are integer IRR."""

    maximum_amount = 4_000_000_000

    def __init__(self, merchant="zibal", order_id=None):
        if merchant != "zibal":
            raise ValueError("zibal_sandbox_requires_test_merchant")
        self.merchant = merchant
        self.order_id = order_id

    def post(self, action, body):
        request = Request(
            f"{ZIBAL_BASE}/v1/{action}",
            data=json.dumps({"merchant": self.merchant, **body}).encode(),
            headers={"Content-Type": "application/json", "User-Agent": "NilArt-Sandbox/1.0"},
        )
        try:
            with urlopen(request, timeout=10) as response:
                data = json.load(response)
            if not isinstance(data, dict) or type(data.get("result")) is not int:
                raise GatewayUnknown()
            return data
        except Exception as exc:
            raise GatewayUnknown() from exc

    @staticmethod
    def track_id(value):
        if isinstance(value, bool) or not re.fullmatch(r"[1-9][0-9]{0,18}", str(value)):
            raise GatewayUnknown()
        return str(value)

    def request(self, amount, callback):
        if type(amount) is not int or not 1000 <= amount <= self.maximum_amount:
            raise GatewayRejected()
        data = self.post(
            "request",
            {
                "amount": amount,
                "callbackUrl": callback,
                "orderId": callback.rsplit("/", 1)[-1],
                "description": "NilArt SANDBOX test order — no real purchase",
            },
        )
        if data["result"] in {
            102,
            103,
            104,
            105,
            106,
            107,
            108,
            109,
            110,
            111,
            112,
            113,
            114,
            115,
            116,
            118,
            140,
            141,
        }:
            raise GatewayRejected()
        if data["result"] != 100:
            raise GatewayUnknown()
        return self.track_id(data.get("trackId"))

    def verify(self, amount, authority):
        track = int(self.track_id(authority))
        data = self.post("verify", {"trackId": track})
        if data["result"] in {201, 202}:
            # 201 may omit the amount/ref. 202 also includes still-pending payments.
            # Inquiry distinguishes authoritative failure from uncertain/pending.
            data = self.post("inquiry", {"trackId": track})
        if data["result"] != 100:
            raise GatewayUnknown()
        if type(data.get("amount")) is not int or data["amount"] != amount:
            raise GatewayUnknown()
        if self.order_id is not None and data.get("orderId") != self.order_id:
            raise GatewayUnknown()
        if type(data.get("status")) is not int:
            raise GatewayUnknown()
        if data["status"] in {3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 21}:
            raise GatewayRejected()
        if data["status"] != 1:
            raise GatewayUnknown()
        # Zibal's real test merchant returns null bank references, even on success.
        # Retain a clearly marked test receipt; never invent a bank reference.
        if data.get("refNumber") is None:
            return f"zibal-sandbox-{track}"
        return self.track_id(data.get("refNumber"))


def payment_provider(row):
    # Existing records predate provider selection and belong to Zarinpal.
    return (row.get("intent") or {}).get("_gateway_provider", "zarinpal_sandbox")


def start_url(row):
    authority = row["authority"]
    if payment_provider(row) == "zibal_sandbox":
        return f"{ZIBAL_BASE}/start/{ZibalSandbox.track_id(authority)}"
    if not re.fullmatch(r"[A-Za-z0-9]{20,80}", str(authority)):
        raise GatewayUnknown()
    return f"{BASE}/pg/StartPay/{authority}"
