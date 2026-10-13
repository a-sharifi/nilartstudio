from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ArtworkDetails(BaseModel):
    model_config = ConfigDict(extra="forbid")
    artist_fa: str = Field(min_length=1, max_length=200)
    artist_en: str = Field(min_length=1, max_length=200)
    medium: Literal["colored-pencil", "oil", "acrylic"]
    style: Literal["landscape", "abstract"]
    width_cm: int = Field(gt=0, le=10000)
    height_cm: int = Field(gt=0, le=10000)
    price_amount: str = Field(pattern=r"^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$")
    currency: Literal["IRT", "IRR"]
    stock: int = Field(ge=0, le=100000)
    image_url: str = Field(pattern=r"^/sample-artworks/[a-z0-9-]+\.jpg$")
    image_credit: str = Field(min_length=1, max_length=1000)
    image_source: str = Field(pattern=r"^https://www\.metmuseum\.org/art/collection/search/\d+$")
    surface_fa: str | None = Field(default=None, min_length=1, max_length=200)
    surface_en: str | None = Field(default=None, min_length=1, max_length=200)
    frame_fa: str | None = Field(default=None, min_length=1, max_length=200)
    frame_en: str | None = Field(default=None, min_length=1, max_length=200)
    framed_fa: str | None = Field(default=None, min_length=1, max_length=200)
    framed_en: str | None = Field(default=None, min_length=1, max_length=200)
    frame_price_amount: str | None = Field(default=None, pattern=r"^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$")
    sample: Literal[True]
