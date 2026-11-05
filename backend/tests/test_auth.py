from sqlalchemy import select

from app.core.database import SessionLocal
from app.models import User
from tests.conftest import register


def test_register_sets_httponly_cookies_and_hashes_password(client):
    res = register(client)
    assert res.status_code == 201
    assert res.json()["email"] == "amina@example.com"
    assert "password" not in res.text
    cookies = res.headers.get_list("set-cookie")
    assert any(c.startswith("cravio_access=") and "HttpOnly" in c for c in cookies)
    assert any(c.startswith("cravio_refresh=") and "Path=/api/v1/auth" in c for c in cookies)
    hint = next(c for c in cookies if c.startswith("cravio_logged_in="))
    assert "HttpOnly" not in hint and hint.startswith("cravio_logged_in=1;")

    with SessionLocal() as db:
        user = db.scalar(select(User))
        assert user.password_hash.startswith("$argon2")


def test_duplicate_email_is_rejected_case_insensitively(client):
    register(client)
    res = register(client, email="AMINA@example.com")
    assert res.status_code == 409


def test_register_validates_input(client):
    assert register(client, password="short").status_code == 422
    assert register(client, email="not-an-email").status_code == 422
    assert register(client, name="   ").status_code == 422


def test_login_and_me(client):
    register(client)
    client.cookies.clear()
    assert client.get("/api/v1/auth/me").status_code == 401

    res = client.post("/api/v1/auth/login", json={"email": "Amina@Example.com", "password": "correct-horse-1"})
    assert res.status_code == 200
    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.json()["name"] == "Amina"


def test_login_errors_do_not_reveal_which_part_is_wrong(client):
    register(client)
    wrong_password = client.post("/api/v1/auth/login", json={"email": "amina@example.com", "password": "nope-nope"})
    unknown_email = client.post("/api/v1/auth/login", json={"email": "ghost@example.com", "password": "nope-nope"})
    assert wrong_password.status_code == unknown_email.status_code == 401
    assert wrong_password.json() == unknown_email.json()


def test_bearer_header_also_works(client):
    res = register(client)
    token = res.cookies.get("cravio_access")
    client.cookies.clear()
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200


def test_refresh_rotates_and_detects_reuse(client):
    register(client)
    old_refresh = client.cookies.get("cravio_refresh")

    first = client.post("/api/v1/auth/refresh")
    assert first.status_code == 200
    assert client.cookies.get("cravio_refresh") != old_refresh

    # Replaying the old (already rotated) token is treated as theft: every session ends.
    client.cookies.clear()
    client.cookies.set("cravio_refresh", old_refresh, path="/api/v1/auth")
    assert client.post("/api/v1/auth/refresh").status_code == 401


def test_logout_revokes_the_session(client):
    register(client)
    refresh_token = client.cookies.get("cravio_refresh")
    logout = client.post("/api/v1/auth/logout")
    assert logout.status_code == 204
    assert any(c.startswith("cravio_logged_in=") and "Max-Age=0" in c for c in logout.headers.get_list("set-cookie"))

    client.cookies.clear()
    client.cookies.set("cravio_refresh", refresh_token, path="/api/v1/auth")
    assert client.post("/api/v1/auth/refresh").status_code == 401


def test_tampered_token_is_rejected(client):
    res = register(client)
    token = res.cookies.get("cravio_access")
    client.cookies.clear()
    tampered = token[:-4] + ("AAAA" if not token.endswith("AAAA") else "BBBB")
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tampered}"}).status_code == 401


def test_login_is_rate_limited(client):
    register(client)
    codes = [
        client.post("/api/v1/auth/login", json={"email": "amina@example.com", "password": "wrong-pass"}).status_code
        for _ in range(12)
    ]
    assert 429 in codes


def test_production_refuses_the_default_secret(monkeypatch):
    import pytest

    from app.core import config

    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("JWT_SECRET", "change-me")
    config.get_settings.cache_clear()
    try:
        with pytest.raises(RuntimeError):
            config.get_settings()
    finally:
        monkeypatch.undo()
        config.get_settings.cache_clear()
