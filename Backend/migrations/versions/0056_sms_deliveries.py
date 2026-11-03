"""Durable, deduplicated transactional SMS receipts; never stores OTP codes."""

from alembic import op

revision = "0056"
down_revision = "0055"
branch_labels = depends_on = None


def upgrade():
    op.execute("""CREATE TABLE sms_deliveries (
        id uuid PRIMARY KEY,
        event_key text NOT NULL UNIQUE,
        account_id uuid NOT NULL REFERENCES identity_accounts(id),
        order_id uuid NOT NULL REFERENCES customer_orders(id),
        template text NOT NULL,
        recipient text NOT NULL,
        tokens jsonb NOT NULL,
        status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','accepted','unknown','skipped')),
        message_id bigint,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
    )""")
    op.execute(
        "CREATE INDEX sms_deliveries_pending ON sms_deliveries(created_at) WHERE status='pending'"
    )


def downgrade():
    op.drop_table("sms_deliveries")
