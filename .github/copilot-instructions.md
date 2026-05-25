# Copilot Instructions — employed.co.mz

## Project

FastAPI + Next.js job board with market selection by subdomain (`mx.*`, `mz.*`).
Frontend is in `frontend/`; backend is in `backend/`.

## Mandatory rules (from portfolio AI-OPS)

1. **No AI authorship trailers** — no `Co-Authored-By: Claude` lines, no
   "Generated with AI" footers in docs or commits.
2. **Never paste credentials** — reference file paths, not values.
3. **Locale codes** — `en`, `pt`, `es` only. Expand together across all products.
4. **Env var naming** — use standard names: `SENTRY_DSN`, `STRIPE_SECRET_KEY`,
   `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_API_URL`.
5. **Secrets posture** — never commit `.env`. See `.env.example` and service env examples.
6. **Port allocation** — frontend defaults to `localhost:3000`, backend to `localhost:8000`, MailHog to `8025` when used.

## Key files

- `CLAUDE.md` — current architecture notes
- `backend/app/main.py` — FastAPI app entrypoint
- `backend/app/config.py` — backend settings
- `backend/app/routers/` — API route modules
- `backend/app/models/` — SQLAlchemy models
- `frontend/src/lib/api.ts` — frontend API base URL handling
- `frontend/src/lib/market.ts` — hostname/subdomain market resolution
- `tests/README.md` — current testing guidance

## Commands

```bash
npm run lint
cd backend && python -m pytest
cd frontend && npm run build
cd frontend && npm run typecheck
npx playwright test tests/e2e/
```
