# Settings Reference

> Complete reference for `settings-example.json`. All keys, their purpose,
> and whether they're required in production.

## Boot validation

`server/startup-checks.js` runs at startup and **refuses to boot** if:

- Any value still contains its placeholder string (e.g., `"Stripe Secret Key"`)
- `private.ipSalt` is shorter than 16 characters
- reCAPTCHA keys are missing (unless `bypassInDevelopment: true` in dev)
- Stripe keys are missing in production

---

## `public` (sent to client)

| Key | Required | Default | Description |
|-----|----------|---------|-------------|
| `public.uploadcare.publickey` | Optional | — | UploadCare widget key for image uploads. Omit if not using file uploads. |
| `public.Stripe.pubKey` | Prod: Yes | — | Stripe publishable key (`pk_test_...` or `pk_live_...`). Required for featured-job checkout UI. |
| `public.recaptcha.v3SiteKey` | Prod: Yes | — | Google reCAPTCHA v3 site key. Required unless bypass is enabled. |
| `public.recaptcha.bypassInDevelopment` | Optional | `false` | Set `true` in dev to skip reCAPTCHA verification. **Never enable in production.** |
| `public.astronomer.appId` | Optional | — | Astronomer.io analytics app ID. Legacy; can be omitted. |
| `public.sentry.dsn` | Optional | — | Client-side Sentry DSN. If absent, error reporter is a no-op. |
| `public.sentry.environment` | Optional | `"development"` | Sentry environment tag (e.g., `"production"`, `"staging"`). |
| `public.sentry.release` | Optional | `""` | Sentry release tag for source-map association. |
| `public.sentry.tracesSampleRate` | Optional | `0` | Performance tracing sample rate (`0`–`1`). Set `> 0` in production for APM. |
| `public.ads.enabled` | Optional | `false` | Toggle ad surfaces in the UI. |
| `public.ads.mock` | Optional | `true` | Render mock/placeholder ads instead of real ad network tags. |

---

## `kadira` (top-level, legacy)

| Key | Required | Default | Description |
|-----|----------|---------|-------------|
| `kadira.appId` | Optional | — | Kadira/Monti APM app ID. Legacy monitoring; can be omitted. |
| `kadira.appSecret` | Optional | — | Kadira/Monti APM secret. Legacy; can be omitted. |

---

## `Stripe` (top-level, legacy)

| Key | Required | Default | Description |
|-----|----------|---------|-------------|
| `Stripe.secretKey` | See below | — | Legacy location for Stripe secret key. Superseded by `private.stripe.secretKey`. If both are set, `private.stripe.secretKey` takes precedence. |

---

## `private` (server-only)

### Core

| Key | Required | Default | Description |
|-----|----------|---------|-------------|
| `private.adminEmail` | Recommended | — | Email address for admin notifications (new job posted, flagged content). |
| `private.fromEmail` | Recommended | — | Sender address for transactional email (e.g., `"Employed <admin@employed.co.mz>"`). |
| `private.ipSalt` | **Yes** | — | Random string (≥16 chars) used to hash IP addresses for privacy. Boot fails if too short. |

### Stripe

| Key | Required | Default | Description |
|-----|----------|---------|-------------|
| `private.stripe.secretKey` | **Prod: Yes** | — | Stripe secret key (`sk_test_...` or `sk_live_...`). Can also be set via `STRIPE_SECRET_KEY` env var. |
| `private.stripe.webhookSecret` | **Prod: Yes** | — | Stripe webhook signing secret (`whsec_...`). Can also be set via `STRIPE_WEBHOOK_SECRET` env var. |

### M-Pesa (Vodacom Mozambique)

| Key | Required | Default | Description |
|-----|----------|---------|-------------|
| `private.mpesa.simulate` | Optional | `true` | Enable simulator mode. Set `false` + configure real keys for live payments. |
| `private.mpesa.shortcode` | Live: Yes | — | Vodacom M-Pesa business shortcode. |
| `private.mpesa.consumerKey` | Live: Yes | — | M-Pesa REST API consumer key. |
| `private.mpesa.consumerSecret` | Live: Yes | — | M-Pesa REST API consumer secret. |
| `private.mpesa.callbackUrl` | Live: Yes | — | Public URL for M-Pesa webhook callbacks. |
| `private.mpesa.webhookSecret` | Live: Yes | — | HMAC secret for verifying inbound webhooks. |

### e-Mola (Movitel Mozambique)

| Key | Required | Default | Description |
|-----|----------|---------|-------------|
| `private.emola.simulate` | Optional | `true` | Enable simulator mode. |
| `private.emola.partnerId` | Live: Yes | — | Movitel e-Mola partner ID. |
| `private.emola.apiKey` | Live: Yes | — | Movitel e-Mola API key. |
| `private.emola.callbackUrl` | Live: Yes | — | Public URL for e-Mola webhook callbacks. |
| `private.emola.webhookSecret` | Live: Yes | — | HMAC secret for verifying inbound webhooks. |

### reCAPTCHA

| Key | Required | Default | Description |
|-----|----------|---------|-------------|
| `private.recaptcha.v3SecretKey` | **Prod: Yes** | — | Server-side reCAPTCHA v3 secret key. |
| `private.recaptcha.scoreThreshold` | Optional | `0.5` | Minimum score to accept a submission (0.0–1.0). |

### Dev seed data

| Key | Required | Default | Description |
|-----|----------|---------|-------------|
| `private.devSeed.enabled` | Optional | `false` | Generate seed data on boot. **Dev/staging only.** |
| `private.devSeed.reset` | Optional | `false` | Wipe existing data before seeding. **Destructive.** |
| `private.devSeed.admins` | Optional | `2` | Number of admin accounts to create. |
| `private.devSeed.users` | Optional | `100` | Number of regular user accounts to create. |
| `private.devSeed.jobs` | Optional | `400` | Number of job listings to create. |
| `private.devSeed.password` | Optional | `"seedpass123"` | Password for all seed accounts. |

### Sentry (server-side)

| Key | Required | Default | Description |
|-----|----------|---------|-------------|
| `private.sentry.dsn` | Optional | — | Server-side Sentry DSN. If absent, reporter is a no-op. |
| `private.sentry.environment` | Optional | `"development"` | Sentry environment tag. |
| `private.sentry.release` | Optional | `""` | Sentry release tag. |
| `private.sentry.tracesSampleRate` | Optional | `0` | Server-side performance tracing rate. |

---

## Environment variable overrides

These env vars override settings-file values at runtime:

| Env var | Overrides |
|---------|-----------|
| `STRIPE_SECRET_KEY` | `private.stripe.secretKey` |
| `STRIPE_WEBHOOK_SECRET` | `private.stripe.webhookSecret` |
| `SENTRY_DSN` | `private.sentry.dsn` (server) |
| `ROOT_URL` | Meteor core — base URL for OAuth, emails, canonical tags |
| `MONGO_URL` | Meteor core — MongoDB connection string |
| `MONGO_OPLOG_URL` | Meteor core — oplog tailing for reactive performance |
| `MAIL_URL` | Meteor core — SMTP URL for transactional email |
| `PORT` | Meteor core — HTTP port (default 3000) |
