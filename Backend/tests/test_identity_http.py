from fastapi.testclient import TestClient

from nilart.bootstrap.main import app
from nilart.shared.database import session_dependency


def test_login_origin_and_rate_limit_fail_closed(monkeypatch):
    # No database access is allowed before the origin/rate gates succeed.
    app.dependency_overrides[session_dependency] = lambda: object()
    try:
        with TestClient(app) as client:
            body = {"phone": "09123456789", "password": "a long secure passphrase"}
            response = client.post("/api/v1/auth/login/password", json=body,
                                   headers={"Origin": "https://attacker.invalid"})
            assert response.status_code == 403
            assert response.json()["code"] == "origin_invalid"
            assert "set-cookie" not in response.headers
            monkeypatch.setattr("nilart.contexts.identity.presentation.router.rate_allowed",
                                lambda *args: False)
            response = client.post("/api/v1/auth/login/password", json=body,
                                   headers={"Origin": "http://localhost:8080"})
            assert response.status_code == 429

            def unavailable(*args):
                raise ConnectionError("Redis unavailable")

            monkeypatch.setattr("nilart.contexts.identity.presentation.router.rate_allowed", unavailable)
            response = client.post("/api/v1/auth/login/password", json=body,
                                   headers={"Origin": "http://localhost:8080"})
            assert response.status_code == 503
            assert response.json()["code"] == "authentication_unavailable"
            assert "set-cookie" not in response.headers
            assert response.headers["cache-control"] == "no-store"
    finally:
        app.dependency_overrides.pop(session_dependency, None)


def test_csrf_bootstrap_origin_rate_limit_and_cache_outage(monkeypatch):
    app.dependency_overrides[session_dependency] = lambda: object()
    try:
        with TestClient(app) as client:
            assert client.post("/api/v1/auth/session/csrf").status_code == 403
            headers = {"Origin": "http://localhost:8080"}
            monkeypatch.setattr("nilart.contexts.identity.presentation.router.csrf_attempt_allowed",
                                lambda *args: False)
            assert client.post("/api/v1/auth/session/csrf", headers=headers).status_code == 429

            def unavailable(*args):
                raise ConnectionError("offline")

            monkeypatch.setattr("nilart.contexts.identity.presentation.router.csrf_attempt_allowed",
                                unavailable)
            response = client.post("/api/v1/auth/session/csrf", headers=headers)
            assert response.status_code == 503
            assert "set-cookie" not in response.headers
    finally:
        app.dependency_overrides.pop(session_dependency, None)
