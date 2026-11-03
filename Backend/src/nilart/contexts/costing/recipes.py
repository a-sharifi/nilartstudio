"""Versioned SKU recipes. Estimates have no price, inventory or production effects."""
import json
import unicodedata
from datetime import date, datetime
from decimal import Decimal
from fractions import Fraction
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from nilart.contexts.costing.cutting import CuttingInput, CuttingLayout, calculate_layout
from nilart.contexts.costing.router import DECIMAL, Resource
from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.contexts.identity.presentation.router import failure
from nilart.shared.database import session_dependency
from nilart.shared.outbox import enqueue

router = APIRouter(prefix="/api/v1/admin/costing", tags=["cost-recipes"])


class Line(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    id: UUID
    label: str = Field(min_length=1, max_length=200)
    resource_id: UUID
    resource_revision_id: UUID
    quantity: str | None = Field(default=None, pattern=DECIMAL)
    unit: Literal["base", "purchase"]
    basis: Literal["output", "batch"]
    cutting_yield: int | None = Field(default=None, strict=True, ge=1, le=1000000)
    waste_fraction: str | None = Field(default=None, pattern=DECIMAL)
    cutting_approval: str = Field(default="", max_length=500)

    @model_validator(mode="after")
    def valid(self):
        if self.quantity is not None and Decimal(self.quantity) <= 0:
            raise ValueError("Consumption must be positive; unknown is null")
        if self.waste_fraction is not None and Decimal(self.waste_fraction) >= 1:
            raise ValueError("Waste must be less than one")
        if self.cutting_yield is not None and not self.cutting_approval:
            raise ValueError("Cutting yield requires workshop approval details")
        return self


class Recipe(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    sku_id: UUID
    title_fa: str = Field(min_length=1, max_length=200)
    title_en: str = Field(min_length=1, max_length=200)
    valid_from: date | None = None
    valid_to: date | None = None
    active: bool = Field(default=True, strict=True)
    lines: list[Line] = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def valid(self):
        if len({line.id for line in self.lines}) != len(self.lines):
            raise ValueError("Duplicate line identity")
        if self.valid_from and self.valid_to and self.valid_from > self.valid_to:
            raise ValueError("Invalid recipe validity")
        values = [self.title_fa, self.title_en, *(v for line in self.lines for v in (line.label, line.cutting_approval))]
        if any(unicodedata.category(c) == "Cc" for value in values for c in value):
            raise ValueError("Printable text required")
        return self


class SaveRecipe(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    expected_version: int = Field(strict=True, ge=0, le=2147483646)
    content: Recipe
    reason: str = Field(min_length=1, max_length=1000)

    @model_validator(mode="after")
    def valid(self):
        if any(unicodedata.category(c) == "Cc" for c in self.reason):
            raise ValueError("Printable reason required")
        return self


class RecipeOutput(BaseModel):
    id: UUID
    version: int
    content: Recipe
    updated_at: datetime
    sku_code: str


class Snapshot(BaseModel):
    resource_id: UUID
    revision_id: UUID
    version: int
    content: Resource


class RevisionOutput(BaseModel):
    revision_id: UUID
    recipe_id: UUID
    actor_id: UUID
    version: int
    expected_version: int
    content: Recipe
    snapshots: list[Snapshot]
    reason: str
    created_at: datetime


class RecipePage(BaseModel):
    items: list[RecipeOutput]
    next_cursor: UUID | None


class RevisionPage(BaseModel):
    items: list[RevisionOutput]
    next_before_version: int | None


class SKUChoice(BaseModel):
    id: UUID
    code: str
    recipe_id: UUID | None


class SKUPage(BaseModel):
    items: list[SKUChoice]
    next_cursor: UUID | None


@router.get("/recipe-skus", response_model=SKUPage)
def skus(q: str = Query("", max_length=160), cursor: UUID | None = None, limit: int = Query(25, ge=1, le=100),
         db: Session = Depends(session_dependency), principal: Principal = Depends(require_permission("pricing.publish"))):
    rows = db.execute(text("SELECT s.id,s.code,r.id recipe_id FROM catalog_skus s LEFT JOIN cost_recipes r ON r.sku_id=s.id "
        "WHERE (:q='' OR strpos(lower(s.code),lower(CAST(:q AS text)))>0) "
        "AND (CAST(:cursor AS uuid) IS NULL OR s.id>:cursor) ORDER BY s.id LIMIT :limit"),
        {"q": q.strip(), "cursor": cursor, "limit": limit+1}).mappings().all()
    return {"items": [dict(r) for r in rows[:limit]], "next_cursor": rows[limit-1]["id"] if len(rows)>limit else None}


@router.get("/recipes", response_model=RecipePage)
def recipes(q: str = Query("", max_length=200), active: bool | None = None, cursor: UUID | None = None,
            limit: int = Query(25, ge=1, le=100), db: Session = Depends(session_dependency),
            principal: Principal = Depends(require_permission("pricing.publish"))):
    rows = db.execute(text("SELECT r.*,s.code sku_code FROM cost_recipes r JOIN catalog_skus s ON s.id=r.sku_id "
        "WHERE (:q='' OR strpos(lower(concat_ws(' ',s.code,r.content->>'title_fa',r.content->>'title_en')),lower(CAST(:q AS text)))>0) "
        "AND (CAST(:active AS boolean) IS NULL OR (r.content->>'active')::boolean=:active) "
        "AND (CAST(:cursor AS uuid) IS NULL OR r.id>:cursor) ORDER BY r.id LIMIT :limit"),
        {"q": q.strip(), "active": active, "cursor": cursor, "limit": limit+1}).mappings().all()
    return {"items": [dict(r) for r in rows[:limit]], "next_cursor": rows[limit-1]["id"] if len(rows)>limit else None}


@router.get("/recipes/{id}", response_model=RecipeOutput)
def detail(id: UUID, request: Request, db: Session = Depends(session_dependency),
           principal: Principal = Depends(require_permission("pricing.publish"))):
    row = db.execute(text("SELECT r.*,s.code sku_code FROM cost_recipes r JOIN catalog_skus s ON s.id=r.sku_id WHERE r.id=:id"), {"id": id}).mappings().first()
    return dict(row) if row else failure(request, "recipe_not_found", 404)


@router.get("/recipes/{id}/versions", response_model=RevisionPage)
def versions(id: UUID, request: Request, before: int | None = Query(None, ge=1), limit: int = Query(20, ge=1, le=100),
             db: Session = Depends(session_dependency), principal: Principal = Depends(require_permission("pricing.publish"))):
    if not db.scalar(text("SELECT id FROM cost_recipes WHERE id=:id"), {"id": id}):
        return failure(request, "recipe_not_found", 404)
    rows = db.execute(text("SELECT * FROM cost_recipe_versions WHERE recipe_id=:id "
        "AND (CAST(:before AS integer) IS NULL OR version<:before) ORDER BY version DESC LIMIT :limit"),
        {"id": id, "before": before, "limit": limit+1}).mappings().all()
    return {"items": [dict(r) for r in rows[:limit]], "next_before_version": rows[limit-1]["version"] if len(rows)>limit else None}


@router.get("/recipes/{id}/versions/{revision}", response_model=RevisionOutput)
def receipt(id: UUID, revision: UUID, request: Request, db: Session = Depends(session_dependency),
            principal: Principal = Depends(require_permission("pricing.publish"))):
    row = db.execute(text("SELECT * FROM cost_recipe_versions WHERE recipe_id=:id AND revision_id=:revision"), {"id": id, "revision": revision}).mappings().first()
    return dict(row) if row else failure(request, "recipe_revision_not_found", 404)


@router.put("/recipes/{id}/versions/{revision}", response_model=RevisionOutput)
def save(id: UUID, revision: UUID, body: SaveRecipe, request: Request, db: Session = Depends(session_dependency),
         principal: Principal = Depends(require_permission("pricing.publish"))):
    actor, denied = write_access(request, db, principal, "pricing.publish")
    if denied is not None:
        return denied
    # Resources and recipes share this lock so a snapshot cannot race a rate edit.
    db.execute(text("SELECT pg_advisory_xact_lock(78214,29)"))
    content = body.content.model_dump(mode="json")
    prior = db.execute(text("SELECT * FROM cost_recipe_versions WHERE revision_id=:key"), {"key": revision}).mappings().first()
    if prior:
        if (prior["recipe_id"], str(prior["actor_id"]), prior["expected_version"], prior["content"], prior["reason"]) == (id, str(actor.id), body.expected_version, content, body.reason):
            return dict(prior)
        return failure(request, "recipe_revision_conflict", 409)
    current = db.execute(text("SELECT * FROM cost_recipes WHERE id=:id FOR UPDATE"), {"id": id}).mappings().first()
    if (current["version"] if current else 0) != body.expected_version:
        return failure(request, "recipe_version_conflict", 409)
    if current and current["sku_id"] != body.content.sku_id:
        return failure(request, "recipe_sku_immutable", 409)
    if not db.scalar(text("SELECT id FROM catalog_skus WHERE id=:id"), {"id": body.content.sku_id}):
        return failure(request, "sku_not_found", 404)
    snapshots = {}
    for line in body.content.lines:
        row = db.execute(text("SELECT v.*,r.version current_version FROM cost_resource_versions v JOIN cost_resources r ON r.id=v.resource_id "
            "WHERE v.resource_id=:id AND v.revision_id=:revision"), {"id": line.resource_id, "revision": line.resource_revision_id}).mappings().first()
        if not row:
            return failure(request, "recipe_resource_not_found", 422)
        resource = Resource.model_validate(row["content"])
        if body.content.active and (row["version"] != row["current_version"] or not resource.active):
            return failure(request, "recipe_resource_changed", 409)
        if resource.kind == "service" and (line.unit == "purchase" or line.cutting_yield is not None or line.waste_fraction is not None):
            return failure(request, "recipe_service_basis_invalid", 422)
        if line.cutting_yield is not None and resource.base_unit != "sheet":
            return failure(request, "recipe_cutting_unit_invalid", 422)
        snapshots[str(line.resource_revision_id)] = {"resource_id": str(line.resource_id), "revision_id": str(line.resource_revision_id), "version": row["version"], "content": row["content"]}
    params = {"id": id, "sku": body.content.sku_id, "version": body.expected_version+1, "content": json.dumps(content)}
    try:
        if current:
            db.execute(text("UPDATE cost_recipes SET content=CAST(:content AS jsonb),version=:version,updated_at=now() WHERE id=:id"), params)
        else:
            db.execute(text("INSERT INTO cost_recipes(id,sku_id,content,version) VALUES(:id,:sku,CAST(:content AS jsonb),:version)"), params)
        row = db.execute(text("INSERT INTO cost_recipe_versions(revision_id,recipe_id,actor_id,expected_version,version,content,snapshots,reason) "
            "VALUES(:key,:id,:actor,:expected,:version,CAST(:content AS jsonb),CAST(:snapshots AS jsonb),:reason) RETURNING *"),
            {**params, "key": revision, "actor": actor.id, "expected": body.expected_version, "snapshots": json.dumps(list(snapshots.values())), "reason": body.reason}).mappings().one()
        event = {"recipe_id": str(id), "revision_id": str(revision), "version": params["version"]}
        SqlAccountManagement(db).audit(actor.id, actor.id, "costing.recipe_saved", event, body.reason)
        enqueue(db, "costing.recipe_saved", event)
        db.commit()
        return dict(row)
    except IntegrityError:
        db.rollback()
        return failure(request, "recipe_sku_conflict", 409)
    except Exception:
        db.rollback()
        raise


def current_resources(db: Session, ids: list[str]) -> dict[str, dict]:
    if not ids:
        return {}
    rows = db.execute(text("SELECT * FROM cost_resources WHERE id=ANY(CAST(:ids AS uuid[]))"), {"ids": list(set(ids))}).mappings().all()
    return {str(row["id"]): dict(row) for row in rows}


def rounded(value: Fraction, places: int, mode: str) -> str:
    """Round a rational exactly, with no floating-point or Decimal division."""
    integer, remainder = divmod(value.numerator * 10**places, value.denominator)
    if (mode == "up" and remainder) or (mode == "half_up" and remainder*2 >= value.denominator):
        integer += 1
    digits = str(integer).zfill(places+1)
    return digits[:-places]+"."+digits[-places:] if places else digits


class LineEstimate(BaseModel):
    line_id: UUID
    label: str
    resource_id: UUID
    resource_version: int
    currency: Literal["IRT", "IRR"] | None
    amount: str | None
    exact_numerator: str | None
    exact_denominator: str | None
    missing: list[str]


class RecipeEstimate(BaseModel):
    recipe_id: UUID
    revision_id: UUID
    version: int
    estimate_date: date
    good_output: int
    places: int
    rounding: Literal["half_up", "up"]
    complete: bool
    currency: Literal["IRT", "IRR"] | None
    total: str | None
    per_output: str | None
    exact_numerator: str | None
    exact_denominator: str | None
    missing: list[str]
    lines: list[LineEstimate]


@router.get("/recipes/{id}/estimate", response_model=RecipeEstimate)
def estimate(id: UUID, revision: UUID, request: Request, on: date, good_output: int = Query(ge=1, le=1000000),
             places: int = Query(ge=0, le=6), rounding: Literal["half_up", "up"] = Query(),
             db: Session = Depends(session_dependency), principal: Principal = Depends(require_permission("pricing.publish"))):
    row = db.execute(text("SELECT * FROM cost_recipe_versions WHERE recipe_id=:id AND revision_id=:revision"), {"id": id, "revision": revision}).mappings().first()
    if not row:
        return failure(request, "recipe_revision_not_found", 404)
    recipe = Recipe.model_validate(row["content"])
    snapshots = {v["revision_id"]: v for v in row["snapshots"]}
    resources = current_resources(db, [v["resource_id"] for v in row["snapshots"]])
    current_recipe = db.execute(text("SELECT version,content FROM cost_recipes WHERE id=:id"), {"id": id}).mappings().one()
    missing = []
    if not recipe.active or not current_recipe["content"]["active"]:
        missing.append("recipe_archived")
    if current_recipe["version"] != row["version"]:
        missing.append("recipe_version_changed")
    if recipe.valid_from is None:
        missing.append("recipe_validity_unknown")
    if (recipe.valid_from and on<recipe.valid_from) or (recipe.valid_to and on>recipe.valid_to):
        missing.append("recipe_not_valid_on_date")
    lines, currencies = [], set()
    total = Fraction(0)
    for line in recipe.lines:
        snapshot = snapshots[str(line.resource_revision_id)]
        resource = Resource.model_validate(snapshot["content"])
        current = resources[str(line.resource_id)]
        issues = []
        if current["version"] != snapshot["version"]:
            issues.append("resource_version_changed")
        if not resource.active or not current["content"]["active"]:
            issues.append("resource_archived")
        if resource.rate is None:
            issues.append("rate_unknown")
        elif resource.valid_from is None:
            issues.append("rate_validity_unknown")
        if (resource.valid_from and on<resource.valid_from) or (resource.valid_to and on>resource.valid_to):
            issues.append("rate_not_valid_on_date")
        if line.quantity is None:
            issues.append("quantity_unknown")
        if resource.kind == "material" and line.waste_fraction is None:
            issues.append("waste_unknown")
        if line.unit == "purchase" and (resource.purchase_unit is None or resource.purchase_to_base is None):
            issues.append("conversion_unknown")
        amount = None
        if not issues and resource.rate and line.quantity is not None:
            amount = Fraction(line.quantity) * Fraction(resource.rate.amount)
            if line.unit == "purchase":
                assert resource.purchase_to_base is not None
                amount *= Fraction(resource.purchase_to_base)
            amount /= line.cutting_yield or 1
            if resource.kind == "material":
                assert line.waste_fraction is not None
                amount /= 1-Fraction(line.waste_fraction)
            if line.basis == "output":
                amount *= good_output
            total += amount
        if resource.rate:
            currencies.add(resource.rate.currency)
        lines.append({"line_id": line.id, "label": line.label, "resource_id": line.resource_id, "resource_version": snapshot["version"],
            "currency": resource.rate.currency if resource.rate else None, "amount": rounded(amount, places, rounding) if amount is not None else None,
            "exact_numerator": str(amount.numerator) if amount is not None else None, "exact_denominator": str(amount.denominator) if amount is not None else None, "missing": issues})
        if issues and "line_incomplete" not in missing:
            missing.append("line_incomplete")
    if len(currencies)>1:
        missing.append("mixed_currencies")
    return {"recipe_id": id, "revision_id": revision, "version": row["version"], "estimate_date": on, "good_output": good_output,
        "places": places, "rounding": rounding, "complete": not missing, "currency": next(iter(currencies)) if len(currencies)==1 else None,
        "total": rounded(total, places, rounding) if not missing else None, "per_output": rounded(total/good_output, places, rounding) if not missing else None,
        "exact_numerator": str(total.numerator) if not missing else None, "exact_denominator": str(total.denominator) if not missing else None, "missing": missing, "lines": lines}


class RateReview(BaseModel):
    resource_id: UUID
    code: str
    pinned_version: int
    current_version: int
    reasons: list[str]


class ReviewItem(BaseModel):
    recipe_id: UUID
    version: int
    sku_code: str
    title_fa: str
    title_en: str
    resources: list[RateReview]


class ReviewPage(BaseModel):
    items: list[ReviewItem]
    next_cursor: UUID | None


@router.get("/recipe-reviews", response_model=ReviewPage)
def reviews(on: date, q: str = Query("", max_length=200), cursor: UUID | None = None,
            limit: int = Query(25, ge=1, le=100), db: Session = Depends(session_dependency),
            principal: Principal = Depends(require_permission("pricing.publish"))):
    # Qualify dependencies before pagination; no queue seed or background timing gap.
    rows = db.execute(text("SELECT r.id,r.version,r.content,s.code sku_code,v.snapshots "
        "FROM cost_recipes r JOIN catalog_skus s ON s.id=r.sku_id "
        "JOIN cost_recipe_versions v ON v.recipe_id=r.id AND v.version=r.version "
        "WHERE (r.content->>'active')::boolean "
        "AND (:q='' OR strpos(lower(concat_ws(' ',s.code,r.content->>'title_fa',r.content->>'title_en')),lower(CAST(:q AS text)))>0) "
        "AND (CAST(:cursor AS uuid) IS NULL OR r.id>:cursor) AND EXISTS ("
        "SELECT 1 FROM jsonb_array_elements(v.snapshots) snap JOIN cost_resources c ON c.id=(snap->>'resource_id')::uuid "
        "WHERE c.version<>(snap->>'version')::int OR NOT (c.content->>'active')::boolean "
        "OR c.content->'rate'='null'::jsonb OR c.content->>'valid_from' IS NULL "
        "OR (c.content->>'valid_from')::date>:on OR (c.content->>'valid_to')::date<:on) "
        "ORDER BY r.id LIMIT :limit"), {"on": on, "q": q.strip(), "cursor": cursor, "limit": limit+1}).mappings().all()
    items = []
    resources = current_resources(db, [snapshot["resource_id"] for row in rows[:limit] for snapshot in row["snapshots"]])
    for row in rows[:limit]:
        dependencies = []
        for snapshot in row["snapshots"]:
            current = resources[snapshot["resource_id"]]
            resource = Resource.model_validate(current["content"])
            reasons = []
            if current["version"] != snapshot["version"]:
                reasons.append("resource_version_changed")
            if not resource.active:
                reasons.append("resource_archived")
            if resource.rate is None:
                reasons.append("rate_unknown")
            elif resource.valid_from is None:
                reasons.append("rate_validity_unknown")
            if (resource.valid_from and on<resource.valid_from) or (resource.valid_to and on>resource.valid_to):
                reasons.append("rate_not_valid_on_date")
            if reasons:
                dependencies.append({"resource_id": snapshot["resource_id"], "code": current["code"], "pinned_version": snapshot["version"], "current_version": current["version"], "reasons": reasons})
        items.append({"recipe_id": row["id"], "version": row["version"], "sku_code": row["sku_code"], "title_fa": row["content"]["title_fa"], "title_en": row["content"]["title_en"], "resources": dependencies})
    return {"items": items, "next_cursor": rows[limit-1]["id"] if len(rows)>limit else None}


@router.get("/cutting-layout", response_model=CuttingLayout)
def cutting_layout(request: Request, inputs: Annotated[CuttingInput, Query()],
                   principal: Principal = Depends(require_permission("pricing.publish"))):
    try:
        return calculate_layout(inputs)
    except ValueError:
        return failure(request, "cutting_layout_out_of_range", 422)
