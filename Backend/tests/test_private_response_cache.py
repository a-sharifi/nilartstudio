import pytest
from fastapi.testclient import TestClient

from nilart.bootstrap.main import app
from nilart.shared.database import session_dependency


@pytest.mark.parametrize("method,path,body,status", [
    ("POST", "/api/v1/auth/login/password", {"password": "private-test-value"}, 422),
    ("POST", "/api/v1/auth/otp/request", {"phone": "private-test-value"}, 422),
    ("POST", "/api/v1/auth/otp/verify", {"code": "private-test-value"}, 422),
    ("POST", "/api/v1/auth/register/complete", {"grant": "private-test-value"}, 422),
    ("POST", "/api/v1/auth/recovery/complete", {"grant": "private-test-value"}, 422),
    ("PUT", "/api/v1/account/profile", {"version": "private-test-value"}, 401),
    ("GET", "/api/v1/auth/missing", None, 404),
    ("GET", "/api/v1/account/missing", None, 404),
    ("DELETE", "/api/v1/auth/login/password", None, 405),
])
def test_private_api_errors_are_not_cacheable(method, path, body, status):
    app.dependency_overrides[session_dependency] = lambda: object()
    try:
        response = TestClient(app).request(method, path, json=body)
        assert response.status_code == status
        assert response.headers["cache-control"] == "no-store"
        assert "set-cookie" not in response.headers
        assert response.json()["request_id"] == response.headers["x-request-id"]
        assert "private-test-value" not in response.text
    finally:
        app.dependency_overrides.pop(session_dependency, None)


@pytest.mark.parametrize("path", ["/api/v1/health/live", "/api/v1/authentic", "/api/v1/accounting"])
def test_private_cache_rule_respects_path_boundaries(path):
    response = TestClient(app).get(path)
    assert "cache-control" not in response.headers
