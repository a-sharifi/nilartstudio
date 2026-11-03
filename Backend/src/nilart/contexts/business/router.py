"""Private versioned business configuration, including explicit incomplete values."""

import json
import unicodedata
from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.contexts.identity.presentation.router import failure
from nilart.shared.database import session_dependency
from nilart.shared.outbox import enqueue

router = APIRouter(prefix="/api/v1/admin/settings", tags=["business-settings"])
Amount = Annotated[str, Field(pattern=r"^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,2})?$")]
Rate = Annotated[str, Field(pattern=r"^(?:0|[1-9][0-9]?|100)(?:\.[0-9]{1,4})?$")]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    @model_validator(mode="after")
    def printable(self):
        def check(value):
            if isinstance(value, str) and any(
                unicodedata.category(c) == "Cc" and c != "\n" for c in value
            ):
                raise ValueError("Control characters are not allowed")
            if isinstance(value, dict):
                for v in value.values():
                    check(v)
            if isinstance(value, list):
                for v in value:
                    check(v)

        check(self.model_dump())
        return self


class ShippingMethod(Strict):
    carrier: Literal["manual", "tapin"] = "manual"
    packaging_weight_grams: int | None = Field(default=None, strict=True, ge=1, le=100000)
    padding_cm: float | None = Field(default=None, ge=0, le=20)
    id: UUID
    title_fa: str = Field(min_length=1, max_length=120)
    title_en: str = Field(min_length=1, max_length=120)
    provinces: list[str] = Field(default_factory=list, max_length=100)
    free_above_amount: Amount | None = None
    base_amount: Amount
    per_kg_amount: Amount
    maximum_weight_grams: int | None = Field(default=None, strict=True, ge=1, le=1000000)
    active: bool = Field(default=False, strict=True)

    @model_validator(mode="after")
    def unique_provinces(self):
        if any(not p or len(p) > 120 for p in self.provinces) or len(set(self.provinces)) != len(
            self.provinces
        ):
            raise ValueError("Invalid province scope")
        return self


class Settings(Strict):
    title_fa: str = Field(default="", max_length=200)
    title_en: str = Field(default="", max_length=200)
    contact_phone: str = Field(default="", max_length=40)
    contact_email: str = Field(default="", max_length=254)
    contact_address: str = Field(default="", max_length=2000)
    currency: Literal["IRT"] = "IRT"
    tax_included: bool = Field(default=False, strict=True)
    tax_percent: Rate | None = None
    tax_basis: Literal["items", "items_and_shipping"] | None = None
    shipping_calculation: Literal["actual_weight", "started_kg"] | None = None
    shipping_rounding: Literal["half_up_cent", "ceil_toman"] | None = None
    tax_rounding: Literal["half_up_cent", "ceil_toman"] | None = None
    refund_policy: Literal["items_and_proportional_tax_shipping_if_unshipped"] | None = None
    reservation_minutes: int | None = Field(default=None, strict=True, ge=1, le=1440)
    return_days: int | None = Field(default=None, strict=True, ge=0, le=365)
    return_policy_fa: str = Field(default="", max_length=10000)
    return_policy_en: str = Field(default="", max_length=10000)
    shipping_methods: list[ShippingMethod] = Field(default_factory=list, max_length=50)
    commission_complexity_amount: Amount | None = None
    commission_base_amount: Amount | None = None
    commission_digital_amount: Amount | None = None
    commission_physical_amount: Amount | None = None
    commission_revision_limit: int | None = Field(default=None, strict=True, ge=0, le=100)
    commission_terms_fa: str = Field(default="", max_length=10000)
    commission_terms_en: str = Field(default="", max_length=10000)

    @model_validator(mode="after")
    def valid(self):
        import re

        if self.tax_percent is not None and Decimal(self.tax_percent) > 100:
            raise ValueError("Tax exceeds 100 percent")
        if self.contact_phone and not re.fullmatch(r"\+?[0-9][0-9 ()-]{2,39}", self.contact_phone):
            raise ValueError("Invalid contact phone")
        if self.contact_email and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", self.contact_email):
            raise ValueError("Invalid contact email")
        if len({m.id for m in self.shipping_methods}) != len(self.shipping_methods):
            raise ValueError("Duplicate shipping method")
        return self


def missing(content: Settings) -> list[str]:
    keys = [
        "tax_basis",
        "shipping_calculation",
        "shipping_rounding",
        "tax_rounding",
        "refund_policy",
        "title_fa",
        "title_en",
        "tax_percent",
        "reservation_minutes",
        "return_days",
        "return_policy_fa",
        "return_policy_en",
    ]
    result = [k for k in keys if getattr(content, k) is None or getattr(content, k) == ""]
    if not any(m.active for m in content.shipping_methods):
        result.append("shipping_methods")
    result += [
        k
        for k in (
            "commission_base_amount",
            "commission_complexity_amount",
            "commission_digital_amount",
            "commission_physical_amount",
            "commission_revision_limit",
            "commission_terms_fa",
            "commission_terms_en",
        )
        if getattr(content, k) is None or getattr(content, k) == ""
    ]
    return result


class Output(BaseModel):
    version: int
    content: Settings
    updated_at: datetime | None
    missing: list[str]


class Save(Strict):
    expected_version: int = Field(strict=True, ge=0, le=2147483646)
    content: Settings
    reason: str = Field(min_length=1, max_length=1000)


class Revision(BaseModel):
    revision_id: UUID
    actor_id: UUID
    expected_version: int
    version: int
    content: Settings
    reason: str
    created_at: datetime


class History(BaseModel):
    items: list[Revision]
    next_before_version: int | None


def current_settings(db: Session) -> tuple[int, Settings, datetime | None]:
    row = (
        db.execute(text("SELECT * FROM business_settings WHERE key='business'")).mappings().first()
    )
    return (
        (row["version"], Settings.model_validate(row["content"]), row["updated_at"])
        if row
        else (0, Settings(), None)
    )


@router.get("", response_model=Output)
def read(
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("identity.manage")),
):
    version, content, updated = current_settings(db)
    return {
        "version": version,
        "content": content,
        "updated_at": updated,
        "missing": missing(content),
    }


@router.get("/versions", response_model=History)
def history(
    before: int | None = Query(None, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("identity.manage")),
):
    rows = (
        db.execute(
            text(
                "SELECT * FROM business_setting_versions WHERE (CAST(:before AS integer) IS NULL OR version<:before) ORDER BY version DESC LIMIT :limit"
            ),
            {"before": before, "limit": limit + 1},
        )
        .mappings()
        .all()
    )
    return {
        "items": [dict(r) for r in rows[:limit]],
        "next_before_version": rows[limit - 1]["version"] if len(rows) > limit else None,
    }


@router.get("/versions/{revision}", response_model=Revision)
def receipt(
    revision: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("identity.manage")),
):
    row = (
        db.execute(
            text("SELECT * FROM business_setting_versions WHERE revision_id=:id"), {"id": revision}
        )
        .mappings()
        .first()
    )
    return dict(row) if row else failure(request, "settings_revision_not_found", 404)


@router.put("/versions/{revision}", response_model=Revision)
def save(
    revision: UUID,
    body: Save,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("identity.manage")),
):
    actor, denied = write_access(request, db, principal, "identity.manage")
    if denied is not None:
        return denied
    return save_record(db, actor, revision, body, request)


def save_record(db, actor, revision, body, request):
    db.execute(text("SELECT pg_advisory_xact_lock(78214,34)"))
    content = body.content.model_dump(mode="json")
    prior = (
        db.execute(
            text("SELECT * FROM business_setting_versions WHERE revision_id=:id"), {"id": revision}
        )
        .mappings()
        .first()
    )
    if prior:
        if (
            str(prior["actor_id"]),
            prior["expected_version"],
            prior["content"],
            prior["reason"],
        ) == (str(actor.id), body.expected_version, content, body.reason):
            return dict(prior)
        return failure(request, "settings_revision_conflict", 409)
    version, _, _ = current_settings(db)
    if version != body.expected_version:
        return failure(request, "settings_version_conflict", 409)
    params = {
        "version": version + 1,
        "expected": version,
        "content": json.dumps(content),
        "revision": revision,
        "actor": actor.id,
        "reason": body.reason,
    }
    try:
        db.execute(
            text(
                "INSERT INTO business_settings(key,version,content) VALUES('business',:version,CAST(:content AS jsonb)) ON CONFLICT(key) DO UPDATE SET version=:version,content=CAST(:content AS jsonb),updated_at=now()"
            ),
            params,
        )
        row = (
            db.execute(
                text(
                    "INSERT INTO business_setting_versions(revision_id,actor_id,expected_version,version,content,reason) VALUES(:revision,:actor,:expected,:version,CAST(:content AS jsonb),:reason) RETURNING *"
                ),
                params,
            )
            .mappings()
            .one()
        )
        payload = {"revision_id": str(revision), "version": version + 1}
        SqlAccountManagement(db).audit(
            actor.id, actor.id, "business.settings_saved", payload, body.reason
        )
        enqueue(db, "business.settings_saved", payload)
        db.commit()
        return dict(row)
    except Exception:
        db.rollback()
        raise
