"""Private customer reference images attached atomically to commission requests."""
from alembic import op

revision = "0057"
down_revision = "0056"
branch_labels = depends_on = None

def upgrade():
    op.execute("""CREATE TABLE commission_references (
      commission_id uuid NOT NULL REFERENCES commission_requests(id),
      id uuid NOT NULL, file_name text NOT NULL, media_type text NOT NULL,
      sha256 text NOT NULL, content bytea NOT NULL CHECK(octet_length(content) BETWEEN 1 AND 5242880),
      PRIMARY KEY(commission_id,id))""")

def downgrade():
    op.drop_table("commission_references")
