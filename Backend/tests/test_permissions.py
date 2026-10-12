import pytest

from nilart.contexts.identity.domain.permissions import Principal, Role


@pytest.mark.parametrize("role", list(Role))
def test_refunds_require_explicit_admin_permission(role):
    principal = Principal("account-a", frozenset({role}))
    assert principal.allows("payments.refund") == (role == Role.ADMIN)
    assert not principal.allows("invented.permission")
    assert principal.owns("account-a")
    assert not principal.owns("account-b")


def test_operations_does_not_gain_finance_or_identity_permissions():
    principal = Principal("a", frozenset({Role.OPERATIONS}))
    assert principal.allows("inventory.manage")
    assert not principal.allows("finance.write")
    assert not principal.allows("identity.manage")


def test_permissions_are_union_without_wildcard_escalation():
    principal = Principal("a", frozenset({Role.ARTIST, Role.CUSTOMER}))
    assert principal.allows("orders.read_self")
    assert principal.allows("commissions.work_assigned")
    assert not principal.allows("commissions.manage")
    assert not Principal("a", frozenset()).permissions
