# Settings Reference

> Environment variable reference for the FastAPI backend and Next.js frontend.
> All env vars are injected at runtime via `/opt/employed/.env` on Box 3.
> See `deploy/.env.example` for a local development template.

---

## Core

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SECRET_KEY` | **Yes (prod)** | `development-only-secret-key` (dev only) | JWT signing key. Must be a long random string in production. Boot refuses to issue tokens if absent in prod. |
| `ENVIRONMENT` | No | `development` | Affects CORS, debug output, HSTS header, and error responses. Set `production` on Box 3. |
| `DEBUG` | No | `false` | Enables full tracebacks in error responses. Never `true` in production. |
| `IP_SALT` | **Yes** | `change-me` | Salt for IP anonymisation in rate-limit and report tracking. Must be ≥16 chars in production. |
| `LOG_LEVEL` | No | `INFO` | Python logging level (`DEBUG`, `INFO`, `WARNING`, `ERROR`). |

---

## Database

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | **Yes** | `postgresql://postgres:postgres@localhost:5432/employed` | SQLAlchemy DSN. Use `postgresql://` (sync driver auto-upgraded to asyncpg at runtime). |
| `POSTGRES_USER` | Yes (compose) | — | PostgreSQL user — consumed by the `postgres` service in compose. |
| `POSTGRES_PASSWORD` | Yes (compose) | — | PostgreSQL password. |
| `POSTGRES_DB` | Yes (compose) | — | PostgreSQL database name. |
| `REDIS_URL` | No | — | Redis DSN (`redis://redis:6379/0`). Required for arq job queue and session caching. |

---

## Auth / JWT

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_ALGORITHM` | No | `HS256` | HMAC algorithm for JWT signing. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `30` | Access token TTL in minutes. |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | `7` | Refresh token TTL in days. |

---

## Email (Resend SMTP relay)

UAT uses Resend's SMTP relay at `smtp.resend.com:465` with SSL.
Sender is `noreply@xibodev.com` (domain verified in Resend).

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SMTP_HOST` | No | — | SMTP server hostname. If absent, email is silently disabled. UAT: `smtp.resend.com`. |
| `SMTP_PORT` | No | `587` | SMTP port. UAT: `465` (SSL). |
| `SMTP_USERNAME` | No | — | SMTP auth username. Resend uses the literal string `resend`. |
| `SMTP_PASSWORD` | No | — | SMTP auth password. For Resend, this is the API key (`re_...`). |
| `SMTP_USE_SSL` | No | `false` | Use SSL (SMTP_SSL). Set `true` for port 465. |
| `SMTP_USE_TLS` | No | `false` | Use STARTTLS. Set `true` for port 587. Mutually exclusive with SSL. |
| `FROM_EMAIL` | No | — | Sender address displayed in outgoing mail (e.g., `Employed <noreply@xibodev.com>`). Required alongside `SMTP_HOST` for email to send. |
| `ADMIN_EMAIL` | No | `admin@employed.co.mz` | Recipient for admin notifications. |

---

## Payments

### Stripe

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STRIPE_SECRET_KEY` | Prod: Yes | `sk_test_...` | Stripe secret key. Test mode: `sk_test_...`, live: `sk_live_...`. |
| `STRIPE_WEBHOOK_SECRET` | Prod: Yes | `whsec_...` | Stripe webhook signing secret. Each webhook endpoint in the dashboard has its own secret. |
| `STRIPE_PUBLISHABLE_KEY` | No | `pk_test_...` | Stripe publishable key. Baked into frontend at build time via `NEXT_PUBLIC_*`. |

### M-Pesa (Vodacom Mozambique)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MPESA_WEBHOOK_SECRET` | Live: Yes | — | HMAC secret for verifying M-Pesa callback signatures. If absent, callbacks are rejected. |

### e-Mola (Movitel Mozambique)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EMOLA_WEBHOOK_SECRET` | Live: Yes | — | HMAC secret for verifying e-Mola callback signatures. |

---

## OAuth Providers

All OAuth providers are optional. If `GOOGLE_CLIENT_ID` is absent, Google OAuth returns a 501. Other providers follow the same pattern.

| Variable | Provider |
|----------|----------|
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 |
| `FACEBOOK_CLIENT_ID` | Facebook Login |
| `FACEBOOK_CLIENT_SECRET` | Facebook Login |
| `GITHUB_CLIENT_ID` | GitHub OAuth |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth |
| `TWITTER_CLIENT_ID` | Twitter/X OAuth |
| `TWITTER_CLIENT_SECRET` | Twitter/X OAuth |

---

## reCAPTCHA v3

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RECAPTCHA_SECRET_KEY` | No | — | Server-side reCAPTCHA v3 secret. If absent, score verification is skipped and submissions pass without bot protection. |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | No | — | Client-side site key. **Must be baked in at Docker build time** via `--build-arg`. If absent, the frontend skips the reCAPTCHA widget. |

---

## Frontend build args

These are baked into the Next.js Docker image at build time (not runtime). They must be passed as `--build-arg` to `docker build` and declared as `ARG` in the Dockerfile.

| Build arg | Effect |
|-----------|--------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL seen by the browser (e.g., `https://api.employed.xibodev.com`). |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | reCAPTCHA site key used by the reCAPTCHA widget. |

---

## Observability

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SENTRY_DSN` | No | — | Sentry DSN for error reporting. If absent, error reporter is a no-op. |
| `SENTRY_ENVIRONMENT` | No | — | Sentry environment tag (e.g., `uat`, `production`). |
