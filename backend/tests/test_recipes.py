from tests.conftest import register


def test_list_is_paginated(client):
    res = client.get("/api/v1/recipes", params={"page_size": 5})
    body = res.json()
    assert res.status_code == 200
    assert body["total"] == 12
    assert len(body["items"]) == 5
    assert set(body["items"][0]["title"]) == {"fr", "en", "ar"}


def test_search_works_in_every_language(client):
    for term in ["chorba", "فريك", "Poulet miel", "mushroom", "velouté"]:
        items = client.get("/api/v1/recipes", params={"q": term}).json()["items"]
        assert items, term


def test_search_matches_ingredients(client):
    slugs = {r["slug"] for r in client.get("/api/v1/recipes", params={"q": "mascarpone"}).json()["items"]}
    assert slugs == {"tiramisu"}


def test_filters(client):
    items = client.get("/api/v1/recipes", params={"cuisine": "maghrebi"}).json()["items"]
    assert {r["slug"] for r in items} == {"chorba-frik", "chicken-skewers"}

    quick = client.get("/api/v1/recipes", params={"max_minutes": 20}).json()["items"]
    assert all(r["total_minutes"] <= 20 for r in quick) and quick

    vegan = client.get("/api/v1/recipes", params={"diet": "vegan"}).json()["items"]
    assert all("vegan" in r["diets"] for r in vegan) and vegan

    assert client.get("/api/v1/recipes", params={"cuisine": "martian"}).status_code == 422


def test_detail(client):
    res = client.get("/api/v1/recipes/chorba-frik")
    body = res.json()
    assert res.status_code == 200
    assert body["total_minutes"] == 35
    assert [s["position"] for s in body["steps"]] == sorted(s["position"] for s in body["steps"])
    assert body["is_favorite"] is False
    assert client.get("/api/v1/recipes/does-not-exist").status_code == 404


def test_favorites_flow(client):
    assert client.put("/api/v1/recipes/tiramisu/favorite").status_code == 401

    register(client)
    assert client.put("/api/v1/recipes/tiramisu/favorite").status_code == 204
    assert client.put("/api/v1/recipes/tiramisu/favorite").status_code == 204  # idempotent
    assert client.get("/api/v1/recipes/tiramisu").json()["is_favorite"] is True
    assert [r["slug"] for r in client.get("/api/v1/me/favorites").json()] == ["tiramisu"]

    assert client.delete("/api/v1/recipes/tiramisu/favorite").status_code == 204
    assert client.get("/api/v1/me/favorites").json() == []


def test_security_headers(client):
    res = client.get("/api/health")
    assert res.json() == {"status": "ok"}
    assert res.headers["x-content-type-options"] == "nosniff"
    assert res.headers["x-frame-options"] == "DENY"


def test_cors_origins_are_read_from_a_comma_separated_env(monkeypatch):
    from app.core.config import Settings

    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:5173, https://cravio.app")
    assert Settings().cors_origins == ["http://localhost:5173", "https://cravio.app"]
