"""One place to build HTTP clients for the free outside services (OpenStreetMap, Wikimedia, Open-Meteo).

Tests set `transport` to an httpx.MockTransport: no real network, fast and free.
"""

import httpx

# A clear User-Agent is part of the rules of these free, volunteer-run services.
USER_AGENT = "Cravio/0.1 (student portfolio project)"

transport: httpx.BaseTransport | None = None


def client(timeout: float) -> httpx.Client:
    return httpx.Client(timeout=timeout, headers={"User-Agent": USER_AGENT}, transport=transport)
