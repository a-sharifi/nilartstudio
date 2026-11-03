"""Kavenegar verification lookup; plaintext OTPs never enter logs or URLs."""

import json
import re
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from nilart.contexts.identity.domain.rules import OtpPurpose, normalize_phone
from nilart.contexts.identity.infrastructure.otp import SmsUnavailable


class KavenegarSmsSender:
    def __init__(self, api_key, templates, approved_templates=()):
        self.api_key = api_key
        self.templates = dict(templates)
        self.approved_templates = frozenset(approved_templates)

    def send_code(self, phone: str, code: str, purpose: OtpPurpose) -> None:
        if not re.fullmatch(r"[0-9]{6}", code):
            raise SmsUnavailable("Invalid OTP format")
        self.send_template(phone, self.templates.get(purpose), {"token": code})

    def send_template(self, phone: str, template: str, tokens: dict[str, str]) -> int:
        if (
            not self.api_key
            or not re.fullmatch(r"[A-Za-z0-9]{20,200}", self.api_key)
            or not template
            or not re.fullmatch(r"[A-Za-z][A-Za-z0-9-]{0,99}", template)
            or template not in self.approved_templates
            or set(tokens) not in ({"token"}, {"token", "token2"})
            or any(
                not isinstance(value, str)
                or not re.fullmatch(r"[A-Za-z0-9\u0600-\u06ff.-]{1,100}", value)
                for value in tokens.values()
            )
        ):
            raise SmsUnavailable("SMS template is not approved or configured")
        try:
            recipient = "0" + normalize_phone(phone)[3:]
            request = Request(
                f"https://api.kavenegar.com/v1/{self.api_key}/verify/lookup.json",
                data=urlencode(
                    {"receptor": recipient, **tokens, "template": template, "type": "sms"}
                ).encode(),
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "application/json",
                },
                method="POST",
            )
            # No automatic retry: a timed-out send may already have reached the provider.
            with urlopen(request, timeout=8) as response:
                result = json.load(response)
            if not isinstance(result, dict) or result.get("return", {}).get("status") != 200:
                raise ValueError("provider_rejected")
            entries = result.get("entries")
            if not isinstance(entries, list) or len(entries) != 1:
                raise ValueError("provider_unconfirmed")
            entry = entries[0]
            if (
                not isinstance(entry, dict)
                or type(entry.get("messageid")) is not int
                or entry["messageid"] <= 0
                or type(entry.get("status")) is not int
                or entry["status"] not in {1, 2, 4, 5, 10}
                or normalize_phone(str(entry.get("receptor", ""))) != normalize_phone(phone)
            ):
                raise ValueError("provider_unconfirmed")
            return entry["messageid"]
        except Exception:
            # urllib errors include the credential-bearing URL. Never chain or expose them.
            raise SmsUnavailable("SMS provider did not confirm acceptance") from None
