from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import text


def current(db):
    if not db.scalar(text("SELECT to_regclass('marketing_settings')")):
        return 0, {"banner": {}, "sales": []}
    row = db.execute(text("SELECT * FROM marketing_settings WHERE id=1")).mappings().first()
    return (row["version"], row["content"]) if row else (0, {"banner": {}, "sales": []})


def effective_sale(db, kind, id, base, currency="IRT", on=None):
    base = Decimal(str(base))
    on = on or datetime.now(UTC)
    _, data = current(db)
    for rule in data.get("sales", []):
        if rule["kind"] != kind or rule["target_id"] != str(id) or not rule["active"]:
            continue
        start = datetime.fromisoformat(rule["starts_at"].replace("Z", "+00:00"))
        end = datetime.fromisoformat(rule["ends_at"].replace("Z", "+00:00"))
        if not start <= on < end:
            continue
        price = Decimal(rule["sale_amount"]) * (10 if currency == "IRR" else 1)
        if 0 < price < base:
            return price
    return base
