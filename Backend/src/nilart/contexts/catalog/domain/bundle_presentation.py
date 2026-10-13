from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Copy(BaseModel):
    model_config = ConfigDict(extra="forbid")
    fa: str = Field(min_length=1, max_length=3000)
    en: str = Field(min_length=1, max_length=3000)


class BundleDiscount(BaseModel):
    model_config = ConfigDict(extra="forbid")
    amount: str = Field(pattern=r"^(?:0|[1-9]\d{0,17})(?:\.\d{1,6})?$")
    currency: Literal["IRT", "IRR"]

    @model_validator(mode="after")
    def finite(self):
        if not Decimal(self.amount).is_finite():
            raise ValueError("Invalid discount")
        return self


class ComponentChoices(BaseModel):
    model_config = ConfigDict(extra="forbid")
    component_sku_id: UUID
    allowed_sku_ids: list[UUID] = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def unique(self):
        if len(set(self.allowed_sku_ids)) != len(self.allowed_sku_ids):
            raise ValueError("Duplicate component choices")
        return self


class BundlePresentation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    intro: Copy
    contents: Copy
    collection_slug: str = Field(min_length=1, max_length=160)
    collection_title: Copy
    sample: bool = False
    discount: BundleDiscount | None = None
    allow_discount_stacking: bool | None = None
    component_choices: list[ComponentChoices] = Field(max_length=50)

    @model_validator(mode="after")
    def unique(self):
        ids = [item.component_sku_id for item in self.component_choices]
        if len(set(ids)) != len(ids):
            raise ValueError("Duplicate components")
        return self
