"""Tapin public v2 transport. Never retry registration or disclose provider response bodies."""

from decimal import Decimal, InvalidOperation
from typing import Annotated
from uuid import UUID

import httpx
from pydantic import BaseModel, ConfigDict, Field


class TapinError(Exception):
    def __init__(self, code, uncertain=False):
        self.code, self.uncertain = code, uncertain
        super().__init__(code)


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Parcel(Strict):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    mobile: str = Field(pattern=r"^09[0-9]{9}$")
    postal_code: str = Field(pattern=r"^[0-9]{10}$")
    address: str = Field(min_length=10, max_length=2000)
    province_code: int = Field(strict=True, ge=1)
    city_code: int = Field(strict=True, ge=1)
    box_id: int = Field(strict=True, ge=1)
    package_weight: int = Field(strict=True, ge=1, le=1000000)
    product_weights: dict[UUID, Annotated[int, Field(strict=True, ge=1, le=1000000)]] = Field(
        min_length=1, max_length=100
    )
    order_type: int = Field(default=1, strict=True, ge=0, le=3)
    has_insurance: bool = Field(strict=True)


def rial(value, currency):
    number = Decimal(value) * (10 if currency == "IRT" else 1)
    if number < 0 or number != number.to_integral_value():
        raise TapinError("tapin_whole_rial_required")
    return int(number)


def payload(shop_id, shipment_id, snapshot, quantities, parcel):
    if parcel.order_type not in (0, 1, 3):
        raise TapinError("tapin_service_invalid")
    selected = {str(k): v for k, v in quantities.items()}
    weights = {str(k): v for k, v in parcel.product_weights.items()}
    if set(weights) != set(selected) or any(
        type(w) is not int or not 1 <= w <= 1000000 for w in weights.values()
    ):
        raise TapinError("tapin_measured_weights_required")
    products = []
    for line in snapshot["items"]:
        if str(line["id"]) not in selected:
            continue
        if line["delivery"] != "physical":
            raise TapinError("tapin_physical_only")
        quantity = selected[str(line["id"])]
        if not 1 <= quantity <= line["quantity"]:
            raise TapinError("tapin_quantity_invalid")
        # A partial parcel retains the historical per-unit paid share exactly.
        unit = Decimal(line["unit_amount"]) - Decimal(line["discount_amount"]) / line["quantity"]
        products.append(
            dict(
                count=quantity,
                discount=0,
                price=rial(unit, snapshot["currency"]),
                title=line["title_fa"],
                weight=weights[str(line["id"])],
                product_id=None,
            )
        )
    if len(products) != len(selected):
        raise TapinError("tapin_line_not_found")
    return {
        **parcel.model_dump(exclude={"product_weights"}),
        "register_type": 0,
        "shop_id": str(shop_id),
        "manual_id": str(shipment_id),
        "employee_code": -1,
        "description": None,
        "email": None,
        "phone": None,
        "pay_type": 1,
        "kiosk_id": None,
        "content_type": 1,
        "products": products,
    }


class Tapin:
    base = "https://api.tapin.ir/api/v2/public/"

    def __init__(self, token, transport=None, *, timeout=20):
        if not token or "\n" in token or "\r" in token:
            raise TapinError("tapin_not_configured")
        self.token, self.transport = token, transport
        self.timeout = timeout

    def call(self, path, data, *, write=False):
        try:
            with httpx.Client(
                timeout=httpx.Timeout(self.timeout, connect=min(5, self.timeout)),
                follow_redirects=False,
                transport=self.transport,
                trust_env=False,
            ) as client:
                response = client.post(
                    self.base + path,
                    headers={"Authorization": self.token, "Accept": "application/json"},
                    json=data,
                )
                if response.status_code in (401, 403):
                    raise TapinError("tapin_access_denied")
                if response.status_code not in (200, 201):
                    raise TapinError("tapin_unavailable", uncertain=write)
                if len(response.content) > 2_000_000:
                    raise TapinError("tapin_invalid_response", uncertain=write)
                if "text/html" in response.headers.get("content-type", "").lower() and (
                    "checking your browser" in response.text.lower()
                    or "/cdn-cgi/" in response.text.lower()
                ):
                    raise TapinError("tapin_security_challenge", uncertain=write)
                result = response.json()
                status = result["returns"]["status"]
                if type(status) is not int:
                    raise ValueError()
                if status not in (200, 201):
                    raise TapinError(
                        "tapin_rejected",
                        uncertain=write
                        and status not in (300, 322, 337, 338, 343, 344, 345, 346, 347, 357),
                    )
                if not isinstance(result["entries"], (dict, list)):
                    raise ValueError()
                return result["entries"]
        except TapinError:
            raise
        except (httpx.HTTPError, ValueError, KeyError, TypeError):
            raise TapinError(
                "tapin_result_unknown" if write else "tapin_unavailable", uncertain=write
            ) from None

    def shop(self, shop_id):
        row = self.call("shop/detail/", {"shop_id": str(shop_id)})
        # Detail endpoint documents active=1; overview table contradicts it.
        # Registration remains gated by this explicit detail check and local enablement.
        if not isinstance(row, dict) or type(row.get("status")) is not int:
            raise TapinError("tapin_invalid_response")
        return dict(active=row["status"] == 1, status=row["status"])

    def register(self, body):
        row = self.call("order/post/register/", body, write=True)
        if (
            not isinstance(row, dict)
            or type(row.get("order_id")) is not int
            or row["order_id"] <= 0
            or type(row.get("status")) is not int
        ):
            raise TapinError("tapin_result_unknown", uncertain=True)
        barcode = row.get("barcode")
        if barcode is not None and (not isinstance(barcode, str) or len(barcode) > 100):
            raise TapinError("tapin_result_unknown", uncertain=True)
        return dict(order_id=row["order_id"], status=row["status"], barcode=barcode or None)

    def detail(self, shop_id, order_id):
        row = self.call("order/post/detail/", dict(shop_id=str(shop_id), order_id=order_id))
        if (
            not isinstance(row, dict)
            or row.get("order_id") != order_id
            or type(row.get("status")) is not int
        ):
            raise TapinError("tapin_invalid_response")
        return row

    def label(self, shop_id, order_uuid):
        try:
            with httpx.Client(
                timeout=20, follow_redirects=False, transport=self.transport, trust_env=False
            ) as client:
                r = client.post(
                    self.base + "order/post/detail/label/",
                    headers={"Authorization": self.token},
                    json={"shop_id": str(shop_id), "orders": [str(order_uuid)]},
                )
                if (
                    r.status_code != 200
                    or "text/html" not in r.headers.get("content-type", "")
                    or len(r.content) > 2_000_000
                ):
                    raise TapinError("tapin_label_unavailable")
                if "checking your browser" in r.text.lower() or "/cdn-cgi/" in r.text.lower():
                    raise TapinError("tapin_security_challenge")
                from nilart.contexts.shipping.labels import printable

                return printable(r.text)
        except httpx.HTTPError:
            raise TapinError("tapin_label_unavailable") from None


def same_parcel(expected, actual):
    """Explicit human recovery still rejects a different recipient, destination or contents."""
    for field in (
        "first_name",
        "last_name",
        "mobile",
        "postal_code",
        "address",
        "city_code",
        "pay_type",
        "order_type",
        "package_weight",
    ):
        if str(expected[field]).strip() != str(actual.get(field, "")).strip():
            return False
    if str(expected["province_code"]) != str(actual.get("state_code", "")):
        return False
    try:

        def items(rows):
            return sorted(
                (
                    str(p["title"]),
                    int(p["count"]),
                    Decimal(str(p["price"])),
                    Decimal(str(p["discount"])),
                    int(p["weight"]),
                )
                for p in rows
            )

        return items(expected["products"]) == items(actual["products"])
    except (KeyError, TypeError, ValueError, InvalidOperation):
        return False
