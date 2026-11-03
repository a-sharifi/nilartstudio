import pytest
from nilart.bootstrap.settings import Settings

@pytest.mark.parametrize('mode',['zarinpal_sandbox','zibal_sandbox'])
def test_production_cannot_start_with_test_gateway(mode):
    with pytest.raises(ValueError,match='Sandbox payment'):
        Settings(environment='production',public_origin='https://nilartstudio.ir',payment_mode=mode)

def test_production_can_wait_for_real_merchant_without_test_gateway():
    value=Settings(environment='production',public_origin='https://nilartstudio.ir',payment_mode='disabled',zibal_merchant_id='')
    assert value.payment_mode=='disabled'
