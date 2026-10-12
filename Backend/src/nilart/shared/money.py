from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal


@dataclass(frozen=True)
class Money:
    amount: Decimal
    currency: str = "IRT"

    def __post_init__(self):
        if not isinstance(self.amount, Decimal) or not self.amount.is_finite():
            raise ValueError("Money requires a finite Decimal")
        if self.amount < 0 or self.currency not in {"IRT", "IRR"}:
            raise ValueError("Invalid money")

    def gateway_rials(self) -> int:
        amount = self.amount * 10 if self.currency == "IRT" else self.amount
        if amount != amount.to_integral_value():
            raise ValueError("Gateway amount must be whole rials")
        return int(amount)


def suggested_price(cost: Decimal | None, margin: Decimal, fee: Decimal) -> Decimal:
    if cost is None:
        raise ValueError("Incomplete cost")
    if not all(isinstance(v, Decimal) and v.is_finite() for v in (cost, margin, fee)):
        raise ValueError("Finite Decimal inputs required")
    if cost < 0 or margin < 0 or fee < 0 or margin + fee >= 1:
        raise ValueError("Invalid pricing inputs")
    return (cost / (1 - margin - fee)).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
