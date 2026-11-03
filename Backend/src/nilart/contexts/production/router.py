"""Production/WIP costs are actual recorded costs, separate from recipe price estimates."""

import json
from datetime import date, datetime
from decimal import ROUND_HALF_UP, Decimal, localcontext
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import text
from sqlalchemy.orm import Session

from nilart.contexts.business.router import Strict
from nilart.contexts.costing.recipes import Recipe
from nilart.contexts.identity.domain.permissions import Principal
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.identity.presentation.access import require_permission
from nilart.contexts.identity.presentation.management import write_access
from nilart.contexts.identity.presentation.router import failure
from nilart.contexts.inventory.document_stock import DocumentStockError, move_stock
from nilart.contexts.inventory.router import Number, source
from nilart.shared.database import session_dependency
from nilart.shared.outbox import enqueue

router = APIRouter(prefix="/api/v1/admin/production", tags=["production"])


class Content(Strict):
    recipe_id: UUID
    revision_id: UUID
    batch_number: str = Field(min_length=1, max_length=100)
    production_date: date
    target_output: int = Field(strict=True, ge=1, le=1000000)
    notes: str = Field(default="", max_length=2000)


class Quantity(Strict):
    line_id: UUID
    quantity: Number

    @model_validator(mode="after")
    def positive(self):
        if Decimal(self.quantity) <= 0:
            raise ValueError("Positive actual quantity required")
        return self


class Quality(Strict):
    healthy_output: int = Field(strict=True, ge=0, le=1000000)
    normal_waste: int = Field(strict=True, ge=0, le=1000000)
    abnormal_damage: int = Field(strict=True, ge=0, le=1000000)

    @model_validator(mode="after")
    def output_exists(self):
        if (
            self.healthy_output + self.normal_waste + self.abnormal_damage > 1000000
            or self.healthy_output + self.abnormal_damage <= 0
        ):
            raise ValueError(
                "Classify total loss as abnormal damage; bounded actual output required"
            )
        return self


class Command(Strict):
    expected_version: int = Field(strict=True, ge=0, le=2147483646)
    action: Literal["draft", "start", "issue", "material_return", "service", "complete", "cancel"]
    content: Content | None = None
    lines: list[Quantity] = Field(default_factory=list, max_length=100)
    service_line_id: UUID | None = None
    service_amount: Number | None = None
    quality: Quality | None = None
    write_off_remaining: bool = Field(default=False, strict=True)
    reason: str = Field(min_length=1, max_length=1000)

    @model_validator(mode="after")
    def shape(self):
        if (self.action == "draft") != (self.content is not None):
            raise ValueError("Draft content only")
        if (self.action in {"issue", "material_return"}) != bool(self.lines):
            raise ValueError("Material movement needs actual quantities")
        if len({line.line_id for line in self.lines}) != len(self.lines):
            raise ValueError("Duplicate material line")
        if self.action == "service":
            if self.service_line_id is None or self.service_amount is None:
                raise ValueError("Service needs an explicit line and actual amount")
        elif self.service_line_id is not None or self.service_amount is not None:
            raise ValueError("Service fields belong only to a service command")
        if (self.action == "complete") != (self.quality is not None):
            raise ValueError("Completion requires QC")
        if self.write_off_remaining and self.action != "cancel":
            raise ValueError("WIP write-off requires cancellation")
        return self


class FrozenLine(BaseModel):
    id: UUID
    resource_id: UUID
    resource_revision_id: UUID
    kind: Literal["material", "service"]
    code: str
    label: str
    unit: str
    planned_quantity: str


class FrozenContent(Content):
    sku_id: UUID
    sku_code: str
    recipe_version: int
    title_fa: str
    title_en: str
    lines: list[FrozenLine]


class MaterialBalance(BaseModel):
    issued_quantity: str
    issued_value: str
    returned_quantity: str
    returned_value: str


class StockEffect(BaseModel):
    movement_id: UUID
    position_id: UUID
    quantity_delta: str
    value_delta: str


class BatchState(BaseModel):
    materials: dict[str, MaterialBalance]
    services: dict[str, str | None]
    wip: str
    transferred_value: str
    abnormal_loss: str
    quality: Quality | None
    movements: list[StockEffect]
    cost_complete: bool


class Batch(BaseModel):
    id: UUID
    status: Literal["draft", "running", "completed", "cancelled"]
    content: FrozenContent
    state: BatchState
    version: int
    updated_at: datetime


class Event(BaseModel):
    id: UUID
    batch_id: UUID
    actor_id: UUID
    version: int
    action: str
    intent: Command
    result: Batch
    created_at: datetime


class Page(BaseModel):
    items: list[Batch]
    next_cursor: UUID | None


class History(BaseModel):
    items: list[Event]
    next_before_version: int | None


class ChoiceTitle(BaseModel):
    title_fa: str
    title_en: str


class Choice(BaseModel):
    id: UUID
    version: int
    revision_id: UUID
    sku_code: str
    content: ChoiceTitle


class Choices(BaseModel):
    items: list[Choice]
    next_cursor: UUID | None


def rounded(value):
    return value.quantize(Decimal(".000001"), rounding=ROUND_HALF_UP)


def wip(state):
    return sum(
        (
            Decimal(v["issued_value"]) - Decimal(v["returned_value"])
            for v in state["materials"].values()
        ),
        Decimal(0),
    ) + sum((Decimal(v) for v in state["services"].values() if v is not None), Decimal(0))


@router.get("/recipe-choices", response_model=Choices)
def choices(
    q: str = Query("", max_length=200),
    cursor: UUID | None = None,
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("production.manage")),
):
    rows = (
        db.execute(
            text(
                "SELECT r.id,r.version,r.content,s.code AS sku_code,v.revision_id FROM cost_recipes r JOIN catalog_skus s ON s.id=r.sku_id JOIN cost_recipe_versions v ON v.recipe_id=r.id AND v.version=r.version WHERE (r.content->>'active')::boolean AND (:q='' OR strpos(lower(concat_ws(' ',s.code,r.content->>'title_fa',r.content->>'title_en')),lower(CAST(:q AS text)))>0) AND (CAST(:cursor AS uuid) IS NULL OR r.id>:cursor) ORDER BY r.id LIMIT :limit"
            ),
            dict(q=q.strip(), cursor=cursor, limit=limit + 1),
        )
        .mappings()
        .all()
    )
    return dict(
        items=[dict(r) for r in rows[:limit]],
        next_cursor=rows[limit - 1]["id"] if len(rows) > limit else None,
    )


@router.get("", response_model=Page)
def listing(
    q: str = Query("", max_length=200),
    status: Literal["draft", "running", "completed", "cancelled"] | None = None,
    losses: bool = False,
    cursor: UUID | None = None,
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("production.manage")),
):
    rows = (
        db.execute(
            text(
                "SELECT * FROM production_batches WHERE (:q='' OR strpos(lower(concat_ws(' ',content->>'batch_number',content->>'sku_code')),lower(CAST(:q AS text)))>0) AND (CAST(:status AS text) IS NULL OR status=:status) AND (NOT :losses OR (state->>'abnormal_loss')::numeric>0 OR coalesce((state->'quality'->>'normal_waste')::int,0)>0 OR coalesce((state->'quality'->>'abnormal_damage')::int,0)>0 OR (status='cancelled' AND EXISTS(SELECT 1 FROM jsonb_each(state->'materials') AS m WHERE (m.value->>'issued_quantity')::numeric>(m.value->>'returned_quantity')::numeric))) AND (CAST(:cursor AS uuid) IS NULL OR id>:cursor) ORDER BY id LIMIT :limit"
            ),
            dict(q=q.strip(), status=status, losses=losses, cursor=cursor, limit=limit + 1),
        )
        .mappings()
        .all()
    )
    return dict(
        items=[dict(r) for r in rows[:limit]],
        next_cursor=rows[limit - 1]["id"] if len(rows) > limit else None,
    )


@router.get("/{id}", response_model=Batch)
def detail(
    id: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("production.manage")),
):
    row = (
        db.execute(text("SELECT * FROM production_batches WHERE id=:id"), dict(id=id))
        .mappings()
        .first()
    )
    return dict(row) if row else failure(request, "production_not_found", 404)


@router.get("/{id}/events", response_model=History)
def history(
    id: UUID,
    before: int | None = Query(None, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("production.manage")),
):
    rows = (
        db.execute(
            text(
                "SELECT * FROM production_events WHERE batch_id=:id AND (CAST(:before AS int) IS NULL OR version<:before) ORDER BY version DESC LIMIT :limit"
            ),
            dict(id=id, before=before, limit=limit + 1),
        )
        .mappings()
        .all()
    )
    return dict(
        items=[dict(r) for r in rows[:limit]],
        next_before_version=rows[limit - 1]["version"] if len(rows) > limit else None,
    )


@router.get("/{id}/commands/{key}", response_model=Event)
def receipt(
    id: UUID,
    key: UUID,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("production.manage")),
):
    row = (
        db.execute(
            text("SELECT * FROM production_events WHERE id=:key AND batch_id=:id"),
            dict(id=id, key=key),
        )
        .mappings()
        .first()
    )
    return dict(row) if row else failure(request, "production_command_not_found", 404)


@router.put("/{id}/commands/{key}", response_model=Event)
def command(
    id: UUID,
    key: UUID,
    body: Command,
    request: Request,
    db: Session = Depends(session_dependency),
    principal: Principal = Depends(require_permission("production.manage")),
):
    actor, denied = write_access(request, db, principal, "production.manage")
    if denied is not None:
        return denied
    db.execute(text("SELECT pg_advisory_xact_lock(78214,39)"))
    intent = body.model_dump(mode="json")
    prior = (
        db.execute(text("SELECT * FROM production_events WHERE id=:key"), dict(key=key))
        .mappings()
        .first()
    )
    if prior:
        return (
            dict(prior)
            if prior["batch_id"] == id
            and str(prior["actor_id"]) == str(actor.id)
            and prior["intent"] == intent
            else failure(request, "production_command_conflict", 409)
        )
    row = (
        db.execute(text("SELECT * FROM production_batches WHERE id=:id FOR UPDATE"), dict(id=id))
        .mappings()
        .first()
    )
    if (row["version"] if row else 0) != body.expected_version:
        return failure(request, "production_version_conflict", 409)
    if not row and body.action != "draft":
        return failure(request, "production_not_found", 404)
    content = json.loads(json.dumps(row["content"])) if row else {}
    state = json.loads(json.dumps(row["state"])) if row else {}
    status = row["status"] if row else "draft"
    try:
        with localcontext() as ctx:
            ctx.prec = 60
            if body.action == "draft":
                if status != "draft":
                    raise DocumentStockError("production_immutable")
                content = body.content.model_dump(mode="json")
                revision = (
                    db.execute(
                        text(
                            "SELECT v.*,s.code AS sku_code FROM cost_recipe_versions v JOIN cost_recipes r ON r.id=v.recipe_id JOIN catalog_skus s ON s.id=r.sku_id WHERE v.recipe_id=:recipe AND v.revision_id=:revision"
                        ),
                        dict(recipe=body.content.recipe_id, revision=body.content.revision_id),
                    )
                    .mappings()
                    .first()
                )
                if not revision:
                    raise DocumentStockError("production_recipe_not_found")
                recipe = Recipe.model_validate(revision["content"])
                if (
                    not recipe.active
                    or recipe.valid_from is None
                    or recipe.valid_from > body.content.production_date
                    or (recipe.valid_to and recipe.valid_to < body.content.production_date)
                ):
                    raise DocumentStockError("production_recipe_not_effective")
                snapshots = {s["revision_id"]: s for s in revision["snapshots"]}
                content.update(
                    sku_id=str(recipe.sku_id),
                    sku_code=revision["sku_code"],
                    recipe_version=revision["version"],
                    title_fa=recipe.title_fa,
                    title_en=recipe.title_en,
                    lines=[],
                )
                state = dict(
                    materials={},
                    services={},
                    wip="0",
                    transferred_value="0",
                    abnormal_loss="0",
                    quality=None,
                    movements=[],
                )
                for line in recipe.lines:
                    resource = snapshots[str(line.resource_revision_id)]["content"]
                    if (
                        line.quantity is None
                        or (resource["kind"] == "material" and line.waste_fraction is None)
                        or (line.unit == "purchase" and resource["purchase_to_base"] is None)
                    ):
                        raise DocumentStockError("production_recipe_incomplete")
                    planned = (
                        Decimal(line.quantity)
                        * (Decimal(resource["purchase_to_base"]) if line.unit == "purchase" else 1)
                        / (line.cutting_yield or 1)
                    )
                    if resource["kind"] == "material":
                        planned /= 1 - Decimal(line.waste_fraction)
                        state["materials"][str(line.id)] = dict(
                            issued_quantity="0",
                            issued_value="0",
                            returned_quantity="0",
                            returned_value="0",
                        )
                    else:
                        state["services"][str(line.id)] = None
                    if line.basis == "output":
                        planned *= body.content.target_output
                    content["lines"].append(
                        dict(
                            id=str(line.id),
                            resource_id=str(line.resource_id),
                            resource_revision_id=str(line.resource_revision_id),
                            kind=resource["kind"],
                            code=resource["code"],
                            label=line.label,
                            unit=resource["base_unit"],
                            planned_quantity=format(rounded(planned), "f"),
                        )
                    )
            elif body.action == "start":
                if status != "draft":
                    raise DocumentStockError("production_state_conflict")
                status = "running"
            elif body.action == "cancel":
                if status not in {"draft", "running"}:
                    raise DocumentStockError("production_closed")
                outstanding = any(
                    Decimal(v["issued_quantity"]) != Decimal(v["returned_quantity"])
                    for v in state["materials"].values()
                )
                if (outstanding or wip(state) > 0) and not body.write_off_remaining:
                    raise DocumentStockError("production_return_or_write_off_required")
                state["abnormal_loss"] = format(wip(state), "f")
                state["wip"] = "0"
                state["movements"] = []
                status = "cancelled"
            else:
                if status != "running":
                    raise DocumentStockError("production_not_running")
                state["movements"] = []
                lines = {v["id"]: v for v in content["lines"]}
                if body.action in {"issue", "material_return"}:
                    for change in body.lines:
                        line = lines.get(str(change.line_id))
                        if not line or line["kind"] != "material":
                            raise DocumentStockError("production_material_line_invalid")
                        balance = state["materials"][line["id"]]
                        quantity = Decimal(change.quantity)
                        stockline = dict(
                            id=line["id"],
                            kind="material",
                            reference_id=line["resource_id"],
                            unit=line["unit"],
                        )
                        if body.action == "issue":
                            effect = move_stock(
                                db,
                                actor.id,
                                id,
                                key,
                                stockline,
                                -quantity,
                                None,
                                body.reason,
                                domain="production",
                                action_override="production_issue",
                            )
                            balance["issued_quantity"] = format(
                                Decimal(balance["issued_quantity"]) + quantity, "f"
                            )
                            balance["issued_value"] = format(
                                Decimal(balance["issued_value"]) - Decimal(effect["value_delta"]),
                                "f",
                            )
                        else:
                            remaining = Decimal(balance["issued_quantity"]) - Decimal(
                                balance["returned_quantity"]
                            )
                            if quantity > remaining:
                                raise DocumentStockError("production_return_exceeds_issued")
                            value = Decimal(balance["issued_value"]) - Decimal(
                                balance["returned_value"]
                            )
                            cost = (
                                value
                                if quantity == remaining
                                else rounded(value * quantity / remaining)
                            )
                            effect = move_stock(
                                db,
                                actor.id,
                                id,
                                key,
                                stockline,
                                quantity,
                                cost,
                                body.reason,
                                domain="production",
                                action_override="production_material_return",
                            )
                            balance["returned_quantity"] = format(
                                Decimal(balance["returned_quantity"]) + quantity, "f"
                            )
                            balance["returned_value"] = format(
                                Decimal(balance["returned_value"]) + cost, "f"
                            )
                        state["movements"].append(effect)
                elif body.action == "service":
                    line = lines.get(str(body.service_line_id))
                    if not line or line["kind"] != "service":
                        raise DocumentStockError("production_service_line_invalid")
                    state["services"][line["id"]] = body.service_amount
                else:
                    if any(v is None for v in state["services"].values()) or any(
                        Decimal(v["issued_quantity"]) <= Decimal(v["returned_quantity"])
                        for v in state["materials"].values()
                    ):
                        raise DocumentStockError("production_actual_cost_incomplete")
                    quality = body.quality
                    cost = wip(state)
                    loss = rounded(
                        cost
                        * quality.abnormal_damage
                        / (quality.healthy_output + quality.abnormal_damage)
                    )
                    transferred = cost - loss
                    if quality.healthy_output:
                        meta = source(db, "sku", content["sku_id"])
                        if not meta:
                            raise DocumentStockError("production_sku_missing")
                        stockline = dict(
                            id=content["sku_id"],
                            kind="sku",
                            reference_id=content["sku_id"],
                            unit=meta["unit"],
                        )
                        state["movements"].append(
                            move_stock(
                                db,
                                actor.id,
                                id,
                                key,
                                stockline,
                                Decimal(quality.healthy_output),
                                transferred,
                                body.reason,
                                domain="production",
                                action_override="production_output",
                            )
                        )
                    state["quality"] = quality.model_dump()
                    state["abnormal_loss"] = format(loss, "f")
                    state["transferred_value"] = format(transferred, "f")
                    status = "completed"
                state["wip"] = format(wip(state), "f") if status == "running" else "0"
                if Decimal(state["wip"]) >= Decimal("1e18"):
                    raise DocumentStockError("production_capacity_exceeded")
            state["cost_complete"] = all(v is not None for v in state["services"].values()) and all(
                Decimal(v["issued_quantity"]) > Decimal(v["returned_quantity"])
                for v in state["materials"].values()
            )
            params = dict(
                id=id,
                status=status,
                content=json.dumps(content),
                state=json.dumps(state),
                version=body.expected_version + 1,
            )
            if row:
                record = (
                    db.execute(
                        text(
                            "UPDATE production_batches SET status=:status,content=CAST(:content AS jsonb),state=CAST(:state AS jsonb),version=:version,updated_at=now() WHERE id=:id RETURNING *"
                        ),
                        params,
                    )
                    .mappings()
                    .one()
                )
            else:
                record = (
                    db.execute(
                        text(
                            "INSERT INTO production_batches(id,status,content,state,version) VALUES(:id,:status,CAST(:content AS jsonb),CAST(:state AS jsonb),:version) RETURNING *"
                        ),
                        params,
                    )
                    .mappings()
                    .one()
                )
            result = Batch(**dict(record)).model_dump(mode="json")
            event = (
                db.execute(
                    text(
                        "INSERT INTO production_events(id,batch_id,actor_id,version,action,intent,result) VALUES(:key,:id,:actor,:version,:action,CAST(:intent AS jsonb),CAST(:result AS jsonb)) RETURNING *"
                    ),
                    dict(
                        key=key,
                        id=id,
                        actor=actor.id,
                        version=params["version"],
                        action=body.action,
                        intent=json.dumps(intent),
                        result=json.dumps(result),
                    ),
                )
                .mappings()
                .one()
            )
            payload = dict(
                batch_id=str(id), event_id=str(key), version=params["version"], action=body.action
            )
            SqlAccountManagement(db).audit(
                actor.id, actor.id, "production.batch_changed", payload, body.reason
            )
            enqueue(db, "production.batch_changed", payload)
            db.commit()
            return dict(event)
    except DocumentStockError as exc:
        db.rollback()
        return failure(request, str(exc), 409)
    except Exception:
        db.rollback()
        raise
