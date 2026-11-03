import importlib.util
from pathlib import Path
from uuid import uuid4

import pytest
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import text
from test_cost_resources_postgres import content, prepare
from test_cost_resources_postgres import save as save_material
from test_identity_otp_postgres import flow as flow


def setup(flow):
    client,db,owner=prepare(flow)
    path=Path(__file__).parents[1]/"migrations/versions/0035_stock_ledger.py"
    spec=importlib.util.spec_from_file_location("stock_migration",path)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with Operations.context(MigrationContext.configure(db.connection())):
        module.upgrade()
    material=uuid4()
    assert save_material(client,id=material).status_code==200
    return client,db,material


def command(client,material,key=None,**changes):
    body={"kind":"material","reference_id":str(material),"expected_version":0,"action":"opening","quantity":"250","value":"1000","reason":"Counted opening stock",**changes}
    return client.put(f"/api/v1/admin/inventory/commands/{key or uuid4()}",json=body)


def test_stock_opening_average_cost_outgoing_and_immutable_replay(flow):
    client,db,material=setup(flow)
    key=uuid4()
    first=command(client,material,key)
    assert first.status_code==200,first.text
    assert command(client,material,key).json()==first.json()
    assert command(client,material,key,reason="Different").status_code==409
    pid=first.json()["position_id"]
    state=client.get(f"/api/v1/admin/inventory/positions/{pid}").json()
    assert state["quantity"]=="250.000000" and state["average_cost"]=="4.000000"
    assert command(client,material,action="increase",expected_version=1,quantity="250",value="2000").status_code==200
    used=command(client,material,action="decrease",expected_version=2,quantity="125",value=None)
    assert used.status_code==200,used.text
    assert used.json()["value_delta"]=="-750.000000"
    assert used.json()["quantity_after"]=="375.000000"
    assert client.get(f"/api/v1/admin/inventory/commands/{key}").json()==first.json()
    page=client.get(f"/api/v1/admin/inventory/positions/{pid}/movements?limit=1").json()
    assert page["items"][0]["version"]==3 and page["next_before_version"]==3
    assert len(client.get(f"/api/v1/admin/inventory/positions/{pid}/movements?before=3").json()["items"])==2
    assert db.scalar(text("SELECT count(*) FROM identity_audits WHERE action='inventory.adjusted'"))==3


def test_threshold_and_latest_linked_reversal(flow):
    client,db,material=setup(flow)
    first=command(client,material).json()
    pid=first["position_id"]
    threshold=command(client,material,expected_version=1,action="threshold",quantity="0",value=None,threshold="250")
    assert threshold.status_code==200,threshold.text
    assert len(client.get("/api/v1/admin/inventory?low=true").json()["items"])==1
    reversal=command(client,material,action="reverse",expected_version=2,quantity="0",value=None,reverses_id=threshold.json()["id"])
    assert reversal.status_code==200,reversal.text
    assert reversal.json()["threshold_after"] is None
    assert command(client,material,action="reverse",expected_version=3,quantity="0",value=None,reverses_id=first["id"]).status_code==409
    assert client.get(f"/api/v1/admin/inventory/positions/{pid}").json()["quantity"]=="250.000000"


def test_no_negative_reserved_repeated_opening_or_stale_write(flow):
    client,db,material=setup(flow)
    first=command(client,material).json()
    assert command(client,material).status_code==409
    assert command(client,material,expected_version=1).json()["code"]=="stock_opening_exists"
    assert command(client,material,action="waste",expected_version=1,quantity="251",value=None).json()["code"]=="stock_insufficient"
    db.execute(text("UPDATE inventory_positions SET reserved=200 WHERE id=:id"),{"id":first["position_id"]})
    db.commit()
    assert command(client,material,action="decrease",expected_version=1,quantity="51",value=None).status_code==409
    result=command(client,material,action="waste",expected_version=1,quantity="50",value=None)
    assert result.status_code==200
    assert result.json()["quantity_after"]=="200.000000"


def test_last_outgoing_removes_all_value_without_rounding_residue(flow):
    client,db,material=setup(flow)
    first=command(client,material,quantity="3",value="1")
    for version in [1,2,3]:
        used=command(client,material,expected_version=version,action="decrease",quantity="1",value=None)
        assert used.status_code==200,used.text
    assert used.json()["quantity_after"]=="0.000000" and used.json()["value_after"]=="0.000000"
    assert first.json()["value_delta"]=="1.000000"


def test_stock_reference_unit_change_and_literal_choices(flow):
    client,db,material=setup(flow)
    assert command(client,uuid4()).status_code==404
    first=command(client,material)
    assert first.status_code==200
    assert client.get("/api/v1/admin/inventory/choices/material?q=%").json()["items"]==[]
    assert client.get("/api/v1/admin/inventory/choices/material?q=PAPER").json()["items"][0]["id"]==str(material)
    assert save_material(client,id=material,version=1,resource=content(base_unit="kilogram",purchase_unit=None,purchase_to_base=None)).status_code==200
    assert command(client,material,expected_version=1,action="decrease",quantity="1",value=None).json()["code"]=="stock_unit_changed"


@pytest.mark.parametrize("change",[{"quantity":"-1"},{"quantity":"1e4"},{"quantity":"0"},{"value":None},{"quantity":"1.0000001"},{"expected_version":True},{"action":"decrease","value":"5"},{"action":"reverse","quantity":"0","value":None},{"threshold":"2"}])
def test_invalid_stock_commands_do_not_write(flow,change):
    client,db,material=setup(flow)
    assert command(client,material,**change).status_code==422
    assert db.scalar(text("SELECT count(*) FROM inventory_positions"))==0


def test_stock_atomic_rollback(flow,monkeypatch):
    client,db,material=setup(flow)
    import nilart.contexts.inventory.service as service
    def broken(*args,**kwargs):
        raise RuntimeError("No outbox")
    monkeypatch.setattr(service,"enqueue",broken)
    with pytest.raises(RuntimeError,match="No outbox"):
        command(client,material)
    assert db.scalar(text("SELECT count(*) FROM inventory_positions"))==0
    assert db.scalar(text("SELECT count(*) FROM inventory_movements"))==0
    assert db.scalar(text("SELECT count(*) FROM identity_audits WHERE action='inventory.adjusted'"))==0


def test_concurrent_stock_decreases_have_one_winner_and_downgrade_preserves_sources():
    import os
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    from types import SimpleNamespace

    from fastapi import Request
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    from nilart.contexts.inventory.router import Command
    from nilart.contexts.inventory.service import apply_adjustment
    from nilart.shared.outbox import metadata

    url=os.environ.get("NILART_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Isolated PostgreSQL required")
    engine=create_engine(url)
    schema,actor,material="stock_concurrent_"+uuid4().hex,uuid4(),uuid4()
    spec=importlib.util.spec_from_file_location("concurrent_stock",Path(__file__).parents[1]/"migrations/versions/0035_stock_ledger.py")
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    request=Request({"type":"http","headers":[],"method":"PUT","path":"/"})
    request.state.request_id="isolated-stock-concurrency"
    def execute(command):
        with engine.connect() as connection:
            connection.execute(text(f'SET search_path TO "{schema}"'))
            connection.commit()
            with Session(bind=connection) as db:
                return apply_adjustment(db,SimpleNamespace(id=str(actor)),request,uuid4(),Command(kind="material",reference_id=material,reason="Concurrent physical count",**command))
    try:
        with engine.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))
            connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            metadata.create_all(connection)
            connection.execute(text("CREATE TABLE identity_accounts(id uuid PRIMARY KEY)"))
            connection.execute(text("CREATE TABLE identity_audits(id uuid PRIMARY KEY,actor_id uuid,account_id uuid,action text,changes jsonb,reason text,created_at timestamptz DEFAULT now())"))
            connection.execute(text("CREATE TABLE cost_resources(id uuid PRIMARY KEY,kind text,code text,content jsonb)"))
            connection.execute(text("INSERT INTO identity_accounts VALUES(:id)"),{"id":actor})
            connection.execute(text("INSERT INTO cost_resources VALUES(:id,'material','ONE','{\"title_fa\":\"کاغذ\",\"title_en\":\"Paper\",\"base_unit\":\"sheet\"}')"),{"id":material})
            with Operations.context(MigrationContext.configure(connection)):
                module.upgrade()
        assert execute({"action":"opening","quantity":"1","value":"5","expected_version":0})["version"]==1
        barrier=Barrier(2)
        def decrease(index):
            barrier.wait(timeout=10)
            result=execute({"action":"decrease","quantity":"1","expected_version":1})
            return "saved" if isinstance(result,dict) else "conflict"
        with ThreadPoolExecutor(max_workers=2) as pool:
            assert sorted(pool.map(decrease,range(2)))==["conflict","saved"]
        with engine.begin() as connection:
            connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            assert connection.scalar(text("SELECT quantity FROM inventory_positions"))==0
            assert connection.scalar(text("SELECT count(*) FROM inventory_movements"))==2
            assert connection.scalar(text("SELECT count(*) FROM identity_audits"))==2
            with Operations.context(MigrationContext.configure(connection)):
                module.downgrade()
            assert connection.scalar(text("SELECT to_regclass('inventory_positions')")) is None
            assert connection.scalar(text("SELECT count(*) FROM cost_resources"))==1
    finally:
        with engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE'))
        engine.dispose()


@pytest.mark.parametrize("change,status", [("rotate", 403), ("revoke", 401), ("permission", 403)])
def test_stock_write_rechecks_live_session_and_permission(flow, monkeypatch, change, status):
    from nilart.contexts.identity.infrastructure.repository import SqlIdentityRepository

    client, db, material = setup(flow)
    original = SqlIdentityRepository.session_account
    original_roles = SqlIdentityRepository.roles

    def session(self, digest, now, *, lock=False):
        result = original(self, digest, now, lock=lock)
        if not lock:
            if change == "revoke":
                self.session.execute(
                    text("DELETE FROM identity_sessions WHERE token_hash=:token"), {"token": digest}
                )
            elif change == "rotate":
                self.rotate_csrf(digest, "changed-nonce", now)
        return result

    def roles(self, account_id, lock=False):
        if lock and change == "permission":
            self.session.execute(text("DELETE FROM identity_account_roles WHERE role='admin'"))
        return original_roles(self, account_id, lock=lock)

    monkeypatch.setattr(SqlIdentityRepository, "session_account", session)
    monkeypatch.setattr(SqlIdentityRepository, "roles", roles)
    assert command(client, material).status_code == status
    assert db.scalar(text("SELECT count(*) FROM inventory_positions")) == 0
