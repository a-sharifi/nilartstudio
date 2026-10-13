"""Owned customer address book, preferences, support and notification records."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0019"
down_revision = "0018"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "customer_records",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "account_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), nullable=False
        ),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("data", JSONB, nullable=False),
        sa.Column("version", sa.Integer, nullable=False, server_default="0"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint(
            "kind IN ('address','preferences','favorite','ticket','message','notification')",
            name="ck_customer_kind",
        ),
        sa.CheckConstraint("version >= 0", name="ck_customer_version"),
    )
    op.create_index("ix_customer_owned", "customer_records", ["account_id", "kind", "id"])
    op.create_index(
        "uq_customer_preferences",
        "customer_records",
        ["account_id"],
        unique=True,
        postgresql_where=sa.text("kind='preferences'"),
    )
    op.create_index(
        "uq_customer_favorite",
        "customer_records",
        ["account_id", sa.text("(data->>'kind')"), sa.text("(data->>'target_id')")],
        unique=True,
        postgresql_where=sa.text("kind='favorite'"),
    )
    op.create_index(
        "uq_customer_message_request",
        "customer_records",
        ["account_id", sa.text("(data->>'request_id')")],
        unique=True,
        postgresql_where=sa.text("kind IN ('ticket','message')"),
    )
    op.create_index(
        "uq_customer_default_address",
        "customer_records",
        ["account_id"],
        unique=True,
        postgresql_where=sa.text("kind='address' AND data->>'default'='true'"),
    )


def downgrade():
    op.drop_table("customer_records")
