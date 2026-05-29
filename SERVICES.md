# Employed — `SERVICES.md` (proposed replacement)

> Drop-in replacement for `E:\startup projects\employed.co.mz\SERVICES.md`. Conforms to the per-product doc shape locked 2026-05-27 (see `00-DECISIONS-LOCKED.md` §9).

---

# Employed (employed.co.mz)

## What this product is
Multilingual job board for Mozambique and Mexico. Companies post jobs, candidates browse localized listings, and admins moderate listings before they go live.

## Repos
| Surface | Repo | Local folder |
|---------|------|--------------|
| Product monorepo | [`mekjr1/employed.co.mz`](https://github.com/mekjr1/employed.co.mz) | `E:\startup projects\employed.co.mz\employed.co.mz\` |
| Backend API | same repo — `backend/` | `E:\startup projects\employed.co.mz\employed.co.mz\backend\` |
| Frontend | same repo — `frontend/` | `E:\startup projects\employed.co.mz\employed.co.mz\frontend\` |
| Deployment | same repo — `deploy/` + `.github/workflows/` | `E:\startup projects\employed.co.mz\employed.co.mz\deploy\` |

Repo/folder slug `employed.co.mz` is retained. Live infrastructure uses the shorter brand slug `employed` for `/opt/employed/`, GHCR images, and observability resource names.

## Live state — 2026-05-28

| Surface | State |
|---------|-------|
| Backend API | 🟢 **LIVE.** `https://api.employed.xibodev.com/health` returns `200` with DB + Redis OK. FastAPI container on Box 3 via Caddy. |
| Frontend | 🟢 **LIVE.** `https://employed.xibodev.com/` is a self-hosted Next.js container on Box 3. No Vercel project exists for Employed. |
| Market hosts | 🟢 **LIVE.** `mx.employed.xibodev.com` and `mz.employed.xibodev.com` reverse-proxy to the same frontend and select market by hostname. |
| Brand domain `employed.co.mz` | 🔴 **NOT ROUTED.** Public DNS is NXDOMAIN; no Cloudflare zone found. Treat as future/prod-domain workstream until ownership/delegation is resolved. |
| PostgreSQL | 🟢 **LIVE.** `postgres:16-alpine` in the Box 3 compose stack with `postgres_data` volume. |
| Redis | 🟢 **LIVE.** `redis:7-alpine` in the Box 3 compose stack; used for arq queue, sessions, and caching. |
| Worker | 🟠 **FALSE-NEGATIVE UNHEALTHY.** arq jobs run, but the worker inherits the API image HTTP `/health` Docker healthcheck. |
| Email | 🟡 **WORKING VIA APEX.** Resend SMTP uses verified `xibodev.com`; Employed-specific Resend domain is not verified yet. |
| Sentry | 🔴 **PENDING.** No Employed project/DSN found; current deps do not wire Sentry. |
| UptimeRobot | 🔴 **PENDING.** No Employed monitors found. |

---

## Hosting & services

### Backend (Box 3)
| | |
|---|---|
| Host | `ubuntu@109.123.241.71` (Contabo VPS 20, Box 3) |
| Compose dir | `/opt/employed/` |
| Compose file | `deploy/docker-compose.prod.yml` copied to `/opt/employed/docker-compose.yml` |
| Image | `ghcr.io/mekjr1/employed-api:uat` |
| Port | `3301` host → `8000` container |
| Reverse proxy | Caddy → `api.employed.xibodev.com { reverse_proxy localhost:3301 }` |
| Health | `GET /health` → `{ "status": "ok", "db": "ok", "redis": "ok" }` |
| Stack | Python 3.12, FastAPI, SQLAlchemy 2, Alembic, arq |

### Frontend (Box 3)
| | |
|---|---|
| Image | `ghcr.io/mekjr1/employed-frontend:uat` |
| Port | `3300` host → `3000` container |
| Reverse proxy | Caddy → `employed.xibodev.com`, `mx.employed.xibodev.com`, `mz.employed.xibodev.com` all proxy to `localhost:3300` |
| Stack | Next.js 15, React 19, TypeScript 5.7.2, Tailwind CSS 4 |
| Vercel | Not used; remove Employed from Vercel smoke/CNAME plans. |

### Market host behaviour
| Host | Market | Default locale | Notes |
|------|--------|----------------|-------|
| `employed.xibodev.com` | MZ fallback | `pt` | Default UAT frontend. |
| `mz.employed.xibodev.com` | Mozambique | `pt` | M-Pesa, e-Mola, Stripe provider options. |
| `mx.employed.xibodev.com` | Mexico | `es` | Stripe provider option. |

### Data
| Service | State | Where |
|---------|-------|-------|
| PostgreSQL | self-hosted in compose | Box 3 `/opt/employed/`, volume `postgres_data` |
| Redis | self-hosted in compose | Box 3 compose stack; no separate managed Redis |
| MongoDB | not runtime data store | Historical migration utilities only; shared Meteor/Mongo docs are stale |

---

## External APIs

### Email — Resend SMTP
| | |
|---|---|
| Current verified sender | `Employed <noreply@xibodev.com>` |
| Current relay | `smtp.resend.com:465`, SSL, username `resend` |
| Env | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_USE_SSL`, `FROM_EMAIL` |
| Resend reality | `xibodev.com` and `adsbridge.xibodev.com` verified; no Employed domain verified yet |
| Target | Verify `employed.xibodev.com` in Resend, then switch to `noreply@employed.xibodev.com`; defer `employed.co.mz` sender until `.mz` DNS exists |

### OAuth — Google sign-in
| | |
|---|---|
| Providers live | Google only |
| Callback | `https://api.employed.xibodev.com/auth/oauth/google/callback` |
| Env | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Current credential note | Product docs mention GCP project `employed-uat-1779918377033` |
| Target | Move OAuth/reCAPTCHA clients into the shared `xibodev.com` GCP project per portfolio standard |

Facebook, GitHub, and Twitter OAuth env slots exist in examples, but those providers are not configured and UI buttons are removed for now.

### Payments
| Provider | Market | State | Env |
|----------|--------|-------|-----|
| Stripe | MX + MZ | Test keys configured; webhook endpoint exists at `POST /_stripe/webhook` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY` |
| M-Pesa | MZ | Simulator mode unless webhook secret/sandbox credentials are present | `MPESA_WEBHOOK_SECRET` |
| e-Mola | MZ | Simulator mode unless webhook secret/sandbox credentials are present | `EMOLA_WEBHOOK_SECRET` |

### reCAPTCHA v3
| | |
|---|---|
| Purpose | Job submission abuse protection |
| Env | `RECAPTCHA_SECRET_KEY`, `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` |
| Current state | UAT keys present in GitHub secrets; frontend site key is baked at image build time |

---

## Observability

| Channel | Project / config |
|---------|------------------|
| Sentry | org `nmtss`. Target projects: `employed-api` + `employed-frontend`. **Not provisioned/wired yet.** |
| New Relic | app name pattern `employed-api-uat`, `employed-frontend-uat`, optionally `employed-worker-uat`. **Agent not installed yet.** |
| UptimeRobot | target monitors to create: API `https://api.employed.xibodev.com/health`; frontend `https://employed.xibodev.com/`. No monitor IDs yet. |
| Loki / Grafana / Promtail | **NOT USED.** Retired with Box A. |
| Health endpoints | API has `/health`; `/healthz?db=1` and `/metrics` are stale doc references unless implemented later. |

---

## CI/CD

### Backend + frontend UAT deploy
| | |
|---|---|
| Workflow | `.github/workflows/deploy-uat.yml` |
| Trigger | push to `uat` branch, ignoring docs-only paths |
| Build | Docker build/push to `ghcr.io/mekjr1/employed-api:uat` and `ghcr.io/mekjr1/employed-frontend:uat` |
| Deploy | SSH to Box 3 as `ubuntu`; ensure `/opt/employed/`; copy compose; upsert `.env`; `docker compose pull && docker compose up -d --remove-orphans` |
| Smoke | `curl -fsSo /dev/null http://localhost:3301/health` |
| GH secrets | `BOX3_HOST`, `BOX3_SSH_KEY`, `EMPLOYED_UAT_DB_PASSWORD`, `EMPLOYED_UAT_SECRET_KEY`, `EMPLOYED_UAT_IP_SALT`, Stripe, reCAPTCHA, Google, Resend secrets |
| Recent evidence | Latest audited deploy run `26541953900` succeeded on `uat` (2026-05-27). |

### CI
| | |
|---|---|
| Workflow | `.github/workflows/ci.yml` |
| Trigger | push to `main`, all pull requests |
| Jobs | backend Ruff lint/format, backend pytest, frontend ESLint/TypeScript, frontend build |
| Branch gap | GitHub default branch is still `master`; local/deploy branch is `uat`; align `master` → `main` or add `master` to CI until rename. |

### One-time init
| | |
|---|---|
| Workflow | `.github/workflows/init-server.yml` |
| Trigger | manual `workflow_dispatch` |
| Purpose | creates `/opt/employed/`, fixes ownership, creates chmod-600 `.env` |

---

## Env conventions (this product)

| Var | Value | Notes |
|-----|-------|-------|
| `APP_NAME` | `Employed API` | Default in `backend/app/config.py` already matches brand. |
| `DATABASE_URL` | `postgresql://employed:<secret>@postgres:5432/employed` | In-compose Postgres on Box 3. |
| `REDIS_URL` | `redis://redis:6379/0` | In-compose Redis on Box 3. |
| `NEXT_PUBLIC_API_URL` | `https://api.employed.xibodev.com` | Baked into frontend image during deploy. |
| `FROM_EMAIL` | `Employed <noreply@xibodev.com>` now | Switch to `noreply@employed.xibodev.com` after Resend verification. |
| `ADMIN_EMAIL` | `admin@employed.co.mz` | Current deploy value; verify mailbox/domain before relying on it. |
| `SMTP_*` | Resend SMTP relay | UAT uses port `465` + SSL. |
| `GOOGLE_CLIENT_ID/SECRET` | present in GH secrets | Google-only OAuth for now. |
| `RECAPTCHA_*` | present in GH secrets | Frontend site key is build-time. |
| `STRIPE_*` | test keys | Live keys required before real payments. |
| `MPESA_WEBHOOK_SECRET` / `EMOLA_WEBHOOK_SECRET` | absent/pending | Absence means simulator mode. |
| `SENTRY_DSN` / `SENTRY_ENVIRONMENT` | pending | Add after projects/SDKs are provisioned. |
| `NEW_RELIC_APP_NAME` | `employed-api-uat` / `employed-frontend-uat` | Use when NR agent is installed. |

---

## TODO — critical path to make UAT release-gated

1. **Fix worker health status.** Override the inherited API Docker `HEALTHCHECK` for `worker` in production compose: either `healthcheck: { disable: true }` or a Redis/arq-specific liveness check.
2. **Create UptimeRobot monitors** for `https://api.employed.xibodev.com/health` and `https://employed.xibodev.com/`; record monitor IDs here.
3. **Provision and wire Sentry**: create `employed-api` + `employed-frontend` in org `nmtss`, add SDK deps/config, set `SENTRY_DSN` and `SENTRY_ENVIRONMENT=uat`.
4. **Install/configure New Relic** for API/frontend (and worker if supported); use brand/env app names above.
5. **Verify `employed.xibodev.com` in Resend** and switch `FROM_EMAIL` after verification. Until then, keep `noreply@xibodev.com`.
6. **Resolve `.mz` domain ownership/delegation** before adding production-domain DNS or Caddy routes.
7. **Align branch policy**: keep `uat` deploy branch, then rename `master` → `main` or add `master` to CI until the rename is done.
8. **Confirm M-Pesa and e-Mola sandbox credentials** before mobile-money UAT journeys that claim real provider coverage.

## TODO — cleanup (post-restore)

- Replace old shared-doc claims that Employed is Meteor/Mongo/Node 18 or Vercel-hosted; current stack is FastAPI + Next.js + PostgreSQL/Redis on Box 3.
- Update `deploy/.env.example` sender from `Employed <admin@employed.co.mz>` to the safe UAT sender until an Employed-specific domain is verified.
- Update `docs/operations/oncall.md`: UptimeRobot should target `/health`; remove `/healthz?db=1` and `/metrics` unless implemented.
- Update `PITCH.md` references to Box A and already-wired Sentry.
- Update GitHub repo description from the old Meteor job-board wording.
- Move current Google OAuth/reCAPTCHA credentials into the shared `xibodev.com` GCP project when rotating credentials.
- Keep historical Meteor migration docs clearly archived/reference-only.

## TODO — backlog

- Activate `employed.co.mz` as a production/custom domain after registration/delegation is confirmed.
- Add production host plan for `api.employed.co.mz`, `mx.employed.co.mz`, and `mz.employed.co.mz` only after `.mz` DNS is approved.
- Decide later whether to migrate Postgres/Redis from product compose to Box 1 shared services; do not move the live UAT database without a migration window.
- Replace mobile-money simulator mode with real M-Pesa/e-Mola sandbox integrations.
- Consider CDN/edge caching for the self-hosted Next.js frontend once traffic justifies it.

---

## Cross-links

- Locked decisions: `_integrations/_archive/2026-05-27-DECISIONS-LOCKED.md` (this run)
- Box / port allocation: `_integrations/BOXES.md`
- External-service standards: `_integrations/DEPENDENCIES.md`
- Slug ↔ brand ↔ repo map: `_integrations/DISAMBIGUATION.md`
