# Payment Flows

> How featured-job payments work across all three providers.

## Overview

Employers can promote a job listing to "featured" status by paying a
market-specific fee. The payment system supports three providers, selected
per market:

| Market | Providers | Currency | Amount | Label |
|--------|-----------|----------|--------|-------|
| MZ (Mozambique) | M-Pesa, e-Mola, Stripe | MZN | 2,500.00 | MZN 2,500 |
| MX (Mexico) | Stripe | MXN | 999.00 | MX$999 |

Featured status lasts **30 days** from payment settlement. If a job is
already featured, the new period extends from the existing expiry date
(not from now).

---

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Client     │────▶│  Meteor Method   │────▶│  Payment        │
│  (checkout)  │     │  featuredJob.*   │     │  Registry       │
└─────────────┘     └──────────────────┘     │  (payments.js)  │
                                              └────────┬────────┘
                              ┌─────────────────┬──────┴──────┬─────────────────┐
                              ▼                 ▼             ▼                 ▼
                        ┌──────────┐     ┌──────────┐   ┌──────────┐
                        │  Stripe  │     │  M-Pesa  │   │  e-Mola  │
                        │ adapter  │     │ adapter  │   │ adapter  │
                        └────┬─────┘     └────┬─────┘   └────┬─────┘
                             │                │              │
                             ▼                ▼              ▼
                        ┌──────────┐     ┌──────────────────────┐
                        │  Stripe  │     │  Simulator or live   │
                        │  API     │     │  webhook callback    │
                        └────┬─────┘     └──────────┬───────────┘
                             │                      │
                             ▼                      ▼
                        ┌───────────────────────────────┐
                        │   payments-settle.js          │
                        │   Extends featuredThrough     │
                        │   Updates PaymentIntent       │
                        └───────────────────────────────┘
```

## Provider Registry

`server/lib/payments.js` provides a registration-based provider system:

| Method | Purpose |
|--------|---------|
| `Payments.register(provider)` | Register a provider with `key`, `name`, `markets`, `initiate()`, `status()` |
| `Payments.get(key)` | Retrieve provider by key (throws `payment-provider-unknown`) |
| `Payments.listForMarket(marketKey)` | All providers for a market |
| `Payments.snapshotForMarket(marketKey)` | Client-safe list: `{ key, name, simulator, ui }` |
| `Payments.isAvailable(providerKey, marketKey)` | Boolean availability check |

---

## Payment lifecycle

### States

The `PaymentIntents` collection tracks every payment attempt:

| Status | Meaning |
|--------|---------|
| `pending` | Intent created, provider not yet contacted |
| `awaiting_user` | Mobile-money: waiting for user to confirm on phone |
| `completed` | Payment settled, featured extension applied |
| `failed` | Payment rejected or timed out |
| `cancelled` | User cancelled before completion |
| `expired` | TTL expired without settlement |

Helpers: `intent.isTerminal()`, `intent.isPending()`

### Key fields

| Field | Description |
|-------|-------------|
| `jobId` | The job being featured |
| `providerKey` | `"stripe"`, `"mpesa"`, or `"emola"` |
| `providerRef` | Provider-specific reference (Stripe session ID, transaction ref) |
| `amount` / `currency` | Charged amount in smallest unit |
| `payerMsisdn` | Last 4 digits only (mobile money) |
| `payerMsisdnHash` | Full MSISDN hashed for lookup |
| `extendedThrough` | Resulting `featuredThrough` date |
| `simulator` | `true` if settled via simulator |
| `meta` | Provider-specific metadata (e.g., `stripeUrl`) |

---

## Provider: Stripe

**Markets:** MX, MZ

**Flow:**
1. Client calls `featuredJob.initiate` with `providerKey: "stripe"`
2. Server creates a Stripe Checkout Session via `stripe.checkout.sessions.create()`
3. `PaymentIntent` inserted with `status: "pending"`, `providerRef: session.id`
4. Client receives `{ kind: "redirect", url: session.url }` and redirects to Stripe
5. After payment, Stripe sends webhook to `POST /_stripe/webhook`
6. Handler verifies signature, processes event, calls settlement

**Webhook events handled:**

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Settle → extend featured |
| `checkout.session.async_payment_succeeded` | Same |
| `checkout.session.async_payment_failed` | Mark intent `failed` |
| `charge.refunded` | Remove featured status |
| `charge.dispute.created` | Remove featured status |

**Idempotency:** Settlement checks `featuredChargeHistory: { $ne: chargeId }`
before applying, so duplicate webhook deliveries are safe.

**Configuration:**
- `STRIPE_SECRET_KEY` or `settings.private.stripe.secretKey` — **required in production**
- `STRIPE_WEBHOOK_SECRET` or `settings.private.stripe.webhookSecret` — **required in production**
- `settings.public.Stripe.pubKey` — client-side publishable key

---

## Provider: M-Pesa (Vodacom Mozambique)

**Markets:** MZ only

**MSISDN validation:** Must start with `84` or `85` (Vodacom MZ prefixes).

**Simulator mode** (default):
Active when `settings.private.mpesa.simulate !== false` OR `shortcode` is not
configured. No real API calls are made.

**Test MSISDNs (simulator only):**

| Number | Outcome | Delay |
|--------|---------|-------|
| `841111111` | Success | Instant |
| `842222222` | Success | 6 seconds |
| `843333333` | `insufficient_funds` | Instant |
| `844444444` | `user_timeout` | Instant |
| `848888888` | `wrong_pin` | Instant |
| Any other 84/85 | Success | 6 seconds |

**Flow:**
1. Client calls `featuredJob.initiate` with `providerKey: "mpesa"`, `msisdn: "84..."`
2. Server validates MSISDN, creates `PaymentIntent` with `status: "awaiting_user"`
3. In simulator mode: `settleSimulatedIntent()` fires after configured delay
4. In live mode: real STK push sent; callback received at `POST /webhooks/mpesa`
5. Settlement extends `featuredThrough` by 30 days

**Webhook verification:** HMAC-SHA256 with `crypto.timingSafeEqual`.
Headers: `x-mpesa-signature` or `x-callback-signature`.

**Configuration:**
- `settings.private.mpesa.shortcode` — required for live mode
- `settings.private.mpesa.consumerKey` — required for live mode
- `settings.private.mpesa.consumerSecret` — required for live mode
- `settings.private.mpesa.callbackUrl` — required for live mode
- `settings.private.mpesa.webhookSecret` — required for webhook verification
- `settings.private.mpesa.simulate` — `true` (default) for simulator

---

## Provider: e-Mola (Movitel Mozambique)

**Markets:** MZ only

**MSISDN validation:** Must start with `86` or `87` (Movitel MZ prefixes).

**Simulator mode** (default):
Active when `settings.private.emola.simulate !== false` OR `partnerId` is not
configured.

**Test MSISDNs (simulator only):**

| Number | Outcome | Delay |
|--------|---------|-------|
| `861111111` | Success | Instant |
| `862222222` | Success | 5 seconds |
| `863333333` | `insufficient_funds` | Instant |
| `864444444` | `user_timeout` | Instant |
| `868888888` | `wrong_pin` | Instant |
| Any other 86/87 | Success | 5 seconds |

**Flow:** Same as M-Pesa — MSISDN validation, `awaiting_user`, simulator
settlement or live webhook at `POST /webhooks/emola`.

**Configuration:**
- `settings.private.emola.partnerId` — required for live mode
- `settings.private.emola.apiKey` — required for live mode
- `settings.private.emola.callbackUrl` — required for live mode
- `settings.private.emola.webhookSecret` — required for webhook verification
- `settings.private.emola.simulate` — `true` (default) for simulator

---

## Error handling

### Initiation errors

The `featuredJob.initiate` method validates before calling the provider:
- User must be logged in
- User must own the job
- Job must be `active` status
- Provider must be available for the job's market
- Job must not already have a pending payment intent

If the provider's `initiate()` throws, the intent is marked `failed` with
the error reason and the error is re-thrown to the client.

### Cancellation

`payment.cancel` is idempotent — calling it on a terminal intent is a no-op.

### Webhook resilience

- **Stripe:** Internal errors return `200` to prevent retry storms; the error
  is logged to Sentry.
- **Simulators:** Settlement is idempotent — terminal intents are skipped on
  repeated calls.
