"""Retained, actor-owned sandbox payment inquiry receipts."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0042"
down_revision = "0041"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("sandbox_payments", sa.Column("version", sa.Integer(), nullable=False, server_default="0"))
    op.execute("CREATE FUNCTION advance_payment_version() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.version := OLD.version + 1; RETURN NEW; END $$")
    op.execute("CREATE TRIGGER payment_version BEFORE UPDATE ON sandbox_payments FOR EACH ROW EXECUTE FUNCTION advance_payment_version()")
    op.create_table(
        "payment_inquiries",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("payment_id", UUID(as_uuid=True), sa.ForeignKey("sandbox_payments.id"), nullable=False),
        sa.Column("actor_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), nullable=False),
        sa.Column("intent", JSONB, nullable=False),
        sa.Column("before", JSONB, nullable=False),
        sa.Column("result", JSONB, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_payment_inquiry_history", "payment_inquiries", ["payment_id", "created_at", "id"])


def downgrade():
    op.drop_table("payment_inquiries")
    op.execute("DROP TRIGGER payment_version ON sandbox_payments")
    op.execute("DROP FUNCTION advance_payment_version()")
    op.drop_column("sandbox_payments", "version")
