from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin, utcnow

# Localized text is stored as {"fr": "...", "en": "...", "ar": "..."}.
Localized = dict[str, str]


class Recipe(TimestampMixin, Base):
    __tablename__ = "recipes"
    __table_args__ = (UniqueConstraint("source", "external_id", name="uq_recipe_source_external_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    title: Mapped[Localized] = mapped_column(JSON)
    description: Mapped[Localized] = mapped_column(JSON, default=dict)
    image_url: Mapped[str] = mapped_column(String(500))
    # Imported recipes often have no timing, servings or difficulty: unknown stays NULL, never guessed.
    prep_minutes: Mapped[int | None] = mapped_column(Integer)
    cook_minutes: Mapped[int | None] = mapped_column(Integer)
    servings: Mapped[int | None] = mapped_column(Integer)
    difficulty: Mapped[str | None] = mapped_column(String(10), index=True)  # easy | medium | hard
    cuisine: Mapped[str] = mapped_column(String(20), index=True)  # maghrebi | mediterranean | world
    origin: Mapped[str | None] = mapped_column(String(40))  # e.g. "Moroccan", "Italian"
    category: Mapped[str] = mapped_column(
        String(20), index=True
    )  # main | soup | salad | starter | side | breakfast | dessert | drink
    diets: Mapped[list[str]] = mapped_column(JSON, default=list)  # halal, vegetarian, ...
    calories: Mapped[int | None] = mapped_column(Integer)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)

    # Where the recipe comes from, so imports are idempotent and credited.
    source: Mapped[str] = mapped_column(String(30), default="cravio", index=True)
    external_id: Mapped[str | None] = mapped_column(String(64))
    source_url: Mapped[str | None] = mapped_column(String(500))
    video_url: Mapped[str | None] = mapped_column(String(500))

    ingredients: Mapped[list["RecipeIngredient"]] = relationship(
        back_populates="recipe", cascade="all, delete-orphan", order_by="RecipeIngredient.position"
    )
    steps: Mapped[list["RecipeStep"]] = relationship(
        back_populates="recipe", cascade="all, delete-orphan", order_by="RecipeStep.position"
    )

    @property
    def total_minutes(self) -> int | None:
        if self.prep_minutes is None and self.cook_minutes is None:
            return None
        return (self.prep_minutes or 0) + (self.cook_minutes or 0)


class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"

    id: Mapped[int] = mapped_column(primary_key=True)
    recipe_id: Mapped[int] = mapped_column(ForeignKey("recipes.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(Integer)
    name: Mapped[Localized] = mapped_column(JSON)
    quantity: Mapped[float | None] = mapped_column(Float)
    unit: Mapped[str | None] = mapped_column(String(20))  # g, ml, tbsp, tsp, piece, bunch, pinch
    measure: Mapped[str | None] = mapped_column(String(80))  # original free-text measure, e.g. "1 heaped tbsp"

    recipe: Mapped[Recipe] = relationship(back_populates="ingredients")


class RecipeStep(Base):
    __tablename__ = "recipe_steps"

    id: Mapped[int] = mapped_column(primary_key=True)
    recipe_id: Mapped[int] = mapped_column(ForeignKey("recipes.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(Integer)
    text: Mapped[Localized] = mapped_column(JSON)
    timer_seconds: Mapped[int | None] = mapped_column(Integer)

    recipe: Mapped[Recipe] = relationship(back_populates="steps")


class Favorite(Base):
    __tablename__ = "favorites"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    recipe_id: Mapped[int] = mapped_column(ForeignKey("recipes.id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
