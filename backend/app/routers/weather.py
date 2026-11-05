from fastapi import APIRouter, HTTPException, Query, Request, status

from app.core.rate_limit import limiter
from app.schemas.place import WeatherOut
from app.services import weather

router = APIRouter(tags=["weather"])


@router.get("/weather", response_model=WeatherOut)
@limiter.limit("60/minute")
def current_weather(request: Request, lat: float = Query(ge=-90, le=90), lon: float = Query(ge=-180, le=180)) -> dict:
    """Current weather, simplified to one word (rain, cold, windy, hot, nice, ok). Data: Open-Meteo."""
    try:
        return weather.get_weather(lat, lon)
    except weather.WeatherUnavailable:
        # The weather is a nice-to-have: the page keeps working without it.
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="Weather unavailable right now") from None
