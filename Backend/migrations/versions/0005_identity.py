"""Identity accounts and hashed server sessions; no automatic account seeding."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("identity_accounts",
                    sa.Column("id", UUID(as_uuid=True), primary_key=True),
                    sa.Column("phone", sa.String(16), nullable=False, unique=True),
                    sa.Column("password_hash", sa.Text(), nullable=False),
                    sa.Column("phone_verified", sa.Boolean(), nullable=False),
                    sa.Column("blocked", sa.Boolean(), nullable=False),
                    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False))
    op.create_table("identity_sessions",
                    sa.Column("token_hash", sa.String(64), primary_key=True),
                    sa.Column("account_id", UUID(as_uuid=True),
                              sa.ForeignKey("identity_accounts.id"), nullable=False),
                    sa.Column("csrf_hash", sa.String(64), nullable=False),
                    sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
                    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_identity_sessions_account", "identity_sessions", ["account_id"])
    op.create_index("ix_identity_sessions_expiry", "identity_sessions", ["expires_at"])


def downgrade():
    op.drop_table("identity_sessions")
    op.drop_table("identity_accounts")
