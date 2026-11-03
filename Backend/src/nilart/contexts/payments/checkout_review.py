"""Authoritative accepted checkout terms. No unconfigured zero costs or inferred policies."""

import hashlib
import json
from decimal import ROUND_CEILING, ROUND_HALF_UP, Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import text

from nilart.contexts.business.router import current_settings


class ReviewError(Exception):
    pass


class Selection(BaseModel):
    model_config = ConfigDict(extra="forbid")
    basket_version: int = Field(strict=True, ge=0)
    address_id: UUID | None = None
    shipping_method_id: UUID | None = None
    discount_code: str | None = Field(default=None, pattern=r"^[A-Z0-9][A-Z0-9_-]{0,79}$")
    discount_version: int | None = Field(default=None, strict=True, ge=1)


class Review(BaseModel):
    basket_version: int
    fingerprint: str
    settings_version: int
    requires_address: bool
    weight_grams: int
    shipping_methods: list[dict]
    shipping_amount: str | None
    tax_amount: str | None
    subtotal: str
    total: str | None
    discount_amount: str
    policy: dict
    lines: list[dict]
    issues: list[str]
    ready: bool


def profile(db, kind, id):
    c = db.scalar(
        text(
            "SELECT r.intent->'content' FROM catalog_profiles p JOIN catalog_profile_revisions r ON r.id=p.published_revision AND r.kind=p.kind AND r.entity_id=p.entity_id WHERE p.kind=:kind AND p.entity_id=:id"
        ),
        {"kind": kind, "id": id},
    )
    revision = db.scalar(
        text("SELECT published_revision FROM catalog_profiles WHERE kind=:kind AND entity_id=:id"),
        {"kind": kind, "id": id},
    )
    return c, str(revision) if revision else None


def line_terms(db, line, *, require_weight=None):
    if require_weight is None:
        db.execute(text("SELECT pg_advisory_xact_lock_shared(78214,34)"))
        _, settings, _ = current_settings(db)
        active = [m for m in settings.shipping_methods if m.active]
        require_weight = not active or any(
            m.carrier == "tapin"
            or Decimal(m.per_kg_amount) != 0
            or m.maximum_weight_grams is not None
            for m in active
        )
    item, q = line["item"], line["quote"]
    refs = q["parts"] if item["kind"] == "bundle" else [dict(sku_id=item["item_id"], quantity=1)]
    parts = []
    for part in refs:
        if item["kind"] == "artwork":
            c = db.scalar(
                text("SELECT document FROM catalog_artwork_details WHERE artwork_id=:id"),
                {"id": item["item_id"]},
            )
            if not c or c.get("sample", True):
                raise ReviewError("checkout_artwork_configuration_missing")
            if c["edition"] == "print":
                c, revision = profile(db, "skus", c["linked_sku_id"])
            else:
                revision = db.scalar(
                    text("SELECT published_revision FROM catalog_artwork_documents WHERE id=:id"),
                    {"id": item["item_id"]},
                )
                c = {**c, "delivery": "digital" if c["edition"] == "digital" else "physical"}
                # Freeze the licensed terms with the accepted identity and profile revision.
        else:
            c, revision = profile(db, "skus", part["sku_id"])
        if (
            not c
            or c.get("delivery") is None
            or c.get("returnable") is None
            or (require_weight and c["delivery"] == "physical" and c.get("weight_grams") is None)
        ):
            raise ReviewError("checkout_delivery_configuration_missing")
        if c["delivery"] == "digital" and c.get("returnable"):
            raise ReviewError("checkout_digital_return_policy_invalid")
        parts.append(
            dict(
                reference_id=str(part["sku_id"]),
                quantity=part["quantity"],
                delivery=c["delivery"],
                weight_grams=c.get("weight_grams"),
                length_cm=c.get("length_cm"),
                width_cm=c.get("width_cm"),
                height_cm=c.get("height_cm"),
                weight_estimated=c.get("weight_estimated", False),
                returnable=c["returnable"],
                revision_id=str(revision),
                license_fa=c.get("license_fa", ""),
                license_en=c.get("license_en", ""),
            )
        )
    return dict(
        basket_line_id=line["id"],
        delivery="physical" if any(p["delivery"] == "physical" for p in parts) else "digital",
        returnable=any(p["delivery"] == "physical" and p["returnable"] for p in parts),
        parts=parts,
    )


def rounded(value, rule):
    return value.quantize(
        Decimal(".01") if rule == "half_up_cent" else Decimal("1"),
        rounding=ROUND_HALF_UP if rule == "half_up_cent" else ROUND_CEILING,
    )


def build(db, basket, current, account, selection):
    db.execute(text("SELECT pg_advisory_xact_lock_shared(78214,34)"))
    version, settings, _ = current_settings(db)
    missing = [
        k
        for k in [
            "tax_percent",
            "tax_basis",
            "tax_rounding",
            "refund_policy",
            "reservation_minutes",
            "return_days",
            "return_policy_fa",
            "return_policy_en",
        ]
        if getattr(settings, k) is None or getattr(settings, k) == ""
    ]
    if missing:
        raise ReviewError("checkout_business_configuration_missing")
    active_methods = [m for m in settings.shipping_methods if m.active]
    require_weight = any(
        m.carrier == "tapin" or Decimal(m.per_kg_amount) != 0 or m.maximum_weight_grams is not None
        for m in active_methods
    )
    terms = [line_terms(db, line, require_weight=require_weight) for line in current["lines"]]
    weight = sum(
        (p["weight_grams"] or 0) * p["quantity"] * line["item"]["quantity"]
        for line, term in zip(current["lines"], terms)
        for p in term["parts"]
        if p["delivery"] == "physical"
    )
    physical = any(t["delivery"] == "physical" for t in terms)
    if physical and (settings.shipping_calculation is None or settings.shipping_rounding is None):
        raise ReviewError("checkout_business_configuration_missing")
    address = None
    if selection.address_id:
        address = db.scalar(
            text(
                "SELECT data FROM customer_records WHERE id=:id AND account_id=:owner AND kind='address' FOR SHARE"
            ),
            {"id": selection.address_id, "owner": account.id},
        )
        if not address:
            raise ReviewError("address_unavailable")
    issues = []
    methods = (
        [
            m
            for m in settings.shipping_methods
            if m.active
            and (m.maximum_weight_grams is None or weight <= m.maximum_weight_grams)
            and (not m.provinces or (address and address["province"] in m.provinces))
        ]
        if physical
        else []
    )
    if physical and not address:
        issues.append("address_required")
    selected = next((m for m in methods if m.id == selection.shipping_method_id), None)
    if physical and not selected:
        issues.append("shipping_method_required")
    if not physical and (selection.address_id or selection.shipping_method_id):
        raise ReviewError("checkout_digital_shipping_not_applicable")
    shipping = None if physical and not selected else Decimal(0)
    carrier_quote = None
    discount = None
    if selection.discount_code:
        from nilart.contexts.discounts.engine import DiscountError, evaluate, rule_by_code

        db.execute(text("SELECT pg_advisory_xact_lock(78214,33)"))
        try:
            rule = rule_by_code(db, selection.discount_code)
            if rule["version"] != selection.discount_version:
                raise ReviewError("discount_changed")
            phone = db.scalar(
                text("SELECT phone FROM identity_accounts WHERE id=:id"), {"id": account.id}
            )
            discount = evaluate(db, rule, current, account.id, phone)
        except DiscountError as exc:
            raise ReviewError(str(exc)) from exc
    elif selection.discount_version is not None:
        raise ReviewError("discount_invalid")
    subtotal = Decimal(discount["total"] if discount else current["totals"]["total"])
    if subtotal != subtotal.quantize(Decimal(".01")):
        raise ReviewError("checkout_price_precision_invalid")
    if selected and selected.carrier == "tapin":
        from nilart.contexts.shipping.checkout import quote_shipping

        carrier_quote, issue = quote_shipping(
            db, account.id, current, terms, address, selected, discount=discount
        )
        if issue:
            issues.append(issue)
            shipping = None
        else:
            shipping = Decimal(carrier_quote["amount"])
    elif selected:
        kilograms = Decimal(weight) / 1000
        if settings.shipping_calculation == "started_kg":
            kilograms = kilograms.to_integral_value(rounding=ROUND_CEILING)
        shipping = rounded(
            Decimal(selected.base_amount) + kilograms * Decimal(selected.per_kg_amount),
            settings.shipping_rounding,
        )
    if (
        selected
        and shipping is not None
        and selected.free_above_amount is not None
        and subtotal > Decimal(selected.free_above_amount)
    ):
        shipping = Decimal(0)
    taxable = subtotal + ((shipping or 0) if settings.tax_basis == "items_and_shipping" else 0)
    # Item prices and frozen paid component shares remain gross when tax is included.
    # tax_amount is the additional charge; the included portion is disclosed separately.
    included_tax = (
        rounded(
            taxable * Decimal(settings.tax_percent) / (100 + Decimal(settings.tax_percent)),
            settings.tax_rounding,
        )
        if settings.tax_included and shipping is not None
        else Decimal(0)
    )
    tax = (
        (
            Decimal(0)
            if settings.tax_included
            else rounded(taxable * Decimal(settings.tax_percent) / 100, settings.tax_rounding)
        )
        if shipping is not None
        else None
    )
    total = subtotal + shipping + tax if shipping is not None and tax is not None else None
    policy = dict(
        settings_version=version,
        carrier_quote=carrier_quote,
        return_days=settings.return_days,
        return_policy_fa=settings.return_policy_fa,
        return_policy_en=settings.return_policy_en,
        refund_policy=settings.refund_policy,
        tax_included=settings.tax_included,
        included_tax_amount=format(included_tax, ".2f"),
        free_shipping_above=selected.free_above_amount if selected else None,
        tax_percent=settings.tax_percent,
        tax_basis=settings.tax_basis,
        tax_rounding=settings.tax_rounding,
        shipping_calculation=settings.shipping_calculation,
        shipping_rounding=settings.shipping_rounding,
        reservation_minutes=settings.reservation_minutes,
    )
    payload = dict(
        basket_version=basket["version"],
        settings_version=version,
        requires_address=physical,
        weight_grams=weight,
        shipping_methods=[m.model_dump(mode="json") for m in methods],
        shipping_amount=format(shipping, ".2f") if shipping is not None else None,
        tax_amount=format(tax, ".2f") if tax is not None else None,
        subtotal=format(subtotal, ".2f"),
        total=format(total, ".2f") if total is not None else None,
        discount_amount=discount["amount"] if discount else "0",
        policy=policy,
        lines=terms,
        issues=issues,
        ready=not issues,
    )
    canonical = dict(
        review=payload,
        selection=selection.model_dump(mode="json"),
        basket_lines=current["lines"],
        address=address,
    )
    payload["fingerprint"] = hashlib.sha256(
        json.dumps(canonical, sort_keys=True, separators=(",", ":"), default=str).encode()
    ).hexdigest()
    return payload, address, discount
