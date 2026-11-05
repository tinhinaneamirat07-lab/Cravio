from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.recipe import RecipeSummary


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class ChatIn(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=20)
    lang: Literal["fr", "en", "ar"] = "fr"
    today: date | None = Field(default=None, description="The user's local date, for 'today' and 'tomorrow'")
    recipe_slug: str | None = Field(default=None, max_length=120, description="Recipe the user is looking at")

    @field_validator("messages")
    @classmethod
    def last_is_user(cls, messages: list[ChatMessage]) -> list[ChatMessage]:
        if messages[-1].role != "user":
            raise ValueError("The last message must come from the user")
        return messages


class ChatOut(BaseModel):
    reply: str
    recipes: list[RecipeSummary]
    actions: list[dict[str, Any]]


class AssistantStatus(BaseModel):
    available: bool
