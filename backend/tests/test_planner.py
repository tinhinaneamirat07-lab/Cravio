from tests.conftest import register

MONDAY = "2026-09-28"


def plan(client, slug, day=MONDAY, slot="dinner", **extra):
    return client.post("/api/v1/planner", json={"day": day, "slot": slot, "recipe_slug": slug, **extra})


def test_planner_requires_login(client):
    assert client.get("/api/v1/planner", params={"start": MONDAY}).status_code == 401
    assert client.get("/api/v1/shopping-list").status_code == 401


def test_add_list_move_and_remove(client):
    register(client)
    res = plan(client, "chorba-frik")
    assert res.status_code == 201
    item = res.json()
    assert item["servings"] == 4  # defaults to the recipe's servings
    assert item["recipe"]["slug"] == "chorba-frik"

    plan(client, "tiramisu", day="2026-10-03", slot="lunch", servings=2)
    plan(client, "garden-salad", day="2026-10-10")  # next week, outside the range below

    week = client.get("/api/v1/planner", params={"start": MONDAY, "days": 7}).json()
    assert [i["recipe"]["slug"] for i in week] == ["chorba-frik", "tiramisu"]

    moved = client.patch(f"/api/v1/planner/{item['id']}", json={"day": "2026-09-29", "servings": 6}).json()
    assert moved["day"] == "2026-09-29" and moved["servings"] == 6

    assert client.delete(f"/api/v1/planner/{item['id']}").status_code == 204
    assert len(client.get("/api/v1/planner", params={"start": MONDAY}).json()) == 1


def test_validation(client):
    register(client)
    assert plan(client, "does-not-exist").status_code == 404
    assert plan(client, "tiramisu", slot="brunch").status_code == 422
    assert plan(client, "tiramisu", servings=0).status_code == 422


def test_users_cannot_touch_each_other_plans(client):
    register(client, email="a@example.com")
    item = plan(client, "tiramisu").json()
    client.cookies.clear()
    register(client, email="b@example.com")
    assert client.patch(f"/api/v1/planner/{item['id']}", json={"servings": 3}).status_code == 404
    assert client.delete(f"/api/v1/planner/{item['id']}").status_code == 404
    assert client.get("/api/v1/planner", params={"start": MONDAY}).json() == []


def test_generate_scales_merges_and_groups(client):
    register(client)
    plan(client, "chorba-frik", servings=8)  # recipe is for 4, so double
    plan(client, "chicken-skewers", day="2026-09-29", servings=4)  # same servings as the recipe
    plan(client, "garden-salad", day="2026-10-20")  # outside the week: ignored
    client.post("/api/v1/shopping-list", json={"name": "Pain"})

    items = client.post("/api/v1/shopping-list/generate", json={"start": MONDAY, "days": 7}).json()
    by_name = {i["name"].get("fr", i["name"].get("custom")): i for i in items}

    assert by_name["Frik (blé vert concassé)"]["quantity"] == 240
    assert by_name["Frik (blé vert concassé)"]["unit"] == "g"
    # Chicken breast: 300 g x2 from the chorba + 600 g from the skewers, merged into one line.
    assert by_name["Blanc de poulet"]["quantity"] == 1200
    assert by_name["Blanc de poulet"]["aisle"] == "meat"
    # Olive oil: 2 tbsp x2 + 3 tbsp.
    assert by_name["Huile d'olive"]["quantity"] == 7
    # 1 onion x2 = 2; the skewers recipe has 1 cucumber, served as is.
    assert by_name["Oignon"]["quantity"] == 2
    assert by_name["Pain"]["source"] == "manual"
    assert "Laitue" not in by_name

    aisles = [i["aisle"] for i in items]
    assert aisles.index("produce") < aisles.index("meat") < aisles.index("pantry")

    # Regenerating does not duplicate lines and keeps hand-added items.
    again = client.post("/api/v1/shopping-list/generate", json={"start": MONDAY, "days": 7}).json()
    assert len(again) == len(items)


def test_countable_units_round_up(client):
    register(client)
    plan(client, "chorba-frik", servings=5)  # 1 onion for 4 -> 1.25 onions -> buy 2
    items = client.post("/api/v1/shopping-list/generate", json={"start": MONDAY}).json()
    by_name = {i["name"]["fr"]: i for i in items}
    assert by_name["Oignon"]["quantity"] == 2
    assert by_name["Coriandre fraîche"]["quantity"] == 2  # 1.25 bunch
    assert by_name["Frik (blé vert concassé)"]["quantity"] == 150  # grams stay exact


def test_check_and_clear(client):
    register(client)
    milk = client.post("/api/v1/shopping-list", json={"name": "Lait"}).json()
    client.post("/api/v1/shopping-list", json={"name": "Tomates"})
    assert milk["aisle"] == "dairy"

    checked = client.patch(f"/api/v1/shopping-list/{milk['id']}", json={"checked": True}).json()
    assert checked["checked"] is True
    assert client.delete("/api/v1/shopping-list").status_code == 204  # removes checked items only
    names = [i["name"]["custom"] for i in client.get("/api/v1/shopping-list").json()]
    assert names == ["Tomates"]
    client.delete("/api/v1/shopping-list", params={"checked_only": False})
    assert client.get("/api/v1/shopping-list").json() == []
