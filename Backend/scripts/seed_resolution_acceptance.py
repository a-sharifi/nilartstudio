"""New synthetic imported late-paid shortage for staff-resolution browser QA, nilart_demo only.

Not a gateway transaction or checkout acceptance journey. No existing records are edited.
"""

import json
import sys
from datetime import UTC, datetime
from uuid import UUID, uuid4, uuid5

from sqlalchemy import create_engine, text

from nilart.bootstrap.settings import settings
from nilart.contexts.inventory.router import NAMESPACE
from nilart.contexts.orders.domain import OrderSnapshot, OrderState, validate_state

if "--demo-only" not in sys.argv:
    raise SystemExit("Explicit --demo-only required")
customer, sku = UUID(sys.argv[-2]), UUID(sys.argv[-1])
now = datetime.now(UTC)
with create_engine(settings.database_url).begin() as db:
    assert db.scalar(text("SELECT current_database()")) == "nilart_demo"
    assert db.scalar(
        text(
            "SELECT 1 FROM catalog_skus s JOIN catalog_products p ON p.id=s.product_id WHERE s.id=:id AND p.slug LIKE 'stock-live-%'"
        ),
        {"id": sku},
    )
    actor = db.scalar(text("SELECT id FROM identity_accounts WHERE phone='+989121110001'"))
    order, line, basket, payment, shipment = [uuid4() for _ in range(5)]
    reference = "SANDBOX-REFUND-" + str(order)[:8]
    component = dict(
        unit_amount="100.10",
        paid_amount="200.20",
        line_id=str(line),
        basket_line_id=uuid4().hex,
        component=0,
        kind="sku",
        reference_id=str(sku),
        position_id=str(uuid5(NAMESPACE, f"sku:{sku}")),
        per_unit=1,
        quantity=2,
        title_fa="قلم واردشده آزمایشی",
        title_en="Imported sandbox item",
    )
    snapshot = OrderSnapshot.model_validate(
        dict(
            reference=reference,
            currency="IRT",
            items=[
                dict(
                    id=str(line),
                    title_fa="سفارش آزمایشی بازپرداخت",
                    title_en="Synthetic refund order",
                    sku=str(sku),
                    options_fa="",
                    options_en="",
                    quantity=2,
                    unit_amount="100.10",
                    discount_amount="0",
                    delivery="physical",
                    returnable=True,
                    stock_components=[component],
                )
            ],
            shipping_amount="0",
            tax_amount="0",
            total_amount="200.20",
            recipient="Synthetic demo recipient",
            address="Isolated sandbox fixture",
            receipt=dict(
                number="SYNTHETIC-PAID-" + str(payment)[:8],
                issued_at=now.isoformat(),
                paid_amount="200.20",
            ),
        )
    )
    state = OrderState(
        payment="paid",
        fulfillment="on_hold",
        delivered={},
        refunded_amount="0",
    )
    validate_state(snapshot, state)
    db.execute(
        text(
            "INSERT INTO shopping_baskets(id,account_id,version,lines) VALUES(:id,:owner,1,'[]'::jsonb)"
        ),
        {"id": basket, "owner": customer},
    )
    db.execute(
        text(
            "INSERT INTO customer_orders(id,account_id,source_id,snapshot,state,sandbox) VALUES(:id,:owner,:source,CAST(:snapshot AS jsonb),CAST(:state AS jsonb),true)"
        ),
        {
            "id": order,
            "owner": customer,
            "source": uuid4(),
            "snapshot": snapshot.model_dump_json(),
            "state": state.model_dump_json(),
        },
    )
    db.execute(
        text(
            "INSERT INTO sandbox_payments(id,account_id,basket_id,basket_version,command_id,order_id,amount_rial,status,reference,language) VALUES(:id,:owner,:basket,1,:command,:order,2002,'paid',:reference,'en')"
        ),
        {
            "id": payment,
            "owner": customer,
            "basket": basket,
            "command": uuid4(),
            "order": order,
            "reference": "SYNTHETIC-" + str(payment)[:8],
        },
    )
    from sqlalchemy.orm import Session

    from nilart.contexts.business.router import current_settings
    from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
    from nilart.contexts.inventory import reservations as stock
    from nilart.shared.outbox import enqueue

    session = Session(bind=db, join_transaction_mode="create_savepoint")
    version, policy, _ = current_settings(session)
    assert (
        policy.reservation_minutes
        and policy.return_days is not None
        and policy.return_policy_fa
        and policy.return_policy_en
    ), "Explicit demo shipment policies required"
    position = component["position_id"]
    assert not session.scalar(
        text("SELECT 1 FROM inventory_positions WHERE id=:id"), {"id": position}
    ), "Use a fresh synthetic SKU"
    session.execute(
        text(
            "INSERT INTO inventory_positions(id,kind,reference_id,code,title_fa,title_en,unit,quantity,reserved,value,version) SELECT :id,'sku',id,code,'آزمایش','Synthetic','piece',2,0,100,1 FROM catalog_skus WHERE id=:sku"
        ),
        {"id": position, "sku": sku},
    )
    opening = uuid4()
    stock_intent = dict(
        kind="sku",
        reference_id=str(sku),
        expected_version=0,
        action="opening",
        quantity="2",
        value="100",
        threshold=None,
        reverses_id=None,
        reason="Explicit counted synthetic demo opening stock",
    )
    session.execute(
        text(
            "INSERT INTO inventory_movements(id,position_id,actor_id,kind,expected_version,version,quantity_delta,value_delta,quantity_after,value_after,reason,intent) VALUES(:id,:position,:actor,'opening',0,1,2,100,2,100,:reason,CAST(:intent AS jsonb))"
        ),
        {
            "id": opening,
            "position": position,
            "actor": actor,
            "reason": stock_intent["reason"],
            "intent": json.dumps(stock_intent),
        },
    )
    payload = dict(position_id=position, movement_id=str(opening), version=1)
    SqlAccountManagement(session).audit(
        str(actor), str(actor), "inventory.adjusted", payload, stock_intent["reason"]
    )
    enqueue(session, "inventory.adjusted", payload)
    stock.reserve_checkout(
        session,
        order,
        actor,
        dict(settings_version=version, reservation_minutes=policy.reservation_minutes),
        [component],
    )
    from types import SimpleNamespace

    from starlette.requests import Request

    from nilart.contexts.inventory.router import Command as StockCommand
    from nilart.contexts.inventory.service import apply_adjustment

    stock.release(session, order, actor, "expire", "Synthetic configured reservation expired for this fixture only")
    loss = apply_adjustment(
        session,
        SimpleNamespace(id=str(actor)),
        Request({"type": "http", "headers": [], "method": "PUT", "path": "/isolated-demo-fixture"}),
        uuid4(),
        StockCommand(
            kind="sku",
            reference_id=sku,
            expected_version=1,
            action="waste",
            quantity="2",
            reason="Observed synthetic damage after reservation expiry",
            value=None,
            threshold=None,
            reverses_id=None,
        ),
    )
    assert isinstance(loss, dict), "Synthetic loss must be recorded"
    stock.confirm(session, order, actor, reason="Synthetic imported late payment confirmation")
    session.commit()
    print(
        json.dumps(
            dict(
                order=str(order),
                line=str(line),
                sku=str(sku),
                customer=str(customer),
                reference=reference,
            )
        )
    )
