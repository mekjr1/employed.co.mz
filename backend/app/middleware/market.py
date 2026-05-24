from __future__ import annotations

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.services.market import market_from_host, market_from_key


class MarketMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request.state.market = market_from_host(request.headers.get("host"))
        response = await call_next(request)
        response.headers.setdefault("X-Market", request.state.market["key"])
        return response


def get_current_market(request: Request) -> dict:
    return getattr(request.state, "market", market_from_key(None))
