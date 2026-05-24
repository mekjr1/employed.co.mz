# Operations Runbook

> Incident response, log triage, and operational procedures for Employed.

## Health checks

### Quick status

```bash
# Liveness
curl -fsS https://employed.co.mz/healthz

# Readiness (includes startup check)
curl -fsS https://employed.co.mz/healthz?readiness=1

# Database connectivity
curl -fsS https://employed.co.mz/healthz?db=1

# Full smoke
curl -fsS https://employed.co.mz/healthz?readiness=1&db=1
```

Expected: `{ "ok": true, "time": "...", "ready": true, "db": "ok" }`

### Automated monitoring

Point UptimeRobot (or equivalent) at `/healthz?db=1` with a 60-second
interval. Alert on any non-200 response.

---

## Log triage

### Log format

All server logs are JSON to stdout via `server/lib/log.js`:

```json
{ "level": "info", "msg": "...", "timestamp": "ISO-8601", ... }
```

### Where to find logs

| Deployment | Location |
|------------|----------|
| Docker | `docker logs <container>` or stdout forwarding to collector |
| Galaxy | Galaxy dashboard → Logs tab |
| Datadog/Logtail/Loki | Search by service name |

### Common log patterns

| Pattern | Meaning | Action |
|---------|---------|--------|
| `"msg":"Startup checks passed"` | App booted successfully | None |
| `"msg":"Startup check failed"` | Missing or invalid settings | Check `settings.json` — see error detail |
| `"msg":"Stripe webhook.*signature"` | Webhook signature mismatch | Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard |
| `"msg":"Rate limit exceeded"` | IP hit rate limit | Monitor for abuse; consider blocklisting |
| `"msg":"deactivateExpiredJobs"` | Cron ran job expiration | Normal — runs daily |
| `"msg":"Account deletion"` | Cron deleted inactive accounts | Normal — **irreversible**, ensure backup exists |

### Error tracking

Errors are reported to **Sentry** (`server/error-reporter.js`).

- Dashboard: Sentry project for Employed
- DSN configured via `settings.private.sentry.dsn` + `settings.public.sentry.dsn`
- If DSN is absent, the reporter is a no-op (safe for dev)

---

## Incident response

### Severity levels

| Level | Definition | Response time |
|-------|-----------|---------------|
| **P1 — Outage** | App is down, `/healthz` failing | Immediate |
| **P2 — Degraded** | Payments failing, jobs not loading, auth broken | < 1 hour |
| **P3 — Minor** | Cosmetic issues, non-critical feature broken | Next business day |

### P1 — App is down

1. **Verify:** `curl https://employed.co.mz/healthz?db=1`
2. **Check hosting:**
   - Docker: `docker ps`, `docker logs <container>`
   - Galaxy: Galaxy dashboard status
3. **Check MongoDB:** `curl https://employed.co.mz/healthz?db=1` — if `db: "error"`,
   check Atlas/Mongo status
4. **Check recent deploys:** Was there a deployment in the last hour? If yes,
   rollback (see below)
5. **Restart:** `docker restart <container>` or Galaxy redeploy

### P2 — Payments failing

1. Check Sentry for payment-related errors
2. Verify Stripe status: https://status.stripe.com
3. Check webhook delivery in Stripe dashboard → Webhooks → Recent events
4. Verify `STRIPE_WEBHOOK_SECRET` hasn't rotated
5. For M-Pesa/e-Mola in simulator mode: check server logs for settlement errors

### P2 — Auth broken

1. Check Sentry for `accounts` errors
2. Verify MongoDB is reachable (`/healthz?db=1`)
3. Check if `Accounts` package versions changed in a recent deploy

---

## Deployment

### Pre-deploy checklist

- [ ] `npm run lint` passes
- [ ] `meteor npm test` passes
- [ ] Backup MongoDB: `mongodump --uri "$MONGO_URL" --archive=backup-$(date +%Y%m%d).gz --gzip`
- [ ] Review `server/migrations.js` for any new destructive migrations
- [ ] Verify `settings-production.json` has no placeholder values

### Deploy

**Docker:**
```bash
docker build -f Dockerfile.prod -t employed:$(date +%Y%m%d) .
docker stop employed-prod
docker run -d --name employed-prod -p 3000:3000 \
  -e ROOT_URL=https://employed.co.mz \
  -e MONGO_URL='...' \
  -e MAIL_URL='...' \
  -e METEOR_SETTINGS="$(cat settings-production.json)" \
  employed:$(date +%Y%m%d)
```

**Galaxy:**
```bash
meteor deploy employed.co.mz --settings settings-production.json
```

### Post-deploy verification

```bash
curl -fsS https://employed.co.mz/healthz?readiness=1&db=1
curl -fsS https://employed.co.mz/api/jobs | head -c 200
curl -fsS https://employed.co.mz/sitemap.xml | head -5
```

Then: sign in, post a test job, verify it appears, deactivate it.

### Rollback

**Docker:** Run the previous image tag:
```bash
docker stop employed-prod
docker run -d --name employed-prod ... employed:<previous-tag>
```

**Galaxy:** Redeploy from the previous commit:
```bash
git checkout <previous-commit>
meteor deploy employed.co.mz --settings settings-production.json
```

**If a destructive migration ran:** Restore the pre-deploy MongoDB backup:
```bash
mongorestore --uri "$MONGO_URL" --archive=backup-YYYYMMDD.gz --gzip --drop
```

---

## Scheduled tasks

The `server/cron.js` module runs these on a timer:

| Task | Schedule | Effect | Reversible? |
|------|----------|--------|-------------|
| `deactivateExpiredJobs` | Daily | Sets jobs older than 90 days to `inactive` | Yes — set status back to `active` |
| Account deletion | Daily | Deletes users marked for deletion + their jobs | **No — irreversible** |

**⚠️ Run a backup before the first deploy that includes account deletion.**

---

## Backup and restore

### Backup

```bash
# Nightly backup (set up as a cron job on a separate host)
mongodump --uri "$MONGO_URL" --archive=backup-$(date +%Y%m%d).gz --gzip
```

### Restore

```bash
mongorestore --uri "$MONGO_URL" --archive=backup-YYYYMMDD.gz --gzip --drop
```

### Verification

After restore, run the smoke tests:
```bash
curl -fsS https://employed.co.mz/healthz?db=1
curl -fsS https://employed.co.mz/api/jobs
```

---

## Escalation

| Issue type | First responder | Escalation |
|------------|----------------|------------|
| App down | On-call engineer | Project owner |
| Payment failure | On-call engineer | Stripe support / provider contact |
| Data loss | On-call engineer → restore backup | Project owner |
| Security incident | Project owner | Legal / compliance |
