import pytest

from nilart.contexts.identity.domain.rules import IdentityError, normalize_full_name


@pytest.mark.parametrize("name", [" سارا احمدی ", "", "a" * 120, "😀" * 120])
def test_profile_name_normalization(name):
    assert normalize_full_name(name) == name.strip()


@pytest.mark.parametrize("name", ["bad\nname", "a" * 121, "\x00value"])
def test_profile_name_rejects_controls_and_overlong_values(name):
    with pytest.raises(IdentityError):
        normalize_full_name(name)
