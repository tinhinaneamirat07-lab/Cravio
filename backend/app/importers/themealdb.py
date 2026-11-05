"""Import real recipes (with photos) from TheMealDB's free API.

    python -m app.importers.themealdb            # import everything (~300 recipes)
    python -m app.importers.themealdb --limit 20 # quick try
    python -m app.importers.themealdb --dry-run  # fetch and map, write nothing

TheMealDB's free key is meant for development and educational projects. Recipes keep a link
back to their source, and the app must credit TheMealDB wherever imported recipes are shown.
Publishing to an app store requires a TheMealDB subscription.
https://www.themealdb.com/terms_of_use.php
"""

from __future__ import annotations

import argparse
import re
import string
import time
import unicodedata
from collections.abc import Iterator

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models import Recipe, RecipeIngredient, RecipeStep

SOURCE = "themealdb"
API = "https://www.themealdb.com/api/json/v1/1"

MAGHREBI = {"Moroccan", "Tunisian", "Algerian"}
MEDITERRANEAN = {"Italian", "Greek", "Spanish", "French", "Croatian", "Portuguese", "Turkish", "Egyptian"}

CATEGORY_MAP = {
    "Dessert": "dessert",
    "Starter": "starter",
    "Side": "side",
    "Breakfast": "breakfast",
}

PORK = ("pork", "bacon", "ham", "prosciutto", "pancetta", "chorizo", "salami", "lard", "gammon", "pepperoni")
ALCOHOL = (
    "wine", "beer", "brandy", "rum", "vodka", "whisky", "whiskey", "sherry", "cognac", "liqueur", "kirsch",
    "marsala", "sake", "bourbon", "champagne", "cider", "gin", "tequila", "amaretto", "stout", "ale", "port",
    "vermouth", "grand marnier", "cointreau", "calvados",
)  # fmt: skip

UNICODE_FRACTIONS = {"½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": 0.125}


# --- Mapping helpers (pure functions, unit-tested) ---------------------------------------------


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text[:100] or "recipe"


def _has_word(names: list[str], words: tuple[str, ...]) -> bool:
    pattern = re.compile(r"\b(" + "|".join(re.escape(w) for w in words) + r")\b", re.IGNORECASE)
    return any(pattern.search(name) for name in names)


def parse_measure(measure: str) -> tuple[float | None, str | None]:
    """'200g' -> (200, 'g'), '1 1/2 cups' -> (1.5, 'cups'), 'To taste' -> (None, None)."""
    text = measure.strip()
    for char, value in UNICODE_FRACTIONS.items():
        text = re.sub(rf"(\d)\s*{char}", lambda m, v=value: str(int(m.group(1)) + v), text)
        text = text.replace(char, str(value))
    match = re.match(r"^(\d+\s+\d+/\d+|\d+/\d+|\d+(?:[.,]\d+)?)\s*(.*)$", text)
    if not match:
        return None, None
    number, rest = match.groups()
    if " " in number:
        whole, fraction = number.split()
        num, den = fraction.split("/")
        quantity = int(whole) + int(num) / int(den)
    elif "/" in number:
        num, den = number.split("/")
        quantity = int(num) / int(den) if int(den) else None
    else:
        quantity = float(number.replace(",", "."))
    unit = rest.strip() or None
    if unit and len(unit) > 20:
        unit = None
    return (round(quantity, 3) if quantity is not None else None), unit


_STEP_LABEL = re.compile(r"^(step\s*\d+[.:)\-]?|\d+[.)])\s*", re.IGNORECASE)
_TIMER = re.compile(r"(\d+)\s*(?:-\s*\d+\s*)?(minutes?|mins?|hours?|hrs?)\b", re.IGNORECASE)


def split_steps(instructions: str) -> list[str]:
    lines = [line.strip() for line in re.split(r"[\r\n]+", instructions or "")]
    steps = []
    for line in lines:
        line = _STEP_LABEL.sub("", line).strip(" -–")
        if len(line) > 2:
            steps.append(line)
    # One long paragraph: cut it into steps of about two sentences.
    if len(steps) == 1 and len(steps[0]) > 200:
        sentences = re.split(r"(?<=[.!?])\s+", steps[0])
        steps = [" ".join(sentences[i : i + 2]) for i in range(0, len(sentences), 2)]
    return steps


def timer_seconds(step: str) -> int | None:
    match = _TIMER.search(step)
    if not match:
        return None
    value, unit = int(match.group(1)), match.group(2).lower()
    seconds = value * 3600 if unit.startswith("h") else value * 60
    return seconds if 0 < seconds <= 24 * 3600 else None


def category_for(meal: dict) -> str:
    name = (meal.get("strMeal") or "").lower()
    if re.search(r"\b(soup|chorba|harira|broth|chowder|bisque)\b", name):
        return "soup"
    if re.search(r"\bsalad\b", name):
        return "salad"
    if re.search(r"\b(smoothie|lemonade|juice|shake|drink)\b", name):
        return "drink"
    return CATEGORY_MAP.get(meal.get("strCategory") or "", "main")


def cuisine_for(area: str | None) -> str:
    if area in MAGHREBI:
        return "maghrebi"
    if area in MEDITERRANEAN:
        return "mediterranean"
    return "world"


def ingredients_of(meal: dict) -> list[tuple[str, str]]:
    items = []
    for i in range(1, 21):
        name = (meal.get(f"strIngredient{i}") or "").strip()
        if name:
            items.append((name, (meal.get(f"strMeasure{i}") or "").strip()))
    return items


def map_meal(meal: dict) -> dict:
    """Turn one TheMealDB meal into the fields of our Recipe model."""
    ingredients = ingredients_of(meal)
    names = [name for name, _ in ingredients]
    category = meal.get("strCategory") or ""
    area = meal.get("strArea")
    area = None if area in (None, "", "Unknown") else area

    diets = []
    if category != "Pork" and not _has_word(names, PORK):
        diets.append("no-pork")
    # Vinegar made from wine or cider is not an alcoholic ingredient.
    if not _has_word([n for n in names if "vinegar" not in n.lower()], ALCOHOL):
        diets.append("no-alcohol")
    if category in {"Vegetarian", "Vegan"}:
        diets.append("vegetarian")
    if category == "Vegan":
        diets.append("vegan")

    steps = split_steps(meal.get("strInstructions") or "")
    meal_id = str(meal["idMeal"])
    return {
        "external_id": meal_id,
        "title": {"en": meal["strMeal"].strip()},
        "description": {},
        "image_url": meal.get("strMealThumb") or "",
        "category": category_for(meal),
        "cuisine": cuisine_for(area),
        "origin": area,
        "diets": diets,
        "source_url": (meal.get("strSource") or "").strip() or f"https://www.themealdb.com/meal/{meal_id}",
        "video_url": (meal.get("strYoutube") or "").strip() or None,
        "ingredients": [
            {"name": {"en": name}, "measure": (measure or None) and measure[:80], **_qty(measure)}
            for name, measure in ingredients
        ],
        "steps": [{"text": {"en": text}, "timer_seconds": timer_seconds(text)} for text in steps],
    }


def _qty(measure: str) -> dict:
    quantity, unit = parse_measure(measure) if measure else (None, None)
    return {"quantity": quantity, "unit": unit}


# --- Fetching and saving ----------------------------------------------------------------------


def fetch_all(client: httpx.Client, pause: float = 0.25) -> Iterator[dict]:
    """TheMealDB's free API has no 'list everything' call, so we walk the alphabet."""
    seen: set[str] = set()
    for letter in string.ascii_lowercase + string.digits:
        for attempt in range(3):
            try:
                response = client.get(f"{API}/search.php", params={"f": letter})
                response.raise_for_status()
                break
            except httpx.HTTPError:
                if attempt == 2:
                    raise
                time.sleep(2**attempt)
        for meal in response.json().get("meals") or []:
            if meal["idMeal"] not in seen:
                seen.add(meal["idMeal"])
                yield meal
        time.sleep(pause)


def _unique_slug(db: Session, title: str, external_id: str) -> str:
    slug = slugify(title)
    if db.scalar(select(Recipe.id).where(Recipe.slug == slug)):
        slug = f"{slug}-{external_id}"
    return slug


def save(db: Session, data: dict) -> bool:
    """Insert or update one recipe. Returns True when it was new."""
    recipe = db.scalar(select(Recipe).where(Recipe.source == SOURCE, Recipe.external_id == data["external_id"]))
    created = recipe is None
    if created:
        recipe = Recipe(source=SOURCE, external_id=data["external_id"])
        recipe.slug = _unique_slug(db, data["title"]["en"], data["external_id"])
        db.add(recipe)
    for key in ("title", "description", "image_url", "category", "cuisine", "origin", "diets", "source_url"):
        setattr(recipe, key, data[key])
    recipe.video_url = data["video_url"]
    recipe.ingredients = [RecipeIngredient(position=i, **item) for i, item in enumerate(data["ingredients"], start=1)]
    recipe.steps = [RecipeStep(position=i, **step) for i, step in enumerate(data["steps"], start=1)]
    return created


def run(db: Session, client: httpx.Client, limit: int | None = None, dry_run: bool = False) -> tuple[int, int]:
    created = updated = 0
    for count, meal in enumerate(fetch_all(client), start=1):
        data = map_meal(meal)
        if not data["steps"] or not data["ingredients"] or not data["image_url"]:
            continue  # skip incomplete entries
        if not dry_run:
            if save(db, data):
                created += 1
            else:
                updated += 1
            db.commit()
        else:
            created += 1
        if limit and count >= limit:
            break
    return created, updated


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--limit", type=int, help="stop after this many recipes")
    parser.add_argument("--dry-run", action="store_true", help="fetch and map without writing to the database")
    args = parser.parse_args()

    headers = {"User-Agent": "Cravio/0.1 (portfolio project)"}
    with httpx.Client(timeout=20, headers=headers) as client, SessionLocal() as db:
        created, updated = run(db, client, limit=args.limit, dry_run=args.dry_run)
    verb = "Would import" if args.dry_run else "Imported"
    print(f"{verb} {created} new recipes, updated {updated}. Source: TheMealDB (themealdb.com)")


if __name__ == "__main__":
    main()
