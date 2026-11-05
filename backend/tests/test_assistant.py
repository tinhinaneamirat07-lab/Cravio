"""The agent is tested with a fake model: no API key, no network, fully repeatable."""

import json
from datetime import date

import pytest
from sqlalchemy import select

from app.core.database import SessionLocal
from app.models import MealPlanItem, ShoppingItem
from app.services import agent
from app.services.retrieval import search
from tests.conftest import register

TODAY = date.today().isoformat()


def call(name: str, **args) -> dict:
    return {"id": f"call_{name}", "type": "function", "function": {"name": name, "arguments": json.dumps(args)}}


class FakeModel:
    """Plays back scripted assistant messages and records what the agent sent."""

    def __init__(self, *replies: dict):
        self.replies = list(replies)
        self.requests: list[list[dict]] = []

    def __call__(self, messages: list[dict], tools: list[dict]) -> dict:
        self.requests.append([dict(m) for m in messages])
        return self.replies.pop(0)


@pytest.fixture
def fake(monkeypatch):
    def install(*replies: dict) -> FakeModel:
        model = FakeModel(*replies)
        monkeypatch.setattr(agent, "llm_complete", model)
        return model

    return install


def chat(client, text: str, **extra):
    return client.post(
        "/api/v1/assistant/chat",
        json={"messages": [{"role": "user", "content": text}], "lang": "fr", "today": TODAY, **extra},
    )


def tool_results(request: list[dict]) -> list[dict]:
    return [json.loads(m["content"]) for m in request if m["role"] == "tool"]


# --- Retrieval ---------------------------------------------------------------------------------


def test_retrieval_finds_recipes_in_three_languages():
    with SessionLocal() as db:
        assert "chorba-frik" in [r.slug for r in search(db, "une soupe algérienne")]
        assert "chorba-frik" in [r.slug for r in search(db, "شوربة")]
        assert "chicken-skewers" in [r.slug for r in search(db, "chicken")]
        assert search(db, "le de la") == []


def test_pantry_match_endpoint(client):
    res = client.get("/api/v1/recipes/match", params={"ingredients": "poulet, oignon, tomates", "lang": "fr"})
    assert res.status_code == 200
    results = res.json()
    assert results, "chicken recipes should match"
    best = results[0]
    assert best["recipe"]["slug"] in {"chorba-frik", "chicken-skewers", "honey-garlic-chicken"}
    assert "Blanc de poulet" in best["have"] or any("oulet" in h for h in best["have"])
    assert all("Sel" != m for m in best["missing"])
    assert client.get("/api/v1/recipes/match", params={"ingredients": ""}).status_code == 422


# --- Endpoint ----------------------------------------------------------------------------------


def test_status_and_login_required(client):
    assert client.get("/api/v1/assistant/status").json() == {"available": False}
    assert chat(client, "Bonjour").status_code == 401


def test_without_api_key_the_assistant_is_unavailable(client):
    register(client)
    res = chat(client, "Une idée de dîner ?")
    assert res.status_code == 503
    assert res.json()["detail"] == "assistant_unavailable"


def test_last_message_must_come_from_user(client):
    register(client)
    res = client.post("/api/v1/assistant/chat", json={"messages": [{"role": "assistant", "content": "Salut"}]})
    assert res.status_code == 422


def test_plain_answer_with_rag_context(client, fake):
    register(client)
    model = fake({"content": "Essaie [[chorba-frik]], prête en 35 minutes."})
    res = chat(client, "Je veux une soupe")
    assert res.status_code == 200
    body = res.json()
    assert body["reply"] == "Essaie [[chorba-frik]], prête en 35 minutes."
    assert [r["slug"] for r in body["recipes"]] == ["chorba-frik"]
    assert body["actions"] == []
    system = model.requests[0][0]["content"]
    assert "chorba-frik" in system  # retrieved recipes are in the prompt
    assert "Answer in French" in system or "answer in French" in system


def test_invented_recipes_are_removed(client, fake):
    register(client)
    fake({"content": "Tu peux faire [[tajine-imaginaire]] ou [[tiramisu]]."})
    body = chat(client, "Un dessert ?").json()
    assert "tajine-imaginaire" not in body["reply"]
    assert [r["slug"] for r in body["recipes"]] == ["tiramisu"]


def test_agent_searches_then_plans_then_answers(client, fake):
    register(client)
    model = fake(
        {"content": "", "tool_calls": [call("search_recipes", query="poulet")]},
        {
            "content": "",
            "tool_calls": [call("add_to_meal_plan", slug="chicken-skewers", day=TODAY, slot="dinner", servings=3)],
        },
        {"content": "C'est fait : [[chicken-skewers]] au dîner pour 3."},
    )
    body = chat(client, "Ajoute un plat au poulet à mon dîner de ce soir pour 3").json()

    assert body["actions"] == [
        {"type": "planner_add", "slug": "chicken-skewers", "day": TODAY, "slot": "dinner", "servings": 3}
    ]
    assert [r["slug"] for r in body["recipes"]] == ["chicken-skewers"]
    found = tool_results(model.requests[1])[0]["results"]
    assert any(r["slug"] == "chicken-skewers" for r in found)
    plan = client.get("/api/v1/planner", params={"start": TODAY, "days": 1}).json()
    assert [(p["recipe"]["slug"], p["servings"]) for p in plan] == [("chicken-skewers", 3)]


def test_bad_tool_calls_return_errors_to_the_model(client, fake):
    register(client)
    model = fake(
        {
            "content": "",
            "tool_calls": [
                call("add_to_meal_plan", slug="nope", day=TODAY, slot="dinner"),
                call("add_to_meal_plan", slug="tiramisu", day="2099-01-01", slot="dinner"),
                call("add_to_meal_plan", slug="tiramisu", day=TODAY, slot="brunch"),
                call("delete_everything"),
                {"id": "x", "function": {"name": "get_recipe", "arguments": "not json"}},
            ],
        },
        {"content": "Je n'ai pas pu l'ajouter."},
    )
    body = chat(client, "Ajoute un truc").json()
    errors = [r["error"] for r in tool_results(model.requests[1])]
    assert len(errors) == 5
    assert "No recipe" in errors[0] and "too far" in errors[1] and "slot" in errors[2]
    assert "Unknown tool" in errors[3] and "JSON" in errors[4]
    assert body["actions"] == []
    with SessionLocal() as db:
        assert db.scalars(select(MealPlanItem)).all() == []


def test_shopping_tools_only_touch_my_list(client, fake):
    register(client, email="other@example.com")
    client.post("/api/v1/shopping-list", json={"name": "Lait"})
    client.cookies.clear()
    register(client)
    fake(
        {"content": "", "tool_calls": [call("add_to_shopping_list", items=["Pain", "  ", "Café"])]},
        {"content": "Ajouté."},
    )
    body = chat(client, "Ajoute du pain et du café").json()
    assert body["actions"] == [{"type": "shopping_add", "items": ["Pain", "Café"]}]
    mine = [i["name"]["custom"] for i in client.get("/api/v1/shopping-list").json()]
    assert sorted(mine) == ["Café", "Pain"]
    with SessionLocal() as db:
        assert len(db.scalars(select(ShoppingItem)).all()) == 3


def test_fridge_tool(client, fake):
    register(client)
    model = fake(
        {"content": "", "tool_calls": [call("find_recipes_with_ingredients", ingredients=["poulet", "riz"])]},
        {"content": "Avec ça : [[chicken-skewers]]."},
    )
    chat(client, "J'ai du poulet et du riz")
    results = tool_results(model.requests[1])[0]["results"]
    assert results and {"slug", "uses", "missing"} <= results[0].keys()


def test_loop_stops_after_max_steps(client, fake):
    register(client)
    looping = {"content": "", "tool_calls": [call("search_recipes", query="soupe")]}
    model = fake(*[looping] * agent.MAX_STEPS, {"content": "Voici ce que j'ai trouvé."})
    body = chat(client, "Cherche encore et encore").json()
    assert body["reply"] == "Voici ce que j'ai trouvé."
    assert len(model.requests) == agent.MAX_STEPS + 1


@pytest.mark.parametrize(
    ("code", "status", "detail"), [("busy", 503, "assistant_busy"), ("failed", 502, "assistant_failed")]
)
def test_provider_errors_are_mapped(client, monkeypatch, code, status, detail):
    register(client)

    def broken(messages, tools):
        raise agent.AgentError(code)

    monkeypatch.setattr(agent, "llm_complete", broken)
    res = chat(client, "Bonjour")
    assert res.status_code == status
    assert res.json()["detail"] == detail


def test_recipe_page_context(client, fake):
    register(client)
    model = fake({"content": "Pour 2, divise les quantités par deux."})
    chat(client, "Pour 2 personnes ?", recipe_slug="chorba-frik")
    assert "looking at this recipe right now: [[chorba-frik]]" in model.requests[0][0]["content"]


# --- Account ------------------------------------------------------------------------------------


def test_change_password(client):
    register(client, password="old-password-1")
    bad = client.put("/api/v1/users/me/password", json={"current_password": "wrong", "new_password": "new-password-1"})
    assert bad.status_code == 400
    ok = client.put(
        "/api/v1/users/me/password", json={"current_password": "old-password-1", "new_password": "new-password-1"}
    )
    assert ok.status_code == 204
    assert client.get("/api/v1/auth/me").status_code == 200  # still signed in here
    client.cookies.clear()
    login = {"email": "amina@example.com"}
    assert client.post("/api/v1/auth/login", json={**login, "password": "old-password-1"}).status_code == 401
    assert client.post("/api/v1/auth/login", json={**login, "password": "new-password-1"}).status_code == 200
