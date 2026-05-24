# API Reference

> Auto-generated from source — May 2026. Keep in sync with `server/api.js`,
> `server/healthz.js`, `server/rss.js`, `server/sitemap.js`, and webhook handlers.

## Public endpoints

### `GET /api/jobs`

Returns active job listings for the current market.

| Aspect | Detail |
|--------|--------|
| Auth | None |
| Rate limit | 60 req/min/IP |
| Market scoped | Yes — resolved from `Host` header subdomain |

**Query parameters:**

| Param | Type | Default | Max | Description |
|-------|------|---------|-----|-------------|
| `limit` | int | 50 | 200 | Results per page |
| `skip` | int | 0 | — | Offset for pagination |

**Response `200`:**

```json
{
  "status": "success",
  "data": [
    {
      "_id": "string",
      "title": "string",
      "company": "string",
      "location": "string",
      "jobType": "string",
      "description": "string (HTML)",
      "country": "string",
      "status": "active",
      "createdAt": "ISO-8601",
      "siteUrl": "https://employed.co.mz/jobs/<_id>/<slug>"
    }
  ]
}
```

**Filtering:** Only `status: "active"` jobs within the expiration window
(`createdAt >= now - 90 days`), sorted newest-first.

**Stripped fields:** `userId`, `userName`, `contact` are removed from each document.

---

### `GET /api/featuredJobs`

Returns currently featured (promoted) job listings for the current market.

Same interface as `/api/jobs` with one additional filter:
`featuredThrough >= now`.

| Aspect | Detail |
|--------|--------|
| Auth | None |
| Rate limit | 60 req/min/IP |
| Query params | Same as `/api/jobs` |
| Response shape | Same as `/api/jobs` |

---

### `GET /healthz`

Liveness and readiness probe for monitoring and container orchestration.

| Aspect | Detail |
|--------|--------|
| Auth | None |
| Rate limit | None |
| Cache | `Cache-Control: no-store` |

**Query parameters:**

| Param | Effect |
|-------|--------|
| `readiness=1` | Include startup-readiness check; returns `503` until boot completes |
| `db=1` | Ping MongoDB; returns `503` on failure |

**Response `200`:**

```json
{ "ok": true, "time": "2026-05-24T12:00:00.000Z" }
```

With `?readiness=1`:
```json
{ "ok": true, "time": "...", "ready": true }
```

With `?db=1`:
```json
{ "ok": true, "time": "...", "db": "ok" }
```

**Error `503`:**

```json
{ "ok": false, "time": "...", "ready": false }
{ "ok": false, "time": "...", "db": "error", "dbError": "reason" }
```

---

### `GET /sitemap.xml`

Standard XML sitemap for SEO crawlers.

| Aspect | Detail |
|--------|--------|
| Auth | None |
| Market scoped | Yes — URLs use the requesting hostname |
| Content | Active, non-expired jobs for the current market |

---

### `GET /feed` (RSS)

RSS 2.0 feed of active job listings.

| Aspect | Detail |
|--------|--------|
| Auth | None |
| Market scoped | Yes |
| Format | RSS 2.0 XML |
| TTL | 1 minute |
| Max items | 200 |

**Item fields:** `title`, `description`, `link`, `guid`, `pubDate`

---

## Authenticated endpoints

### `GET /api/me/export`

GDPR-style personal data export. Returns all user data as a downloadable JSON file.

| Aspect | Detail |
|--------|--------|
| Auth | Login token required |
| Rate limit | 5 req/hour/user |
| Cache | `Cache-Control: no-store` |

**Authentication:**

Preferred: `X-Auth-Token: <loginToken>` header.

Deprecated fallback: `?token=<loginToken>` query param (sends `Deprecation: true`
and `Sunset: Sat, 01 Nov 2026 00:00:00 GMT` headers).

**Response `200`:**

```
Content-Type: application/json
Content-Disposition: attachment; filename="employed-export-<timestamp>.json"
```

**Errors:**

| Status | Body |
|--------|------|
| `401` | `{ "error": "unauthenticated", "message": "Login token required." }` |
| `401` | `{ "error": "unauthenticated", "message": "Invalid or expired token." }` |
| `500` | `{ "error": "export-failed", "message": "Could not produce export." }` |

---

## Webhook endpoints

### `POST /_stripe/webhook`

Receives Stripe webhook events for payment lifecycle updates.

| Aspect | Detail |
|--------|--------|
| Auth | `Stripe-Signature` header verified against webhook secret |
| Content-Type | Raw body (parsed before JSON) |

**Handled events:**

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Settle payment, extend featured listing |
| `checkout.session.async_payment_succeeded` | Same as above |
| `checkout.session.async_payment_failed` | Mark intent failed |
| `charge.refunded` | Remove featured status |
| `charge.dispute.created` | Remove featured status |

**Responses:**

| Status | Meaning |
|--------|---------|
| `200` | Event processed (or skipped as duplicate) |
| `400` | Signature verification failed or body unreadable |
| `405` | Non-POST method |
| `503` | Stripe or webhook secret not configured |

All event handling is **idempotent** — duplicate deliveries are safe.

---

### `POST /webhooks/mpesa`

Receives M-Pesa payment callbacks.

| Aspect | Detail |
|--------|--------|
| Auth | HMAC-SHA256 via `x-mpesa-signature` or `x-callback-signature` header |
| Secret | `settings.private.mpesa.webhookSecret` |
| Verification | `crypto.timingSafeEqual` to prevent timing attacks |

---

### `POST /webhooks/emola`

Receives e-Mola payment callbacks.

| Aspect | Detail |
|--------|--------|
| Auth | HMAC-SHA256 via `x-emola-signature` or `x-callback-signature` header |
| Secret | `settings.private.emola.webhookSecret` |
| Verification | `crypto.timingSafeEqual` to prevent timing attacks |
