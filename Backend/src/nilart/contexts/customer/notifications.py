"""Transactional in-app notices for recorded customer events. No SMS delivery."""
import json
from typing import Literal
from uuid import UUID, uuid5

from sqlalchemy import text

NAMESPACE = UUID("d33e8200-a806-4d3c-9209-f2de4720ab23")


def notify(db, owner, *, event: str, category: Literal["order", "artwork", "files", "support"],
           title_fa: str, title_en: str, reference: Literal["request_id", "commission_id", "file_id", "ticket_id", "order_id"], id):
    """Caller commits the event and notice together; deterministic identity deduplicates."""
    owner, id = UUID(str(owner)), UUID(str(id))
    preferences = db.execute(text("SELECT data FROM customer_records WHERE account_id=:owner "
                                  "AND kind='preferences' ORDER BY created_at,id LIMIT 1"), {"owner": owner}).scalar()
    if preferences and not preferences.get("choices", {}).get(category, {}).get("inApp", True):
        return
    notice_id = uuid5(NAMESPACE, f"{owner}:{event}")
    payload = {"read": False, "category": category, "title_fa": title_fa,
               "title_en": title_en, reference: str(id)}
    db.execute(text("INSERT INTO customer_records(id,account_id,kind,data) "
                    "VALUES(:id,:owner,'notification',CAST(:data AS jsonb)) ON CONFLICT (id) DO NOTHING"),
               {"id": notice_id, "owner": owner, "data": json.dumps(payload)})
