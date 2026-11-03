from uuid import UUID

import pytest
from pydantic import ValidationError
from sqlalchemy import text
from test_catalog_options import admin, document
from test_identity_otp_postgres import flow as flow
from test_sku_authoring import authoring_flow as authoring_flow
from test_sku_mappings import mapping_flow as mapping_flow

from nilart.contexts.catalog.infrastructure.options import SqlOptionDraftRepository
from nilart.contexts.catalog.infrastructure.sku_authoring import SqlSKUAuthoringRepository
from nilart.contexts.catalog.infrastructure.sku_mappings import SqlSKUMappingRepository
from nilart.contexts.catalog.presentation.sku_authoring import SKUPublication


@pytest.mark.parametrize('change', [{"reason": " "}, {"reason": "bad\nreason"}, {"published": 1}, {"version": True}, {"version": 2147483647}, {"stock": 1}])
def test_invalid_publication(change):
    with pytest.raises(ValidationError):
        SKUPublication.model_validate({"version": 1, "published": True, "reason": "Reviewed", **change})


def prepare(flow):
    client, db, actor, product, csrf, sku, selection = flow
    admin(db, actor)
    mapped = SqlSKUMappingRepository(db).save(sku['sku_id'], UUID(actor), 1, {**selection, 'configuration_id': UUID(selection['configuration_id'])})
    db.commit()
    return client, db, actor, product, csrf, mapped


def test_visibility_snapshot_history_and_unpublication(mapping_flow):
    client, db, actor, product, csrf, sku = prepare(mapping_flow)
    path = f"/api/v1/admin/catalog/skus/{sku['sku_id']}/publication"
    public = '/api/v1/catalog/skus/EXPLICIT-A/options'
    assert client.get(public).status_code == 404
    result = client.post(path, json={'version': 2, 'published': True, 'reason': 'Reviewed labels'}, headers={'X-CSRF-Token': csrf})
    assert result.status_code == 200, result.text
    assert result.json()['version'] == 3 and result.json()['published'] is True
    snapshot = client.get(public).json()
    assert snapshot['configuration_version'] == 1
    audit = db.execute(text('SELECT "after" FROM catalog_sku_authoring_audits WHERE sku_id=:id AND version=3'), {'id': sku['sku_id']}).scalar_one()
    assert audit['reason'] == 'Reviewed labels' and audit['action'] == 'published'
    SqlOptionDraftRepository(db).save(product, UUID(actor), 1, document())
    db.commit()
    assert client.get(public).json() == snapshot
    assert client.put(f"/api/v1/admin/catalog/skus/{sku['sku_id']}", json={'version': 3, 'code': 'NEW'}, headers={'X-CSRF-Token': csrf}).status_code == 409
    assert client.post(path, json={'version': 2, 'published': False, 'reason': 'Withdraw'}, headers={'X-CSRF-Token': csrf}).status_code == 409
    result = client.post(path, json={'version': 3, 'published': False, 'reason': 'Withdraw'}, headers={'X-CSRF-Token': csrf})
    assert result.status_code == 200 and result.json()['version'] == 4
    assert client.get(public).status_code == 404
    assert client.post(path, json={'version': 4, 'published': True, 'reason': 'Republish'}, headers={'X-CSRF-Token': csrf}).json()['code'] == 'sku_mapping_review_required'
    db.execute(text('UPDATE catalog_products SET published=false WHERE id=:id'), {'id': product})
    db.commit()
    assert client.post(path, json={'version': 4, 'published': True, 'reason': 'Republish'}, headers={'X-CSRF-Token': csrf}).json()['code'] == 'product_unpublished'


def test_access_and_missing_mapping(mapping_flow):
    client, db, actor, product, csrf, sku, selection = mapping_flow
    path = f"/api/v1/admin/catalog/skus/{sku['sku_id']}/publication"
    body = {'version': 1, 'published': True, 'reason': 'Reviewed'}
    assert client.post(path, json=body, headers={'X-CSRF-Token': csrf}).status_code == 403
    admin(db, actor)
    for headers in [{}, {'X-CSRF-Token': 'wrong'}, {'X-CSRF-Token': csrf, 'Origin': 'https://foreign.invalid'}]:
        assert client.post(path, json=body, headers=headers).status_code == 403
    assert client.post(path, json=body, headers={'X-CSRF-Token': csrf}).json()['code'] == 'sku_mapping_review_required'
    assert client.get('/api/v1/catalog/skus/EXPLICIT-A/options').status_code == 404


def test_audit_failure_rolls_back_publication(mapping_flow, monkeypatch):
    client, db, actor, product, csrf, sku = prepare(mapping_flow)
    def fail(*args):
        raise RuntimeError('audit unavailable')
    monkeypatch.setattr(SqlSKUAuthoringRepository, '_audit', fail)
    with pytest.raises(RuntimeError):
        client.post(f"/api/v1/admin/catalog/skus/{sku['sku_id']}/publication", json={'version': 2, 'published': True, 'reason': 'Reviewed'}, headers={'X-CSRF-Token': csrf})
    db.rollback()
    assert SqlSKUAuthoringRepository(db).read(sku['sku_id'])['published'] is False
    assert SqlSKUAuthoringRepository(db).read(sku['sku_id'])['version'] == 2


def test_concurrent_publication_has_one_winner():
    import os
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    from uuid import uuid4

    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session
    from test_catalog_options import migration as options_migration
    from test_sku_authoring import migration as authoring_migration
    from test_sku_mappings import migration as mappings_migration

    from nilart.contexts.catalog.infrastructure.repository import Base
    from nilart.contexts.catalog.infrastructure.sku_authoring import SKUAuthoringError

    url = os.environ.get('NILART_TEST_DATABASE_URL')
    if not url:
        pytest.skip('isolated PostgreSQL required')
    engine = create_engine(url)
    schema = 'sku_publication_' + uuid4().hex
    actor, product = uuid4(), uuid4()
    try:
        with engine.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))
            connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            Base.metadata.create_all(connection)
            connection.execute(text('CREATE TABLE identity_accounts (id uuid PRIMARY KEY)'))
            options_migration(connection)
            authoring_migration(connection)
            mappings_migration(connection)
            connection.execute(text('INSERT INTO identity_accounts VALUES (:id)'), {'id': actor})
            connection.execute(text("INSERT INTO catalog_products (id,slug,title_fa,title_en,published) VALUES (:id,'p','تست','Test',true)"), {'id': product})
            session = Session(bind=connection)
            draft = SqlOptionDraftRepository(session).save(product, actor, 0, document())
            sku = SqlSKUAuthoringRepository(session).create(product, actor, 'EXPLICIT-A')
            SqlSKUMappingRepository(session).save(sku['sku_id'], actor, 1, {'configuration_id': UUID(draft['configuration_id']), 'configuration_version': 1, 'combination_code': 'EXPLICIT-A'})
            session.flush()
        barrier = Barrier(2)
        def publish(_):
            with Session(engine) as session:
                session.execute(text(f'SET LOCAL search_path TO "{schema}"'))
                barrier.wait(timeout=10)
                try:
                    SqlSKUAuthoringRepository(session).publication(sku['sku_id'], actor, 2, True, 'Reviewed')
                    session.commit()
                    return 'published'
                except SKUAuthoringError:
                    session.rollback()
                    return 'conflict'
        with ThreadPoolExecutor(max_workers=2) as pool:
            assert sorted(pool.map(publish, range(2))) == ['conflict', 'published']
        with engine.begin() as connection:
            connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
            assert connection.scalar(text('SELECT count(*) FROM catalog_sku_authoring_audits WHERE version=3')) == 1
    finally:
        with engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE'))
        engine.dispose()


def test_sku_audits_permission_cursor_and_publication_reason(mapping_flow):
    client, db, actor, product, csrf, sku, selection = mapping_flow
    path = f"/api/v1/admin/catalog/skus/{sku['sku_id']}/audits"
    assert client.get(path).status_code == 403
    client, db, actor, product, csrf, sku = prepare(mapping_flow)
    assert client.post(f"/api/v1/admin/catalog/skus/{sku['sku_id']}/publication", json={'version': 2, 'published': True, 'reason': 'Reviewed labels'}, headers={'X-CSRF-Token': csrf}).status_code == 200
    page = client.get(path + '?limit=1')
    assert page.status_code == 200 and page.headers['cache-control'] == 'no-store'
    latest = page.json()
    assert latest['next_before_version'] == 3
    assert latest['items'][0]['after']['reason'] == 'Reviewed labels'
    assert latest['items'][0]['actor_id'] == actor
    older = client.get(path + '?limit=1&before_version=3').json()
    assert older['items'][0]['version'] == 2 and older['items'][0]['after']['mapping']['current'] is True
    oldest = client.get(path + '?before_version=2').json()
    assert oldest['next_before_version'] is None and oldest['items'][0]['before'] is None
    assert client.get(path + '?before_version=0').status_code == 422
    assert client.get(path + '?limit=101').status_code == 422
