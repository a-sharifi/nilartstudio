"""Read-only Tapin rating. No fallback prices and no carrier registration at checkout."""

import hashlib
import json
import unicodedata
from decimal import Decimal, InvalidOperation
from uuid import UUID

from sqlalchemy import text

from nilart.bootstrap.settings import settings
from nilart.contexts.shipping.tapin import Tapin, TapinError, rial


def normalized(value):
    value = unicodedata.normalize("NFKC", str(value)).replace("ي", "ی").replace("ك", "ک")
    return "".join(c for c in value if not c.isspace() and c not in "\u200c-ـ").removeprefix(
        "استان"
    )


def parcel_geometry(terms, current, method, discount=None):
    dimensions, weight, products = [], 0, []
    for line, term in zip(current["lines"], terms):
        for part in term["parts"]:
            if part["delivery"] != "physical":
                continue
            size = [part.get(k) for k in ("length_cm", "width_cm", "height_cm")]
            if any(v is None or v <= 0 for v in size) or not part.get("weight_grams"):
                raise TapinError("shipping_dimensions_required")
            count = part["quantity"] * line["item"]["quantity"]
            dimensions.append((*sorted(size, reverse=True), count))
            weight += part["weight_grams"] * count
        if term["delivery"] == "physical":
            # For bundles mixed with digital parts, insure the whole paid bundle value.
            # Physical weight is authoritative from component profiles.
            unit_weight = sum(
                (p.get("weight_grams") or 0) * p["quantity"]
                for p in term["parts"]
                if p["delivery"] == "physical"
            )
            products.append(
                dict(
                    count=line["item"]["quantity"],
                    discount=0,
                    price=rial(
                        Decimal(line["quote"]["unit"])
                        - Decimal((discount or {}).get("allocations", {}).get(line["id"], 0))
                        / 100
                        / line["item"]["quantity"],
                        "IRT",
                    ),
                    title=line["quote"]["name"][0],
                    weight=unit_weight,
                    product_id=None,
                )
            )
    if not dimensions or method.padding_cm is None or method.packaging_weight_grams is None:
        raise TapinError("shipping_packaging_required")
    pad = method.padding_cm * 2
    size = sorted(
        [
            max(d[0] for d in dimensions) + pad,
            max(d[1] for d in dimensions) + pad,
            sum(d[2] * d[3] for d in dimensions) + pad,
        ],
        reverse=True,
    )
    return size, weight + method.packaging_weight_grams, products


def choose_box(boxes, required):
    fits = []
    for box in boxes:
        try:
            dims = sorted(
                [Decimal(str(box[k])) for k in ("length", "width", "height")], reverse=True
            )
            code = int(box["pk"])
            if code > 0 and all(
                d.is_finite() and d > 0 and d >= Decimal(str(r)) for d, r in zip(dims, required)
            ):
                fits.append((dims[0] * dims[1] * dims[2], code, dims))
        except (KeyError, TypeError, ValueError, InvalidOperation):
            continue
    if not fits:
        raise TapinError("shipping_box_unavailable")
    return min(fits)


def quote_shipping(db, owner, current, terms, address, method, *, fetch=False, discount=None):
    if not address:
        return None, "address_required"
    if not settings.tapin_enabled or not settings.tapin_token or not settings.tapin_shop_id:
        return None, "tapin_unavailable"
    try:
        shop = str(UUID(settings.tapin_shop_id))
        size, weight, products = parcel_geometry(terms, current, method, discount)
        intent = dict(
            owner=str(owner),
            shop=shop,
            lines=current["lines"],
            terms=terms,
            discount=discount,
            address=address,
            method=method.model_dump(mode="json"),
        )
        key = hashlib.sha256(json.dumps(intent, sort_keys=True, default=str).encode()).hexdigest()
        db.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"), dict(key=key))
        cached = db.scalar(
            text(
                "SELECT quote FROM checkout_carrier_quotes WHERE key=:key AND account_id=:owner AND expires_at>now()"
            ),
            dict(key=key, owner=owner),
        )
        if cached:
            return cached, None
        if not fetch:
            return None, "shipping_quote_required"
        client = Tapin(settings.tapin_token.get_secret_value(), timeout=3)
        if not client.shop(shop)["active"]:
            raise TapinError("tapin_shop_inactive")
        tree = client.call("state/tree/", {})
        provinces = [p for p in tree if normalized(p["title"]) == normalized(address["province"])]
        cities = [
            c
            for p in provinces
            for c in p["cities"]
            if normalized(c["title"]) == normalized(address["city"])
        ]
        if len(provinces) != 1 or len(cities) != 1:
            raise TapinError("shipping_destination_unavailable")
        boxes = client.call("order/post/packing-box/", dict(shop_id=shop))["list"]
        _, box_id, box_dimensions = choose_box(boxes, size)
        names = address["name"].strip().split(maxsplit=1)
        mobile = address["phone"]
        if len(mobile) == 10 and mobile.startswith("9"):
            mobile = "0" + mobile
        payload = dict(
            shop_id=shop,
            address=address["street"],
            city_code=int(cities[0]["code"]),
            province_code=int(provinces[0]["code"]),
            description=None,
            email=None,
            employee_code=-1,
            first_name=names[0],
            last_name=names[-1],
            mobile=mobile,
            phone=None,
            postal_code=address["postal"],
            pay_type=1,
            order_type=1,
            package_weight=method.packaging_weight_grams,
            box_id=box_id,
            kiosk_id=None,
            products=products,
            has_insurance=True,
        )
        result = client.call("order/post/check-price/", payload)
        amount_rial = Decimal(str(result["total_price"]))
        if (
            not amount_rial.is_finite()
            or amount_rial < 0
            or amount_rial > Decimal("1e12")
            or amount_rial != amount_rial.to_integral_value()
        ):
            raise TapinError("tapin_invalid_response")
        if Decimal(str(result["total_weight"])) != weight:
            raise TapinError("tapin_weight_mismatch")
        expiry = db.scalar(text("SELECT now()+interval '5 minutes'"))
        quote = dict(
            id=key,
            amount=format(amount_rial / 10, ".2f"),
            currency="IRT",
            expires_at=expiry.isoformat(),
            weight_grams=weight,
            parcel_cm=[float(d) for d in box_dimensions],
            required_cm=size,
            box_id=box_id,
            province_code=payload["province_code"],
            city_code=payload["city_code"],
            packaging_weight_grams=method.packaging_weight_grams,
            estimated=any(p.get("weight_estimated") for t in terms for p in t["parts"]),
        )
        db.execute(
            text(
                "INSERT INTO checkout_carrier_quotes(key,account_id,quote,expires_at) VALUES(:key,:owner,CAST(:quote AS jsonb),:expiry) ON CONFLICT(key) DO UPDATE SET quote=excluded.quote,expires_at=excluded.expires_at"
            ),
            dict(key=key, owner=owner, quote=json.dumps(quote), expiry=expiry),
        )
        return quote, None
    except TapinError as exc:
        return None, exc.code
    except (KeyError, TypeError, ValueError, InvalidOperation):
        return None, "tapin_invalid_response"
