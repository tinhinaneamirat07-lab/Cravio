from sqlalchemy import select

from app.core.database import SessionLocal
from app.models import User
from tests.conftest import register


def make_admin(email: str) -> None:
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        user.role = "admin"
        db.commit()


def test_update_profile(client):
    register(client)
    res = client.patch("/api/v1/users/me", json={"name": "Amina B.", "locale": "ar"})
    assert res.status_code == 200
    assert res.json()["locale"] == "ar"
    assert client.patch("/api/v1/users/me", json={"role": "admin"}).json()["role"] == "user"


def test_admin_routes_are_protected(client):
    assert client.get("/api/v1/admin/users").status_code == 401
    register(client)
    assert client.get("/api/v1/admin/users").status_code == 403
    assert client.delete("/api/v1/admin/users/1").status_code == 403


def test_admin_can_list_and_manage_users(client):
    register(client, email="admin@example.com", name="Admin")
    make_admin("admin@example.com")
    admin_cookies = dict(client.cookies)

    client.cookies.clear()
    other = register(client, email="yacine@example.com", name="Yacine").json()

    client.cookies.clear()
    for k, v in admin_cookies.items():
        client.cookies.set(k, v, path="/api/v1/auth" if k == "cravio_refresh" else "/")

    listing = client.get("/api/v1/admin/users", params={"q": "yacine"})
    assert listing.status_code == 200
    assert listing.json()["total"] == 1

    assert client.patch(f"/api/v1/admin/users/{other['id']}", json={"is_active": False}).json()["is_active"] is False
    assert client.delete(f"/api/v1/admin/users/{other['id']}").status_code == 204
    me = client.get("/api/v1/auth/me").json()
    assert client.delete(f"/api/v1/admin/users/{me['id']}").status_code == 400


def test_delete_own_account(client):
    register(client)
    assert client.delete("/api/v1/users/me").status_code == 204
    assert client.get("/api/v1/auth/me").status_code == 401
