"""Server-bound, expiring checkout carrier quotes."""

from alembic import op

revision = "0059"
down_revision = "0058"
branch_labels = depends_on = None


def upgrade():
    op.execute("""CREATE TABLE checkout_carrier_quotes (
      key text PRIMARY KEY, account_id uuid NOT NULL REFERENCES identity_accounts(id),
      quote jsonb NOT NULL, expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now())""")
    op.execute("CREATE INDEX checkout_carrier_quote_expiry ON checkout_carrier_quotes(expires_at)")


def downgrade():
    op.drop_table("checkout_carrier_quotes")
