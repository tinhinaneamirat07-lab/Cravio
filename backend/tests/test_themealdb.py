import httpx
import pytest

from app.core.database import SessionLocal
from app.importers import themealdb as mdb


def meal(id_, name, category, area, instructions, ingredients, **extra):
    data = {
        "idMeal": id_,
        "strMeal": name,
        "strCategory": category,
        "strArea": area,
        "strInstructions": instructions,
        "strMealThumb": f"https://www.themealdb.com/images/media/meals/{id_}.jpg",
        "strYoutube": "",
        "strSource": "",
    }
    for i, (ingredient, measure) in enumerate(ingredients, start=1):
        data[f"strIngredient{i}"] = ingredient
        data[f"strMeasure{i}"] = measure
    for i in range(len(ingredients) + 1, 21):
        data[f"strIngredient{i}"] = ""
        data[f"strMeasure{i}"] = " "
    data.update(extra)
    return data


HARIRA = meal(
    "52901",
    "Harira Soup",
    "Lamb",
    "Moroccan",
    "STEP 1\r\nSoak the chickpeas overnight.\r\n\r\nSTEP 2\r\nSimmer everything for 1 hour, stirring.",
    [("Lamb", "500g"), ("Chickpeas", "1 1/2 cups"), ("Coriander", "½ bunch"), ("Salt", "To taste")],
    strYoutube="https://www.youtube.com/watch?v=abc",
)
CARBONARA = meal(
    "52982",
    "Spaghetti Carbonara",
    "Pasta",
    "Italian",
    "Cook the pasta for 10 minutes. Fry the bacon. Mix the eggs and cheese. Combine everything off the heat. "
    "Season well with pepper and serve straight away while it is hot and silky, with more cheese on top.",
    [("Spaghetti", "320g"), ("Bacon", "150g"), ("Eggs", "3"), ("Parmesan", "50g")],
)
RISOTTO = meal(
    "53001",
    "Mushroom Risotto",
    "Vegetarian",
    "Italian",
    "1. Fry the onion.\n2. Add the rice and the white wine.\n3. Add stock slowly for 18-20 minutes.",
    [("Arborio rice", "300g"), ("White Wine", "1 glass"), ("Mushrooms", "250g"), ("Red Wine Vinegar", "1 tbs")],
)
VINAIGRETTE_SALAD = meal(
    "53002",
    "Greek Salad",
    "Side",
    "Greek",
    "Chop everything and dress with oil and vinegar.",
    [("Tomatoes", "4"), ("Feta", "200g"), ("Red Wine Vinegar", "1 tbs")],
)


def test_parse_measure():
    assert mdb.parse_measure("500g") == (500, "g")
    assert mdb.parse_measure("1 1/2 cups") == (1.5, "cups")
    assert mdb.parse_measure("½ bunch") == (0.5, "bunch")
    assert mdb.parse_measure("1½ tsp") == (1.5, "tsp")
    assert mdb.parse_measure("To taste") == (None, None)


def test_split_steps_removes_labels_and_splits_paragraphs():
    assert mdb.split_steps(HARIRA["strInstructions"]) == [
        "Soak the chickpeas overnight.",
        "Simmer everything for 1 hour, stirring.",
    ]
    assert mdb.split_steps(RISOTTO["strInstructions"])[0] == "Fry the onion."
    assert len(mdb.split_steps(CARBONARA["strInstructions"])) == 3


def test_timers_come_from_the_text():
    assert mdb.timer_seconds("Simmer for 1 hour") == 3600
    assert mdb.timer_seconds("Add stock for 18-20 minutes") == 18 * 60
    assert mdb.timer_seconds("Serve") is None


def test_map_meal_categories_cuisines_and_diets():
    harira = mdb.map_meal(HARIRA)
    assert harira["category"] == "soup"
    assert harira["cuisine"] == "maghrebi"
    assert harira["origin"] == "Moroccan"
    assert set(harira["diets"]) == {"no-pork", "no-alcohol"}
    assert harira["video_url"].startswith("https://www.youtube.com")
    assert harira["source_url"] == "https://www.themealdb.com/meal/52901"

    assert "no-pork" not in mdb.map_meal(CARBONARA)["diets"]

    risotto = mdb.map_meal(RISOTTO)
    assert "no-alcohol" not in risotto["diets"]
    assert "vegetarian" in risotto["diets"]

    # Wine vinegar is not an alcoholic ingredient.
    salad = mdb.map_meal(VINAIGRETTE_SALAD)
    assert salad["category"] == "salad"
    assert "no-alcohol" in salad["diets"]


def fake_api(meals):
    def handler(request: httpx.Request) -> httpx.Response:
        letter = request.url.params["f"]
        found = [m for m in meals if m["strMeal"].lower().startswith(letter)]
        return httpx.Response(200, json={"meals": found or None})

    return httpx.Client(transport=httpx.MockTransport(handler))


@pytest.fixture
def no_sleep(monkeypatch):
    monkeypatch.setattr(mdb.time, "sleep", lambda _s: None)


def test_import_is_idempotent_and_searchable(client, no_sleep):
    meals = [HARIRA, CARBONARA, RISOTTO, VINAIGRETTE_SALAD]
    with SessionLocal() as db:
        assert mdb.run(db, fake_api(meals)) == (4, 0)
    with SessionLocal() as db:
        assert mdb.run(db, fake_api(meals)) == (0, 4)

    body = client.get("/api/v1/recipes", params={"q": "harira"}).json()
    assert body["total"] == 1
    detail = client.get(f"/api/v1/recipes/{body['items'][0]['slug']}").json()
    assert detail["source"] == "themealdb"
    assert detail["total_minutes"] is None  # unknown, not guessed
    assert detail["ingredients"][1]["quantity"] == 1.5
    assert detail["ingredients"][1]["measure"] == "1 1/2 cups"

    # Hand-written Cravio recipes stay first in listings.
    first = client.get("/api/v1/recipes").json()["items"][0]
    assert first["slug"] == "chorba-frik"

    no_pork = client.get("/api/v1/recipes", params={"diet": "no-pork", "q": "spaghetti"}).json()
    assert no_pork["total"] == 0


def test_dry_run_writes_nothing(client, no_sleep):
    with SessionLocal() as db:
        assert mdb.run(db, fake_api([HARIRA]), dry_run=True) == (1, 0)
    assert client.get("/api/v1/recipes", params={"q": "harira"}).json()["total"] == 0
