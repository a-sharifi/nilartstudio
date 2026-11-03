from decimal import Decimal
from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, model_validator

from nilart.contexts.business.router import Strict
from nilart.contexts.catalog.presentation.bundle_authoring import GalleryImage

Channel = Literal["basalam", "digikala", "snappshop", "tapsishop"]
Percent = Annotated[str, Field(pattern=r"^(?:0|[1-9][0-9]{0,2})(?:\.[0-9]{1,4})?$")]


class Config(Strict):
    mode: Literal["disabled", "preview", "live"] = "disabled"
    markup_percent: Percent = "10"
    commission_percent: Percent | None = None
    installment_percent: Percent | None = None
    rounding_toman: int = Field(default=1, strict=True, ge=1, le=1000000)
    stock_buffer: int = Field(default=0, strict=True, ge=0, le=1000000)
    stock_cap: int | None = Field(default=None, strict=True, ge=0, le=1000000)
    vendor_id: int | None = Field(default=None, strict=True, ge=1)
    sync_products: bool = True
    sync_stock: bool = True
    import_orders: bool = True
    preparation_days: int | None = Field(default=None, strict=True, ge=0, le=90)
    packaging_weight_grams: int | None = Field(default=None, strict=True, ge=1, le=100000)

    @model_validator(mode="after")
    def rates(self):
        if Decimal(self.markup_percent) > 500 or any(
            v is not None and Decimal(v) >= 100
            for v in [self.commission_percent, self.installment_percent]
        ):
            raise ValueError("Invalid channel rate")
        return self


class SettingsCommand(Strict):
    expected_version: int = Field(strict=True, ge=0)
    content: Config
    reason: str = Field(min_length=5, max_length=1000)


class Attribute(Strict):
    property_id: int = Field(strict=True, ge=1)
    value: str = Field(default="", max_length=1000)
    selected_values: list[Annotated[int, Field(strict=True, ge=1)]] = Field(
        default_factory=list, max_length=50
    )

    @model_validator(mode="after")
    def valid_value(self):
        if not self.value.strip() and not self.selected_values:
            raise ValueError("An attribute value is required")
        return self


class Listing(Strict):
    sku_id: UUID
    active: bool = False
    title: str = Field(default="", max_length=120)
    description: str = Field(default="", max_length=5000)
    category_id: int | None = Field(default=None, strict=True, ge=1)
    brand: str = Field(default="", max_length=120)
    barcode: str = Field(default="", max_length=100)
    video_id: int | None = Field(default=None, strict=True, ge=1)
    keywords: list[str] = Field(default_factory=list, max_length=20)
    preparation_days: int | None = Field(default=None, strict=True, ge=0, le=90)
    packaging_weight_grams: int | None = Field(default=None, strict=True, ge=1, le=100000)
    attributes: list[Attribute] = Field(default_factory=list, max_length=100)
    gallery: list[GalleryImage] = Field(default_factory=list, max_length=20)
    external_product_id: int | None = Field(default=None, strict=True, ge=1)
    external_variation_id: int | None = Field(default=None, strict=True, ge=1)
    images_reviewed: bool = False
    handmade: bool = True
    customizable: bool = False

    @model_validator(mode="after")
    def unique(self):
        if self.external_variation_id and not self.external_product_id:
            raise ValueError("A variation requires its product")
        if len({a.property_id for a in self.attributes}) != len(self.attributes):
            raise ValueError("Duplicate attributes")
        return self


class ListingCommand(Strict):
    expected_version: int = Field(strict=True, ge=0)
    content: Listing
    reason: str = Field(min_length=5, max_length=1000)


class SyncCommand(Strict):
    fingerprint: str = Field(pattern=r"^[a-f0-9]{64}$")
    confirmed: bool


class Reconcile(Strict):
    external_product_id: int = Field(strict=True, ge=1)
    reason: str = Field(min_length=5, max_length=1000)
