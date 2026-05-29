from __future__ import annotations

from typing import Any

MARKETS: dict[str, dict[str, Any]] = {
    "mx": {
        "key": "mx",
        "country": "Mexico",
        "locale": "es",
        "site_name": "Employed MX",
        "tagline": "Local jobs. Local hiring.",
        "featured_job": {"amount": 99900, "currency": "mxn", "label": "MX$999"},
        "payment_providers": ["stripe"],
    },
    "mz": {
        "key": "mz",
        "country": "Mozambique",
        "locale": "pt",
        "site_name": "Employed MZ",
        "tagline": "Local jobs. Local hiring.",
        "featured_job": {"amount": 250000, "currency": "mzn", "label": "MZN 2,500"},
        "payment_providers": ["mpesa", "emola", "stripe"],
    },
}

DEFAULT_MARKET_KEY = "mz"


def market_from_key(key: str | None) -> dict[str, Any]:
    if not key:
        return MARKETS[DEFAULT_MARKET_KEY]
    return MARKETS.get(str(key).lower(), MARKETS[DEFAULT_MARKET_KEY])


def market_key_from_host(host: str | None) -> str:
    clean_host = (host or "").lower().split(":", 1)[0]
    first_label = clean_host.split(".", 1)[0]
    return first_label if first_label in MARKETS else DEFAULT_MARKET_KEY


def market_from_host(host: str | None) -> dict[str, Any]:
    return market_from_key(market_key_from_host(host))
