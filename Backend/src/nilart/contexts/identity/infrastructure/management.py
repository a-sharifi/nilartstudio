import json
from uuid import uuid4

from sqlalchemy import text

from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository


class ManagementError(ValueError):
    def __init__(self, code: str, status: int):
        self.code, self.status = code, status
        super().__init__(code)


class SqlAccountManagement:
    def __init__(self, db):
        self.db = db

    def serialize_writes(self):
        self.db.execute(text("SELECT pg_advisory_xact_lock(hashtextextended('identity-management',0))"))

    def read(self, account_id, *, lock=False):
        row = self.db.execute(text("SELECT id,phone,phone_verified,blocked,access_version FROM identity_accounts "
                                   "WHERE id=:id" + (" FOR UPDATE" if lock else "")), {"id": account_id}).mappings().first()
        if not row:
            raise ManagementError("account_not_found", 404)
        overrides = self.db.execute(text("SELECT permission,allowed FROM identity_permission_overrides WHERE account_id=:id ORDER BY permission"), {"id": account_id}).mappings().all()
        principal = SqlIdentityRepository(self.db).principal(str(row["id"]))
        return {"id": str(row["id"]), "phone": row["phone"], "phone_verified": row["phone_verified"],
                "blocked": row["blocked"], "version": row["access_version"], "roles": sorted(principal.roles),
                "overrides": {row["permission"]: row["allowed"] for row in overrides}, "permissions": sorted(principal.permissions)}

    def audit(self, actor, account, action, changes, reason):
        self.db.execute(text("INSERT INTO identity_audits(id,actor_id,account_id,action,changes,reason) "
                             "VALUES(:id,:actor,:account,:action,CAST(:changes AS jsonb),:reason)"),
                        {"id": uuid4(), "actor": actor, "account": account, "action": action,
                         "changes": json.dumps(changes), "reason": reason})

    def update(self, actor, target, version, roles, overrides, blocked, reason):
        before = self.read(target, lock=True)
        if before["version"] != version:
            raise ManagementError("access_version_conflict", 409)
        self.db.execute(text("DELETE FROM identity_account_roles WHERE account_id=:id"), {"id": target})
        for role in roles:
            self.db.execute(text("INSERT INTO identity_account_roles(account_id,role) VALUES(:id,:role)"), {"id": target, "role": role})
        self.db.execute(text("DELETE FROM identity_permission_overrides WHERE account_id=:id"), {"id": target})
        for permission, allowed in overrides.items():
            self.db.execute(text("INSERT INTO identity_permission_overrides(account_id,permission,allowed) VALUES(:id,:permission,:allowed)"), {"id": target, "permission": permission, "allowed": allowed})
        self.db.execute(text("UPDATE identity_accounts SET blocked=:blocked,access_version=access_version+1 WHERE id=:id"), {"id": target, "blocked": blocked})
        candidates = self.db.execute(text("SELECT id FROM identity_accounts WHERE blocked=false AND phone_verified=true")).scalars()
        if not any(SqlIdentityRepository(self.db).principal(str(id)).allows("identity.manage") for id in candidates):
            raise ManagementError("last_access_manager", 409)
        if blocked:
            self.db.execute(text("DELETE FROM identity_sessions WHERE account_id=:id"), {"id": target})
            self.db.execute(text("UPDATE identity_phone_changes SET consumed=true WHERE account_id=:id"), {"id": target})
            self.db.execute(text("UPDATE identity_password_grants SET consumed=true WHERE phone=:phone"), {"phone": before["phone"]})
            self.db.execute(text("UPDATE identity_otp_challenges SET consumed=true WHERE phone=:phone"), {"phone": before["phone"]})
        after = self.read(target)
        self.audit(actor, target, "access.updated", {"before": before, "after": after}, reason)
        return after

    def bootstrap(self, target, reason):
        self.serialize_writes()
        if self.db.execute(text("SELECT 1 FROM identity_account_roles WHERE role='admin' LIMIT 1")).first():
            raise ManagementError("administrator_already_exists", 409)
        before = self.read(target, lock=True)
        if before["blocked"] or not before["phone_verified"]:
            raise ManagementError("account_inactive", 409)
        self.db.execute(text("INSERT INTO identity_account_roles(account_id,role) VALUES(:id,'admin')"), {"id": target})
        self.db.execute(text("UPDATE identity_accounts SET access_version=access_version+1 WHERE id=:id"), {"id": target})
        after = self.read(target)
        if "identity.manage" not in after["permissions"]:
            raise ManagementError("account_inactive", 409)
        self.audit(None, target, "admin.bootstrapped", {"before": before, "after": after}, reason)
        return after
