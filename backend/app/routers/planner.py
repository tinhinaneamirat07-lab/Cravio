from datetime import date, timedelta

from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload

from app.deps import DB, CurrentUser
from app.models import MealPlanItem, Recipe, ShoppingItem
from app.schemas.planner import (
    GenerateIn,
    PlanItemIn,
    PlanItemOut,
    PlanItemUpdate,
    ShoppingItemIn,
    ShoppingItemOut,
    ShoppingItemUpdate,
)
from app.services import shopping
from app.services.aisles import AISLES, aisle_for

router = APIRouter(tags=["planner"])

MAX_ITEMS_PER_SLOT = 6


def _own_plan_item(db: DB, user_id: int, item_id: int) -> MealPlanItem:
    item = db.get(MealPlanItem, item_id)
    if item is None or item.user_id != user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Planner item not found")
    return item


def _own_shopping_item(db: DB, user_id: int, item_id: int) -> ShoppingItem:
    item = db.get(ShoppingItem, item_id)
    if item is None or item.user_id != user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Shopping item not found")
    return item


# --- Planner ------------------------------------------------------------------------------------


@router.get("/planner", response_model=list[PlanItemOut])
def get_plan(user: CurrentUser, db: DB, start: date, days: int = Query(default=7, ge=1, le=31)) -> list[MealPlanItem]:
    end = start + timedelta(days=days - 1)
    return list(
        db.scalars(
            select(MealPlanItem)
            .where(MealPlanItem.user_id == user.id, MealPlanItem.day >= start, MealPlanItem.day <= end)
            .options(selectinload(MealPlanItem.recipe))
            .order_by(MealPlanItem.day, MealPlanItem.id)
        )
    )


@router.post("/planner", response_model=PlanItemOut, status_code=status.HTTP_201_CREATED)
def add_to_plan(body: PlanItemIn, user: CurrentUser, db: DB) -> MealPlanItem:
    recipe = db.scalar(select(Recipe).where(Recipe.slug == body.recipe_slug, Recipe.is_published.is_(True)))
    if recipe is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Recipe not found")
    in_slot = db.scalars(
        select(MealPlanItem.id).where(
            MealPlanItem.user_id == user.id, MealPlanItem.day == body.day, MealPlanItem.slot == body.slot
        )
    ).all()
    if len(in_slot) >= MAX_ITEMS_PER_SLOT:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="This meal already has too many recipes")
    item = MealPlanItem(
        user_id=user.id,
        day=body.day,
        slot=body.slot,
        recipe_id=recipe.id,
        servings=body.servings or recipe.servings or 2,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/planner/{item_id}", response_model=PlanItemOut)
def update_plan_item(item_id: int, body: PlanItemUpdate, user: CurrentUser, db: DB) -> MealPlanItem:
    item = _own_plan_item(db, user.id, item_id)
    for field, value in body.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/planner/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_plan_item(item_id: int, user: CurrentUser, db: DB) -> Response:
    db.delete(_own_plan_item(db, user.id, item_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Shopping list ------------------------------------------------------------------------------


def _list(db: DB, user_id: int) -> list[ShoppingItem]:
    items = db.scalars(select(ShoppingItem).where(ShoppingItem.user_id == user_id)).all()
    order = {aisle: i for i, aisle in enumerate(AISLES)}
    return sorted(items, key=lambda i: (order.get(i.aisle, 99), i.checked, i.id))


@router.get("/shopping-list", response_model=list[ShoppingItemOut])
def get_shopping_list(user: CurrentUser, db: DB) -> list[ShoppingItem]:
    return _list(db, user.id)


@router.post("/shopping-list/generate", response_model=list[ShoppingItemOut])
def generate_shopping_list(body: GenerateIn, user: CurrentUser, db: DB) -> list[ShoppingItem]:
    shopping.generate(db, user.id, body.start, body.days)
    return _list(db, user.id)


@router.post("/shopping-list", response_model=ShoppingItemOut, status_code=status.HTTP_201_CREATED)
def add_shopping_item(body: ShoppingItemIn, user: CurrentUser, db: DB) -> ShoppingItem:
    name = body.name.strip()
    item = ShoppingItem(user_id=user.id, name={"custom": name}, aisle=aisle_for(name), source="manual")
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/shopping-list/{item_id}", response_model=ShoppingItemOut)
def update_shopping_item(item_id: int, body: ShoppingItemUpdate, user: CurrentUser, db: DB) -> ShoppingItem:
    item = _own_shopping_item(db, user.id, item_id)
    if body.checked is not None:
        item.checked = body.checked
    if body.name is not None:
        item.name = {"custom": body.name.strip()}
        item.aisle = aisle_for(body.name)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/shopping-list/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shopping_item(item_id: int, user: CurrentUser, db: DB) -> Response:
    db.delete(_own_shopping_item(db, user.id, item_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/shopping-list", status_code=status.HTTP_204_NO_CONTENT)
def clear_shopping_list(user: CurrentUser, db: DB, checked_only: bool = True) -> Response:
    query = delete(ShoppingItem).where(ShoppingItem.user_id == user.id)
    if checked_only:
        query = query.where(ShoppingItem.checked.is_(True))
    db.execute(query)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
