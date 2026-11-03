from uuid import uuid4

import httpx
import pytest

from nilart.contexts.shipping.tapin import Parcel, Tapin, TapinError, payload, rial


def parcel(line):
    return Parcel(
        first_name="Test",
        last_name="Recipient",
        mobile="09123456789",
        postal_code="1234567890",
        address="Synthetic test address only",
        province_code=1,
        city_code=1,
        box_id=10,
        package_weight=20,
        product_weights={line: 100},
        has_insurance=True,
    )


def test_exact_gross_price_and_weights_bind_to_frozen_lines():
    line = uuid4()
    snapshot = dict(
        currency="IRT",
        items=[
            dict(
                id=str(line),
                title_fa="دفتر",
                quantity=2,
                unit_amount="110000",
                discount_amount="20000",
                delivery="physical",
            )
        ],
    )
    data = payload(uuid4(), uuid4(), snapshot, {str(line): 1}, parcel(line))
    assert data["products"] == [
        dict(count=1, discount=0, price=1000000, title="دفتر", weight=100, product_id=None)
    ]
    assert data["register_type"] == 0 and data["pay_type"] == 1
    assert data["email"] is None and data["kiosk_id"] is None
    with pytest.raises(TapinError):
        payload(uuid4(), uuid4(), snapshot, {str(line): 1}, parcel(uuid4()))
    with pytest.raises(TapinError):
        rial("0.01", "IRT")


def test_transport_contract_uses_raw_token_and_post_without_redirect_or_retry():
    calls = []

    def respond(request):
        calls.append(request)
        assert request.headers["Authorization"] == "secret-test-token"
        assert request.method == "POST"
        return httpx.Response(
            200,
            json={
                "returns": {"status": 200},
                "entries": {"order_id": 123, "status": 0, "barcode": None},
            },
        )

    provider = Tapin("secret-test-token", httpx.MockTransport(respond))
    assert provider.register({"manual_id": "test"}) == dict(order_id=123, status=0, barcode=None)
    assert len(calls) == 1 and calls[0].url.path == "/api/v2/public/order/post/register/"


@pytest.mark.parametrize(
    "response",
    [
        httpx.Response(500, text="secret test token and recipient data"),
        httpx.Response(200, json={"returns": {"status": 200}, "entries": {}}),
        httpx.Response(302, headers={"Location": "https://untrusted.example"}),
        httpx.Response(200, json={"returns": {"status": 363}, "entries": {}}),
    ],
)
def test_ambiguous_registration_is_never_retried_or_leaked(response):
    calls = []

    def respond(request):
        calls.append(request)
        return response

    with pytest.raises(TapinError) as error:
        Tapin("test-token", httpx.MockTransport(respond)).register({})
    assert error.value.uncertain and len(calls) == 1
    assert "secret" not in str(error.value) and "recipient" not in str(error.value)


def test_timeout_is_unknown_and_explicit_auth_or_validation_rejection_is_not():
    def respond(request):
        raise httpx.ReadTimeout("private details")

    with pytest.raises(TapinError) as error:
        Tapin("token", httpx.MockTransport(respond)).register({})
    assert error.value.uncertain
    for response in [
        httpx.Response(401),
        httpx.Response(200, json={"returns": {"status": 300}, "entries": {}}),
    ]:
        with pytest.raises(TapinError) as error:
            Tapin("token", httpx.MockTransport(lambda _: response)).register({})
        assert not error.value.uncertain


def test_shop_inactive_is_distinct_and_detail_identity_is_bound():
    provider = Tapin(
        "token",
        httpx.MockTransport(
            lambda _: httpx.Response(
                200, json={"returns": {"status": 200}, "entries": {"status": 0}}
            )
        ),
    )
    assert provider.shop(uuid4()) == dict(active=False, status=0)
    with pytest.raises(TapinError):
        provider.detail(uuid4(), 44)


def test_label_removes_scripts_remote_resources_and_event_attributes():
    from nilart.contexts.shipping.labels import printable

    result = printable(
        '<script>private</script><img src="https://evil.example/a" onerror="steal()"><table><tr><td>TRACK-123</td></tr></table><img src="data:image/png;base64,YQ==">'
    )
    assert "<script" not in result and "evil.example" not in result and "onerror" not in result
    assert "TRACK-123" in result and "data:image/png;base64,YQ==" in result


def test_reconciliation_requires_matching_recipient_and_products():
    from nilart.contexts.shipping.tapin import same_parcel

    id = uuid4()
    expected = payload(
        uuid4(),
        uuid4(),
        dict(
            currency="IRT",
            items=[
                dict(
                    id=str(id),
                    title_fa="دفتر",
                    quantity=1,
                    unit_amount="100",
                    discount_amount="0",
                    delivery="physical",
                )
            ],
        ),
        {str(id): 1},
        parcel(id),
    )
    actual = {**expected, "state_code": expected["province_code"]}
    assert same_parcel(expected, actual)
    assert not same_parcel(expected, {**actual, "mobile": "09999999999"})
    assert not same_parcel(expected, {**actual, "products": []})


def test_checkout_box_geometry_uses_quantities_and_discounted_declared_value():
    from types import SimpleNamespace

    from nilart.contexts.shipping.checkout import choose_box, parcel_geometry

    method = SimpleNamespace(padding_cm=1, packaging_weight_grams=100)
    current = {
        "lines": [
            {
                "id": "line",
                "item": {"quantity": 2},
                "quote": {"unit": "100.1", "name": ["دفتر", "Notebook"]},
            }
        ]
    }
    terms = [
        {
            "delivery": "physical",
            "parts": [
                {
                    "delivery": "physical",
                    "quantity": 1,
                    "weight_grams": 100,
                    "length_cm": 10,
                    "width_cm": 5,
                    "height_cm": 0.3,
                }
            ],
        }
    ]
    required, weight, products = parcel_geometry(
        terms, current, method, {"allocations": {"line": 20}}
    )
    assert required == [12, 7, 2.6] and weight == 300
    assert products[0]["price"] == 1000 and products[0]["count"] == 2
    assert (
        choose_box(
            [dict(pk=7, length=15, width=10, height=5), dict(pk=8, length=40, width=30, height=20)],
            required,
        )[1]
        == 7
    )
    with pytest.raises(TapinError):
        parcel_geometry(terms, current, method, {"allocations": {"line": 25}})


@pytest.mark.parametrize("label", [False, True])
def test_security_challenge_is_never_a_success_or_a_shipping_label(label):
    def respond(request):
        assert request.headers["Authorization"] == "secret-test-token"
        return httpx.Response(
            200,
            text="<html>Checking your browser before accessing the website... /cdn-cgi/</html>",
            headers={"content-type": "text/html"},
        )

    provider = Tapin("secret-test-token", httpx.MockTransport(respond))
    with pytest.raises(TapinError) as error:
        if label:
            provider.label(uuid4(), uuid4())
        else:
            provider.register({})
    assert error.value.code == "tapin_security_challenge"
    assert error.value.uncertain is (not label)
