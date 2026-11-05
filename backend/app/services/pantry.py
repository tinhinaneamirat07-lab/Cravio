"""'Cook with what you have': rank recipes by how many of the user's ingredients they use."""

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Recipe
from app.services.retrieval import normalize, tokenize

# Basics almost every kitchen has: never counted as missing.
STAPLES = {
    "salt",
    "sel",
    "ملح",
    "pepper",
    "poivre",
    "فلفل",
    "water",
    "eau",
    "ماء",
    "oil",
    "huile",
    "زيت",
    "olive",
    "sugar",
    "sucre",
    "سكر",
    "black",
}


@dataclass
class Match:
    recipe: Recipe
    have: list[str]  # ingredient names (in the reader's language) the user has
    missing: list[str]  # ingredient names still needed

    @property
    def coverage(self) -> float:
        total = len(self.have) + len(self.missing)
        return len(self.have) / total if total else 0.0


def _words(text: str) -> set[str]:
    return set(tokenize(text))


def _matches(pantry_words: set[str], ingredient_words: set[str]) -> bool:
    for p in pantry_words:
        for w in ingredient_words:
            if p == w or (len(p) >= 4 and len(w) >= 4 and (p.startswith(w) or w.startswith(p))):
                return True
    return False


def match(db: Session, ingredients: list[str], lang: str = "fr", limit: int = 24) -> list[Match]:
    pantry = [_words(i) for i in ingredients if i.strip()]
    pantry = [p for p in pantry if p]
    if not pantry:
        return []
    recipes = db.scalars(
        select(Recipe).where(Recipe.is_published.is_(True)).options(selectinload(Recipe.ingredients))
    ).all()

    results: list[Match] = []
    for recipe in recipes:
        have, missing = [], []
        for ing in recipe.ingredients:
            label = ing.name.get(lang) or ing.name.get("en") or next(iter(ing.name.values()), "")
            words = set().union(*(_words(n) for n in ing.name.values()))
            if not words:
                continue
            if any(_matches(p, words) for p in pantry):
                have.append(label)
            elif not words & STAPLES and not {normalize(w) for w in words} <= STAPLES:
                missing.append(label)
        if have:
            results.append(Match(recipe, have, missing))

    # Most of my ingredients used first, then fewest things to buy.
    results.sort(key=lambda m: (-len(m.have), len(m.missing), m.recipe.source != "cravio", m.recipe.id))
    return results[:limit]
