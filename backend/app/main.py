from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.middleware.market import MarketMiddleware
from app.routers import admin, auth, jobs, payments, profiles, public_api, reports, users

TAGS_METADATA = [
    {"name": "auth", "description": "Account, JWT, and OAuth endpoints."},
    {"name": "jobs", "description": "Market-scoped job listing and management endpoints."},
    {"name": "profiles", "description": "Talent profile endpoints."},
    {"name": "payments", "description": "Featured-job payment intent endpoints."},
    {"name": "reports", "description": "Community moderation report endpoints."},
    {"name": "admin", "description": "Admin moderation and user-management endpoints."},
    {"name": "users", "description": "Current-user account management endpoints."},
    {"name": "public-api", "description": "Public JSON endpoints that replace Restivus."},
]


def _settings_value(*names: str, default: Any = None) -> Any:
    for name in names:
        value = getattr(settings, name, None)
        if value not in (None, ""):
            return value
    return default


def _cors_origins() -> list[str]:
    origins = _settings_value("CORS_ORIGINS", "BACKEND_CORS_ORIGINS", default=["*"])
    if isinstance(origins, str):
        return [item.strip() for item in origins.split(",") if item.strip()] or ["*"]
    return list(origins)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=_settings_value("APP_NAME", default="Employed API"),
        version=_settings_value("API_VERSION", default="0.1.0"),
        lifespan=lifespan,
        openapi_tags=TAGS_METADATA,
    )

    app.add_middleware(MarketMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_cors_origins(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router)
    app.include_router(jobs.router)
    app.include_router(profiles.router)
    app.include_router(payments.router)
    app.include_router(reports.router)
    app.include_router(admin.router)
    app.include_router(users.router)
    app.include_router(public_api.router)

    @app.get("/health", include_in_schema=False)
    async def health() -> dict[str, str]:
        return {"status": "ok", "service": "employed-backend"}

    return app


app = create_app()
