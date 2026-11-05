"""Real photos from Wikimedia Commons (free, no key), ported from GoSpot.

How we find the photo of a place, from its OpenStreetMap tags:
  1. wikimedia_commons = "File:…" or image = a Commons link → that file
  2. wikidata = "Q123" → Wikidata's photo of that item (property P18)
  3. wikipedia = "fr:…" → the main image of the article
When the place has none of these (most places in Algeria), and only for monuments, beaches,
parks, museums and activities (for a café the risk of a wrong photo is too high):
  4. a Wikidata item less than 300 m away, with a photo AND a matching name
  5. a Commons photo taken less than 150 m away whose title shares a word of the name
Then Commons gives an 800 px version, the author and the license.

Rules: every photo is shown with its author and license (CC BY / BY-SA require it), and we ask
only once per place: the answer, even "no photo", is saved in place_photos.
"""

import re
import threading
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from urllib.parse import unquote

import httpx
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.models import Place, PlacePhoto
from app.models.mixins import utcnow
from app.services import http
from app.services.osm import _aware

SEARCH_VERSION = "v2"  # a "none" saved by an older search is checked again
RETRY_NONE_DAYS = 30  # someone may upload a photo one day
NEARBY_CATEGORIES = ("attraction", "beach", "park", "activity", "cinema")

# Words that say WHAT the place is, not WHICH one: they cannot prove a photo shows THIS place.
STOP_WORDS = set(
    (
        "plage beach parc park jardin garden square place placette rue avenue boulevard "
        "musee museum monument memorial statue mosquee mosque masjid eglise church cathedrale basilique "
        "centre center complexe cinema salle stade fort palais palace tour tower port "
        "de du des la le les l d el al et and the of a au aux en sur sidi lalla ben bni"
    ).split()
)


class PhotoError(Exception):
    pass


def _get(url: str, params: dict) -> dict:
    try:
        with http.client(timeout=8) as c:
            res = c.get(url, params={"format": "json", "formatversion": "2", **params})
            res.raise_for_status()
            return res.json()
    except (httpx.HTTPError, ValueError) as err:
        raise PhotoError(str(err)) from err


def file_name_from(value: object) -> str | None:
    """"File:Plage.jpg", "Plage.jpg" or a Commons URL → "Plage.jpg", only for real image files."""
    if not value:
        return None
    v = str(value).strip()
    m = (
        re.search(r"commons\.wikimedia\.org/wiki/(?:File|Fichier|Special:FilePath):(.+)$", v, re.I)
        or re.search(r"Special:FilePath/(.+)$", v, re.I)
        or re.search(r"upload\.wikimedia\.org/.+/([^/]+\.\w{3,4})$", v, re.I)
    )
    name = unquote(m.group(1)) if m else re.sub(r"^(File|Fichier|Image):", "", v, flags=re.I)
    return name.replace("_", " ") if re.search(r"\.(jpe?g|png|webp|tiff?)$", name, re.I) else None


def name_words(text: object) -> list[str]:
    """"Plage des Sablettes" → ["sablettes"]. Accents and Arabic short vowels are removed."""
    s = unicodedata.normalize("NFD", str(text or "").lower())
    s = re.sub(r"[̀-ًͯ-ٰٟ]", "", s)
    s = re.sub(r"\.\w{3,4}$", "", s)
    return [w for w in re.split(r"[^a-z0-9؀-ۿ]+", s) if len(w) >= 4 and w not in STOP_WORDS]


def _score(words: list[str], candidate: object) -> int:
    found = set(name_words(candidate))
    return sum(1 for w in words if w in found)


def has_photo_hint(tags: dict[str, str]) -> bool:
    return any(tags.get(k) for k in ("wikimedia_commons", "image", "wikidata", "wikipedia"))


def can_search_nearby(place: Place) -> bool:
    return place.category in NEARBY_CATEGORIES and bool(name_words(place.name))


def _from_tags(tags: dict[str, str]) -> tuple[str, str] | None:
    s = get_settings()
    direct = file_name_from(tags.get("wikimedia_commons")) or file_name_from(tags.get("image"))
    if direct:
        return direct, "wikimedia_commons" if tags.get("wikimedia_commons") else "image"
    if re.fullmatch(r"Q\d+", tags.get("wikidata", "")):
        data = _get(s.wikidata_api_url, {"action": "wbgetclaims", "entity": tags["wikidata"], "property": "P18"})
        claim = (data.get("claims", {}).get("P18") or [{}])[0]
        file = file_name_from(claim.get("mainsnak", {}).get("datavalue", {}).get("value"))
        if file:
            return file, "wikidata"
    wiki = re.fullmatch(r"([a-z-]{2,12}):(.+)", tags.get("wikipedia", ""))
    if wiki:
        url = s.wikipedia_api_url.replace("{lang}", wiki.group(1))
        data = _get(url, {"action": "query", "prop": "pageimages", "piprop": "name", "titles": wiki.group(2)})
        pages = data.get("query", {}).get("pages") or [{}]
        file = file_name_from(pages[0].get("pageimage"))
        if file:
            return file, "wikipedia"
    return None


def _wikidata_nearby(place: Place, words: list[str]) -> tuple[str, str] | None:
    sparql = f"""SELECT ?label ?image ?dist WHERE {{
      SERVICE wikibase:around {{
        ?item wdt:P625 ?loc .
        bd:serviceParam wikibase:center "Point({place.longitude} {place.latitude})"^^geo:wktLiteral .
        bd:serviceParam wikibase:radius "0.3" .
        bd:serviceParam wikibase:distance ?dist .
      }}
      ?item wdt:P18 ?image .
      ?item rdfs:label ?label . FILTER(LANG(?label) IN ("fr", "en", "ar"))
    }} ORDER BY ?dist LIMIT 40"""
    data = _get(get_settings().wikidata_sparql_url, {"query": sparql})
    best: tuple[int, str] | None = None
    for b in data.get("results", {}).get("bindings", []):
        score = _score(words, b.get("label", {}).get("value"))
        file = file_name_from(b.get("image", {}).get("value"))
        if score and file and (best is None or score > best[0]):  # sorted by distance: first best wins
            best = (score, file)
    return (best[1], "wikidata-nearby") if best else None


def _commons_nearby(place: Place, words: list[str]) -> tuple[str, str] | None:
    data = _get(
        get_settings().commons_api_url,
        {"action": "query", "list": "geosearch", "gscoord": f"{place.latitude}|{place.longitude}",
         "gsradius": "150", "gsnamespace": "6", "gslimit": "30"},
    )
    best: tuple[int, str] | None = None
    for r in data.get("query", {}).get("geosearch", []):
        file = file_name_from(r.get("title"))
        score = _score(words, file) if file else 0
        if score and (best is None or score > best[0]):
            best = (score, file)
    return (best[1], "commons-nearby") if best else None


def _plain(html: object) -> str | None:
    """The author often comes as HTML (<a href="…">Name</a>): keep the text only."""
    text = re.sub(r"\s+", " ", re.sub(r"<[^>]*>", "", str(html or ""))).strip()
    return text[:200] or None


def _commons_info(file: str) -> dict | None:
    data = _get(
        get_settings().commons_api_url,
        {"action": "query", "titles": f"File:{file}", "prop": "imageinfo", "iiprop": "url|extmetadata",
         "iiurlwidth": "800", "iiextmetadatafilter": "Artist|LicenseShortName"},
    )
    pages = data.get("query", {}).get("pages") or [{}]
    info = (pages[0].get("imageinfo") or [{}])[0]
    if not info.get("thumburl"):
        return None  # deleted, or not an image
    meta = info.get("extmetadata", {})
    return {
        "thumb_url": info["thumburl"][:1000],
        "image_url": (info.get("url") or "")[:1000] or None,
        "page_url": (info.get("descriptionurl") or "")[:1000] or None,
        "author": _plain(meta.get("Artist", {}).get("value")),
        "license": (_plain(meta.get("LicenseShortName", {}).get("value")) or "")[:100] or None,
    }


def _needs_lookup(row: PlacePhoto | None) -> bool:
    if row is None:
        return True
    if row.status == "found":
        return False
    too_old = _aware(row.fetched_at) < utcnow() - timedelta(days=RETRY_NONE_DAYS)
    return too_old or row.source != SEARCH_VERSION


def get_photo(db: Session, place: Place) -> PlacePhoto | None:
    """The photo of one place, from our database or looked up once and saved. Network errors raise."""
    row = db.get(PlacePhoto, place.id)
    if not _needs_lookup(row):
        return row if row and row.status == "found" else None

    tags = place.osm_tags or {}
    found = _from_tags(tags) if has_photo_hint(tags) else None
    if found is None and can_search_nearby(place):
        words = name_words(place.name)
        found = _wikidata_nearby(place, words) or _commons_nearby(place, words)
    info = _commons_info(found[0]) if found else None

    row = row or PlacePhoto(place_id=place.id)
    row.status = "found" if info else "none"
    row.source = found[1] if info and found else SEARCH_VERSION
    for k in ("thumb_url", "image_url", "page_url", "author", "license"):
        setattr(row, k, (info or {}).get(k))
    row.fetched_at = utcnow()
    db.add(row)
    db.commit()
    return row if info else None


# ---------------------------------------------------------------------------
# After a search: look for photos in the background, so the next visitors see them.
# At most 3 requests at a time and 40 places per search: we stay polite with Wikimedia.
# ---------------------------------------------------------------------------
_pool = ThreadPoolExecutor(max_workers=3, thread_name_prefix="photos")
_queued: set[str] = set()
_queued_lock = threading.Lock()


def needs_prefetch(place: Place, photo: PlacePhoto | None) -> bool:
    return _needs_lookup(photo) and (has_photo_hint(place.osm_tags or {}) or can_search_nearby(place))


def _fetch_one(place_id: str) -> None:
    try:
        with SessionLocal() as db:
            place = db.get(Place, place_id)
            if place is not None:
                get_photo(db, place)
    except PhotoError:
        pass  # a photo is a nice-to-have: we try again on a later visit
    finally:
        with _queued_lock:
            _queued.discard(place_id)


def prefetch(place_ids: list[str]) -> None:
    with _queued_lock:
        todo = [pid for pid in place_ids if pid not in _queued][:40]
        _queued.update(todo)
    for pid in todo:
        _pool.submit(_fetch_one, pid)
