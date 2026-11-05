from typing import Literal

from pydantic import BaseModel, ConfigDict

Difficulty = Literal["easy", "medium", "hard"]
Cuisine = Literal["maghrebi", "mediterranean", "world"]
Category = Literal["main", "soup", "salad", "starter", "side", "breakfast", "dessert", "drink"]
Localized = dict[str, str]


class IngredientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: Localized
    quantity: float | None
    unit: str | None
    measure: str | None = None


class StepOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    position: int
    text: Localized
    timer_seconds: int | None


class RecipeSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    title: Localized
    image_url: str
    total_minutes: int | None
    servings: int | None
    difficulty: Difficulty | None
    cuisine: Cuisine
    category: Category
    origin: str | None
    diets: list[str]


class RecipeDetail(RecipeSummary):
    description: Localized
    prep_minutes: int | None
    cook_minutes: int | None
    calories: int | None
    source: str
    source_url: str | None
    video_url: str | None
    ingredients: list[IngredientOut]
    steps: list[StepOut]
    is_favorite: bool = False


class PantryMatch(BaseModel):
    recipe: RecipeSummary
    have: list[str]
    missing: list[str]
