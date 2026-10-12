"""Real disposable Redis probes; never connect to the application Redis database."""
import json
import os
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from redis import Redis
from redis.exceptions import ConnectionError

from nilart.bootstrap.main import app
from nilart.bootstrap.settings import settings
from nilart.contexts.identity.infrastructure.rate_limit import (
    csrf_attempt_allowed,
    otp_attempt_allowed,
    password_attempt_allowed,
)
from nilart.shared.database import session_dependency


@pytest.fixture
def isolated_redis():
    image = os.environ.get("NILART_TEST_REDIS_IMAGE")
    if not image:
        pytest.skip("NILART_TEST_REDIS_IMAGE required for disposable Redis tests")
    name = "nilart-redis-test-" + uuid4().hex
    created = False
    cache = None
    try:
        subprocess.run(["docker", "create", "--name", name, "-p", "127.0.0.1::6379",
                        "--tmpfs", "/data:rw,size=64m", image,
                        "redis-server", "--save", "", "--appendonly", "no"],
                       check=True, capture_output=True, timeout=30)
        created = True
        subprocess.run(["docker", "start", name], check=True, capture_output=True, timeout=30)
        ports = json.loads(subprocess.check_output(
            ["docker", "inspect", "--format", "{{json .NetworkSettings.Ports}}", name],
            timeout=30))
        port = ports["6379/tcp"][0]
        assert port["HostIp"] == "127.0.0.1"
        url = f"redis://127.0.0.1:{port['HostPort']}/0"
        cache = Redis.from_url(url, socket_connect_timeout=1, socket_timeout=1)
        deadline = time.monotonic() + 10
        while True:
            try:
                cache.ping()
                break
            except ConnectionError:
                if time.monotonic() >= deadline:
                    raise
                time.sleep(0.1)
        yield url, cache, name
    finally:
        if cache:
            cache.close()
        if created:
            subprocess.run(["docker", "rm", "-f", name], check=True,
                           capture_output=True, timeout=30)


def test_concurrent_password_phone_attempts_cannot_exceed_limit(isolated_redis):
    url, cache, _ = isolated_redis
    with ThreadPoolExecutor(max_workers=16) as workers:
        results = list(workers.map(lambda _: password_attempt_allowed(url, "+989123456789", "test-ip"), range(40)))
    assert sum(results) == 10
    assert all(0 < cache.ttl(key) <= 300 for key in cache.scan_iter())
    assert all(b"+989123456789" not in key and b"test-ip" not in key for key in cache.scan_iter())


def test_password_address_limit_applies_across_phone_numbers(isolated_redis):
    url, _, _ = isolated_redis
    with ThreadPoolExecutor(max_workers=16) as workers:
        results = list(workers.map(lambda index: password_attempt_allowed(url, f"phone-{index}", "shared-ip"), range(80)))
    assert sum(results) == 60


def test_csrf_limit_and_expiry_are_atomic_and_not_extended(isolated_redis):
    url, cache, _ = isolated_redis
    with ThreadPoolExecutor(max_workers=16) as workers:
        results = list(workers.map(lambda _: csrf_attempt_allowed(url, "test-ip"), range(80)))
    assert sum(results) == 60
    key = next(cache.scan_iter())
    cache.expire(key, 10)
    assert not csrf_attempt_allowed(url, "test-ip")
    assert 0 < cache.ttl(key) <= 10
    cache.delete(key)
    assert csrf_attempt_allowed(url, "test-ip")


@pytest.mark.parametrize("action,limit,window", [("request", 5, 3600), ("verify", 30, 300), ("complete", 10, 300)])
def test_otp_phone_limits_and_windows(isolated_redis, action, limit, window):
    url, cache, _ = isolated_redis
    with ThreadPoolExecutor(max_workers=12) as workers:
        results = list(workers.map(lambda _: otp_attempt_allowed(url, action, "test-phone", "test-ip"), range(limit + 5)))
    assert sum(results) == limit
    assert all(0 < cache.ttl(key) <= window for key in cache.scan_iter())


def test_bootstrap_http_limit_and_real_outage_fail_closed(isolated_redis, monkeypatch):
    url, _, name = isolated_redis
    monkeypatch.setattr(settings, "redis_url", url)
    app.dependency_overrides[session_dependency] = lambda: object()
    try:
        with TestClient(app) as client:
            client.headers["Origin"] = "http://localhost:8080"
            for _ in range(60):
                assert client.post("/api/v1/auth/session/csrf").status_code == 401
            rejected = client.post("/api/v1/auth/session/csrf")
            assert rejected.status_code == 429
            subprocess.run(["docker", "stop", name], check=True, capture_output=True, timeout=30)
            unavailable = client.post("/api/v1/auth/session/csrf")
            assert unavailable.status_code == 503
            assert unavailable.json()["code"] == "authentication_unavailable"
            assert "set-cookie" not in unavailable.headers
            assert unavailable.headers["cache-control"] == "no-store"
    finally:
        app.dependency_overrides.pop(session_dependency, None)


@pytest.mark.parametrize("action,limit", [("request", 30), ("verify", 60), ("complete", 30)])
def test_otp_address_limits_across_phone_numbers(isolated_redis, action, limit):
    url, _, _ = isolated_redis
    with ThreadPoolExecutor(max_workers=12) as workers:
        results = list(workers.map(
            lambda index: otp_attempt_allowed(url, action, f"phone-{index}", "shared-ip"),
            range(limit + 10)))
    assert sum(results) == limit


def test_otp_actions_have_independent_address_windows_without_phone(isolated_redis):
    url, cache, _ = isolated_redis
    for action, limit, window in [("request", 30, 3600), ("verify", 60, 300), ("complete", 30, 300)]:
        assert all(otp_attempt_allowed(url, action, "", "shared-ip") for _ in range(limit))
        assert not otp_attempt_allowed(url, action, "", "shared-ip")
        keys = list(cache.scan_iter(match=f"auth:otp:{action}:*"))
        assert len(keys) == 1
        assert b":address:" in keys[0]
        cache.expire(keys[0], 10)
        assert not otp_attempt_allowed(url, action, "", "shared-ip")
        assert 0 < cache.ttl(keys[0]) <= min(10, window)
    assert len(list(cache.scan_iter())) == 3


@pytest.mark.parametrize("path,body", [
    ("login/password", {"phone": "+989123456789", "password": "test-password"}),
    ("otp/request", {"phone": "+989123456789", "purpose": "register"}),
    ("otp/verify", {"challenge_id": "00000000-0000-0000-0000-000000000001",
                    "purpose": "register", "code": "123456"}),
    ("register/complete", {"grant": "x" * 40, "password": "test-password"}),
    ("recovery/complete", {"grant": "x" * 40, "password": "test-password"}),
])
def test_sign_in_endpoints_fail_closed_on_real_redis_outage(isolated_redis, monkeypatch, path, body):
    url, _, name = isolated_redis
    monkeypatch.setattr(settings, "redis_url", url)
    # Any accidental database access will fail: the outage must deny before business work.
    app.dependency_overrides[session_dependency] = lambda: object()
    try:
        subprocess.run(["docker", "stop", name], check=True, capture_output=True, timeout=30)
        with TestClient(app) as client:
            rejected = client.post(f"/api/v1/auth/{path}", json=body,
                                   headers={"Origin": "http://localhost:8080"})
            assert rejected.status_code == 503
            assert rejected.json()["code"] == "authentication_unavailable"
            assert "set-cookie" not in rejected.headers
            assert rejected.headers["cache-control"] == "no-store"
    finally:
        app.dependency_overrides.pop(session_dependency, None)
