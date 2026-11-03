"""Durable Tapin registration intent, including unconfirmed external writes."""

from alembic import op

revision = "0058"
down_revision = "0057"
branch_labels = depends_on = None


def upgrade():
    op.execute("""CREATE TABLE tapin_shipments (
      shipment_id uuid NOT NULL REFERENCES fulfillment_shipments(id),
      operation_id uuid PRIMARY KEY, actor_id uuid NOT NULL REFERENCES identity_accounts(id),
      shop_id uuid NOT NULL, intent jsonb NOT NULL, payload jsonb NOT NULL,
      state text NOT NULL CHECK(state IN ('sending','registered','unknown','rejected')),
      provider_order_id bigint UNIQUE, barcode text, provider_status integer, error_code text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())""")
    op.execute(
        "CREATE UNIQUE INDEX tapin_one_active_registration ON tapin_shipments(shipment_id) WHERE state IN ('sending','unknown','registered')"
    )


def downgrade():
    op.drop_table("tapin_shipments")
