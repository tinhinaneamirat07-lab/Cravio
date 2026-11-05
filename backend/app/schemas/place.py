from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Category = Literal[
    "cafe", "restaurant", "cinema", "shopping", "park", "activity", "hotel", "beach", "attraction", "parking"
]
GoodFor = Literal["solo", "couple", "friends", "family", "work", "kids"]
# Only OpenStreetMap ids: "osm-node-123", "osm-way-45", "osm-relation-6".
PLACE_ID_PATTERN = r"^osm-(node|way|relation)-\d{1,15}$"


class PhotoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    thumb_url: str
    page_url: str | None
    author: str | None  # must be shown next to the photo
    license: str | None


class PlaceOut(BaseModel):
    id: str
    name: str
    category: str
    latitude: float
    longitude: float
    address: str | None
    tags: dict[str, str]  # opening_hours, phone, website, cuisine… straight from OpenStreetMap
    distance_m: int | None = None
    photo: PhotoOut | None = None


class PlaceDetail(PlaceOut):
    rating_average: float | None
    rating_count: int
    is_favorite: bool = False


class NearbyPage(BaseModel):
    places: list[PlaceOut]
    total: int
    limit: int
    offset: int
    source: Literal["database", "openstreetmap"]  # openstreetmap = first visit of this area
    stale: bool  # Overpass was down: these places may be a bit old


class PhotoAnswer(BaseModel):
    photo: PhotoOut | None


class ReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=1000)

    @field_validator("comment")
    @classmethod
    def strip(cls, value: str) -> str:
        return value.strip()


class ReviewOut(BaseModel):
    id: int
    author: str
    rating: int
    comment: str
    created_at: datetime
    mine: bool = False


class Reviews(BaseModel):
    average: float | None
    count: int
    reviews: list[ReviewOut]


class InfoIn(BaseModel):
    price_min: int | None = Field(default=None, ge=0, le=1_000_000)
    price_max: int | None = Field(default=None, ge=0, le=1_000_000)
    group_min: int | None = Field(default=None, ge=1, le=500)
    group_max: int | None = Field(default=None, ge=1, le=500)
    good_for: list[GoodFor] = Field(default_factory=list, max_length=6)

    @model_validator(mode="after")
    def ranges(self) -> "InfoIn":
        if self.price_min is not None and self.price_max is not None and self.price_min > self.price_max:
            raise ValueError("price_min must be <= price_max")
        if self.group_min is not None and self.group_max is not None and self.group_min > self.group_max:
            raise ValueError("group_min must be <= group_max")
        self.good_for = list(dict.fromkeys(self.good_for))  # no duplicates
        return self


class InfoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    price_min: int | None
    price_max: int | None
    group_min: int | None
    group_max: int | None
    good_for: list[str]
    updated_at: datetime


class MenuItemIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    price: int = Field(ge=0, le=1_000_000)

    @field_validator("name")
    @classmethod
    def strip(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name cannot be empty")
        return value


class MenuItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    price: int


class PlaceInfo(BaseModel):
    info: InfoOut | None
    menu: list[MenuItemOut]
    can_edit: bool  # the page shows the edit form; the server checks again on save


class WeatherOut(BaseModel):
    temperature: int
    wind_kmh: int
    code: int
    is_day: bool
    condition: Literal["rain", "cold", "windy", "hot", "nice", "ok"]
    time: str
    cached: bool
