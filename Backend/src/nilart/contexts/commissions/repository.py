import json
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import text


class SubmissionConflict(ValueError):
    pass


class SqlCommissionRepository:
    def __init__(self, session):
        self.session = session

    def submit(self, owner, submission, brief):
        parameters = {"id": uuid4(), "owner": owner, "submission": submission,
                      "brief": json.dumps(brief), "now": datetime.now(UTC)}
        row = self.session.execute(text("INSERT INTO commission_requests (id,account_id,submission_id,brief,created_at) "
            "VALUES (:id,:owner,:submission,CAST(:brief AS jsonb),:now) ON CONFLICT (account_id,submission_id) "
            "DO NOTHING RETURNING id,created_at,brief"), parameters).mappings().first()
        if row is None:
            row = self.session.execute(text("SELECT id,created_at,brief FROM commission_requests "
                "WHERE account_id=:owner AND submission_id=:submission"), parameters).mappings().one()
            if row["brief"] != brief:
                raise SubmissionConflict("submission_conflict")
        return {"id": row["id"], "created_at": row["created_at"], "status": "awaiting_review"}
