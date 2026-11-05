from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy import String, cast, exists, func, select
from sqlalchemy.orm import selectinload

from app.deps import DB, CurrentUser, OptionalUser
from app.models import Favorite, Recipe, RecipeIngredient
from app.schemas.recipe import Category, Cuisine, Difficulty, PantryMatch, RecipeDetail, RecipeSummary
from app.schemas.user import Locale, Page
from app.services import pantry

router = APIRouter(tags=["recipes"])


def _published():
    return select(Recipe).where(Recipe.is_published.is_(True))


def _get_recipe(db: DB, slug: str) -> Recipe:
    recipe = db.scalar(
        _published().where(Recipe.slug == slug).options(selectinload(Recipe.ingredients), selectinload(Recipe.steps))
    )
    if recipe is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Recipe not found")
    return recipe


@router.get("/recipes", response_model=Page[RecipeSummary])
def list_recipes(
    db: DB,
    q: str | None = Query(default=None, max_length=100, description="Search titles and ingredients"),
    cuisine: Cuisine | None = None,
    category: Category | None = None,
    difficulty: Difficulty | None = None,
    diet: str | None = Query(default=None, max_length=30, pattern=r"^[a-z-]+$"),
    max_minutes: int | None = Query(default=None, ge=1, le=1440),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=48),
) -> dict:
    query = _published()
    if q:
        term = f"%{q.strip().lower()}%"
        # JSON columns are searched as text so one query covers FR, EN and AR.
        in_title = func.lower(cast(Recipe.title, String)).like(term)
        in_ingredients = exists().where(
            RecipeIngredient.recipe_id == Recipe.id,
            func.lower(cast(RecipeIngredient.name, String)).like(term),
        )
        query = query.where(in_title | in_ingredients)
    if cuisine:
        query = query.where(Recipe.cuisine == cuisine)
    if category:
        query = query.where(Recipe.category == category)
    if difficulty:
        query = query.where(Recipe.difficulty == difficulty)
    if diet:
        query = query.where(cast(Recipe.diets, String).like(f'%"{diet}"%'))
    if max_minutes:
        minutes = func.coalesce(Recipe.prep_minutes, 0) + func.coalesce(Recipe.cook_minutes, 0)
        known = Recipe.prep_minutes.is_not(None) | Recipe.cook_minutes.is_not(None)
        query = query.where(known, minutes <= max_minutes)

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    order = (Recipe.source != "cravio", Recipe.id)  # hand-written recipes first
    items = db.scalars(query.order_by(*order).offset((page - 1) * page_size).limit(page_size)).all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/recipes/match", response_model=list[PantryMatch])
def match_recipes(
    db: DB,
    ingredients: str = Query(min_length=1, max_length=400, description="Comma-separated, e.g. 'poulet,riz,tomate'"),
    lang: Locale = "fr",
) -> list[dict]:
    """Cook with what you have: recipes that use the most of these ingredients, and what is missing."""
    names = [i.strip() for i in ingredients.split(",") if i.strip()][:20]
    return [{"recipe": m.recipe, "have": m.have, "missing": m.missing} for m in pantry.match(db, names, lang)]


@router.get("/recipes/{slug}", response_model=RecipeDetail)
def get_recipe(slug: str, db: DB, user: OptionalUser) -> dict:
    recipe = _get_recipe(db, slug)
    detail = RecipeDetail.model_validate(recipe).model_dump()
    if user:
        detail["is_favorite"] = db.get(Favorite, (user.id, recipe.id)) is not None
    return detail


@router.get("/me/favorites", response_model=list[RecipeSummary])
def my_favorites(user: CurrentUser, db: DB) -> list[Recipe]:
    return list(
        db.scalars(
            _published()
            .join(Favorite, Favorite.recipe_id == Recipe.id)
            .where(Favorite.user_id == user.id)
            .order_by(Favorite.created_at.desc())
        )
    )


@router.put("/recipes/{slug}/favorite", status_code=status.HTTP_204_NO_CONTENT)
def add_favorite(slug: str, user: CurrentUser, db: DB) -> Response:
    recipe = _get_recipe(db, slug)
    if db.get(Favorite, (user.id, recipe.id)) is None:
        db.add(Favorite(user_id=user.id, recipe_id=recipe.id))
        db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/recipes/{slug}/favorite", status_code=status.HTTP_204_NO_CONTENT)
def remove_favorite(slug: str, user: CurrentUser, db: DB) -> Response:
    recipe = _get_recipe(db, slug)
    favorite = db.get(Favorite, (user.id, recipe.id))
    if favorite:
        db.delete(favorite)
        db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
