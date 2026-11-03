import importlib.util
from pathlib import Path
from uuid import uuid4

from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import text
from test_cost_resources_postgres import prepare, save as save_material
from test_identity_otp_postgres import flow as flow
from test_suppliers_postgres import save as save_supplier


def setup(flow, staff=True):
    client, db, owner = prepare(flow, staff)
    for name in ("0032_suppliers.py", "0035_stock_ledger.py", "0038_purchases.py"):
        path=Path(__file__).parents[1]/"migrations/versions"/name
        spec=importlib.util.spec_from_file_location(path.stem,path)
        module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        with Operations.context(MigrationContext.configure(db.connection())):
            module.upgrade()
    if not staff:
        return client,db,None,None
    supplier,material=uuid4(),uuid4()
    assert save_supplier(client,id=supplier).status_code==200
    assert save_material(client,id=material).status_code==200
    return client,db,supplier,material


def content(supplier,material,quantity="10",unit_price="10",discount="0",acquisition="0"):
    return dict(supplier_id=str(supplier),document_number="P-001",document_date="2026-10-18",currency="IRT",notes="Synthetic purchase",
                lines=[dict(id=str(uuid4()),kind="material",reference_id=str(material),quantity=quantity,unit_price=unit_price,discount=discount,supplier_acquisition_cost=acquisition)])


def command(client,id,version,action,**extra):
    key=extra.pop("key",uuid4())
    return client.put(f"/api/v1/admin/procurement/purchases/{id}/commands/{key}",json=dict(expected_version=version,action=action,reason="Reviewed synthetic purchase",**extra))


def draft_post(client,supplier,material,**changes):
    id=uuid4();body=content(supplier,material,**changes)
    response=command(client,id,0,"draft",content=body)
    assert response.status_code==200,response.text
    response=command(client,id,1,"post")
    assert response.status_code==200,response.text
    return id,body["lines"][0]["id"]


def test_purchase_post_receipt_and_supplier_credit_are_distinct(flow):
    client,db,supplier,material=setup(flow)
    id,line=draft_post(client,supplier,material,discount="10",acquisition="5")
    assert db.scalar(text("SELECT count(*) FROM inventory_movements"))==0
    state=client.get(f"/api/v1/admin/procurement/purchases/{id}").json()
    assert state["state"]["liability"]=="95.000000"
    first=command(client,id,2,"receive",lines=[dict(line_id=line,quantity="4")])
    assert first.status_code==200,first.text
    assert first.json()["result"]["state"]["lines"][line]["received_value"]=="38.000000"
    second=command(client,id,3,"receive",lines=[dict(line_id=line,quantity="6")])
    assert second.status_code==200,second.text
    assert db.scalar(text("SELECT value FROM inventory_positions"))==95
    returned=command(client,id,4,"return",receipt_id=first.json()["id"],lines=[dict(line_id=line,quantity="2")])
    assert returned.status_code==200,returned.text
    assert returned.json()["result"]["state"]["liability"]=="76.000000"
    assert db.scalar(text("SELECT quantity FROM inventory_positions"))==8
    statement=client.get(f"/api/v1/admin/procurement/suppliers/{supplier}/purchase-statement").json()
    assert statement["purchase_liability"]=="76.000000" and statement["payments_included"] is False
    movement=client.get(f"/api/v1/admin/inventory/positions/{returned.json()['result']['state']['movements'][0]['position_id']}/movements").json()["items"][0]
    assert movement["source_document_id"]==str(id)
    reversed=client.put(f"/api/v1/admin/inventory/commands/{uuid4()}",json=dict(kind="material",reference_id=str(material),expected_version=3,action="reverse",reverses_id=movement["id"],reason="Cannot bypass source"))
    assert reversed.status_code==409


def test_retry_is_exact_and_reused_intent_or_stale_version_never_double_receives(flow):
    client,db,supplier,material=setup(flow);id,line=draft_post(client,supplier,material)
    key=uuid4();changes=dict(lines=[dict(line_id=line,quantity="3")],key=key)
    first=command(client,id,2,"receive",**changes)
    assert first.status_code==200,first.text
    assert command(client,id,2,"receive",**changes).json()==first.json()
    assert command(client,id,2,"receive",key=key,lines=[dict(line_id=line,quantity="4")]).status_code==409
    assert command(client,id,2,"receive",lines=[dict(line_id=line,quantity="3")]).status_code==409
    assert client.get(f"/api/v1/admin/procurement/purchases/{id}/commands/{key}").json()==first.json()
    assert db.scalar(text("SELECT quantity FROM inventory_positions"))==3
    assert db.scalar(text("SELECT count(*) FROM inventory_movements"))==1
    assert db.scalar(text("SELECT count(*) FROM outbox_events WHERE event_type='procurement.purchase_changed'"))==3


def test_return_uses_original_receipt_credit_and_current_weighted_average(flow):
    client,db,supplier,material=setup(flow);id,line=draft_post(client,supplier,material)
    first=command(client,id,2,"receive",lines=[dict(line_id=line,quantity="10")])
    other,otherline=draft_post(client,supplier,material,unit_price="30")
    assert command(client,other,2,"receive",lines=[dict(line_id=otherline,quantity="10")]).status_code==200
    result=command(client,id,3,"return",receipt_id=first.json()["id"],lines=[dict(line_id=line,quantity="2")])
    assert result.status_code==200,result.text
    movement=result.json()["result"]["state"]["movements"][0]
    assert movement["supplier_credit"]=="20.000000" and movement["value_delta"]=="-40.000000"
    assert movement["valuation_difference"]=="-20.000000"
    assert db.scalar(text("SELECT value FROM inventory_positions"))==360
    assert command(client,id,4,"return",receipt_id=first.json()["id"],lines=[dict(line_id=line,quantity="9")]).status_code==409


def test_receipt_excess_and_return_stock_shortage_rollback(flow):
    client,db,supplier,material=setup(flow);id,line=draft_post(client,supplier,material)
    assert command(client,id,2,"receive",lines=[dict(line_id=line,quantity="11")]).status_code==409
    first=command(client,id,2,"receive",lines=[dict(line_id=line,quantity="10")])
    decrease=client.put(f"/api/v1/admin/inventory/commands/{uuid4()}",json=dict(kind="material",reference_id=str(material),expected_version=1,action="decrease",quantity="9",reason="Workshop consumption"))
    assert decrease.status_code==200,decrease.text
    result=command(client,id,3,"return",receipt_id=first.json()["id"],lines=[dict(line_id=line,quantity="2")])
    assert result.status_code==409
    assert db.scalar(text("SELECT returned FROM procurement_receipt_lines"))==0
    assert db.scalar(text("SELECT version FROM procurement_purchases"))==3
    assert db.scalar(text("SELECT quantity FROM inventory_positions"))==1


def test_posted_purchase_is_immutable_cancel_without_receipts_is_linked(flow):
    client,db,supplier,material=setup(flow);id,line=draft_post(client,supplier,material)
    assert command(client,id,2,"draft",content=content(supplier,material)).status_code==409
    assert command(client,id,2,"cancel").status_code==200
    assert db.scalar(text("SELECT state->>'liability' FROM procurement_purchases"))=="0"
    assert command(client,id,3,"receive",lines=[dict(line_id=line,quantity="1")]).status_code==409
    assert db.scalar(text("SELECT count(*) FROM procurement_purchase_events"))==3


def test_partial_receipt_rounding_sums_to_invoice(flow):
    client,db,supplier,material=setup(flow);id,line=draft_post(client,supplier,material,quantity="3",unit_price="1",discount="2")
    for version in (2,3,4):
        response=command(client,id,version,"receive",lines=[dict(line_id=line,quantity="1")])
        assert response.status_code==200,response.text
    assert db.scalar(text("SELECT sum(value) FROM procurement_receipt_lines"))==1
    assert db.scalar(text("SELECT value FROM inventory_positions"))==1


def test_purchase_permission_and_csrf(flow):
    client,db,supplier,material=setup(flow,False)
    assert client.get("/api/v1/admin/procurement/purchases").status_code==403
    assert command(client,uuid4(),0,"draft",content=content(uuid4(),uuid4())).status_code==403


def test_multi_line_receipt_failure_rolls_back_every_stock_and_allocation(flow):
    client,db,supplier,material=setup(flow)
    second=uuid4()
    from test_cost_resources_postgres import content as material_content
    assert save_material(client,id=second,resource=material_content(code="PAPER-B")).status_code==200
    body=content(supplier,material);body["lines"]+=content(supplier,second)["lines"]
    id=uuid4()
    assert command(client,id,0,"draft",content=body).status_code==200
    assert command(client,id,1,"post").status_code==200
    response=command(client,id,2,"receive",lines=[dict(line_id=body["lines"][0]["id"],quantity="2"),dict(line_id=body["lines"][1]["id"],quantity="11")])
    assert response.status_code==409
    assert db.scalar(text("SELECT count(*) FROM inventory_positions"))==0
    assert db.scalar(text("SELECT count(*) FROM procurement_receipt_lines"))==0
    assert db.scalar(text("SELECT version FROM procurement_purchases"))==2


def test_return_cannot_borrow_receipt_from_another_purchase_and_posted_cancel_is_bounded(flow):
    client,db,supplier,material=setup(flow);id,line=draft_post(client,supplier,material)
    original=command(client,id,2,"receive",lines=[dict(line_id=line,quantity="1")])
    other,otherline=draft_post(client,supplier,material)
    assert command(client,other,2,"return",receipt_id=original.json()["id"],lines=[dict(line_id=otherline,quantity="1")]).status_code==409
    assert command(client,id,3,"cancel").status_code==409
    assert db.scalar(text("SELECT quantity FROM inventory_positions"))==1


def test_purchase_write_rechecks_permission_and_csrf(flow):
    client,db,supplier,material=setup(flow)
    client.headers["X-CSRF-Token"]="invalid"
    assert command(client,uuid4(),0,"draft",content=content(supplier,material)).status_code==403
    assert db.scalar(text("SELECT count(*) FROM procurement_purchases"))==0


def test_large_receipt_valuation_remains_readable_in_stock_history(flow):
    client,db,supplier,material=setup(flow);id,line=draft_post(client,supplier,material,quantity="1000000",unit_price="2000000")
    response=command(client,id,2,"receive",lines=[dict(line_id=line,quantity="1000000")])
    assert response.status_code==200,response.text
    pid=response.json()["result"]["state"]["movements"][0]["position_id"]
    history=client.get(f"/api/v1/admin/inventory/positions/{pid}/movements")
    assert history.status_code==200,history.text
    assert history.json()["items"][0]["value_after"]=="2000000000000.000000"
