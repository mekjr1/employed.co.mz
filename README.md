# Employed

Employed is a Meteor-based job board with subdomain-based localization.

Companies can post roles, candidates can browse active opportunities, and admins can moderate listings before they go live.

## Markets

The active market is resolved from the first hostname label:

- `mx.*` serves the MX market
- `mz.*` serves the MZ market

For local development, use `mx.lvh.me` and `mz.lvh.me`. The `lvh.me` domain resolves to `127.0.0.1`, so no hosts-file changes are needed.

## Languages

The UI is available in English, Spanish, and Portuguese. Each market ships
with a default locale (MX → `es`, MZ → `pt`), but visitors can override
the language from the header dropdown; the choice is persisted in
`localStorage`.

Adding or editing translations is a one-file change: open
`both/lib/i18n.js`, add or update the desired key under the `en`, `es`
and `pt` buckets, and the templates pick it up reactively — no build
step required.

## Settings

This app needs a settings file to run. See `settings-example.json` for the supported values, including Stripe, reCAPTCHA, and admin email settings.

For local development, `settings-example.json` enables the reCAPTCHA development bypass.

## Local Docker

Start the app, MongoDB, and a local mail inbox:

```bash
docker compose up --build
```

Then open:

- MZ app: http://mz.lvh.me:3000
- MX app: http://mx.lvh.me:3000
- Fallback app: http://localhost:3000
- Local email inbox: http://localhost:8025
- Job moderation: http://mz.lvh.me:3000/admin/jobs or http://mx.lvh.me:3000/admin/jobs

`settings-docker.json` seeds two development accounts:

- Admin: `admin@example.test` / `admin12345`
- Regular user: `user@example.test` / `user12345`

Use the regular user to post jobs from each subdomain. New jobs inherit the active market from the subdomain and start as `pending`; use the admin user at `/admin/jobs` to approve, flag, fill, or deactivate them.

## Production Deployment

Two supported targets. Pick one.

### Option A — Docker image (any container host)

Build a self-contained production image (multi-stage build defined in `Dockerfile.prod`):

```bash
docker build -f Dockerfile.prod -t employed:latest .
```

Meteor 2.7.1 builds its server bundle on Node 14 by default, but the runtime
has been bumped to **Node 18 LTS** (A9.11). The Dockerfile and CI are pinned to
Node 18; Galaxy deploys should match.

Run it. **Settings and secrets are passed at runtime; never bake them into the image.**

```bash
docker run --rm -p 3000:3000 \
  -e ROOT_URL=https://employed.co.mz \
  -e MONGO_URL='mongodb+srv://USER:PASS@CLUSTER/employed' \
  -e MAIL_URL='smtps://USER:PASS@smtp.example.com:465' \
  -e METEOR_SETTINGS="$(cat settings-production.json)" \
  employed:latest
```

Required runtime environment variables:

- `ROOT_URL` — fully-qualified base URL with scheme (matters for OAuth callbacks, emails, the canonical/og: tags, and `Meteor.absoluteUrl`)
- `MONGO_URL` — MongoDB 5+ connection string (Atlas or self-hosted; never SQLite/in-memory in prod)
- `MAIL_URL` — SMTP URL for moderator notifications and password-reset mail
- `METEOR_SETTINGS` — JSON string of the merged settings file (see `settings-example.json` for the schema)
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — optional environment
  overrides for `settings.private.stripe.secretKey` and
  `settings.private.stripe.webhookSecret`; useful for local Stripe CLI smoke
  tests where secrets should not be written into `settings-docker.json`

Optional but recommended:

- `MONGO_OPLOG_URL` — Oplog tailing URL for reactive performance (Atlas exposes this; self-hosted requires a replica set)
- `PORT` — defaults to 3000; only change if reverse-proxy demands it

### Option B — Meteor Galaxy

Galaxy is the lowest-effort target because Meteor 2.7.1 deploys to it natively:

```bash
meteor deploy employed.co.mz --settings settings-production.json
```

The `.meteor/galaxy.json` manifest pins the appName and node version. Configure `ROOT_URL`, `MONGO_URL`, `MAIL_URL`, Stripe keys, reCAPTCHA keys, and the Sentry DSN (A9.14) inside the Galaxy app dashboard, not in `galaxy.json`.

### Settings file

Production settings should never be committed. The fields in `settings-example.json` annotated with `SETTINGS_PLACEHOLDERS` are validated at startup by `server/startup-checks.js`; the server refuses to boot if any of them still hold their placeholder value. See A9.1 / A9.5 in `FIXES_PLAN.md`.

### Backup and restore

MongoDB is the only stateful component. The image and Galaxy bundle are stateless.

```bash
# nightly backup (operator cron, ideally on a separate host)
mongodump --uri "$MONGO_URL" --archive=backup-$(date +%Y%m%d).gz --gzip

# restore
mongorestore --uri "$MONGO_URL" --archive=backup-YYYYMMDD.gz --gzip --drop
```

Run a backup **before** the first deploy that includes the A9.3 account-deletion cron, since it permanently removes user documents and the jobs they own.

### Rollback

- **Docker:** keep the previous image tag (e.g. `employed:2025-01-31`); rollback is `docker stop && docker run` with the older tag.
- **Galaxy:** `meteor deploy --owner <account> <site>` from a clean checkout at the previous commit.

In either case, also restore the matching Mongo backup if the failing deploy ran a destructive migration (see `server/migrations.js`).

### Smoke test after deploy

```bash
curl -fsS https://employed.co.mz/healthz   # expects 200 with {"ok":true,...}
curl -fsS https://employed.co.mz/api/jobs  # expects 200 with a JSON envelope
curl -fsS https://employed.co.mz/sitemap.xml
```

Hit the home page in both browser locales (`Accept-Language: pt`, `Accept-Language: es`), sign in once with a known account, and post one test job that you immediately deactivate.

### Log collection (A9.14)

The structured logger (`server/lib/log.js`) emits JSON to stdout. Error tracking is handled by Sentry (`server/error-reporter.js`). The container host or PaaS is responsible for forwarding stdout to a collector. Tested-compatible options:

- **Datadog / Logtail / Loki:** stdout → host agent → backend, no app code change.
- **Self-hosted ELK:** use `filebeat` on the host with the `json.keys_under_root: true` decoder.

The Sentry DSN is read from `settings.private.sentry.dsn` and `settings.public.sentry.dsn`. If absent, the reporter is a no-op so local development is unaffected.

## Testing

The test suite uses `meteortesting:mocha` (already enabled in `.meteor/packages`).

```bash
meteor npm test                          # Mocha unit + integration tests
npx playwright test tests/e2e/           # Playwright E2E smoke tests
npm run lint                             # ESLint
```

Test files:

| File | Scope |
| --- | --- |
| `tests/accounts.tests.js` | Auth flows (login, registration, password reset) |
| `tests/methods.tests.js` | DDP methods (jobs CRUD, admin actions, email notifications) |
| `tests/publications.tests.js` | Pub/sub data shape |
| `tests/helpers.tests.js` | Pure-function client helpers |
| `tests/cron.tests.js` | Scheduled job expiration |
| `tests/payments.tests.js` | Payment provider registry |
| `tests/stripe-webhook.tests.js` | Stripe webhook signature verification |
| `tests/e2e/smoke.spec.js` | Playwright smoke (healthz, jobs API, sitemap) |

## Upstream

This project was originally forked from `nate-strauser/wework`. The codebase has diverged significantly — subdomain markets, Stripe payments, mobile-money providers, BS5 migration, rebrand, and i18n are all post-fork additions.
