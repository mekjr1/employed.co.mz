# Tests

Current test coverage for the FastAPI backend, the Next.js frontend, and Playwright E2E flows.

## Status

Meteor Mocha tests have been removed with the legacy application code. The active test surfaces are now:

- backend `pytest`
- frontend `npm run build`
- frontend `npm run typecheck`
- Playwright E2E under `tests/e2e/`

## Running

```bash
# Root lint
npm run lint

# Backend API tests
cd backend
python -m pytest

# Frontend verification
cd ..\frontend
npm run build
npm run typecheck

# E2E smoke / journeys (requires the app stack to be running)
cd ..
npx playwright test tests/e2e/
```

## Test files

### Backend

The backend pytest suite lives in `backend/tests/` and covers:

- auth
- jobs
- market resolution
- observability / health endpoints
- payments
- profiles
- public API
- users
- webhooks
- admin workflows

### E2E

| File | What it covers |
| --- | --- |
| `tests/e2e/smoke.spec.js` | Cross-stack smoke coverage such as health, public pages, and core browse flows |

## CI

The repository CI now validates the backend and frontend separately, with browser automation reserved for UAT / E2E workflows.
