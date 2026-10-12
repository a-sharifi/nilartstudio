from dataclasses import dataclass
from enum import StrEnum


class Role(StrEnum):
    CUSTOMER = "customer"
    ARTIST = "artist"
    OPERATIONS = "operations"
    FINANCE = "finance"
    ADMIN = "admin"


ROLE_PERMISSIONS: dict[Role, frozenset[str]] = {
    Role.CUSTOMER: frozenset({"account.read_self", "orders.read_self"}),
    Role.ARTIST: frozenset({"account.read_self", "commissions.work_assigned"}),
    Role.OPERATIONS: frozenset({"account.read_self", "orders.read_all", "inventory.manage",
                                "production.manage", "fulfillment.manage"}),
    Role.FINANCE: frozenset({"account.read_self", "finance.read", "finance.write", "payments.read"}),
    Role.ADMIN: frozenset({"account.read_self", "orders.read_all", "catalog.manage",
                           "inventory.manage", "production.manage", "fulfillment.manage",
                           "finance.read", "finance.write", "payments.read", "payments.refund",
                           "pricing.publish", "identity.manage", "commissions.manage"}),
}
ROLE_PERMISSIONS = {role: permissions | {"account.write_self"}
                    for role, permissions in ROLE_PERMISSIONS.items()}


@dataclass(frozen=True)
class Principal:
    account_id: str
    roles: frozenset[Role]

    @property
    def permissions(self) -> frozenset[str]:
        return frozenset(permission for role in self.roles for permission in ROLE_PERMISSIONS[role])

    def allows(self, permission: str) -> bool:
        return permission in self.permissions

    def owns(self, owner_id: str) -> bool:
        return owner_id == self.account_id
