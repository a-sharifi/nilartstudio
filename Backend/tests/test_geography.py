from fastapi import FastAPI
from fastapi.testclient import TestClient

from nilart.contexts.geography.router import router


def test_regions_are_bilingual_and_cities_belong_to_provinces():
    app = FastAPI()
    app.include_router(router)
    response = TestClient(app).get('/api/v1/geography/iran')
    assert response.status_code == 200
    rows = response.json()
    assert len(rows) == 31
    assert all(p['name_fa'] and p['name_en'] and p['cities'] for p in rows)
    assert len({c['id'] for p in rows for c in p['cities']}) == sum(len(p['cities']) for p in rows)
    tehran = next(p for p in rows if p['name_fa'] == 'تهران')
    assert any(c['name_fa'] == 'تهران' for c in tehran['cities'])
