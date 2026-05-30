# DEPLOY.md — employed.co.mz

> Generated 2026-05-31 from portfolio deep-inventory probe.
> Source of truth for this repo's deployment. Update when topology changes.

## Identity

| Field | Value |
|---|---|
| Repo | `mekjr1/employed.co.mz` |
| Default branch | `master` |
| Deploy branch | `master` |
| Last UAT tag | _(none)_ |
| Last deploy run | success/Deploy UAT |

## Where deployed

- **Box**: `box3` (109.123.241.71)
- **Host port (loopback)**: `127.0.0.1:3300 (FE) + 3301 (BE)`
- **Public hostname(s)**: employed.xibodev.com / api.employed.xibodev.com (+ mx. and mz. aliases)
- **On-box compose**: `/opt/employed/docker-compose.yml (SCPd from deploy/docker-compose.prod.yml)`

## How deployed

- **CI workflow**: `Deploy UAT` → `.github/workflows/deploy-uat.yml`
- **Image**: ghcr.io/mekjr1/employed-frontend, -api
- **Image origin**: built by this repo CI → GHCR
- **Deploy chain**: this repo's CI uses the reusable `mekjr1/.github/workflows/deploy-compose.yml@main` (for box-deployed services) which SSHes to the box and runs `docker compose pull && docker compose up -d --remove-orphans`.

## Required secrets

See `_integrations/docs/SECRETS-MAP.md` for the canonical secret list per repo. Common ones:

- GH Actions secrets: `BOX1_HOST`/`BOX1_SSH_KEY` (or box2/box3 equivalent), `GHCR_TOKEN` (implicit), product-specific API keys
- For Vercel deploys: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- For AWS Lambda: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

## Required env vars (production)

See `.env.uat.example` in this repo (TODO if missing). Source of truth for the env-var schema.

## Restart procedure

```bash
ssh -i ~/.ssh/contabo_box3 ubuntu@109.123.241.71
cd /opt/employed
docker compose restart
docker compose logs --tail 50
```

## Rollback procedure

Each successful deploy pushes a new GHCR image tagged with the commit SHA. To roll back:

```bash
# On the box:
cd /opt/<slug>/
# edit docker-compose.yml: replace 'image: <name>:latest' with 'image: <name>:<previous-sha>'
docker compose up -d --force-recreate
```

Or use `docker tag` to retag the old image as `:latest` locally and `docker compose up -d`.

## External integrations

See `SERVICES.md` in this repo (or in the workspace meta-repo) for the full list. Common across the portfolio:

- **Email**: Resend (`RESEND_API_KEY`)
- **Observability**: New Relic (`NEW_RELIC_LICENSE_KEY`), Sentry (`SENTRY_DSN` — sparse), UptimeRobot (`UPTIMEROBOT_API_KEY`)
- **Storage**: AWS S3 (sparse) or MinIO on Box 1 (`minio.xibodev.com`)
- **DNS / TLS**: Cloudflare zone `xibodev.com` + Caddy ACME auto-LE

## Drift & notes

Box 3. Deploy workflow SCPs the compose file (so source-repo edits flow through immediately).

## See also

- `_integrations/docs/INVENTORY-2026-05-31.md` — portfolio-wide deep inventory
- `_integrations/docs/PORTS.md` — box × port × service map
- `_integrations/docs/SECRETS-MAP.md` — every secret × repo × purpose
- `_integrations/docs/TOPOLOGY.md` — multi-repo vs monorepo recommendations
- `_integrations/docs/FREE-TIER.md` — per-service free-tier ceilings
