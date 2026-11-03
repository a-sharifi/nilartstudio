from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ArtworkDetails(BaseModel):
    model_config = ConfigDict(extra="forbid")
    artist_fa: str = Field(min_length=1, max_length=200)
    artist_en: str = Field(min_length=1, max_length=200)
    medium: Literal["colored-pencil", "oil", "acrylic", "mixed-media"]
    style: Literal["landscape", "abstract"]
    width_cm: float = Field(gt=0, le=10000)
    height_cm: float = Field(gt=0, le=10000)
    price_amount: str = Field(pattern=r"^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$")
    original_price_amount: str | None = None
    currency: Literal["IRT", "IRR"]
    stock: int = Field(ge=0, le=100000)
    image_url: str = Field(
        pattern=r"^(?:/sample-artworks/[a-z0-9-]+\.jpg|/api/v1/media/[a-f0-9-]{36}/versions/[a-f0-9-]{36}/content)$"
    )
    image_credit: str = Field(min_length=1, max_length=1000)
    image_source: str = Field(default="", max_length=1000)
    surface_fa: str | None = Field(default=None, min_length=1, max_length=200)
    surface_en: str | None = Field(default=None, min_length=1, max_length=200)
    frame_fa: str | None = Field(default=None, min_length=1, max_length=200)
    frame_en: str | None = Field(default=None, min_length=1, max_length=200)
    framed_fa: str | None = Field(default=None, min_length=1, max_length=200)
    framed_en: str | None = Field(default=None, min_length=1, max_length=200)
    frame_price_amount: str | None = Field(
        default=None, pattern=r"^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$"
    )
    sample: bool
    edition: Literal["original", "print", "digital"] = "original"
    linked_sku_id: UUID | None = None
    weight_grams: int | None = Field(default=None, strict=True, ge=1)
    returnable: bool | None = None
    license_fa: str = ""
    license_en: str = ""
    gallery: list[dict] = Field(default_factory=list, max_length=30)

    @model_validator(mode="after")
    def media_scope(self):
        import re

        if self.sample and (
            not re.fullmatch(r"/sample-artworks/[a-z0-9-]+\.jpg", self.image_url)
            or not re.fullmatch(
                r"https://www\.metmuseum\.org/art/collection/search/\d+", self.image_source
            )
        ):
            raise ValueError("Historical sample media must retain its approved source")
        if not self.sample and not self.image_url.startswith("/api/v1/media/"):
            raise ValueError("Managed artwork requires approved immutable media")
        return self
