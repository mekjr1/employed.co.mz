# Employed - Architecture Notes

## Overview

Employed is a Meteor job board adapted from the original We Work Meteor codebase. Markets are selected by subdomain.

## Technology Stack

- Framework: Meteor 2.7.1
- Runtime: Node.js 18 LTS (A9.11 bumped from 14; CI + Dockerfile.dev pinned)
- Database: MongoDB 5+ (docker-compose pins `mongo:5`; production should match)
- UI: Bootstrap 5 (migrated from BS3), Blaze, Iron Router
- Forms: AutoForm with Collection2 schemas
- Auth: Meteor Accounts with OAuth support

## Application Structure

```text
/both/           # Shared client/server code
  |-- collections/
  |-- lib/
/client/         # Client templates, helpers, and styles
  |-- views/
  |-- lib/
/server/         # Publications, methods, API, RSS, hooks
/public/         # Static assets
/router.js       # Route definitions
```

## Current Product Scope

- Subdomain-localized public job listings
- `mx.*` and `mz.*` hostnames map to separate market contexts
- Job country is derived from the active market during creation
- Admin approval workflow: `pending` -> `active` -> `filled`/`inactive`
- 90-day listing expiration
- Featured job payments via Stripe
- reCAPTCHA v3 protection for new job submissions
- RSS and JSON feeds for active jobs
- English / Spanish / Portuguese UI with per-market defaults (`mx → es`, `mz → pt`) and a visitor-overridable header switcher persisted in `localStorage`
- Per-route SEO meta + `og:` tags via `mdg:seo`, localized to the active locale

## Configuration

The app requires a Meteor settings file. `settings-example.json` documents the expected values:

- Stripe publishable and secret keys
- reCAPTCHA v3 site and secret keys
- Admin notification email
- Sender email
- Optional development reCAPTCHA bypass

## Commands

```bash
meteor npm install
meteor --settings settings-example.json
npm run lint
```

## Docker Development

```bash
docker compose up --build
```

The Docker setup runs the app on `http://localhost:3000`, MongoDB on `localhost:27017`, and MailHog on `http://localhost:8025`.

Use these localized hosts for app testing:

- `http://mx.lvh.me:3000`
- `http://mz.lvh.me:3000`

`settings-docker.json` creates:

- Admin: `admin@example.test` / `admin12345`
- Regular user: `user@example.test` / `user12345`

## Notes

- Profile/developer-directory code still exists but is disabled in routes and navigation.
- Admin moderation is exposed at `/admin/jobs`; the legacy `yogiben:admin` dashboard is not enabled.
- New job creation goes through `server/methods.js` so reCAPTCHA can be verified server-side.
- `both/lib/constants.js` contains app name, market mapping (including per-market default `locale`), country options, job types, and featured-job pricing constants.
- `both/lib/i18n.js` is the in-repo i18n module (no npm dep). Add a key by editing the `Translations` object for `en`, `es` and `pt`; templates consume keys via `{{t 'key' var=value}}` and JS via `t('key', {var: value})`.
- `client/lib/seo.js` registers `mdg:seo` defaults and exposes a global `applySeo(routeKey, vars)` used by `Router.onAfterAction` hooks in `router.js` to publish per-route titles and `og:` tags.
- The project was originally imported from `nate-strauser/wework`; `upstream` points to that repository.

## Portfolio Standards Alignment

This project follows the 10-point standardisation programme defined in `_integrations/STANDARDS.md`.

| Standard | Status | Notes |
|---|---|---|
| S-01 Email (Resend) | ⏳ future | Currently Meteor SMTP/MailHog; Resend migration planned |
| S-02 Structured logging | ✅ | `server/lib/log.js` outputs JSON to stdout |
| S-03 Sentry | ✅ | Client + server SDKs wired; supports `SENTRY_DSN` env var |
| S-04 File storage | N/A | No file uploads in current scope |
| S-05 Database (MongoDB) | ✅ | Accepted divergence |
| S-06 Auth (JWT) | ⏳ deferred | Uses Meteor Accounts; JWT migration is a major rewrite |
| S-07 CI/CD | ✅ | `ci.yml` (lint+test) + `deploy-uat.yml` (push-to-deploy) |
| S-08 UptimeRobot | ✅ | `/healthz` endpoint with liveness + readiness |
| S-09 Background jobs | N/A | No async job processing needed |
| S-10 LLM | N/A | No AI features |

### Env var conventions

Standard env var names are used where applicable: `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. See `.env.example`.

## AI Assistant Rules

- No `Co-Authored-By: Claude` trailers, no AI authorship attribution in docs or commits (AI-OPS Rule 6).
- Never paste credentials into chat. Use file paths to reference secrets (AI-OPS Rule 5).
- Locale codes: `en`, `pt`, `es` only (STANDARDS §4).
