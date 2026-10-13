from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class LocalizedCopy(BaseModel):
    model_config = ConfigDict(extra="forbid")
    fa: str = Field(min_length=1, max_length=3000)
    en: str = Field(min_length=1, max_length=3000)


class ProductView(BaseModel):
    model_config = ConfigDict(extra="forbid")
    label: LocalizedCopy
    view: Literal["front", "back", "inside", "detail"]


class ProductFact(BaseModel):
    model_config = ConfigDict(extra="forbid")
    label: LocalizedCopy
    value: LocalizedCopy


class ProductPresentation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    intro: LocalizedCopy
    about: LocalizedCopy
    kind: Literal["book", "bookmark", "stickers"]
    color: Literal["sage", "lilac", "sand", "rose", "blue"]
    gallery: list[ProductView] = Field(min_length=1, max_length=10)
    specifications: list[ProductFact] = Field(max_length=20)
    option_labels: dict[str, LocalizedCopy] = Field(default_factory=dict, max_length=1000)
    delivery: LocalizedCopy
