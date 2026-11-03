"""Historical prices are exact and immutable; request submission never moves money."""

from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

Amount = Annotated[str, Field(pattern=r"^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$")]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class StockComponent(Strict):
    delivery: Literal["physical", "digital"] = "physical"
    returnable: bool | None = None
    unit_amount: str = Field(pattern=r"^(?:0|[1-9]\d{0,17})(?:\.\d{1,7})?$")
    paid_amount: Amount | None = None
    line_id: UUID
    basket_line_id: str = Field(pattern=r"^[a-f0-9]{32}$")
    component: int = Field(ge=0)
    kind: Literal["sku", "artwork"]
    reference_id: UUID
    position_id: UUID
    per_unit: int = Field(strict=True, ge=1)
    quantity: int = Field(strict=True, ge=1)
    title_fa: str
    title_en: str


class OrderLine(Strict):
    stock_components: list[StockComponent] | None = None
    id: UUID
    title_fa: str = Field(min_length=1, max_length=240)
    title_en: str = Field(min_length=1, max_length=240)
    sku: str = Field(min_length=1, max_length=100)
    options_fa: str = Field(max_length=2000)
    options_en: str = Field(max_length=2000)
    quantity: int = Field(ge=1, le=10000, strict=True)
    unit_amount: Amount
    discount_amount: Amount
    delivery: Literal["physical", "digital"]
    returnable: bool = Field(strict=True)
    commission_id: UUID | None = None

    @model_validator(mode="after")
    def valid_discount(self):
        if self.stock_components is not None and (
            not self.stock_components
            or any(
                c.line_id != self.id or c.quantity != c.per_unit * self.quantity
                for c in self.stock_components
            )
        ):
            raise ValueError("Invalid frozen stock component")
        if self.stock_components and all(c.paid_amount is not None for c in self.stock_components):
            if sum((Decimal(c.paid_amount) for c in self.stock_components), Decimal(0)) != Decimal(
                self.unit_amount
            ) * self.quantity - Decimal(self.discount_amount):
                raise ValueError("Component paid shares do not match the line")
        if Decimal(self.discount_amount) > Decimal(self.unit_amount) * self.quantity:
            raise ValueError("Discount exceeds line amount")
        return self


class Receipt(Strict):
    number: str = Field(min_length=1, max_length=80)
    issued_at: datetime
    paid_amount: Amount

    @model_validator(mode="after")
    def valid_time(self):
        if self.issued_at.tzinfo is None:
            raise ValueError("Receipt time requires timezone")
        return self


class OrderSnapshot(Strict):
    checkout_terms: dict | None = None
    reference: str = Field(min_length=1, max_length=80)
    currency: Literal["IRT", "IRR"]
    items: list[OrderLine] = Field(min_length=1, max_length=100)
    shipping_amount: Amount
    tax_amount: Amount
    total_amount: Amount
    # The checkout adapter must supply the approved historical delivery address.
    recipient: str = Field(max_length=120)
    address: str = Field(max_length=2000)
    receipt: Receipt | None = None

    @model_validator(mode="after")
    def exact_total(self):
        ids = [item.id for item in self.items]
        if len(ids) != len(set(ids)):
            raise ValueError("Duplicate line identity")
        total = sum(
            (
                Decimal(item.unit_amount) * item.quantity - Decimal(item.discount_amount)
                for item in self.items
            ),
            Decimal(0),
        )
        total += Decimal(self.shipping_amount) + Decimal(self.tax_amount)
        if total != Decimal(self.total_amount):
            raise ValueError("Historical total mismatch")
        if self.receipt and Decimal(self.receipt.paid_amount) != total:
            raise ValueError("Receipt amount mismatch")
        return self


class OrderState(Strict):
    digital_delivered: dict[UUID, Annotated[int, Field(strict=True, ge=0)]] = Field(
        default_factory=dict
    )
    unpaid_cancellation_closure: UUID | None = None
    payment: Literal["pending", "verification", "paid", "failed", "partially_refunded", "refunded"]
    fulfillment: Literal["unshipped", "partial", "shipped", "delivered", "cancelled", "on_hold"]
    delivered: dict[UUID, Annotated[int, Field(strict=True, ge=0)]]
    return_until: datetime | None = None
    refunded_amount: Amount = "0"

    @model_validator(mode="after")
    def valid_delivery(self):
        if any(type(quantity) is not int or quantity < 0 for quantity in self.delivered.values()):
            raise ValueError("Invalid delivered quantities")
        if self.return_until and self.return_until.tzinfo is None:
            raise ValueError("Return deadline requires timezone")
        return self


def validate_state(snapshot: OrderSnapshot, state: OrderState):
    quantities = {line.id: line.quantity for line in snapshot.items}
    if any(
        id not in quantities or quantity > quantities[id]
        for id, quantity in state.delivered.items()
    ):
        raise ValueError("Delivered quantities exceed order")
    if state.fulfillment in {"unshipped", "on_hold", "cancelled"} and any(state.delivered.values()):
        raise ValueError("Unfulfilled order cannot have delivered quantities")
    if state.fulfillment == "delivered" and any(
        state.delivered.get(id, 0) != quantity for id, quantity in quantities.items()
    ):
        raise ValueError("Fully delivered order requires all quantities")
    refunded, total = Decimal(state.refunded_amount), Decimal(snapshot.total_amount)
    if refunded > total or (refunded and state.payment not in {"partially_refunded", "refunded"}):
        raise ValueError("Invalid refund state")
    if state.payment == "refunded" and refunded != total:
        raise ValueError("Full refund amount mismatch")
    if state.payment == "partially_refunded" and not Decimal(0) < refunded < total:
        raise ValueError("Partial refund amount mismatch")
    if snapshot.receipt and state.payment not in {"paid", "partially_refunded", "refunded"}:
        raise ValueError("Issued receipt requires confirmed historical payment")


def cancellation_allowed(state: OrderState) -> bool:
    return (
        state.fulfillment in {"unshipped", "on_hold"}
        and not any(state.delivered.values())
        and not any(state.digital_delivered.values())
    )


def return_allowed(snapshot: OrderSnapshot, state: OrderState, now: datetime) -> bool:
    return bool(
        state.payment in {"paid", "partially_refunded"}
        and state.fulfillment in {"partial", "delivered"}
        and state.return_until
        and now <= state.return_until
        and any(
            line.delivery == "physical" and line.returnable and state.delivered.get(line.id, 0) > 0
            for line in snapshot.items
        )
    )


class RequestSubmission(Strict):
    version: int = Field(strict=True, ge=0)
    kind: Literal["cancellation", "return"]
    reason: str = Field(min_length=5, max_length=4000)
    quantities: dict[UUID, Annotated[int, Field(strict=True, ge=1, le=10000)]] = Field(
        default_factory=dict
    )

    @model_validator(mode="after")
    def valid_kind(self):
        if (self.kind == "cancellation" and self.quantities) or (
            self.kind == "return" and not self.quantities
        ):
            raise ValueError("Invalid request quantities")
        return self
