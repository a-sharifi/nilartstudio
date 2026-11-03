"""Versioned discount rules with immutable audit snapshots."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0033"
down_revision = "0032"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("discount_rules",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("code", sa.String(80), nullable=False),
        sa.Column("content", JSONB, nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("code", name="uq_discount_rule_code"),
        sa.CheckConstraint("kind IN ('fixed','percent') AND version>0", name="ck_discount_rule_kind_version"))
    op.create_table("discount_rule_versions",
        sa.Column("revision_id", UUID(as_uuid=True), primary_key=True),
        sa.Column("discount_id", UUID(as_uuid=True), sa.ForeignKey("discount_rules.id"), nullable=False),
        sa.Column("actor_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), nullable=False),
        sa.Column("expected_version", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("content", JSONB, nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("discount_id", "version", name="uq_discount_rule_version"),
        sa.CheckConstraint("expected_version>=0 AND version=expected_version+1", name="ck_discount_rule_revision_version"))

    for constraint in sa.inspect(op.get_bind()).get_check_constraints("sandbox_payments"):
        if constraint["sqltext"].replace(" ", "").replace("(", "").replace(")", "") == "amount_rial>0":
            op.drop_constraint(constraint["name"], "sandbox_payments", type_="check")
    op.create_check_constraint("ck_sandbox_payment_nonnegative", "sandbox_payments", "amount_rial>=0")
    op.add_column("sandbox_payments", sa.Column("intent", JSONB))
    op.create_table("discount_usage",
        sa.Column("payment_id", UUID(as_uuid=True), sa.ForeignKey("sandbox_payments.id"), primary_key=True),
        sa.Column("discount_id", UUID(as_uuid=True), sa.ForeignKey("discount_rules.id"), nullable=False),
        sa.Column("account_id", UUID(as_uuid=True), sa.ForeignKey("identity_accounts.id"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("snapshot", JSONB, nullable=False),
        sa.Column("amount", sa.Numeric(24,2), nullable=False),
        sa.Column("state", sa.String(16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("amount>=0 AND version>0 AND state IN ('reserved','redeemed','released')", name="ck_discount_usage"))
    op.create_index("ix_discount_usage_rule_account", "discount_usage", ["discount_id","account_id","state"])


def downgrade():
    if op.get_bind().scalar(sa.text("SELECT count(*) FROM sandbox_payments WHERE amount_rial=0")):
        raise RuntimeError("Zero-total payment records require the discount-capable schema")
    op.drop_constraint("ck_sandbox_payment_nonnegative", "sandbox_payments", type_="check")
    op.create_check_constraint("sandbox_payments_amount_rial_check", "sandbox_payments", "amount_rial>0")
    op.drop_table("discount_usage")
    op.drop_column("sandbox_payments", "intent")
    op.drop_table("discount_rule_versions")
    op.drop_table("discount_rules")
