# Tests

Server-side Mocha tests and Playwright E2E smoke tests for Employed.

## Running

`meteortesting:mocha` is already enabled in `.meteor/packages` — no setup needed.

```bash
# Install deps (first time only)
meteor npm install

# Unit + integration tests (Mocha, full-app mode)
meteor npm test

# E2E smoke tests (requires a running app on localhost:3000)
npx playwright test tests/e2e/

# Lint
npm run lint
```

The test command uses `settings-docker.json` so server methods, collections,
and startup code are available to the suite. MongoDB must be reachable on
`MONGO_URL` (Docker Compose provides this automatically).

## Test files

| File | What it covers | Needs Mongo? |
| --- | --- | --- |
| `accounts.tests.js` | Auth flows — registration, login tokens, password reset | Yes |
| `methods.tests.js` | DDP methods — `jobs.create`, `jobs.deleteMine`, `adminSetJobStatus`, email notifications on status change | Yes |
| `publications.tests.js` | Publication data shape and access control | Yes |
| `helpers.tests.js` | Pure-function client helpers (`getUserName`, `getUserEmail`, `marketFromKey`, `marketFromCountry`, `hashIdentifier`) | No |
| `cron.tests.js` | Scheduled job expiration (`deactivateExpiredJobs`) | Yes |
| `payments.tests.js` | Payment provider registry — `register`, `get`, `listForMarket`, `snapshotForMarket`, `isAvailable` | No |
| `stripe-webhook.tests.js` | Stripe webhook signature verification | No |
| `main.js` | Test entry point (imports all `*.tests.js` files) | — |

### E2E

| File | What it covers |
| --- | --- |
| `e2e/smoke.spec.js` | `/healthz` liveness, `/api/jobs` envelope, `/sitemap.xml` presence |

## CI

`.github/workflows/ci.yml` runs `install → lint → meteor npm test` on every push.
E2E tests run as part of the Docker UAT workflow (`deploy-uat.yml`).
