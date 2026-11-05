"""Build a shopping list from the meal plan: scale each recipe, then merge identical ingredients."""

import math
from datetime import date, timedelta

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.models import MealPlanItem, Recipe, ShoppingItem
from app.services.aisles import aisle_for

# You cannot buy 1.25 onions: countable units are rounded up.
COUNTABLE = {"piece", "clove", "bunch"}


def _amount(quantity: float, unit: str | None) -> float:
    if unit in COUNTABLE or unit is None:
        return float(math.ceil(quantity - 1e-9))
    return round(quantity, 2)


def _key(name: dict[str, str], unit: str | None) -> tuple[str, str]:
    base = (name.get("en") or name.get("fr") or next(iter(name.values()), "")).strip().lower()
    return base, (unit or "").strip().lower()


def generate(db: Session, user_id: int, start: date, days: int) -> None:
    end = start + timedelta(days=days - 1)
    items = db.scalars(
        select(MealPlanItem)
        .where(MealPlanItem.user_id == user_id, MealPlanItem.day >= start, MealPlanItem.day <= end)
        .options(selectinload(MealPlanItem.recipe).selectinload(Recipe.ingredients))
    ).all()

    merged: dict[tuple[str, str], dict] = {}
    for item in items:
        base_servings = item.recipe.servings
        # Imported recipes have no known serving count: take their quantities as they are.
        scale = item.servings / base_servings if base_servings else 1
        for ing in item.recipe.ingredients:
            key = _key(ing.name, ing.unit)
            entry = merged.setdefault(key, {"name": ing.name, "unit": ing.unit, "quantity": None, "has_amount": False})
            if ing.quantity is not None:
                entry["quantity"] = (entry["quantity"] or 0) + ing.quantity * scale
                entry["has_amount"] = True

    # Regenerating replaces the previous generated lines; hand-added items stay.
    db.execute(delete(ShoppingItem).where(ShoppingItem.user_id == user_id, ShoppingItem.source == "plan"))
    for entry in merged.values():
        db.add(
            ShoppingItem(
                user_id=user_id,
                name=entry["name"],
                quantity=_amount(entry["quantity"], entry["unit"]) if entry["has_amount"] else None,
                unit=entry["unit"] if entry["has_amount"] else None,
                aisle=aisle_for(entry["name"]),
                source="plan",
            )
        )
    db.commit()
