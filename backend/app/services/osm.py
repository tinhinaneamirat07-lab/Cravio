"""OpenStreetMap places, cached in our database (ported from GoSpot).

get_places_around(): if the area was searched less than 7 days ago we read our database
(fast). Otherwise we ask Overpass ONCE, save every place and remember the area. If Overpass
is down we still answer with the old places when we have some ("stale").

Overpass is a free service run by volunteers: one request per area per week keeps it free.
"""

import math
import re
import threading
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import AreaSearch, Place, PlacePhoto
from app.models.mixins import utcnow
from app.services import http

FRESH_DAYS = 7
TIMEOUT_SECONDS = 25
CATEGORIES = ("cafe", "restaurant", "cinema", "shopping", "park", "activity", "hotel", "beach", "attraction", "parking")
PLACE_ID = re.compile(r"^osm-(node|way|relation)-(\d+)$")


class PlacesUnavailable(Exception):
    """Overpass failed and we have nothing saved for this area."""


# ---------------------------------------------------------------------------
# 1. OSM tags → our category
# ---------------------------------------------------------------------------
def category_from_tags(tags: dict[str, str]) -> str | None:
    amenity, shop, leisure = tags.get("amenity"), tags.get("shop"), tags.get("leisure")
    tourism, historic, natural = tags.get("tourism"), tags.get("historic"), tags.get("natural")
    if amenity == "cafe":
        return "cafe"
    if amenity in ("restaurant", "fast_food"):
        return "restaurant"
    if amenity == "cinema":
        return "cinema"
    if shop in ("mall", "supermarket", "marketplace"):
        return "shopping"
    if leisure in ("park", "garden"):
        return "park"
    if tourism in ("hotel", "hostel", "guest_house", "motel", "apartment"):
        return "hotel"
    if natural == "beach" or leisure == "beach_resort":
        return "beach"
    if amenity == "parking":
        return "parking"
    if tourism in ("museum", "viewpoint", "gallery", "artwork") or historic in (
        "monument", "memorial", "castle", "fort", "ruins", "archaeological_site",
    ):
        return "attraction"
    if (
        leisure in ("sports_centre", "bowling_alley", "amusement_arcade", "escape_game", "miniature_golf", "water_park")
        or tourism in ("theme_park", "zoo", "attraction")
        or amenity == "theatre"
    ):
        return "activity"
    return None


DEFAULT_NAMES = {"parking": "Parking", "beach": "Plage"}

# One selector per category, each with its own limit, so 60 cafés cannot hide the beaches.
SELECTORS = [
    ('nwr["amenity"="cafe"]', 40),
    ('nwr["amenity"~"^(restaurant|fast_food)$"]', 40),
    ('nwr["amenity"~"^(cinema|theatre)$"]', 15),
    ('nwr["shop"~"^(mall|supermarket|marketplace)$"]', 20),
    ('nwr["leisure"~"^(park|garden)$"]', 20),
    ('nwr["leisure"~"^(sports_centre|bowling_alley|amusement_arcade|escape_game|miniature_golf|water_park)$"]', 20),
    ('nwr["tourism"~"^(hotel|hostel|guest_house|motel|apartment)$"]', 20),
    ('nwr["natural"="beach"]', 15),
    ('nwr["leisure"="beach_resort"]', 5),
    ('nwr["amenity"="parking"]["access"!~"^(private|no)$"]', 15),
    ('nwr["tourism"~"^(museum|viewpoint|gallery|attraction|theme_park|zoo)$"]', 20),
    ('nwr["historic"~"^(monument|memorial|castle|fort|ruins|archaeological_site)$"]', 15),
]


@dataclass
class OsmPlace:
    id: str
    name: str
    category: str
    latitude: float
    longitude: float
    address: str | None
    tags: dict[str, str] = field(default_factory=dict)


def _address(tags: dict[str, str]) -> str | None:
    return ", ".join(v for v in (tags.get("addr:street"), tags.get("addr:city")) if v) or None


def _position(el: dict) -> tuple[float | None, float | None]:
    # Nodes have lat/lon; ways and relations (buildings, parks) have a "center".
    center = el.get("center") or {}
    return el.get("lat", center.get("lat")), el.get("lon", center.get("lon"))


def to_place(el: dict) -> OsmPlace | None:
    """Raw Overpass element → a clean place, or None when it is not useful (no name, no category)."""
    tags = el.get("tags") or {}
    category = category_from_tags(tags)
    if not category:
        return None
    name = (tags.get("name") or "").strip() or DEFAULT_NAMES.get(category)
    if not name:
        return None
    lat, lon = _position(el)
    if lat is None or lon is None:
        return None
    return OsmPlace(f"osm-{el['type']}-{el['id']}", name[:200], category, lat, lon, _address(tags), tags)


def _overpass(ql: str) -> list[dict]:
    """Ask Overpass. The public servers are free and often full (HTTP 429, 502, 504):
    when one is busy or slow we try the next mirror, and give up only if they all fail."""
    last: Exception | None = None
    # 5 s to connect: a server that does not answer is skipped quickly.
    with http.client(timeout=httpx.Timeout(TIMEOUT_SECONDS, connect=5)) as c:
        for url in get_settings().overpass_urls:
            try:
                res = c.post(url, data={"data": ql})
                res.raise_for_status()
                return res.json().get("elements", [])
            except (httpx.HTTPError, ValueError) as err:
                last = err
    raise last or httpx.HTTPError("No Overpass server configured")


# ---------------------------------------------------------------------------
# 2. Save and read
# ---------------------------------------------------------------------------
def save_places(db: Session, places: list[OsmPlace]) -> None:
    """Insert new places, refresh known ones. Our own data (reviews, prices…) is in other tables."""
    if not places:
        return
    known = {p.id: p for p in db.scalars(select(Place).where(Place.id.in_([p.id for p in places])))}
    now = utcnow()
    for p in places:
        row = known.get(p.id)
        if row is None:
            db.add(Place(id=p.id, name=p.name, category=p.category, latitude=p.latitude, longitude=p.longitude,
                         address=p.address, osm_tags=p.tags, osm_synced_at=now))
        else:
            row.name, row.category, row.latitude, row.longitude = p.name, p.category, p.latitude, p.longitude
            row.address = p.address or row.address
            row.osm_tags, row.osm_synced_at = p.tags, now


def distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine formula: the distance in metres between two points on Earth."""
    r = 6_371_000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    a = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


@dataclass
class Found:
    place: Place
    distance_m: int
    photo: PlacePhoto | None


def read_around(db: Session, lat: float, lon: float, radius_m: int, category: str | None) -> list[Found]:
    """Every saved place in the circle, nearest first.

    Step A, a "box" in SQL (fast thanks to the lat/lon index). 1° of latitude ≈ 111 km everywhere;
    a degree of longitude gets smaller away from the equator, so we divide by cos(latitude).
    Step B, the real distance in Python, to keep a circle.
    """
    d_lat = radius_m / 111_320
    d_lon = radius_m / (111_320 * math.cos(math.radians(lat)))
    query = (
        select(Place, PlacePhoto)
        .outerjoin(PlacePhoto, PlacePhoto.place_id == Place.id)
        .where(
            Place.latitude.between(lat - d_lat, lat + d_lat),
            Place.longitude.between(lon - d_lon, lon + d_lon),
        )
    )
    if category:
        query = query.where(Place.category == category)
    found = []
    for place, photo in db.execute(query):
        d = distance_m(lat, lon, place.latitude, place.longitude)
        if d <= radius_m:
            found.append(Found(place, round(d), photo))
    found.sort(key=lambda f: f.distance_m)
    return found


# ---------------------------------------------------------------------------
# 3. Main function
# ---------------------------------------------------------------------------
# Two visitors open the same city at the same second → only one Overpass call.
_area_locks: dict[str, threading.Lock] = {}
_locks_guard = threading.Lock()


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)  # SQLite gives naive datetimes back


def _is_fresh(area: AreaSearch | None) -> bool:
    return area is not None and _aware(area.searched_at) > utcnow() - timedelta(days=FRESH_DAYS)


def area_key(lat: float, lon: float, radius_m: int) -> tuple[str, float, float]:
    # Round the center to 2 decimals (≈ 1 km) so neighbours share one area.
    c_lat, c_lon = round(lat, 2), round(lon, 2)
    return f"{c_lat:.2f},{c_lon:.2f},{radius_m}", c_lat, c_lon


def _refresh_area(db: Session, key: str, c_lat: float, c_lon: float, radius_m: int) -> None:
    # +700 m: the center was rounded, so we search a bit wider to cover the real circle.
    around = f"(around:{radius_m + 700},{c_lat},{c_lon})"
    ql = "[out:json][timeout:25];\n" + "\n".join(f"{sel}{around}; out center {limit};" for sel, limit in SELECTORS)
    by_id: dict[str, OsmPlace] = {}
    for el in _overpass(ql):
        place = to_place(el)
        if place and place.id not in by_id:  # one element can match two selectors
            by_id[place.id] = place
    # One transaction: the places AND the area, or nothing.
    save_places(db, list(by_id.values()))
    area = db.get(AreaSearch, key) or AreaSearch(key=key, latitude=c_lat, longitude=c_lon, radius_m=radius_m)
    area.place_count, area.searched_at = len(by_id), utcnow()
    db.add(area)
    db.commit()


def get_places_around(db: Session, lat: float, lon: float, radius_m: int, category: str | None = None) -> dict:
    key, c_lat, c_lon = area_key(lat, lon, radius_m)
    source, stale = "database", False
    if not _is_fresh(db.get(AreaSearch, key)):
        with _locks_guard:
            lock = _area_locks.setdefault(key, threading.Lock())
        with lock:
            db.expire_all()  # another request may have refreshed it while we waited
            area = db.get(AreaSearch, key)
            if not _is_fresh(area):
                try:
                    _refresh_area(db, key, c_lat, c_lon, radius_m)
                    source = "openstreetmap"
                except (httpx.HTTPError, ValueError) as err:
                    db.rollback()
                    if area is None:  # nothing saved for this area
                        raise PlacesUnavailable(str(err)) from err
                    stale = True  # old places are better than nothing
    return {"found": read_around(db, lat, lon, radius_m, category), "source": source, "stale": stale}


def get_place(db: Session, place_id: str) -> Place | None:
    """One place: our database first, otherwise Overpass (so a shared link always works)."""
    place = db.get(Place, place_id)
    if place is not None and place.osm_synced_at is not None:
        return place
    match = PLACE_ID.match(place_id)
    if not match:
        return place
    osm_type, osm_id = match.groups()
    try:
        elements = _overpass(f"[out:json][timeout:25];{osm_type}({osm_id});out center tags;")
    except (httpx.HTTPError, ValueError) as err:
        if place is not None:
            return place
        raise PlacesUnavailable(str(err)) from err
    # Only accept the element we asked for (same type AND same id).
    el = next((e for e in elements if e.get("type") == osm_type and str(e.get("id")) == osm_id), None)
    if el is None:
        return None
    found = to_place(el)
    if found is None:
        # Found by its id, but in a category we do not list (a pharmacy…): keep it anyway.
        tags = el.get("tags") or {}
        lat, lon = _position(el)
        if lat is None or lon is None:
            return None
        category = tags.get("amenity") or tags.get("shop") or tags.get("leisure") or tags.get("tourism") or "place"
        name = (tags.get("name") or "").strip() or f"OSM {osm_type} {osm_id}"
        found = OsmPlace(place_id, name[:200], category[:30], lat, lon, _address(tags), tags)
    save_places(db, [found])
    db.commit()
    return db.get(Place, place_id)
