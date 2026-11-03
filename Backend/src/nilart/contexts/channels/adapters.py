"""Provider boundary. Basalam v1 gateway paths verified against its official OpenAPI.
Never use a seller's browser token, follow redirects, or retry ambiguous writes.
"""

from typing import Protocol

import httpx

from nilart.bootstrap.settings import settings


class ChannelError(Exception):
    def __init__(self, code, *, uncertain=False):
        self.code, self.uncertain = code, uncertain
        super().__init__(code)


class Adapter(Protocol):
    def product(self, product_id: int) -> dict: ...
    def create(self, vendor_id: int, body: dict) -> dict: ...
    def update(self, product_id: int, body: dict, variation_id: int | None = None) -> dict: ...
    def parcel(self, parcel_id: int) -> dict: ...


class Basalam:
    base = "https://openapi.basalam.com"

    def __init__(self, token, transport=None):
        if not token or any(c in token for c in "\r\n"):
            raise ChannelError("channel_credentials_missing")
        self.token, self.transport = token, transport

    def call(self, method, path, *, body=None, params=None, files=None, data=None):
        write = method != "GET"
        headers = {"Authorization": "Bearer " + self.token, "Accept": "application/json"}
        try:
            with httpx.Client(
                timeout=httpx.Timeout(12, connect=4),
                transport=self.transport,
                follow_redirects=False,
                trust_env=False,
            ) as client:
                with client.stream(
                    method,
                    self.base + path,
                    headers=headers,
                    json=body,
                    params=params,
                    files=files,
                    data=data,
                ) as response:
                    if response.status_code in (401, 403):
                        raise ChannelError("channel_access_denied")
                    if not 200 <= response.status_code < 300:
                        raise ChannelError(
                            "channel_remote_rejected"
                            if 400 <= response.status_code < 500
                            and response.status_code not in (408, 409, 429)
                            else "channel_result_unknown",
                            uncertain=write
                            and response.status_code not in (400, 401, 403, 404, 422),
                        )
                    content = bytearray()
                    for chunk in response.iter_bytes():
                        content.extend(chunk)
                        if len(content) > 4 * 1024 * 1024:
                            raise ChannelError("channel_invalid_response", uncertain=write)
                    import json

                    value = json.loads(content)
                    if not isinstance(value, dict):
                        raise ChannelError("channel_invalid_response", uncertain=write)
                    return value
        except ChannelError:
            raise
        except (httpx.HTTPError, ValueError, TypeError):
            raise ChannelError("channel_result_unknown", uncertain=write) from None

    def me(self):
        return self.call("GET", "/v1/users/me")

    def products(self, vendor_id, page=1):
        return self.call(
            "GET", f"/v1/vendors/{vendor_id}/products", params={"page": page, "per_page": 50}
        )

    def product(self, product_id):
        return self.call("GET", f"/v1/products/{int(product_id)}", params=None)

    def categories(self):
        return self.call("GET", "/v1/categories")

    def category(self, category_id):
        return self.call("GET", f"/v1/categories/{int(category_id)}")

    def attributes(self, category_id):
        return self.call("GET", f"/v1/categories/{int(category_id)}/attributes")

    def create(self, vendor_id, body):
        return self.call("POST", f"/v1/vendors/{int(vendor_id)}/products", body=body)

    def update(self, product_id, body, variation_id=None):
        path = f"/v1/products/{int(product_id)}"
        if variation_id:
            path += f"/variations/{int(variation_id)}"
        return self.call("PATCH", path, body=body)

    def upload(self, name, content):
        return self.call(
            "POST",
            "/v1/files",
            files={
                "file": (
                    name,
                    content,
                    "image/jpeg" if name.lower().endswith((".jpg", ".jpeg")) else "image/png",
                )
            },
            data={"file_type": "product.photo"},
        )

    def parcels(self, vendor_id, cursor=None):
        return self.call(
            "GET",
            "/v1/vendor-parcels",
            params={
                "items.vendor_ids": str(vendor_id),
                "per_page": 50,
                **({"cursor": cursor} if cursor else {}),
            },
        )

    def parcel(self, parcel_id):
        return self.call("GET", f"/v1/vendor-parcels/{int(parcel_id)}")

    def events(self):
        return self.call("GET", "/v1/webhooks/events")

    def register_webhook(self, url, secret):
        import json

        return self.call(
            "POST",
            "/v1/webhooks",
            body={
                "event_ids": [3, 5, 7, 8],
                "request_method": "POST",
                "request_headers": json.dumps({"Authorization": "Bearer " + secret}),
                "url": url,
                "is_active": True,
                "register_me": True,
            },
        )


def adapter(channel):
    if channel != "basalam":
        raise ChannelError("channel_adapter_not_implemented")
    if not settings.basalam_enabled:
        raise ChannelError("channel_transport_disabled")
    if not settings.basalam_token:
        raise ChannelError("channel_credentials_missing")
    return Basalam(settings.basalam_token.get_secret_value())
