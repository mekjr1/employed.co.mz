# Copilot Instructions — employed.co.mz

## Project

Meteor 2.7.1 job board. MongoDB, Blaze templates, Iron Router, Bootstrap 5.
Markets selected by subdomain (`mx.*`, `mz.*`).

## Mandatory rules (from portfolio AI-OPS)

1. **No AI authorship trailers** — no `Co-Authored-By: Claude` lines, no
   "Generated with AI" footers in docs or commits.
2. **Never paste credentials** — reference file paths, not values.
3. **Locale codes** — `en`, `pt`, `es` only. Expand together across all products.
4. **Env var naming** — use standard names: `SENTRY_DSN`, `STRIPE_SECRET_KEY`,
   `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`.
5. **Secrets posture** — never commit `.env`. See `.env.example` for documented vars.
6. **Port allocation** — dev runs on `localhost:3000`, Mongo on `27017`, MailHog on `8025`.

## Key files

- `CLAUDE.md` — architecture notes + standards alignment
- `both/lib/constants.js` — markets, pricing, app name
- `both/lib/i18n.js` — translations (`en`, `es`, `pt`)
- `server/lib/log.js` — structured JSON logger
- `server/lib/payments.js` — payment provider registry (Stripe, M-Pesa, e-Mola)
- `server/error-reporter.js` — Sentry server-side
- `server/healthz.js` — liveness/readiness probe
- `server/security-headers.js` — CSP and HTTP security headers
- `settings-example.json` — all Meteor settings documented

## Commands

```bash
meteor npm install
meteor --settings settings-docker.json
meteor npm test
npm run lint
docker compose up --build
```
