from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

Status = Literal[
    "draft", "picked", "qc_failed", "qc_passed", "packed", "dispatched", "delivered", "cancelled"
]
Quantity = Annotated[int, Field(strict=True, ge=1, le=10000)]
Amount = Annotated[str, Field(pattern=r"^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$")]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Content(Strict):
    quantities: dict[UUID, Quantity] = Field(min_length=1, max_length=100)


class QC(Strict):
    correct_items: bool = Field(strict=True)
    intact: bool = Field(strict=True)
    complete: bool = Field(strict=True)


class Packing(Strict):
    note: str = Field(min_length=1, max_length=2000)
    weight_grams: int = Field(strict=True, ge=1, le=1000000)


class Carrier(Strict):
    carrier: str = Field(min_length=1, max_length=120)
    tracking: str = Field(min_length=1, max_length=200)


class Dispatch(Carrier):
    actual_shipping_cost: Amount
    sandbox_confirmed: Literal[True]


class Command(Strict):
    expected_version: int = Field(strict=True, ge=0, le=2147483646)
    action: Literal[
        "draft", "edit", "pick", "qc", "pack", "dispatch", "deliver", "cancel", "tracking"
    ]
    order_id: UUID
    reason: str = Field(min_length=1, max_length=1000)
    content: Content | None = None
    pick_confirmed: Literal[True] | None = None
    qc: QC | None = None
    packing: Packing | None = None
    dispatch: Dispatch | None = None
    carrier: Carrier | None = None

    @model_validator(mode="after")
    def fields_for_action(self):
        fields = {
            "content": {"draft", "edit"},
            "pick_confirmed": {"pick"},
            "qc": {"qc"},
            "packing": {"pack"},
            "dispatch": {"dispatch"},
            "carrier": {"tracking"},
        }
        if any(
            (getattr(self, key) is not None) != (self.action in actions)
            for key, actions in fields.items()
        ):
            raise ValueError("Command fields must match its action")
        return self


class Shipment(BaseModel):
    id: UUID
    order_id: UUID
    version: int
    status: Status
    content: Content
    state: dict
    updated_at: datetime


class Event(BaseModel):
    id: UUID
    shipment_id: UUID
    actor_id: UUID
    version: int
    action: str
    intent: Command
    result: Shipment
    created_at: datetime
