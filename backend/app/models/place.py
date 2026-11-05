"""Places to go out (ported from GoSpot).

We do not copy all of OpenStreetMap: a place is saved the first time someone searches
its area (see services/osm.py). Prices, menus, reviews and favorites are ours and live
in their own tables, so refreshing OSM data never erases what users added.
"""

from datetime import datetime

from sqlalchemy import JSON, CheckConstraint, DateTime, Float, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import utcnow


class Place(Base):
    __tablename__ = "places"
    # A "box" search (latitude BETWEEN … AND longitude BETWEEN …) uses this index.
    __table_args__ = (Index("ix_places_lat_lon", "latitude", "longitude"),)

    id: Mapped[str] = mapped_column(String(40), primary_key=True)  # "osm-node-123"
    name: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(30), index=True)  # cafe, restaurant, beach…
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    address: Mapped[str | None] = mapped_column(String(300))
    osm_tags: Mapped[dict[str, str]] = mapped_column(JSON, default=dict)  # opening_hours, phone, website…
    osm_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AreaSearch(Base):
    """An area we already asked Overpass about. Fresher than 7 days → read our database only."""

    __tablename__ = "area_searches"

    key: Mapped[str] = mapped_column(String(40), primary_key=True)  # "36.77,3.06,5000" (rounded center + radius)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    radius_m: Mapped[int] = mapped_column(Integer)
    place_count: Mapped[int] = mapped_column(Integer, default=0)
    searched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class PlacePhoto(Base):
    """A free Wikimedia Commons photo, looked up once. 'none' is remembered too, to avoid asking again."""

    __tablename__ = "place_photos"
    __table_args__ = (CheckConstraint("status IN ('found', 'none')", name="ck_place_photo_status"),)

    place_id: Mapped[str] = mapped_column(ForeignKey("places.id", ondelete="CASCADE"), primary_key=True)
    status: Mapped[str] = mapped_column(String(10))
    thumb_url: Mapped[str | None] = mapped_column(String(1000))
    image_url: Mapped[str | None] = mapped_column(String(1000))
    page_url: Mapped[str | None] = mapped_column(String(1000))
    author: Mapped[str | None] = mapped_column(String(200))  # free photos MUST be credited
    license: Mapped[str | None] = mapped_column(String(100))
    source: Mapped[str | None] = mapped_column(String(30))  # which tag or search found it
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class PlaceDetails(Base):
    """Budget and group size: OpenStreetMap has none of this, so an admin fills it in."""

    __tablename__ = "place_details"
    __table_args__ = (
        CheckConstraint("price_min IS NULL OR price_max IS NULL OR price_min <= price_max", name="ck_details_price"),
        CheckConstraint("group_min IS NULL OR group_max IS NULL OR group_min <= group_max", name="ck_details_group"),
    )

    place_id: Mapped[str] = mapped_column(ForeignKey("places.id", ondelete="CASCADE"), primary_key=True)
    price_min: Mapped[int | None] = mapped_column(Integer)  # DA per person, 0 = free
    price_max: Mapped[int | None] = mapped_column(Integer)
    group_min: Mapped[int | None] = mapped_column(Integer)
    group_max: Mapped[int | None] = mapped_column(Integer)
    good_for: Mapped[list[str]] = mapped_column(JSON, default=list)  # solo, couple, friends, family, work
    updated_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class MenuItem(Base):
    __tablename__ = "menu_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    place_id: Mapped[str] = mapped_column(ForeignKey("places.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(80))
    price: Mapped[int] = mapped_column(Integer)  # DA
    added_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class PlaceReview(Base):
    """One review per user and place: posting again replaces it."""

    __tablename__ = "place_reviews"
    __table_args__ = (
        UniqueConstraint("user_id", "place_id", name="uq_review_user_place"),
        CheckConstraint("rating BETWEEN 1 AND 5", name="ck_review_rating"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    place_id: Mapped[str] = mapped_column(ForeignKey("places.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    rating: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str] = mapped_column(String(1000), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class PlaceFavorite(Base):
    __tablename__ = "place_favorites"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    place_id: Mapped[str] = mapped_column(ForeignKey("places.id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
