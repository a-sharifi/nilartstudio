"""Explicit account roles. Never create or auto-promote an administrator."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("identity_account_roles",
                    sa.Column("account_id", UUID(as_uuid=True),
                              sa.ForeignKey("identity_accounts.id"), primary_key=True),
                    sa.Column("role", sa.String(24), primary_key=True),
                    sa.CheckConstraint("role IN ('customer','artist','operations','finance','admin')",
                                       name="ck_identity_role"))
    op.execute("INSERT INTO identity_account_roles (account_id,role) "
               "SELECT id,'customer' FROM identity_accounts")


def downgrade():
    op.drop_table("identity_account_roles")
