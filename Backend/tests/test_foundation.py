from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from nilart.bootstrap.main import app
from nilart.shared.money import Money, suggested_price


def test_liveness():
    response = TestClient(app).get("/api/v1/health/live")
    assert response.status_code == 200
    assert response.headers["x-request-id"]


def test_gateway_conversion():
    assert Money(Decimal("1234")).gateway_rials() == 12340


def test_margin_not_markup():
    assert suggested_price(Decimal("100000"), Decimal(".25"), Decimal("0")) == 133333


@pytest.mark.parametrize("cost,margin,fee", [
    (None, Decimal(".2"), Decimal("0")),
    (Decimal("1"), Decimal(".9"), Decimal(".1")),
    (Decimal("NaN"), Decimal("0"), Decimal("0")),
])
def test_invalid_cost(cost, margin, fee):
    with pytest.raises(ValueError):
        suggested_price(cost, margin, fee)
