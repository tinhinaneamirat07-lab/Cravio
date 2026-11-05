"""Load the demo recipes. Safe to run several times: existing recipes are updated.

python -m app.seed
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models import Recipe, RecipeIngredient, RecipeStep
from app.seed.recipes_data import RECIPES, L


def seed(db: Session) -> int:
    for data in RECIPES:
        recipe = db.scalar(select(Recipe).where(Recipe.slug == data["slug"]))
        if recipe is None:
            recipe = Recipe(slug=data["slug"])
            db.add(recipe)
        fields = {k: v for k, v in data.items() if k not in {"slug", "ingredients", "steps"}}
        for key, value in fields.items():
            setattr(recipe, key, value)
        recipe.ingredients = [
            RecipeIngredient(position=i, name=L(fr, en, ar), quantity=qty, unit=unit)
            for i, (fr, en, ar, qty, unit) in enumerate(data["ingredients"], start=1)
        ]
        recipe.steps = [
            RecipeStep(position=i, text=L(fr, en, ar), timer_seconds=timer)
            for i, (fr, en, ar, timer) in enumerate(data["steps"], start=1)
        ]
    db.commit()
    return len(RECIPES)


if __name__ == "__main__":
    with SessionLocal() as session:
        print(f"Seeded {seed(session)} recipes.")
