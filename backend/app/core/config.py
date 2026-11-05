from functools import lru_cache
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    """All configuration comes from environment variables or the .env file."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: str = "development"
    database_url: str = "sqlite:///./cravio.db"

    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 15
    refresh_token_days: int = 7

    # Comma-separated in .env, e.g. CORS_ORIGINS=http://localhost:5173,https://cravio.app
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:5173"]

    # Cooking assistant (Groq, free tier). Without a key the assistant answers 503; the rest of the app works.
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"
    groq_base_url: str = "https://api.groq.com/openai/v1"

    # Going out (free services, no key): places, photos and weather. Tests point these at fakes.
    overpass_url: str = "https://overpass-api.de/api/interpreter"
    open_meteo_url: str = "https://api.open-meteo.com/v1/forecast"
    commons_api_url: str = "https://commons.wikimedia.org/w/api.php"
    wikidata_api_url: str = "https://www.wikidata.org/w/api.php"
    wikipedia_api_url: str = "https://{lang}.wikipedia.org/w/api.php"
    wikidata_sparql_url: str = "https://query.wikidata.org/sparql"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.is_production and settings.jwt_secret in {"", "change-me"}:
        raise RuntimeError("JWT_SECRET must be set to a long random value in production.")
    return settings
