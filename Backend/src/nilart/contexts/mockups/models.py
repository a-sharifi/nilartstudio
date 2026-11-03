"""Validated, portable render inputs; no filesystem paths or external URLs."""

from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

SIZES = {"A3": (297, 420), "A4": (210, 297), "A5": (148, 210), "A6": (105, 148)}
PAPERS = {
    "writing-paper": ("کاغذ تحریر", "Writing paper", 80),
    "kraft-dark-70gsm": ("کرافت تیره ۷۰ گرم", "Dark kraft 70 gsm", 70),
    "kraft-coffee-100gsm": ("کرافت نسکافه‌ای ۱۰۰ گرم", "Coffee kraft 100 gsm", 100),
    "drawing-cream-110gsm": ("طراحی نخودی ۱۱۰ گرم", "Cream drawing 110 gsm", 110),
    "drawing-cream-127gsm": ("طراحی نخودی ۱۲۷ گرم", "Cream drawing 127 gsm", 127),
}
Kind = Literal["notebook", "sketchbook"]
View = Literal["front", "back", "inside"]
Size = Literal["A3", "A4", "A5", "A6"]
Paper = Literal[
    "writing-paper",
    "kraft-dark-70gsm",
    "kraft-coffee-100gsm",
    "drawing-cream-110gsm",
    "drawing-cream-127gsm",
]
Fraction = Annotated[float, Field(ge=0, le=1, allow_inf_nan=False)]
Point = tuple[Fraction, Fraction]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class MediaRef(Strict):
    asset_id: UUID
    revision_id: UUID


class Spec(Strict):
    design: str = Field(pattern=r"^[a-z0-9][a-z0-9-]{0,79}$")
    title_fa: str = Field(min_length=1, max_length=160)
    title_en: str = Field(min_length=1, max_length=160)
    group: Literal["collection", "personal"]
    notebook_type: Kind
    size: Size
    paper: Paper
    sheets: Literal[40, 80]
    binding: Literal["top", "side"]

    @model_validator(mode="after")
    def compatible(self):
        expected = ("top", 40) if self.notebook_type == "sketchbook" else ("side", 80)
        if (self.binding, self.sheets) != expected:
            raise ValueError("Binding and sheet count must match notebook type")
        if (self.paper == "writing-paper") != (self.notebook_type == "notebook"):
            raise ValueError("Paper must match notebook type")
        return self

    @property
    def key(self):
        return f"{self.design}/{self.notebook_type}/{self.size}/{self.paper}/{self.sheets}"

    @property
    def views(self):
        return (
            ["front", "back", "inside"] if self.notebook_type == "notebook" else ["front", "back"]
        )


class Quad(Strict):
    points: tuple[Point, Point, Point, Point]

    @model_validator(mode="after")
    def convex(self):
        p = self.points
        cross = [
            (p[(i + 1) % 4][0] - p[i][0]) * (p[(i + 2) % 4][1] - p[(i + 1) % 4][1])
            - (p[(i + 1) % 4][1] - p[i][1]) * (p[(i + 2) % 4][0] - p[(i + 1) % 4][0])
            for i in range(4)
        ]
        if min(cross) <= 0.0001:
            raise ValueError(
                "Corners must be convex, ordered top-left/top-right/bottom-right/bottom-left"
            )
        return self


class Template(Strict):
    title_fa: str = Field(min_length=1, max_length=160)
    title_en: str = Field(min_length=1, max_length=160)
    notebook_type: Kind
    binding: Literal["top", "side"]
    view: View
    photo: MediaRef
    quads: list[Quad] = Field(min_length=1, max_length=2)
    occlusion: MediaRef | None = None
    active: bool = True

    @model_validator(mode="after")
    def compatible(self):
        if self.binding != ("top" if self.notebook_type == "sketchbook" else "side"):
            raise ValueError("Incompatible template binding")
        if self.notebook_type == "sketchbook" and self.view == "inside":
            raise ValueError("Sketchbooks have no interior render")
        if len(self.quads) != (2 if self.view == "inside" else 1):
            raise ValueError("Inside spread requires two print planes")
        return self


class Sources(Strict):
    front: MediaRef
    back_print: MediaRef | None = None
    back_crop: tuple[Fraction, Fraction, Fraction, Fraction] = (0, 0, 1, 1)
    back_art: MediaRef | None = None
    logo: MediaRef | None = None
    inside_left: MediaRef | None = None
    inside_right: MediaRef | None = None
    inside_mode: Literal["motifs", "pages"] = "motifs"

    @model_validator(mode="after")
    def back_required(self):
        if not self.back_print and not self.back_art:
            raise ValueError("A back print or back illustration is required")
        x1, y1, x2, y2 = self.back_crop
        if x2 <= x1 or y2 <= y1:
            raise ValueError("Invalid print trim")
        return self


class Target(Strict):
    product_id: UUID | None = None
    sku_id: UUID | None = None
    collection_id: UUID | None = None


class RunInput(Strict):
    expected_version: int = Field(strict=True, ge=0)
    spec: Spec
    sources: Sources
    templates: dict[View, UUID]
    target: Target = Field(default_factory=Target)
    attach_to: Literal["sku", "product", "none"] = "none"
    reason: str = Field(min_length=5, max_length=1000)

    @model_validator(mode="after")
    def complete(self):
        if set(self.templates) != set(self.spec.views):
            raise ValueError("Templates must match the required views exactly")
        if self.spec.notebook_type == "notebook" and not (
            self.sources.inside_left and self.sources.inside_right
        ):
            raise ValueError("Notebooks require an existing motif/page for both sides")
        if self.spec.notebook_type == "sketchbook" and (
            self.sources.inside_left or self.sources.inside_right
        ):
            raise ValueError("Sketchbooks must not have interior sources")
        if self.attach_to == "sku" and self.target.sku_id is None:
            raise ValueError("SKU gallery publication requires a SKU")
        if self.attach_to == "product" and self.target.product_id is None:
            raise ValueError("Product gallery publication requires a product")
        return self
