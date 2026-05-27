# API Reference

> FastAPI backend — `https://api.employed.xibodev.com` (UAT)
>
> Interactive docs available at `/docs` (Swagger UI) and `/redoc`.
> All authenticated endpoints require `Authorization: Bearer <access_token>`.

---

## Health

### `GET /health`

Liveness and readiness probe. Used by the deploy pipeline smoke test and UptimeRobot.

| Aspect | Detail |
|--------|--------|
| Auth | None |
| Rate limit | None |

**Response `200`:**

```json
{ "status": "ok", "db": "ok", "redis": "ok" }
```

**Response `503`** (degraded — one or more components failing):

```json
{ "status": "degraded", "db": "error", "redis": "ok" }
```

---

## Public API

### `GET /api/jobs`

Market-scoped active job listings. Market is resolved from the `Host` header subdomain.

| Aspect | Detail |
|--------|--------|
| Auth | None |
| Rate limit | 60 req/min/IP |
| Market scoped | Yes |

**Query parameters:**

| Param | Type | Default | Max | Description |
|-------|------|---------|-----|-------------|
| `page` | int | `1` | — | Page number (1-indexed) |
| `page_size` | int | `20` | `100` | Results per page |
| `query` | string | — | — | Full-text search on title/company |
| `jobtype` | string | — | — | Filter by job type (e.g., `Full Time`) |
| `remote` | bool | — | — | Filter by remote flag |

**Response `200`:**

```json
{
  "items": [
    {
      "id": "string",
      "slug": "string",
      "title": "string",
      "company": "string",
      "country": "string",
      "location": "string",
      "url": "string",
      "job_type": "string",
      "description": "string (sanitised HTML)",
      "status": "active",
      "featured": false,
      "featured_through": null,
      "created_at": "ISO-8601",
      "site_url": "https://employed.xibodev.com/jobs/<id>/<slug>"
    }
  ],
  "total": 42,
  "page": 1,
  "page_size": 20
}
```

Contact fields (`contact`) are stripped from public responses.

### `GET /api/featuredJobs`

Currently featured listings for the current market. Returns up to 3.

| Aspect | Detail |
|--------|--------|
| Auth | None |
| Rate limit | 60 req/min/IP |
| Market scoped | Yes |

Response shape: same as individual `JobRead` objects from `/api/jobs`.

---

## Auth

### `POST /auth/register`

Create a new account.

**Body:** `{ "email": "...", "password": "..." }`

**Response `201`:** `TokenResponse` — access + refresh tokens.

### `POST /auth/login`

Authenticate with email and password.

**Body:** `{ "email": "...", "password": "..." }`

**Response `200`:** `TokenResponse`

**Lockout:** 5 failed attempts within 15 minutes → 15-minute lockout.

### `POST /auth/refresh`

Exchange a refresh token for a new access/refresh pair.

**Body:** `{ "refresh_token": "..." }`

**Response `200`:** `TokenResponse`

### `POST /auth/logout`

Revoke the current refresh token.

**Auth:** Bearer token required.

### `GET /auth/verify-email`

Confirm email address via a token sent to the user's inbox.

**Query param:** `token=<verification_token>`

### `POST /auth/forgot-password`

Request a password-reset email.

**Body:** `{ "email": "..." }`

### `POST /auth/reset-password`

Set a new password using a reset token.

**Body:** `{ "token": "...", "new_password": "..." }`

### `GET /auth/me`

Return the current user's profile.

**Auth:** Bearer token required.

**Response `200`:** `UserRead`

### `GET /auth/token-status`

Check whether the current access token is valid.

**Auth:** Bearer token required.

### `GET /auth/oauth/{provider}/redirect`

Initiate OAuth login. Redirects to the provider's consent page.

Supported providers: `google` (others return `501` until configured).

### `GET /auth/oauth/{provider}/callback`

OAuth callback. Exchanges the authorization code, issues tokens, and redirects to the frontend.

**Redirect URI for Google UAT:**
`https://api.employed.xibodev.com/auth/oauth/google/callback`

---

## Jobs

All job mutation endpoints require a verified email address.

### `GET /jobs`

Authenticated job listing (includes drafts owned by the current user).

**Auth:** Bearer token required.

### `POST /jobs`

Create a new job listing.

**Auth:** Bearer token + verified email required.

**Body:** `JobCreate` schema. `country` is force-set to the current market — client-supplied value is ignored.

**Response `201`:** `JobRead`

### `GET /jobs/{job_id}`

Fetch a single job by ID.

### `PUT /jobs/{job_id}`

Update a job owned by the current user.

**Auth:** Bearer token + owner required.

### `DELETE /jobs/{job_id}`

Delete a job owned by the current user.

### `GET /jobs/count`

Return the count of active listings for the current market.

---

## Payments

### `GET /payments/providers`

List payment providers available for the current market.

### `POST /payments/initiate`

Create a payment intent for featuring a job.

**Auth:** Bearer token + verified email + job owner required.

**Body:** `{ "job_id": "...", "provider_key": "stripe" | "mpesa" | "emola" }`

**Response `200`:** `PaymentInitiateResponse`

For Stripe: includes a `redirect_url` pointing to Stripe Checkout.
For mobile money: includes a `status` of `awaiting_user`.

### `GET /payments/status/{intent_id}`

Fetch the current status of a payment intent.

**Auth:** Bearer token + intent owner required.

### `POST /payments/cancel/{intent_id}`

Cancel a pending payment intent. Idempotent — calling on a terminal intent is a no-op.

---

## Webhook Endpoints

### `POST /_stripe/webhook`

Stripe payment lifecycle events.

| Aspect | Detail |
|--------|--------|
| Auth | `Stripe-Signature` header verified against `STRIPE_WEBHOOK_SECRET` |
| Body | Raw bytes (must not be pre-parsed) |

**Handled events:** `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `charge.refunded`, `charge.dispute.created`

All handling is idempotent via a replay cache.

### `POST /_mpesa/callback`

M-Pesa payment callback (Vodacom Mozambique).

| Aspect | Detail |
|--------|--------|
| Auth | HMAC-SHA256 via `x-mpesa-signature` or `x-callback-signature` header |
| Secret | `MPESA_WEBHOOK_SECRET` |

### `POST /_emola/callback`

e-Mola payment callback (Movitel Mozambique).

| Aspect | Detail |
|--------|--------|
| Auth | HMAC-SHA256 via `x-emola-signature` or `x-callback-signature` header |
| Secret | `EMOLA_WEBHOOK_SECRET` |

---

## Admin

All admin endpoints require the `admin` role.

### `GET /admin/jobs`

List all jobs regardless of status.

### `PUT /admin/jobs/{job_id}/status`

Update a job's status (`pending` → `active` → `filled` / `inactive`).

### `GET /admin/users`

List all users.

### `PUT /admin/users/{user_id}/roles`

Assign or revoke roles on a user.

---

## Profiles

### `GET /profiles/{username}`

Public talent profile.

### `POST /profiles`

Create or update the current user's talent profile.

**Auth:** Bearer token required.

---

## Users

### `GET /users/me`

Current user account data.

### `PUT /users/me`

Update display name, preferences.

### `DELETE /users/me`

Request account deletion (queued, not immediate).
