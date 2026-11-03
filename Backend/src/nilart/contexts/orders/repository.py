import json
from uuid import uuid4

from sqlalchemy import text

from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.contexts.orders.domain import OrderSnapshot, OrderState, validate_state
from nilart.shared.outbox import enqueue


class OrderConflict(ValueError):
    pass


class SqlOrderRepository:
    def __init__(self, db):
        self.db = db

    def owned(self, owner, id, lock=False):
        return self.db.execute(text(
            "SELECT * FROM customer_orders WHERE account_id=:owner AND id=:id"
            + (" FOR UPDATE" if lock else "")), {"owner": owner, "id": id}).mappings().first()

    def record_checkout_snapshot(self, owner, source_id, snapshot: OrderSnapshot, state: OrderState):
        """Internal adapter boundary, not a customer payment or order-creation endpoint.

        Called only after upstream checkout/fulfillment confirms these facts. Does not
        reserve stock, charge a card, invent a receipt, or commit its caller's transaction.
        """
        snapshot = OrderSnapshot.model_validate(snapshot.model_dump())
        state = OrderState.model_validate(state.model_dump())
        validate_state(snapshot, state)
        payload, status = snapshot.model_dump(mode="json"), state.model_dump(mode="json")
        row = self.db.execute(text(
            "INSERT INTO customer_orders(id,account_id,source_id,snapshot,state) "
            "VALUES(:id,:owner,:source,CAST(:snapshot AS jsonb),CAST(:state AS jsonb)) "
            "ON CONFLICT(account_id,source_id) DO NOTHING RETURNING *"),
            {"id": uuid4(), "owner": owner, "source": source_id,
             "snapshot": json.dumps(payload), "state": json.dumps(status)}).mappings().first()
        if row is None:
            row = self.db.execute(text(
                "SELECT * FROM customer_orders WHERE account_id=:owner AND source_id=:source"),
                {"owner": owner, "source": source_id}).mappings().one()
            if OrderSnapshot.model_validate(row["snapshot"]).model_dump(mode="json") != payload:
                raise OrderConflict("order_source_conflict")
        else:
            SqlAccountManagement(self.db).audit(owner, owner, "orders.recorded",
                {"order_id": str(row["id"])}, "Confirmed upstream order snapshot")
            enqueue(self.db, "orders.recorded", {"order_id": str(row["id"]), "account_id": str(owner)})
        return row
