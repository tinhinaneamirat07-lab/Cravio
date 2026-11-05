from datetime import date, datetime

from sqlalchemy import JSON, Boolean, Date, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import utcnow
from app.models.recipe import Localized, Recipe


class MealPlanItem(Base):
    """One recipe placed on a day and meal slot of a user's week."""

    __tablename__ = "meal_plan_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    day: Mapped[date] = mapped_column(Date, index=True)
    slot: Mapped[str] = mapped_column(String(10))  # breakfast | lunch | dinner
    recipe_id: Mapped[int] = mapped_column(ForeignKey("recipes.id", ondelete="CASCADE"))
    servings: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    recipe: Mapped[Recipe] = relationship()


class ShoppingItem(Base):
    """A line of the shopping list, either generated from the planner or added by hand."""

    __tablename__ = "shopping_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[Localized] = mapped_column(JSON)
    quantity: Mapped[float | None] = mapped_column(Float)
    unit: Mapped[str | None] = mapped_column(String(20))
    aisle: Mapped[str] = mapped_column(String(20), default="other")
    checked: Mapped[bool] = mapped_column(Boolean, default=False)
    source: Mapped[str] = mapped_column(String(10), default="manual")  # manual | plan
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
