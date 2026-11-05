"""Current weather from Open-Meteo (free, no key; non-commercial use with credit).

Why the server and not the browser: one cached call every 15 minutes per neighbourhood
instead of one per visitor, and the raw numbers become one simple word the app uses
to suggest outings ("rain" → cinema, "nice" → terrace or beach).
"""

import threading
import time

import httpx

from app.core.config import get_settings
from app.services import http

TTL_SECONDS = 15 * 60
MAX_ENTRIES = 500

_cache: dict[str, tuple[float, dict]] = {}
_lock = threading.Lock()


class WeatherUnavailable(Exception):
    pass


def _is_rain(code: int) -> bool:
    # WMO codes: 51-67 drizzle and rain, 80-82 showers, 95-99 storms.
    return 51 <= code <= 67 or 80 <= code <= 82 or code >= 95


def condition_of(code: int, temp: float, wind: float, rain: float) -> str:
    """Raw numbers → rain | cold | windy | hot | nice | ok. Order matters: a hot rainy day is rainy."""
    if _is_rain(code) or rain >= 0.2:
        return "rain"
    if 71 <= code <= 77:  # snow, it happens in Algeria
        return "cold"
    if wind >= 40:
        return "windy"
    if temp >= 33:
        return "hot"
    if temp <= 8:
        return "cold"
    if code <= 3 and temp >= 16:
        return "nice"
    return "ok"


def get_weather(latitude: float, longitude: float) -> dict:
    # 2 decimals ≈ 1 km: neighbours share one cache entry, and the exact position is never sent.
    lat, lon = f"{latitude:.2f}", f"{longitude:.2f}"
    key = f"{lat},{lon}"
    now = time.monotonic()
    with _lock:
        hit = _cache.get(key)
    if hit and hit[0] > now:
        return {**hit[1], "cached": True}

    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,weather_code,wind_speed_10m,precipitation,is_day",
        "timezone": "auto",
    }
    try:
        with http.client(timeout=5) as c:
            res = c.get(get_settings().open_meteo_url, params=params)
            res.raise_for_status()
            current = res.json()["current"]
    except (httpx.HTTPError, KeyError, ValueError) as err:
        raise WeatherUnavailable(str(err)) from err

    data = {
        "temperature": round(current["temperature_2m"]),
        "wind_kmh": round(current["wind_speed_10m"]),
        "code": current["weather_code"],
        "is_day": current["is_day"] == 1,
        "condition": condition_of(
            current["weather_code"], current["temperature_2m"], current["wind_speed_10m"], current["precipitation"]
        ),
        "time": current["time"],
    }
    with _lock:
        _cache[key] = (now + TTL_SECONDS, data)
        if len(_cache) > MAX_ENTRIES:  # never let the cache grow forever
            _cache.pop(next(iter(_cache)))
    return {**data, "cached": False}


def clear_cache() -> None:
    with _lock:
        _cache.clear()
