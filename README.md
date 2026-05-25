# Employed

Employed is a multilingual job board for Mozambique and Mexico, localized by subdomain and rebuilt on a FastAPI + Next.js stack.

Companies can post roles, candidates can browse active opportunities, and admins can moderate listings before they go live.

## Markets

The active market is resolved from the first hostname label:

- `mx.*` serves the MX market
- `mz.*` serves the MZ market

For local browser testing, `mx.lvh.me` and `mz.lvh.me` are still useful because `lvh.me` resolves to `127.0.0.1` without hosts-file changes.

## Languages

The product supports English, Spanish, and Portuguese. Each market has a default locale (MX → `es`, MZ → `pt`), while visitors can override language in the frontend.

## Technology stack

- **Backend:** FastAPI, SQLAlchemy, Alembic, pytest
- **Frontend:** Next.js 15, React 19, TypeScript
- **Payments:** Stripe, M-Pesa, e-Mola
- **Testing:** backend pytest, frontend build/typecheck, Playwright E2E

## Repository layout

```text
/backend    FastAPI API, models, routers, workers, migrations, pytest suite
/frontend   Next.js app router frontend
/deploy     Container and environment-specific compose files
/docs       Product, API, operations, and ADR documentation
/tests      Cross-project test docs and Playwright E2E coverage
```

## Development notes

- Frontend defaults to `http://localhost:3000`
- Frontend talks to the API via `NEXT_PUBLIC_API_URL`, which defaults to `http://localhost:8000`
- Local infra and deployment compose files live under `deploy/`
- The root `docker-compose*.yml` files no longer start the application runtime; they only preserve supporting local services that remain useful during migration cleanup

## Documentation

| Document | Description |
| --- | --- |
| [`CLAUDE.md`](CLAUDE.md) | Current architecture notes for FastAPI + Next.js |
| [`MIGRATION-PLAN.md`](MIGRATION-PLAN.md) | Historical Meteor → FastAPI/Next.js migration plan |
| [`docs/api-reference.md`](docs/api-reference.md) | API documentation |
| [`docs/payment-flows.md`](docs/payment-flows.md) | Stripe, M-Pesa, and e-Mola flows |
| [`docs/markets-and-locales.md`](docs/markets-and-locales.md) | Market and locale behaviour |
| [`docs/decisions/`](docs/decisions/) | Architecture Decision Records |
| [`brand/`](brand/) | Brand kit assets |

## Testing

```bash
npm run lint
cd backend && python -m pytest
cd frontend && npm run build && npm run typecheck
npx playwright test tests/e2e/
```

## History

This project started as a fork of `nate-strauser/wework` and has since been migrated away from Meteor. Historical migration documents are kept in the repo where they still provide context.