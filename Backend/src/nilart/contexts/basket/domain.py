import hashlib
import json
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class BasketItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: Literal["product", "bundle", "artwork"]
    item_id: UUID
    choices: dict[UUID, UUID] = Field(default_factory=dict, max_length=30)
    framed: bool = False
    quantity: int = Field(default=1, ge=1, le=99)

    def key(self):
        payload = self.model_dump(mode="json", exclude={"quantity"})
        return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()[:32]


Item = BasketItem


class BasketCommand(BaseModel):
    model_config = ConfigDict(extra="forbid")
    command_id: UUID
    version: int = Field(ge=0)
    action: Literal["add", "quantity", "remove", "accept", "clear", "merge", "replace"]
    item: Item | None = None
    line_id: str | None = Field(default=None, pattern=r"^[a-f0-9]{32}$")
    quantity: int | None = Field(default=None, ge=1, le=99)
    expected_unit: str | None = Field(default=None, pattern=r"^(?:0|[1-9]\d{0,35})(?:\.\d{1,7})?$")


Command = BasketCommand


def amount(value):
    return format(Decimal(str(value)).normalize(), "f")


def toman(value, currency):
    if currency not in {"IRT", "IRR"} or value is None:
        raise ValueError("price_unavailable")
    result = Decimal(str(value)) / (10 if currency == "IRR" else 1)
    if not result.is_finite() or result < 0:
        raise ValueError("price_unavailable")
    return result
