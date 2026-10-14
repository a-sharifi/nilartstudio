"""Owned and guest baskets with optimistic writes and command idempotency."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0027"
down_revision = "0026"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("shopping_baskets",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("account_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), nullable=True),
        sa.Column("token_hash", sa.String(64), nullable=True, unique=True),
        sa.Column("csrf_hash", sa.String(64), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("lines", JSONB, nullable=False, server_default="[]"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("version >= 0", name="ck_basket_version"),
        sa.CheckConstraint("(account_id IS NULL) <> (token_hash IS NULL)", name="ck_basket_owner"),
    )
    op.create_index("uq_basket_account", "shopping_baskets", ["account_id"], unique=True, postgresql_where=sa.text("account_id IS NOT NULL"))
    op.create_table("shopping_basket_commands",
        sa.Column("basket_id", UUID(as_uuid=True), sa.ForeignKey("shopping_baskets.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("command_id", UUID(as_uuid=True), primary_key=True),
        sa.Column("payload_hash", sa.String(64), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
    )


def downgrade():
    op.drop_table("shopping_basket_commands")
    op.drop_table("shopping_baskets")
