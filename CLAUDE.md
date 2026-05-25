# Employed - Architecture Notes

## Overview

Employed is a FastAPI + Next.js job board for localized markets. Market context is selected from the request hostname, primarily `mx.*` and `mz.*`.

## Technology Stack

- Backend: FastAPI
- Frontend: Next.js 15 / React 19 / TypeScript
- Data layer: SQLAlchemy + Alembic
- Testing: pytest, Playwright, frontend build + typecheck
- Payments: Stripe, M-Pesa, e-Mola

## Application Structure

```text
/backend         # FastAPI app, models, routers, workers, migrations, pytest suite
/frontend        # Next.js app router frontend
/deploy          # Compose files and deployment assets
/docs            # API, operations, product, ADRs
/tests           # Cross-project test docs and Playwright coverage
/public          # Static assets shared at repo level
```

## Current Product Scope

- Subdomain-localized public job listings
- `mx.*` and `mz.*` hostnames map to separate market contexts
- Job country is derived from the active market during creation
- Admin approval workflow: `pending` -> `active` -> `filled`/`inactive`
- 90-day listing expiration
- Featured job payments via Stripe, M-Pesa, and e-Mola
- reCAPTCHA protection for new job submissions
- Public API and health endpoints
- English / Spanish / Portuguese UI with per-market defaults (`mx → es`, `mz → pt`)

## Commands

```bash
npm run lint
cd backend && python -m pytest
cd frontend && npm run build
cd frontend && npm run typecheck
```

## Local Development Notes

- Frontend default URL: `http://localhost:3000`
- Backend default URL: `http://localhost:8000`
- Frontend API base URL is controlled by `NEXT_PUBLIC_API_URL`
- `mx.lvh.me` and `mz.lvh.me` remain useful for local market testing
- Deployment-oriented compose files live under `deploy/`

## Key Code Areas

- `backend/app/main.py` — FastAPI app entrypoint, middleware, router wiring
- `backend/app/config.py` — environment-driven settings
- `backend/app/routers/` — auth, jobs, payments, admin, profiles, reports, users
- `backend/app/models/` — SQLAlchemy models and enums
- `backend/app/workers/` — background task configuration
- `frontend/src/lib/api.ts` — frontend API client base URL handling
- `frontend/src/lib/market.ts` — hostname/subdomain market resolution
- `frontend/src/components/` — shared UI and page-level components

## Notes

- Historical Meteor migration documents remain in the repo as reference only.
- Root-level `docker-compose*.yml` no longer describe the full application runtime.
- The project was originally imported from `nate-strauser/wework`; the current codebase is now a separate FastAPI + Next.js implementation.

## Env var conventions

Standard env var names are used where applicable: `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_API_URL`. See `.env.example` and service-specific env examples.

## AI Assistant Rules

- No `Co-Authored-By: Claude` trailers, no AI authorship attribution in docs or commits (AI-OPS Rule 6).
- Never paste credentials into chat. Use file paths to reference secrets (AI-OPS Rule 5).
- Locale codes: `en`, `pt`, `es` only (STANDARDS §4).
