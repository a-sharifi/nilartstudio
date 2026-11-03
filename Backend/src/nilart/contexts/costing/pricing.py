"""Price proposals freeze exact cost inputs; only explicit publication changes SKU prices."""

import hashlib
import json
from datetime import date, datetime
from decimal import Decimal
from fractions import Fraction
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.contexts.business.router import Strict
from nilart.contexts.catalog.infrastructure.prices import PriceError, SqlSKUPriceRepository
from nilart.contexts.catalog.presentation.prices import PriceOutput
from nilart.contexts.costing.recipes import RecipeEstimate, estimate
from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.contexts.identity.presentation.router import failure
from nilart.shared.database import session_dependency
from nilart.shared.outbox import enqueue

router = APIRouter(prefix="/api/v1/admin/pricing", tags=["price-proposals"])
Amount = Annotated[str, Field(pattern=r"^(?:0|[1-9][0-9]{0,17})(?:\.[0-9]{1,6})?$")]
FractionInput = Annotated[str, Field(pattern=r"^(?:0(?:\.[0-9]{1,6})?|1(?:\.0{1,6})?)$")]


class Parameters(Strict):
    sku_id: UUID
    on: date
    good_output: int = Field(strict=True, ge=1, le=1000000)
    margin: FractionInput
    fee: FractionInput
    fixed_cost: Amount
    round_to: Amount
    rounding: Literal["half_up", "up"]
    custom_price: Amount | None = None
    discount_fraction: FractionInput

    @model_validator(mode="after")
    def valid(self):
        if (
            Decimal(self.margin) + Decimal(self.fee) >= 1
            or Decimal(self.round_to) <= 0
            or Decimal(self.discount_fraction) >= 1
            or (self.custom_price is not None and Decimal(self.custom_price) <= 0)
        ):
            raise ValueError("Margin plus fee must be below one; rounding and price positive")
        return self


class Command(Strict):
    expected_version: int = Field(strict=True, ge=0, le=2147483646)
    action: Literal["draft", "revise", "publish", "reject"]
    content: Parameters | None = None
    expected_fingerprint: str | None = Field(default=None, pattern=r"^[a-f0-9]{64}$")
    reason: str = Field(min_length=1, max_length=1000)

    @model_validator(mode="after")
    def shape(self):
        draft = self.action in {"draft", "revise"}
        if (
            draft != (self.content is not None)
            or draft != (self.expected_fingerprint is not None)
            or ((self.action == "draft") != (self.expected_version == 0))
        ):
            raise ValueError("Draft/revision requires complete reviewed calculation")
        return self


class BundleImpact(BaseModel):
    id: UUID
    slug: str
    title_fa: str
    title_en: str
    quantity: int


class Snapshot(BaseModel):
    parameters: Parameters
    cost: RecipeEstimate
    current_price: PriceOutput
    affected_bundles: list[BundleImpact]
    cost_per_output: str
    cost_with_fixed: str
    suggested_price: str
    selected_price: str
    actual_margin: str
    profit: str
    discounted_price: str
    discounted_margin: str
    fingerprint: str


class Proposal(BaseModel):
    id: UUID
    sku_id: UUID
    status: Literal["pending", "published", "rejected"]
    version: int
    content: Parameters
    snapshot: Snapshot
    reason: str
    updated_at: datetime
    stale: bool = False


class Event(BaseModel):
    id: UUID
    proposal_id: UUID
    actor_id: UUID
    version: int
    action: str
    intent: Command
    result: Proposal
    created_at: datetime


class ProposalPage(BaseModel):
    items: list[Proposal]
    next_cursor: UUID | None


class History(BaseModel):
    items: list[Event]
    next_before_version: int | None


class PricingError(ValueError):
    pass


def fmt(value, places=6):
    """Half-up rounding of exact rational values (including negative margins)."""
    scaled = value * 10**places
    negative = scaled < 0
    scaled = abs(scaled)
    number = scaled.numerator // scaled.denominator
    if (scaled.numerator % scaled.denominator) * 2 >= scaled.denominator:
        number += 1
    whole, tail = divmod(number, 10**places)
    return (
        ("-" if negative and number else "")
        + str(whole)
        + (f".{tail:0{places}d}" if places else "")
    )


def computation(db, request, principal, p):
    row = (
        db.execute(
            text(
                "SELECT r.id,v.revision_id FROM cost_recipes r JOIN cost_recipe_versions v ON v.recipe_id=r.id AND v.version=r.version WHERE r.sku_id=:sku"
            ),
            dict(sku=p.sku_id),
        )
        .mappings()
        .first()
    )
    if not row:
        raise PricingError("pricing_recipe_missing")
    raw = estimate(
        row["id"], row["revision_id"], request, p.on, p.good_output, 6, "half_up", db, principal
    )
    cost = RecipeEstimate.model_validate(raw)
    if not cost.complete or cost.currency != "IRT":
        raise PricingError("pricing_cost_incomplete")
    price = SqlSKUPriceRepository(db).read(p.sku_id)
    bundles = [
        dict(r)
        for r in db.execute(
            text(
                "SELECT b.id,b.slug,b.title_fa,b.title_en,c.quantity FROM catalog_bundle_components c JOIN catalog_bundles b ON b.id=c.bundle_id WHERE c.sku_id=:sku ORDER BY b.id"
            ),
            dict(sku=p.sku_id),
        ).mappings()
    ]
    c = Fraction(int(cost.exact_numerator), int(cost.exact_denominator)) / p.good_output + Fraction(
        p.fixed_cost
    )
    m, f = Fraction(p.margin), Fraction(p.fee)
    suggested = c / (1 - m - f)
    step = Fraction(p.round_to)
    units = suggested / step
    count = units.numerator // units.denominator
    remainder = units.numerator % units.denominator
    if (p.rounding == "up" and remainder) or (
        p.rounding == "half_up" and remainder * 2 >= units.denominator
    ):
        count += 1
    rounded = count * step
    final = Fraction(p.custom_price) if p.custom_price is not None else rounded
    if final <= 0 or final >= 10**18:
        raise PricingError("pricing_price_out_of_range")
    net = final * (1 - Fraction(p.discount_fraction))
    margin = (final * (1 - f) - c) / final
    snapshot = jsonable_encoder(
        dict(
            parameters=p.model_dump(mode="json"),
            cost=cost.model_dump(mode="json"),
            current_price=price,
            affected_bundles=bundles,
            cost_per_output=fmt(c - Fraction(p.fixed_cost)),
            cost_with_fixed=fmt(c),
            suggested_price=fmt(rounded),
            selected_price=fmt(final),
            actual_margin=fmt(margin),
            profit=fmt(final * (1 - f) - c),
            discounted_price=fmt(net),
            discounted_margin=fmt((net * (1 - f) - c) / net),
        )
    )
    snapshot["fingerprint"] = hashlib.sha256(
        json.dumps(snapshot, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    return snapshot


@router.post("/calculate", response_model=Snapshot)
def calculate(
    body: Parameters,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("pricing.publish")),
):
    # Calculation is private and side-effect free. All stored commands recheck authorization.
    try:
        return computation(db, request, principal, body)
    except (PricingError, PriceError) as exc:
        return failure(request, str(exc), 409)


@router.get("/choices")
def choices(
    q: str = Query("", max_length=200),
    sku_id: UUID | None = None,
    cursor: UUID | None = None,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("pricing.publish")),
):
    rows = (
        db.execute(
            text(
                "SELECT s.id,s.code,r.content->>'title_fa' AS title_fa,r.content->>'title_en' AS title_en FROM cost_recipes r JOIN catalog_skus s ON s.id=r.sku_id WHERE (:q='' OR strpos(lower(concat_ws(' ',s.code,r.content->>'title_fa',r.content->>'title_en')),lower(CAST(:q AS text)))>0) AND (CAST(:sku AS uuid) IS NULL OR s.id=:sku) AND (CAST(:cursor AS uuid) IS NULL OR s.id>:cursor) ORDER BY s.id LIMIT 26"
            ),
            dict(q=q.strip(), sku=sku_id, cursor=cursor),
        )
        .mappings()
        .all()
    )
    return dict(
        items=[dict(r) for r in rows[:25]], next_cursor=rows[24]["id"] if len(rows) > 25 else None
    )


def view(db, row, request, principal):
    result = dict(row)
    if row["status"] == "pending":
        try:
            result["stale"] = (
                computation(db, request, principal, Parameters.model_validate(row["content"]))[
                    "fingerprint"
                ]
                != row["snapshot"]["fingerprint"]
            )
        except (PricingError, PriceError):
            result["stale"] = True
    return result


@router.get("/proposals", response_model=ProposalPage)
def listing(
    request: Request,
    q: str = Query("", max_length=200),
    status: Literal["pending", "published", "rejected"] | None = None,
    cursor: UUID | None = None,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("pricing.publish")),
):
    rows = (
        db.execute(
            text(
                "SELECT p.* FROM pricing_proposals p JOIN catalog_skus s ON s.id=p.sku_id WHERE (:q='' OR strpos(lower(concat_ws(' ',s.code,p.reason)),lower(CAST(:q AS text)))>0) AND (CAST(:status AS text) IS NULL OR p.status=:status) AND (CAST(:cursor AS uuid) IS NULL OR p.id>:cursor) ORDER BY p.id LIMIT 26"
            ),
            dict(q=q.strip(), status=status, cursor=cursor),
        )
        .mappings()
        .all()
    )
    return dict(
        items=[view(db, r, request, principal) for r in rows[:25]],
        next_cursor=rows[24]["id"] if len(rows) > 25 else None,
    )


@router.get("/proposals/{id}", response_model=Proposal)
def detail(
    id: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("pricing.publish")),
):
    row = (
        db.execute(text("SELECT * FROM pricing_proposals WHERE id=:id"), dict(id=id))
        .mappings()
        .first()
    )
    return (
        view(db, row, request, principal)
        if row
        else failure(request, "pricing_proposal_missing", 404)
    )


@router.get("/proposals/{id}/events", response_model=History)
def history(
    id: UUID,
    before: int | None = Query(None, ge=1),
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("pricing.publish")),
):
    rows = (
        db.execute(
            text(
                "SELECT * FROM pricing_events WHERE proposal_id=:id AND (CAST(:before AS int) IS NULL OR version<:before) ORDER BY version DESC LIMIT 21"
            ),
            dict(id=id, before=before),
        )
        .mappings()
        .all()
    )
    return dict(
        items=[dict(r) for r in rows[:20]],
        next_before_version=rows[19]["version"] if len(rows) > 20 else None,
    )


@router.get("/proposals/{id}/commands/{key}", response_model=Event)
def receipt(
    id: UUID,
    key: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("pricing.publish")),
):
    row = (
        db.execute(
            text(
                "SELECT * FROM pricing_events WHERE id=:key AND proposal_id=:id AND actor_id=:actor"
            ),
            dict(key=key, id=id, actor=principal.account_id),
        )
        .mappings()
        .first()
    )
    return dict(row) if row else failure(request, "pricing_command_missing", 404)


@router.put("/proposals/{id}/commands/{key}", response_model=Event)
def command(
    id: UUID,
    key: UUID,
    body: Command,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("pricing.publish")),
):
    actor, denied = write_access(request, db, principal, "pricing.publish")
    if denied is not None:
        return denied
    # Same resource/recipe lock, then catalogue lock, then SKU: no unreviewed input change can race publication.
    db.execute(text("SELECT pg_advisory_xact_lock(78214,29)"))
    db.execute(text("SELECT pg_advisory_xact_lock(78214,21)"))
    db.execute(text("SELECT pg_advisory_xact_lock(78214,41)"))
    intent = body.model_dump(mode="json")
    try:
        prior = (
            db.execute(text("SELECT * FROM pricing_events WHERE id=:key"), dict(key=key))
            .mappings()
            .first()
        )
        if prior:
            if (
                str(prior["proposal_id"]) != str(id)
                or str(prior["actor_id"]) != str(actor.id)
                or prior["intent"] != intent
            ):
                raise PricingError("pricing_command_conflict")
            return dict(prior)
        row = (
            db.execute(text("SELECT * FROM pricing_proposals WHERE id=:id FOR UPDATE"), dict(id=id))
            .mappings()
            .first()
        )
        if (row["version"] if row else 0) != body.expected_version:
            raise PricingError("pricing_version_conflict")
        if row and row["status"] != "pending":
            raise PricingError("pricing_status_conflict")
        if body.action in {"draft", "revise"}:
            p = body.content
            if row and str(p.sku_id) != str(row["sku_id"]):
                raise PricingError("pricing_sku_conflict")
            SqlSKUPriceRepository(db).read(p.sku_id, lock=True)
            snapshot = computation(db, request, principal, p)
            if snapshot["fingerprint"] != body.expected_fingerprint:
                raise PricingError("pricing_inputs_stale")
            content = p.model_dump(mode="json")
            status = "pending"
        else:
            if not row:
                raise PricingError("pricing_proposal_missing")
            content = row["content"]
            snapshot = row["snapshot"]
            status = "rejected" if body.action == "reject" else "published"
            if body.action == "publish":
                p = Parameters.model_validate(content)
                SqlSKUPriceRepository(db).read(p.sku_id, lock=True)
                fresh = computation(db, request, principal, p)
                if fresh["fingerprint"] != snapshot["fingerprint"]:
                    raise PricingError("pricing_inputs_stale")
                SqlSKUPriceRepository(db).save(
                    p.sku_id,
                    actor.id,
                    snapshot["current_price"]["version"],
                    dict(amount=Decimal(snapshot["selected_price"]), currency="IRT"),
                )
        params = dict(
            id=id,
            sku=content["sku_id"],
            version=body.expected_version + 1,
            status=status,
            content=json.dumps(content),
            snapshot=json.dumps(snapshot),
            reason=body.reason,
        )
        result = (
            db.execute(
                text(
                    "INSERT INTO pricing_proposals(id,sku_id,status,version,content,snapshot,reason) VALUES(:id,:sku,:status,:version,CAST(:content AS jsonb),CAST(:snapshot AS jsonb),:reason) ON CONFLICT(id) DO UPDATE SET status=EXCLUDED.status,version=EXCLUDED.version,content=EXCLUDED.content,snapshot=EXCLUDED.snapshot,reason=EXCLUDED.reason,updated_at=now() RETURNING *"
                ),
                params,
            )
            .mappings()
            .one()
        )
        event = (
            db.execute(
                text(
                    "INSERT INTO pricing_events(id,proposal_id,actor_id,version,action,intent,result) VALUES(:key,:id,:actor,:version,:action,CAST(:intent AS jsonb),CAST(:result AS jsonb)) RETURNING *"
                ),
                dict(
                    key=key,
                    id=id,
                    actor=actor.id,
                    version=params["version"],
                    action=body.action,
                    intent=json.dumps(intent),
                    result=json.dumps(jsonable_encoder(dict(result))),
                ),
            )
            .mappings()
            .one()
        )
        SqlAccountManagement(db).audit(
            actor.id,
            actor.id,
            "pricing.proposal_changed",
            dict(
                proposal_id=str(id),
                action=body.action,
                before=jsonable_encoder(dict(row)) if row else None,
                after=jsonable_encoder(dict(result)),
            ),
            body.reason,
        )
        enqueue(
            db,
            "pricing.proposal_changed",
            dict(
                proposal_id=str(id),
                event_id=str(key),
                version=params["version"],
                action=body.action,
            ),
        )
        db.commit()
        return dict(event)
    except (PricingError, PriceError) as exc:
        db.rollback()
        return failure(request, str(exc), 409)
    except Exception:
        db.rollback()
        raise
