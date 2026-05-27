# Operations Runbook

> Incident response, log triage, and operational procedures for Employed.
> Stack: FastAPI + Next.js 15 · PostgreSQL 16 · Redis 7 · Docker Compose · Box 3 (`109.123.241.71`)

---

## Health checks

### Quick status

```bash
# Backend (FastAPI)
curl -fsS https://api.employed.xibodev.com/health

# Frontend (Next.js)
curl -fsS https://employed.xibodev.com/api/health
```

**Backend healthy response:**
```json
{ "status": "ok", "db": "ok", "redis": "ok" }
```

**Frontend healthy response:**
```json
{ "status": "ok", "service": "employed-frontend" }
```

### On Box 3 (SSH)

```bash
ssh ubuntu@109.123.241.71
cd /opt/employed
docker compose ps               # all services running?
docker compose logs --tail=50 backend
docker compose logs --tail=50 frontend
```

---

## Log triage

### Where to find logs

All services write to stdout; `docker compose logs` aggregates them.

```bash
# Follow backend logs in real time
docker compose logs -f backend

# Last 100 lines from a service
docker compose logs --tail=100 worker

# All services since 30 minutes ago
docker compose logs --since=30m
```

### Common log patterns

| Pattern | Meaning | Action |
|---------|---------|--------|
| `"status":"ok","db":"ok"` | Backend booted, DB connected | None |
| `"db":"error"` in `/health` response | PostgreSQL unreachable | `docker compose logs postgres` |
| `"redis":"error"` in `/health` response | Redis unreachable | `docker compose logs redis` |
| `"Stripe webhook.*signature"` | Webhook signature mismatch | Check `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard |
| `alembic.runtime.migration` | Migration running on startup | Normal — `migrate` service runs once |
| `OSError: [Errno 111] Connection refused` | Service dependency not ready | Usually transient; check health on the failing dependency |

---

## Incident response

### Severity levels

| Level | Definition | Response time |
|-------|-----------|---------------|
| **P1 — Outage** | App is down, `/health` failing | Immediate |
| **P2 — Degraded** | Payments failing, auth broken, DB errors | < 1 hour |
| **P3 — Minor** | Cosmetic issues, non-critical feature broken | Next business day |

### P1 — App is down

1. **Verify:** `curl https://api.employed.xibodev.com/health`
2. **SSH to Box 3:** `ssh ubuntu@109.123.241.71`
3. **Check containers:** `cd /opt/employed && docker compose ps`
4. **Check logs:** `docker compose logs --tail=100 backend`
5. **Restart backend:** `docker compose restart backend`
6. **If postgres is down:** `docker compose restart postgres` then wait for healthcheck to pass before restarting backend
7. **Check recent deploy:** Was there a push to `uat` in the last hour? If yes, roll back (see below).

### P2 — Payments failing

1. Check Stripe status: https://status.stripe.com
2. Inspect webhook delivery in Stripe dashboard → Webhooks → Recent events
3. Verify `STRIPE_WEBHOOK_SECRET` in `/opt/employed/.env` matches the dashboard
4. `docker compose logs --tail=50 backend | grep -i stripe`

### P2 — Database unreachable

```bash
docker compose logs postgres
docker compose exec postgres pg_isready -U employed -d employed
# if postgres is running but backend can't connect, check DATABASE_URL in .env
cat /opt/employed/.env | grep DATABASE_URL
```

---

## Deployment

### Standard deploy

Push to the `uat` branch — GitHub Actions builds and deploys automatically.

```bash
git push origin uat
```

Pipeline stages (parallel builds, then sequential deploy):
1. **build-backend** — pushes `ghcr.io/mekjr1/employed-api:uat`
2. **build-frontend** — pushes `ghcr.io/mekjr1/employed-frontend:uat`
3. **deploy** — SCPs compose file, upserts `.env`, `docker compose pull && up -d`, smoke tests `/health`

Monitor at: `gh run list --repo mekjr1/employed.co.mz`

### Rollback

The previous image is still in GHCR. To rollback:

```bash
ssh ubuntu@109.123.241.71
cd /opt/employed

# Pull the previous image tag (or use a specific digest)
docker compose pull

# Or: temporarily pin the image digest in docker-compose.yml
# image: ghcr.io/mekjr1/employed-api@sha256:<previous-digest>
docker compose up -d
```

For a code rollback, revert the `uat` branch and push:

```bash
git revert HEAD && git push origin uat
```

### Manual deploy (emergency, no CI)

```bash
ssh ubuntu@109.123.241.71
cd /opt/employed
docker compose pull
docker compose up -d --remove-orphans
```

---

## Scheduled tasks

The arq `worker` service runs these background tasks:

| Task | Schedule | Effect | Reversible? |
|------|----------|--------|-------------|
| `deactivate_expired_jobs` | Daily | Sets jobs older than 90 days to `inactive` | Yes — update status back to `active` |
| Account deletion | Daily | Deletes users with pending deletion requests + their jobs | **No — irreversible** |

Run a backup before any deploy that includes changes to these tasks.

---

## Secrets management

Secrets live in `/opt/employed/.env` (chmod 600). They are written by the deploy workflow from GitHub Actions secrets and never committed to the repo.

To inspect a secret on Box 3 (without revealing the value):

```bash
ssh ubuntu@109.123.241.71
grep "^STRIPE_SECRET_KEY=" /opt/employed/.env | cut -c1-30
```

To rotate a secret:
1. Update the GitHub Actions secret (`gh secret set EMPLOYED_UAT_<NAME>`)
2. Push a no-op commit to `uat` to trigger a redeploy
3. The deploy upserts the new value into `.env` automatically

---

## Scaling / resource notes

- Backend: FastAPI with uvicorn workers. For higher load, increase `--workers` in the backend `command` in `docker-compose.prod.yml`.
- Redis: used for arq job queue + session caching. No persistence needed (in-memory only).
- PostgreSQL: data stored in a named Docker volume `postgres_data`. Back up regularly.

---

## Escalation

| Issue type | First responder | Escalation |
|------------|----------------|------------|
| App down | On-call engineer | Project owner |
| Payment failure | On-call engineer | Stripe support / provider contact |
| Data loss | On-call engineer → restore backup | Project owner |
| Security incident | Project owner | Legal / compliance |
