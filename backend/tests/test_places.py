"""Going out (ported from GoSpot). A fake network stands in for Overpass, Wikimedia and Open-Meteo."""

from datetime import timedelta

import httpx
import pytest
from sqlalchemy import select

from app.core.database import SessionLocal
from app.models import AreaSearch, Place, PlacePhoto, User
from app.models.mixins import utcnow
from app.services import http, osm, photos, weather
from tests.conftest import register

ALGIERS = (36.7538, 3.0588)

ELEMENTS = [
    {"type": "node", "id": 1, "lat": 36.7540, "lon": 3.0590, "tags": {"amenity": "cafe", "name": "Café Le Jardin",
                                                                    "opening_hours": "Mo-Su 07:00-23:00"}},
    {"type": "node", "id": 2, "lat": 36.7600, "lon": 3.0700, "tags": {"amenity": "restaurant", "name": "El Djenina"}},
    {"type": "way", "id": 3, "center": {"lat": 36.7700, "lon": 3.0500}, "tags": {"natural": "beach"}},
    {"type": "node", "id": 4, "lat": 36.7541, "lon": 3.0591, "tags": {"amenity": "cafe"}},  # no name: dropped
    {"type": "node", "id": 5, "lat": 36.7542, "lon": 3.0592, "tags": {"amenity": "pharmacy", "name": "Pharmacie"}},
    {"type": "node", "id": 6, "lat": 37.5, "lon": 3.0, "tags": {"amenity": "cafe", "name": "Too far"}},
]


class FakeNet:
    """Answers like the real services; counts calls so we can check the caches."""

    def __init__(self):
        self.calls: dict[str, int] = {}
        self.down: set[str] = set()
        self.elements = ELEMENTS

    def __call__(self, request: httpx.Request) -> httpx.Response:
        host = request.url.host
        self.calls[host] = self.calls.get(host, 0) + 1
        if host in self.down:
            return httpx.Response(504)
        if host in ("overpass-api.de", "overpass.private.coffee", "overpass.kumi.systems"):
            ql = dict(httpx.QueryParams(request.content.decode()))["data"]
            if "node(1)" in ql:
                return httpx.Response(200, json={"elements": [ELEMENTS[0]]})
            if "node(999)" in ql:
                return httpx.Response(200, json={"elements": []})
            return httpx.Response(200, json={"elements": self.elements})
        if host == "api.open-meteo.com":
            return httpx.Response(200, json={"current": {"temperature_2m": 24.4, "weather_code": 1,
                                                         "wind_speed_10m": 12.2, "precipitation": 0, "is_day": 1,
                                                         "time": "2026-11-05T15:00"}})
        if host == "commons.wikimedia.org":
            return httpx.Response(200, json={"query": {"pages": [{"imageinfo": [{
                "thumburl": "https://upload.wikimedia.org/thumb/sablettes.jpg",
                "url": "https://upload.wikimedia.org/sablettes.jpg",
                "descriptionurl": "https://commons.wikimedia.org/wiki/File:Sablettes.jpg",
                "extmetadata": {"Artist": {"value": '<a href="x">Amina B.</a>'},
                                "LicenseShortName": {"value": "CC BY-SA 4.0"}}}]}]}})
        return httpx.Response(404)


@pytest.fixture(autouse=True)
def net(monkeypatch):
    fake = FakeNet()
    monkeypatch.setattr(http, "transport", httpx.MockTransport(fake))
    weather.clear_cache()
    prefetched: list[list[str]] = []
    monkeypatch.setattr(photos, "prefetch", prefetched.append)  # no background threads in tests
    fake.prefetched = prefetched
    yield fake


def nearby(client, **params):
    return client.get("/api/v1/places/nearby", params={"lat": ALGIERS[0], "lon": ALGIERS[1], **params})


def make_admin(email="amina@example.com"):
    with SessionLocal() as db:
        db.scalar(select(User).where(User.email == email)).role = "admin"
        db.commit()


# --- Pure functions -------------------------------------------------------------


def test_categories_and_cleaning():
    assert osm.category_from_tags({"amenity": "fast_food"}) == "restaurant"
    assert osm.category_from_tags({"historic": "ruins"}) == "attraction"
    assert osm.category_from_tags({"amenity": "pharmacy"}) is None
    beach = osm.to_place(ELEMENTS[2])
    assert beach and beach.id == "osm-way-3" and beach.name == "Plage" and beach.latitude == 36.77
    assert osm.to_place(ELEMENTS[3]) is None  # an unnamed café is not useful


def test_weather_condition():
    assert weather.condition_of(61, 30, 5, 0) == "rain"
    assert weather.condition_of(0, 35, 5, 0) == "hot"
    assert weather.condition_of(1, 22, 45, 0) == "windy"
    assert weather.condition_of(1, 22, 5, 0) == "nice"
    assert weather.condition_of(3, 5, 5, 0) == "cold"


def test_photo_name_helpers():
    assert photos.file_name_from("File:Plage_des_Sablettes.jpg") == "Plage des Sablettes.jpg"
    assert photos.file_name_from("Category:Beaches") is None
    assert photos.name_words("Plage des Sablettes") == ["sablettes"]


# --- Nearby -----------------------------------------------------------------------


def test_nearby_asks_overpass_once_then_reads_the_database(client, net):
    first = nearby(client).json()
    assert first["source"] == "openstreetmap" and not first["stale"]
    names = [p["name"] for p in first["places"]]
    assert names == ["Café Le Jardin", "El Djenina", "Plage"]  # nearest first, useless and far ones dropped
    assert first["places"][0]["distance_m"] < 50
    assert first["places"][0]["tags"]["opening_hours"] == "Mo-Su 07:00-23:00"

    second = nearby(client).json()
    assert second["source"] == "database" and second["total"] == 3
    assert net.calls["overpass-api.de"] == 1


def test_nearby_filters_and_pages(client):
    assert [p["name"] for p in nearby(client, category="beach").json()["places"]] == ["Plage"]
    page = nearby(client, limit=1, offset=1).json()
    assert page["total"] == 3 and [p["name"] for p in page["places"]] == ["El Djenina"]


def test_nearby_never_stores_the_exact_position(client):
    nearby(client)
    with SessionLocal() as db:
        area = db.scalar(select(AreaSearch))
    assert (area.latitude, area.longitude, area.key) == (36.75, 3.06, "36.75,3.06,5000")


def test_overpass_down(client, net):
    net.down.update({"overpass-api.de", "overpass.private.coffee", "overpass.kumi.systems"})
    assert nearby(client).status_code == 503  # every server down and nothing saved yet

    net.down.clear()
    nearby(client)
    with SessionLocal() as db:  # make the area old, then break Overpass again
        db.scalar(select(AreaSearch)).searched_at = utcnow() - timedelta(days=8)
        db.commit()
    net.down.update({"overpass-api.de", "overpass.private.coffee", "overpass.kumi.systems"})
    stale = nearby(client).json()
    assert stale["stale"] is True and stale["total"] == 3  # old places are better than nothing


def test_busy_overpass_falls_back_to_a_mirror(client, net):
    net.down.add("overpass-api.de")  # the main server is full
    res = nearby(client).json()
    assert res["total"] == 3 and net.calls["overpass.private.coffee"] == 1


def test_nearby_validates_input(client):
    assert client.get("/api/v1/places/nearby", params={"lat": 200, "lon": 3}).status_code == 422
    assert nearby(client, radius=50).status_code == 422
    assert nearby(client, category="casino").status_code == 422


def test_photos_are_queued_for_places_that_can_have_one(client, net):
    net.elements = [{**ELEMENTS[0], "tags": {**ELEMENTS[0]["tags"], "wikidata": "Q1"}}]
    nearby(client)
    assert net.prefetched == [["osm-node-1"]]


# --- One place ---------------------------------------------------------------------


def test_place_details_and_unknown_place(client, net):
    nearby(client)
    place = client.get("/api/v1/places/osm-node-1").json()
    assert place["name"] == "Café Le Jardin" and place["rating_count"] == 0 and place["is_favorite"] is False
    assert net.calls["overpass-api.de"] == 1  # read from our database

    assert client.get("/api/v1/places/osm-node-999").status_code == 404
    assert client.get("/api/v1/places/1; DROP TABLE places").status_code == 422


def test_shared_link_to_a_place_never_searched(client, net):
    res = client.get("/api/v1/places/osm-node-1")
    assert res.status_code == 200 and res.json()["category"] == "cafe"


def test_photo_from_wikimedia_is_saved_with_its_credit(client, net):
    with SessionLocal() as db:
        db.add(Place(id="osm-way-3", name="Plage des Sablettes", category="beach", latitude=36.77, longitude=3.05,
                     osm_tags={"wikimedia_commons": "File:Sablettes.jpg"}, osm_synced_at=utcnow()))
        db.commit()
    photo = client.get("/api/v1/places/osm-way-3/photo").json()["photo"]
    assert photo["author"] == "Amina B." and photo["license"] == "CC BY-SA 4.0"
    client.get("/api/v1/places/osm-way-3/photo")
    assert net.calls["commons.wikimedia.org"] == 1  # asked once, then read from place_photos
    with SessionLocal() as db:
        assert db.get(PlacePhoto, "osm-way-3").status == "found"


def test_place_without_photo_hint_remembers_none(client, net):
    nearby(client)
    assert client.get("/api/v1/places/osm-node-1/photo").json() == {"photo": None}
    assert "commons.wikimedia.org" not in net.calls  # a café with no tag: no risky search


# --- Reviews -----------------------------------------------------------------------


def test_reviews(client):
    nearby(client)
    url = "/api/v1/places/osm-node-1/reviews"
    assert client.post(url, json={"rating": 5}).status_code == 401
    register(client)
    assert client.post(url, json={"rating": 6}).status_code == 422
    created = client.post(url, json={"rating": 4, "comment": "  Très calme  "})
    assert created.status_code == 201 and created.json()["comment"] == "Très calme"
    client.post(url, json={"rating": 2, "comment": "Bruyant ce soir"})  # replaces, never two reviews
    data = client.get(url).json()
    assert data["count"] == 1 and data["average"] == 2 and data["reviews"][0]["author"] == "Amina"
    assert data["reviews"][0]["mine"] is True
    assert client.get("/api/v1/places/osm-node-1").json()["rating_average"] == 2

    assert client.delete(url + "/mine").status_code == 204
    assert client.get(url).json()["count"] == 0


# --- Favorites -----------------------------------------------------------------------


def test_place_favorites(client):
    nearby(client)
    assert client.put("/api/v1/places/osm-node-2/favorite").status_code == 401
    register(client)
    assert client.put("/api/v1/places/osm-node-2/favorite").status_code == 204
    client.put("/api/v1/places/osm-node-2/favorite")  # twice is fine
    mine = client.get("/api/v1/me/places").json()
    assert [p["id"] for p in mine] == ["osm-node-2"]
    assert client.get("/api/v1/places/osm-node-2").json()["is_favorite"] is True
    client.delete("/api/v1/places/osm-node-2/favorite")
    assert client.get("/api/v1/me/places").json() == []


# --- Budget info and menu -------------------------------------------------------------


def test_only_an_admin_edits_prices_and_menu(client):
    nearby(client)
    url = "/api/v1/places/osm-node-1"
    info = {"price_min": 200, "price_max": 400, "group_min": 2, "group_max": 6, "good_for": ["friends", "work"]}
    register(client)
    assert client.put(url + "/info", json=info).status_code == 403
    assert client.get(url + "/info").json() == {"info": None, "menu": [], "can_edit": False}

    make_admin()
    assert client.put(url + "/info", json={**info, "price_min": 900}).status_code == 422  # min > max
    saved = client.put(url + "/info", json=info).json()
    assert saved["price_max"] == 400 and saved["good_for"] == ["friends", "work"]
    item = client.post(url + "/menu", json={"name": " Café turc ", "price": 150}).json()
    assert item["name"] == "Café turc"

    page = client.get(url + "/info").json()
    assert page["can_edit"] is True and page["menu"][0]["price"] == 150
    batch = client.get("/api/v1/places/info", params={"ids": "osm-node-1,osm-node-2"}).json()
    assert list(batch) == ["osm-node-1"]

    assert client.delete(f"/api/v1/places/osm-node-2/menu/{item['id']}").status_code == 404  # wrong place
    assert client.delete(f"{url}/menu/{item['id']}").status_code == 204


# --- Weather ----------------------------------------------------------------------------


def test_weather_is_simplified_and_cached(client, net):
    res = client.get("/api/v1/weather", params={"lat": 36.7538, "lon": 3.0588})
    assert res.json()["condition"] == "nice" and res.json()["temperature"] == 24 and res.json()["cached"] is False
    again = client.get("/api/v1/weather", params={"lat": 36.7541, "lon": 3.0592}).json()
    assert again["cached"] is True and net.calls["api.open-meteo.com"] == 1  # same neighbourhood


def test_weather_down(client, net):
    net.down.add("api.open-meteo.com")
    assert client.get("/api/v1/weather", params={"lat": 36.7, "lon": 3.0}).status_code == 503


def test_weather_sends_a_rounded_position(net, monkeypatch):
    seen: list[httpx.URL] = []

    def spy(request):
        seen.append(request.url)
        return net(request)

    monkeypatch.setattr(http, "transport", httpx.MockTransport(spy))
    weather.get_weather(36.753812, 3.058856)
    assert seen[0].params["latitude"] == "36.75" and seen[0].params["longitude"] == "3.06"
