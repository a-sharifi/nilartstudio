"""Audited account access management and public session identifiers."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0017"
down_revision = "0016"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("identity_accounts", sa.Column("access_version", sa.Integer(), nullable=False, server_default="0"))
    op.create_check_constraint("ck_identity_access_version", "identity_accounts", "access_version >= 0")
    op.add_column("identity_sessions", sa.Column("id", UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")))
    op.create_unique_constraint("uq_identity_session_id", "identity_sessions", ["id"])
    op.create_table("identity_permission_overrides",
        sa.Column("account_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), primary_key=True),
        sa.Column("permission", sa.String(80), primary_key=True),
        sa.Column("allowed", sa.Boolean(), nullable=False))
    op.create_table("identity_audits",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("actor_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), nullable=True),
        sa.Column("account_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), nullable=False),
        sa.Column("action", sa.String(40), nullable=False),
        sa.Column("changes", JSONB(), nullable=False),
        sa.Column("reason", sa.String(1000), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.create_index("ix_identity_audits_account", "identity_audits", ["account_id", "created_at"])


def downgrade():
    op.drop_table("identity_audits")
    op.drop_table("identity_permission_overrides")
    op.drop_constraint("uq_identity_session_id", "identity_sessions", type_="unique")
    op.drop_column("identity_sessions", "id")
    op.drop_constraint("ck_identity_access_version", "identity_accounts", type_="check")
    op.drop_column("identity_accounts", "access_version")
