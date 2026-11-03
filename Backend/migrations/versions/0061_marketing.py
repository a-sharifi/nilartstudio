"""Versioned storefront banners and scheduled sale prices; no offers activated."""

from alembic import op

revision = "0061"
down_revision = "0060"
branch_labels = depends_on = None


def upgrade():
    op.execute("""CREATE TABLE marketing_settings (
      id integer PRIMARY KEY CHECK(id=1),version integer NOT NULL,content jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now())""")
    op.execute("""CREATE TABLE marketing_revisions (
      id uuid PRIMARY KEY,actor_id uuid NOT NULL REFERENCES identity_accounts(id),expected_version integer NOT NULL,version integer NOT NULL,
      content jsonb NOT NULL,reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now())""")


def downgrade():
    op.drop_table("marketing_revisions")
    op.drop_table("marketing_settings")
