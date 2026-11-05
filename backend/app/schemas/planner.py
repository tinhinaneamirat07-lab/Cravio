from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.recipe import RecipeSummary

Slot = Literal["breakfast", "lunch", "dinner"]
Localized = dict[str, str]


class PlanItemIn(BaseModel):
    day: date
    slot: Slot
    recipe_slug: str = Field(min_length=1, max_length=120)
    servings: int | None = Field(default=None, ge=1, le=24)


class PlanItemUpdate(BaseModel):
    day: date | None = None
    slot: Slot | None = None
    servings: int | None = Field(default=None, ge=1, le=24)


class PlanItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    day: date
    slot: Slot
    servings: int
    recipe: RecipeSummary


class ShoppingItemIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class ShoppingItemUpdate(BaseModel):
    checked: bool | None = None
    name: str | None = Field(default=None, min_length=1, max_length=120)


class ShoppingItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: Localized
    quantity: float | None
    unit: str | None
    aisle: str
    checked: bool
    source: Literal["manual", "plan"]


class GenerateIn(BaseModel):
    start: date
    days: int = Field(default=7, ge=1, le=31)
