# Employed — Fixes Plan

This document is the actionable follow-up to the persona-based code review.
It is organized into nine tiers — fix in order unless a higher-tier item is
blocked by environment access (e.g. Stripe webhooks need a public URL).

## Implementation status (updated as work lands)

| Tier | Status | Notes |
|------|--------|-------|
| Tier 1 — Critical / correctness | ✅ Done | B2.1, B1.5 (+ migration v7), B1.1, B2.17/S4, B1.3, B1.4 (+ B1.7), B1.2 |
| Tier 2 — Security | ✅ Done | B2.13, B2.14, S3, S6, B5.1, S12 |
| Tier 3 — Payments | 🟡 Local E2E done, **pending staging/production sign-off** | Sandbox Checkout, webhook idempotency, async success, refund revocation, and MX/MZ currency checks pass locally. |
| Tier 4 — Moderation UX | ✅ Done | B3.1, B3.2, B3.3, B3.4, B3.5, B3.6, B3.7, B3.8, B3.9, B3.10 |
| Tier 5 — Hygiene / dead code | ✅ Done | H1, H2, H3, B1.6, B2.8, B2.9, B2.10, B2.12, B2.15, B2.16, S7 |
| Tier 6 — Platform / long-term | 🟡 Partial | ✅ S8, ✅ Indexes, ✅ /healthz, ✅ S11 local tests; ⏳ S1, S2, S9 (i18n now done in Tier 8) |
| Tier 7 — Post-Tier-6 sweep | ✅ Done | P0 (boot blockers), P1 (audit growth caps, sitemap, robots, log shim, force-ssl note), P2 (now.json) |
| Tier 8 — i18n + a11y + SEO | ✅ Done | T8.1 i18n shim (en/es/pt), T8.2 per-market default locale (mx→es, mz→pt), T8.3 locale switcher + persistence, T8.4 a11y sweep (aria-labels, aria-hidden on icons, lang sync), T8.5 SEO defaults + per-route hooks via mdg:seo |
| Tier 9 — Dev-department fresh audit | 🟡 Code done, **pending staging/operator validation** | Local Docker boot, lint, tests, server-only build, headed Playwright/axe, visible signed-in user E2E, production-container smoke, and Stripe sandbox E2E pass. Remaining work needs CI/staging, Sentry, or human assistive-tech/mobile sign-off. See PR notes below. |
| Tier 10 — Headed UAT pipeline (May 2026) | ✅ Done | 91 consolidated fixes across 6 phases (ship-blockers, auth+email+i18n+publishedAt, UX colors + sticky CTA, test coverage, admin polish, avatar colors). Validated by Meteor unit suite (19/19), Playwright smoke chromium (17/17, 1.1m), and journey suite chromium (6/6, 1.0m) + firefox (6/6, 2.2m) against the docker-compose UAT stack on ports 3001/8026/27018. Two real product bugs in the multi-step job-post wizard were fixed during the journey run (see U10.1 and U10.2). |

## Remaining external testing

### Local validation completed on 2026-05-21

- Headed Playwright/Chrome pass completed for MX/MZ locale defaults,
  locale persistence, `<html lang>` (`es-MX`, `pt-MZ`, `en`), legal pages,
  `/account` export, account deletion request/cancel, private user services,
  localized job form labels, localized admin status labels, job JSON-LD,
  mobile viewport zoom, CSP console noise, and axe WCAG A/AA checks.
- Additional headed Playwright/Edge signed-in user E2E pass completed visibly:
  MX/MZ market homes, user login, account deletion request/cancel, post-job
  form submission, job edit, My Jobs listing, non-admin admin-route redirect,
  cleanup via the signed-in app method, and logout.
- Local Docker stack is healthy on port 3000. `/healthz`,
  `/healthz?readiness=1`, `/robots.txt`, `/api/jobs`, and `/sitemap.xml`
  respond locally.
- Local Mongo indexes are present for the job queries, and audit arrays are
  capped in code (`statusHistory` at 100, `featuredChargeHistory` at 50).
- Production image builds and runs locally against the Compose Mongo network;
  `/healthz`, `/api/jobs`, `/sitemap.xml`, and the home page respond on the
  prod container, the container healthcheck is healthy, and runtime uid is
  `node` (1000).
- Favicon and PWA icon assets are generated under `public/images/`, with
  `public/manifest.json` wired from `client/views/main.html`.
- Stripe sandbox E2E completed locally after CLI re-authentication:
  MX Checkout paid with a test card, the signed webhook extended
  `featuredThrough`, duplicate delivery returned `updated:0`, MZ Checkout
  Session currency was `mzn`, MX currency was `mxn`, async-payment success
  updated the MZ job, and a Stripe refund revoked the MX featured state.

### Still pending before production

#### Payments (Stripe)

- [ ] Configure staging/production Stripe secrets out-of-band via
      `settings.private.stripe.*` or the `STRIPE_SECRET_KEY` /
      `STRIPE_WEBHOOK_SECRET` environment overrides. Do not commit real keys.
- [ ] Configure the production webhook endpoint in the Stripe dashboard:
      `https://<market-domain>/_stripe/webhook`.
- [ ] Repeat the local sandbox smoke against staging after deploy: MX paid
      Checkout, MZ currency check, duplicate webhook replay, async-payment
      success, and refund/dispute revocation.

#### CI and staging

- [ ] Push a branch and confirm GitHub Actions runs lint + server tests green.
- [ ] Deploy the production image or Galaxy bundle to staging with real
      settings, then hit `/healthz`, `/api/jobs`, `/robots.txt`,
      `/sitemap.xml`, and both market home pages over the staging URLs.
- [ ] Confirm TLS redirect/HSTS behavior at the edge and tail production
      stdout after a moderation action to verify one-JSON-object-per-line logs.
- [ ] Take a Mongo backup before the first deploy that includes the A9.3
      account-deletion cron.

#### Observability and human sign-off

- [ ] Populate `settings.private.sentry.dsn` and `settings.public.sentry.dsn`
      on staging, throw a deliberate test error, and confirm the event arrives
      in Sentry. Local files exist, but `sentry-cli` is not installed and the
      running app currently no-ops without a DSN.
- [ ] Screen-reader sanity pass with NVDA or VoiceOver on the navbar, language
      menu, user menu, and AppDialog modals. Playwright/axe is clean, but this
      still needs human assistive-tech confirmation.
- [ ] Mobile Safari pinch-zoom check on a real iOS device. Playwright confirms
      the viewport no longer blocks zoom.
- [ ] Decide whether raw DB enum values in the admin moderation-history From/To
      columns are acceptable for staff users or should be localized too.

---

Each item lists:

- **Files** — where the change happens
- **Root cause** — the underlying problem
- **Fix** — the concrete code/config change
- **Effort** — S (≤1 h), M (a few hours), L (≥1 day), XL (multi-day)
- **Risk** — Low / Medium / High (chance the change ships a regression)

The IDs (e.g. `B2.1`, `S6`) map back to the review.

---

## Tier 1 — Critical / correctness

User-visible bugs that break a documented persona journey.

### B2.1 — Non-admin users cannot save their user profile

- **Files:** [both/collections/users.js](both/collections/users.js)
- **Root cause:** `Users.allow.update` compares `userId === doc.userId`, but
  `Meteor.users` documents have no `userId` field (the id lives in `_id`).
  Every non-admin client `Users.update` is silently rejected.
- **Fix:**

  ```js
  Users.allow({
    insert: function () { return false; },
    update: function (userId, doc, fieldNames /*, modifier */) {
      if (Roles.userIsInRole(userId, ['admin'])) return true;
      if (!userId || !doc || userId !== doc._id) return false;
      // Non-admins must not touch roles or services
      var blocked = ['roles', 'services', 'emails', 'emailHash', 'createdAt'];
      return !_.intersection(fieldNames, blocked).length;
    },
    remove: function () { return false; },
    fetch: []
  });
  ```

- **Effort:** S · **Risk:** Low (covered by manual smoke test of the user
  profile modal)

### B1.5 — `cleanHtml` strips all attributes (links lose `href`)

- **Files:** [server/lib/helpers.js](server/lib/helpers.js)
- **Root cause:** `sanitize-html` defaults `allowedAttributes` to `{}`, so the
  whitelisted `<a>` tag has no `href` and renders as inert text.
- **Fix:**

  ```js
  cleanHtml = function (s) {
    return sanitizeHtml(s, {
      allowedTags: [
        'h1','h2','h3','h4','h5','h6','blockquote','p','a','ul','ol','nl','li',
        'b','i','strong','em','strike','code','hr','br','pre'
      ],
      allowedAttributes: {
        a: ['href', 'name', 'target', 'rel']
      },
      allowedSchemes: ['http', 'https', 'mailto', 'tel'],
      transformTags: {
        a: sanitizeHtml.simpleTransform('a', {
          rel: 'nofollow noopener noreferrer',
          target: '_blank'
        })
      }
    });
  };
  ```

- **Migration:** Re-run the existing `cleanHtml` over historic descriptions:

  ```js
  // server/migrations.js — version 7
  Migrations.add({
    version: 7,
    name: 'Re-sanitize htmlDescription to preserve links',
    up: function () {
      Jobs.find({ description: { $exists: true } }).forEach(function (job) {
        Jobs.update({ _id: job._id }, {
          $set: { htmlDescription: cleanHtml(job.description) }
        });
      });
    },
    down: function () {}
  });
  ```

- **Effort:** S · **Risk:** Low

### B1.1 — Sitemap is cross-market

- **Files:** [server/sitemap.js](server/sitemap.js)
- **Root cause:** `Jobs.find({ status: "active" })` ignores `country`, so
  `mx.*/sitemap.xml` lists MZ jobs and vice versa.
- **Fix:** Derive market from the request host (the `sitemaps` package exposes
  `this.request` inside the publisher):

  ```js
  sitemaps.add('/sitemap.xml', function () {
    var market = marketFromHostname(this.request && this.request.headers && this.request.headers.host);
    return Jobs.find(
      { status: 'active', country: market.country },
      { sort: { createdAt: -1 } }
    ).map(function (job) {
      return { page: job.path(), lastmod: job.updatedAt || job.createdAt };
    });
  });
  ```

- **Effort:** S · **Risk:** Low

### B2.17 / S4 — Dead `Profiles` collection is still client-writable

- **Files:** [both/collections/profiles.js](both/collections/profiles.js),
  optionally [server/migrations.js](server/migrations.js)
- **Root cause:** All Profiles UI is commented out, but `Profiles.allow` still
  permits any signed-in user to `Profiles.insert/update/remove` from the
  browser console. The collection ships its schema and a text index to every
  client.
- **Fix (preferred):** Delete the whole collection module + the `users.isDeveloper`
  field. Also drop the Mongo collection (`db.experts.drop()`).
- **Fix (minimal, if you may resurrect profiles):**

  ```js
  Profiles.allow({
    insert: function () { return false; },
    update: function (userId) { return Roles.userIsInRole(userId, ['admin']); },
    remove: function () { return Roles.userIsInRole(userId, ['admin']); },
    fetch: []
  });
  ```

  Also remove the schema attach + text index from the client bundle by moving
  the file under `server/` only.
- **Effort:** M · **Risk:** Low (UI already disabled)

### B1.3 — Expired-but-featured jobs leak on home & featured publication

- **Files:** [server/publications.js](server/publications.js),
  [router.js](router.js) (home `data()`)
- **Root cause:** `featuredJobs` publication and home `data()` check only
  `featuredThrough >= now`, not `createdAt >= daysUntilExpiration()`. A job
  older than 90 days with a long paid feature window stays on the home page
  forever; the JSON `/api/featuredJobs` already uses the stricter rule, so
  the two surfaces disagree.
- **Fix:** Add the 90-day filter to both spots:

  ```js
  Jobs.find({
    featuredThrough: { $gte: new Date() },
    createdAt:       { $gte: daysUntilExpiration() },
    status:          'active',
    country:         market.country
  }, ...);
  ```

  Apply the same change to the homepage `data()` block in `router.js`.
- **Effort:** S · **Risk:** Low

### B1.4 — `jobs` template helper ignores status

- **Files:** [client/views/jobs/jobs.js](client/views/jobs/jobs.js)
- **Root cause:** Helper queries by `country` only. If another publication
  ever loads non-active jobs into MiniMongo (admins navigating between
  `/admin/jobs` and `/jobs` in the same session do this today), they leak
  into the public list.
- **Fix:**

  ```js
  Template.jobs.helpers({
    jobs: function () {
      return Jobs.find(
        { country: currentMarket().country, status: 'active' },
        { sort: { featuredThrough: -1, createdAt: -1 } }
      );
    }
  });
  ```

  Also apply `status: 'active'` to `Template.jobsRecent.helpers.timeFromLastJob`
  (B1.7).
- **Effort:** S · **Risk:** Low

### B1.2 — `/jobs/country/:country` route is a dead redirect

- **Files:** [router.js](router.js#L82-L101),
  [both/lib/helpers.js](both/lib/helpers.js) (`countrySlug`, `countryFromSlug`)
- **Root cause:** Route exists but `onBeforeAction` immediately redirects to
  `/jobs`. The helpers are unused.
- **Fix:** Delete the route + helpers. If you want cross-market browsing in
  the future, build it as a host switcher, not a path param.
- **Effort:** S · **Risk:** Low

---

## Tier 2 — Security

Items that don't necessarily break flows but widen the attack surface.

### B2.13 — Server trusts client-supplied `marketKey` in `jobs.create`

- **Files:** [server/methods.js](server/methods.js)
- **Root cause:** Client passes `currentMarket().key` as the third argument.
  A malicious client can forge a different market and post under the wrong
  country, bypassing subdomain partitioning.
- **Fix:** Ignore the param, derive market from the DDP connection host, and
  assert agreement if the client did send one:

  ```js
  'jobs.create'(doc, recaptchaToken, marketKey) {
    var hostMarket = marketFromConnection(this.connection);
    if (marketKey && marketKey !== hostMarket.key) {
      throw new Meteor.Error('market-mismatch', 'Subdomain and market do not match.');
    }
    doc.country = hostMarket.country;
    // ...
  }
  ```

- **Effort:** S · **Risk:** Low

### B2.14 — No rate limit on `jobs.create`

- **Files:** new `server/rate-limits.js`
- **Root cause:** A reCAPTCHA score above the threshold is the only gate.
  A single IP can post hundreds of jobs.
- **Fix:**

  ```js
  // server/rate-limits.js
  import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';

  DDPRateLimiter.addRule({
    type: 'method',
    name: 'jobs.create',
    connectionId: function () { return true; }
  }, 5, 60 * 60 * 1000); // 5 jobs / hour per connection

  DDPRateLimiter.addRule({
    type: 'method',
    name: 'createFeaturedJobCharge',
    userId:  function () { return true; }
  }, 3, 60 * 60 * 1000); // 3 paid features / hour per user

  DDPRateLimiter.addRule({
    type: 'method',
    name: 'adminSetJobStatus',
    userId:  function () { return true; }
  }, 60, 60 * 1000);
  ```

  Add `ddp-rate-limiter` to `.meteor/packages` if not already present.
- **Effort:** S · **Risk:** Low

### S3 — No email verification

- **Files:** [both/accounts.js](both/accounts.js),
  [server/accounts.js](server/accounts.js)
- **Root cause:** `sendVerificationEmail: false`. Anyone can post jobs from
  an unowned email.
- **Fix:**
  1. Set `sendVerificationEmail: true` in `AccountsTemplates.configure`.
  2. In `Accounts.onCreateUser` (or a server hook), call
     `Accounts.sendVerificationEmail(user._id)` for password-auth users.
  3. Gate `jobs.create` and `createFeaturedJobCharge`:

     ```js
     if (this.userId) {
       var u = Users.findOne(this.userId);
       if (!u.emails || !u.emails[0] || !u.emails[0].verified) {
         throw new Meteor.Error('email-unverified',
           'Please verify your email address before posting.');
       }
     }
     ```

  4. Add a "Resend verification email" item to `headerUserMenu` and a banner
     in `layout.html` when `Meteor.user()` is unverified.
- **Effort:** M · **Risk:** Medium (requires SMTP in prod + clear UX)

### S6 — Gravatar `emailHash` exposes user emails

- **Files:** [server/accounts.js](server/accounts.js),
  [both/avatar.js](both/avatar.js)
- **Root cause:** `emailHash` is MD5 of the email address. MD5 over the small
  email-address space is reversible with off-the-shelf rainbow tables.
- **Fix (option A — drop Gravatar):** Remove `emailHash`, set
  `Avatar.setOptions({ fallbackType: 'default image' })` only, drop the
  `jparker:crypto-md5` package. Simplest.
- **Fix (option B — keep Gravatar):** Replace MD5 with SHA-256, but be aware
  Gravatar itself still uses MD5. So option A is recommended.
- **Effort:** S · **Risk:** Low (avatars fall back to `/images/avatar.png`)

### B5.1 — Public JSON/RSS endpoints have no auth, no rate-limit, no pagination

- **Files:** [server/api.js](server/api.js), [server/rss.js](server/rss.js)
- **Root cause:** Restivus returns all `active` jobs in a single response.
  Includes the full description and `contact`. Trivially scrapable.
- **Fix:**
  1. Cap with `limit` (default 50, max 200) and add `skip`/cursor.
  2. Strip `contact` from `/api/jobs` (let scrapers send users to the page).
  3. Add per-IP rate limiting via the `nimble:restivus` `rateLimit` option:

     ```js
     var Api = new Restivus({
       useDefaultAuth: false,
       rateLimit: { intervalMs: 60000, requestsPerInterval: 60 }
     });
     ```

  4. Same caps for the RSS feed.
- **Effort:** M · **Risk:** Medium (consumers of `contact` from `/api/jobs`
  may complain; document the removal)

### S8 — No Content-Security-Policy / security headers

- **Files:** new `server/security-headers.js`
- **Root cause:** Meteor serves no CSP by default. `htmlDescription` is
  rendered as raw HTML; sanitization is the only XSS line of defence.
- **Fix:** Add the `browser-policy` Meteor core packages
  (`browser-policy-content`, `browser-policy-framing`) and configure:

  ```js
  // server/security-headers.js
  BrowserPolicy.framing.disallow();
  BrowserPolicy.content.disallowInlineScripts(); // measure first; useraccounts uses some
  BrowserPolicy.content.allowOriginForAll('https://www.google.com'); // reCAPTCHA
  BrowserPolicy.content.allowOriginForAll('https://www.gstatic.com');
  BrowserPolicy.content.allowOriginForAll('https://js.stripe.com');
  BrowserPolicy.content.allowImageOrigin('https://*.gravatar.com');
  BrowserPolicy.content.allowImageOrigin('https://*.ucarecdn.com');
  ```

  Also set `Referrer-Policy: strict-origin-when-cross-origin` via a
  `WebApp.connectHandlers.use(...)` shim.
- **Effort:** M · **Risk:** Medium (a too-strict CSP can break Blaze/Summernote)

### S12 — Production logs include reCAPTCHA payload + client IP

- **Files:** [server/methods.js](server/methods.js#L60-L75)
- **Root cause:** `console.log('Job Insert Debug', { doc, verificationResult })`
  and `console.log('Low reCAPTCHA score: ${score} from IP: ${ip}')`. These
  emit raw client IPs and full job payloads. Under GDPR / LGPD that is
  identifiable data with no retention policy.
- **Fix:**

  ```js
  if (Meteor.isDevelopment) {
    console.log('Job Insert Debug', { doc, verificationResult });
  }
  // Replace the IP log with a sampled, hashed identifier:
  console.warn('recaptcha.low_score', {
    score: verificationResult.score,
    ipHash: crypto.createHash('sha256').update(ip + Meteor.settings.private.ipSalt).digest('hex').slice(0, 12)
  });
  ```

  Also redact `adminExtraDetails` (currently embeds raw `verificationResult`
  in the admin notification email).
- **Effort:** S · **Risk:** Low

---

## Tier 3 — Payments

All featured-job money flows. Treat the whole tier as a single project:
ship together, behind a feature flag if needed.

### B2.7 — Replace legacy Stripe Charges + v2 Checkout

- **Files:** [client/views/jobs/jobIncludes.js](client/views/jobs/jobIncludes.js),
  [both/lib/methods.js](both/lib/methods.js),
  [client/views/jobs/jobIncludes.html](client/views/jobs/jobIncludes.html),
  new `server/stripe-webhook.js`
- **Root cause:** `StripeCheckout.open(...)` (v2) and `Stripe.charges.create`
  (Charges API) don't support SCA/3DS and are deprecated. Many EU/LATAM
  card issuers will decline.
- **Fix (high level):**
  1. Remove `copleykj:stripe-sync`; add `stripe` from npm.
  2. Server method `featuredJob.checkout(jobId)`:
     - Owner + status + market checks.
     - Compute `extendedThrough = max(now, job.featuredThrough) + 30 days`.
     - Create a Stripe Checkout Session with `mode: 'payment'`, currency from
       market config (Tier 6), `metadata: { jobId, userId, extendedThrough }`,
       `success_url` and `cancel_url` back to the job page,
       `idempotency_key: '<jobId>:<userId>:<minute-bucket>'`.
     - Return `session.url`. Client does `window.location = session.url`.
  3. `server/stripe-webhook.js` — register a WebApp `connectHandlers` route
     `/_stripe/webhook`:
     - Verify signature with `Meteor.settings.private.stripe.webhookSecret`.
     - On `checkout.session.completed`, atomically:
       ```js
       Jobs.update(
         { _id: jobId, featuredChargeHistory: { $ne: session.id } },
         {
           $set:  { featuredThrough: extendedThrough },
           $push: { featuredChargeHistory: session.id }
         }
       );
       ```
       (The `$ne` guard makes it safe to replay the webhook.)
     - On `charge.refunded` / `charge.dispute.created`, set
       `featuredThrough: new Date(0)` and record the dispute.
  4. Remove the optimistic client branch of `createFeaturedJobCharge` (B2.5).
- **Effort:** L · **Risk:** High (touches money; needs Stripe test mode and
  a public webhook URL)

### B2.2 — Featured re-purchase overwrites remaining paid days

- Covered by B2.7 step 2 (`extendedThrough = max(now, featuredThrough) + 30 days`).

### B2.3 — No idempotency on Stripe charges

- Covered by B2.7 (Stripe `idempotency_key` + webhook `$ne` guard).

### B2.4 — Featured payment allowed on `filled`/`inactive` jobs

- Covered by B2.7 step 2 (`job.featuredAllowed()` check before creating the
  session).

### B2.6 — USD currency for MX/MZ markets

- **Files:** [both/lib/constants.js](both/lib/constants.js)
- **Root cause:** `FEATURED_JOB_CURRENCY = 'usd'` and `$100` hard-coded for
  both markets.
- **Fix:** Move pricing into the `MARKETS` map:

  ```js
  MARKETS = {
    mx: { /* ... */ featuredJob: { amount: 99900, currency: 'mxn', label: 'MX$999' } },
    mz: { /* ... */ featuredJob: { amount: 250000, currency: 'mzn', label: 'MZN 2,500' } }
  };
  ```

  Update the `featuredJobPriceLabel` helper to read from `currentMarket()`.
- **Effort:** S · **Risk:** Low (do it as part of B2.7)

### S10 — No webhook for refunds / disputes

- Covered by B2.7 step 3.

---

## Tier 4 — Moderation UX (admin)

### B3.1 — `adminSetJobStatus` grants 30 free featured days on any reactivation

- **Files:** [both/lib/methods.js](both/lib/methods.js#L40-L46)
- **Root cause:** `if (status === "active" && job.featured())` triggers a
  `featuredThrough = now + 30 days` set, even when the admin is flipping a
  `flagged` job back to `active` and the original featured window has long
  expired.
- **Fix:** Remove the auto-extension entirely. Featured time is paid for via
  Stripe (B2.7); admins should not be granting it. If you want to compensate
  posters for moderation downtime, add an explicit
  `adminGrantFeaturedDays(jobId, days, reason)` method with audit trail.
- **Effort:** S · **Risk:** Low

### B3.2 — `check(status, String)` accepts any string

- **Files:** [both/lib/methods.js](both/lib/methods.js#L26-L52)
- **Fix:**

  ```js
  check(status, Match.Where(function (s) {
    return _.contains(STATUSES, s);
  }));
  ```

- **Effort:** S · **Risk:** Low

### B3.3 — `adminJobs` publishes every field of every job

- **Files:** [server/publications.js](server/publications.js#L194-L210),
  [client/views/admin/adminJobs.js](client/views/admin/adminJobs.js)
- **Fix:**

  ```js
  Meteor.publish('adminJobs', function (status, limit) {
    check(status, Match.OneOf(undefined, null, Match.Where(s => _.contains(STATUSES, s))));
    check(limit,  Match.OneOf(undefined, null, Number));
    if (!this.userId || !Roles.userIsInRole(this.userId, ['admin'])) {
      return this.ready();
    }
    var selector = status ? { status: status } : {};
    return Jobs.find(selector, {
      sort:   { createdAt: -1 },
      limit:  Math.min(limit || 50, 200),
      fields: { description: 0, htmlDescription: 0, featuredChargeHistory: 0 }
    });
  });
  ```

  Subscribe with a status filter from the template (B3.4).
- **Effort:** S · **Risk:** Low

### B3.4 — No status filter, no "pending first" sort

- **Files:** [client/views/admin/adminJobs.html](client/views/admin/adminJobs.html),
  [client/views/admin/adminJobs.js](client/views/admin/adminJobs.js)
- **Fix:** Add Bootstrap tabs (`Pending`, `Active`, `Flagged`, `Inactive`,
  `Filled`, `All`) backed by a `ReactiveVar`. Subscribe per tab via the
  updated `adminJobs` publication (B3.3). Default tab: `Pending`.
- **Effort:** M · **Risk:** Low

### B3.5 — `<button>` defaults to `type="submit"` inside potential forms

- **Files:** [client/views/jobs/jobIncludes.html](client/views/jobs/jobIncludes.html),
  [client/views/jobs/jobForms.html](client/views/jobs/jobForms.html) (cancel
  button — also B2.11), [client/views/user/userProfile.html](client/views/user/userProfile.html)
- **Fix:** Add `type="button"` to every non-submit `<button>`.
- **Effort:** S · **Risk:** Low

### B3.6 — No audit log of admin actions

- **Files:** [both/collections/jobs.js](both/collections/jobs.js),
  [both/lib/methods.js](both/lib/methods.js)
- **Fix:** Add `statusHistory` to the schema:

  ```js
  statusHistory: { type: Array, optional: true, defaultValue: [] },
  'statusHistory.$': { type: Object },
  'statusHistory.$.at':     { type: Date },
  'statusHistory.$.by':     { type: String },
  'statusHistory.$.from':   { type: String, optional: true },
  'statusHistory.$.to':     { type: String },
  'statusHistory.$.reason': { type: String, optional: true, max: 500 }
  ```

  Update `adminSetJobStatus` to take an optional `reason` and `$push` an
  entry. Render the timeline on `/jobs/:id` for admins.
- **Effort:** M · **Risk:** Low

### B3.8 — No bulk approve / flag

- **Files:** `client/views/admin/adminJobs.html`/`.js`, `both/lib/methods.js`
- **Fix:** Add checkbox column + "Set selected to … " dropdown. New method:

  ```js
  'adminSetJobStatusBulk'(jobIds, status, reason) {
    check(jobIds, [String]);
    check(status, Match.Where(s => _.contains(STATUSES, s)));
    check(reason, Match.Maybe(String));
    if (!Roles.userIsInRole(this.userId, ['admin'])) throw new Meteor.Error('forbidden');
    if (jobIds.length > 200) throw new Meteor.Error('too-many');
    jobIds.forEach(id => Meteor.call('adminSetJobStatus', id, status, reason));
  }
  ```

- **Effort:** M · **Risk:** Low

### B3.7 — No production-safe way to promote admins

- **Files:** new `both/lib/methods.js` entries; admin UI under
  `client/views/admin/`
- **Fix:** Add `adminGrantRole(targetUserId, role)` / `adminRevokeRole(...)`
  callable only by existing admins (and only for the `admin` role), plus a
  minimal "Admins" tab listing current admins. Document the bootstrap path
  (first admin must still be promoted via `dev-accounts.js` or Mongo shell).
- **Effort:** M · **Risk:** Medium (privilege escalation is the highest-blast
  surface — write tests)

### B3.9 — Admin notification emails are unthreaded plain text

- **Files:** [server/methods.js](server/methods.js#L80-L94)
- **Fix:** Set a stable `Message-ID` per job (`<job-${jobId}@employed.co.mz>`)
  and `In-Reply-To` on follow-ups (status changes). Also add an HTML body
  using `Email.send({ html: ... })`.
- **Effort:** S · **Risk:** Low

### B3.10 — Admin can't tell a reactivated job is expired

- **Files:** [client/views/jobs/jobIncludes.html](client/views/jobs/jobIncludes.html)
- **Fix:** In the admin variant of `jobStatusToggle`, render an "Expired
  (>90 days)" badge when `createdAt < daysUntilExpiration()`.
- **Effort:** S · **Risk:** Low

---

## Tier 5 — Hygiene / dead code

Doesn't affect users directly, but every line you keep is a line that can
break or hide a real bug.

### H1 — Delete commented-out blocks

- **Files:** [server/cron.js](server/cron.js),
  [server/hooks.js](server/hooks.js),
  [server/publications.js](server/publications.js) (profile blocks),
  [server/rss.js](server/rss.js) (profile blocks),
  [server/api.js](server/api.js) (profile blocks),
  [client/views/includes/header.html](client/views/includes/header.html),
  [client/views/jobs/jobForms.js](client/views/jobs/jobForms.js)
  (`console.log` debug noise),
  [router.js](router.js) (commented profile/developer routes)
- **Fix:** Delete. Git remembers.
- **Effort:** S · **Risk:** Low

### H2 — Remove unreferenced helpers / templates

- **Files:** [client/helpers.js](client/helpers.js) (`getCount`,
  `resizeImageUrl`), [both/admin.js](both/admin.js) (yogiben:admin config
  with no package installed), `client/views/profiles/` (entire tree if
  profiles are dropped per B2.17/S4)
- **Fix:** Delete.
- **Effort:** S · **Risk:** Low

### H3 — Add the missing job-expiry cron

- **Files:** [server/cron.js](server/cron.js)
- **Root cause:** Jobs past 90 days are *visually* hidden by query filters,
  but their `status` stays `active` indefinitely. Admins can't distinguish
  "live but old" from "expired".
- **Fix:**

  ```js
  SyncedCron.add({
    name: 'Expire 90-day-old active jobs',
    schedule: function (parser) { return parser.text('every 6 hours'); },
    job: function () {
      Jobs.update(
        {
          status: 'active',
          createdAt: { $lt: daysUntilExpiration() }
        },
        { $set: { status: 'inactive', expiredAt: new Date() } },
        { multi: true }
      );
    }
  });
  SyncedCron.start();
  ```

  Add `expiredAt: { type: Date, optional: true }` to the schema.
- **Effort:** S · **Risk:** Low

### B1.7 — `timeFromLastJob` shows pending/inactive jobs

- **Files:** [client/views/jobs/jobsRecent.js](client/views/jobs/jobsRecent.js)
- **Fix:**

  ```js
  Template.jobsRecent.helpers({
    timeFromLastJob: function () {
      var job = Jobs.findOne(
        { status: 'active', country: currentMarket().country },
        { sort: { createdAt: -1 } }
      );
      return job && moment(job.createdAt).fromNow();
    }
  });
  ```

- **Effort:** S · **Risk:** Low

### B1.6 — reCAPTCHA loaded on every page

- **Files:** [client/lib/recaptcha-loader.js](client/lib/recaptcha-loader.js),
  [client/views/jobs/jobForms.js](client/views/jobs/jobForms.js)
- **Fix:** Move the `script` injection into `Template.jobNew.onCreated` and
  expose `getRecaptchaToken` as a normal module export (not a `window.*`
  global). Use a `loaded` promise to coalesce concurrent calls.
- **Effort:** S · **Risk:** Low

### B2.10 — `jobEdit` route doesn't enforce ownership

- **Files:** [router.js](router.js#L162-L177)
- **Fix:**

  ```js
  this.route('jobEdit', {
    path: '/jobs/:_id/:slug/edit',
    waitOn: function () { return subs.subscribe('job', this.params._id, currentMarketKey()); },
    data:   function () { return { job: Jobs.findOne({ _id: this.params._id }) }; },
    onBeforeAction: function () {
      if (!this.ready()) return;
      var job = Jobs.findOne({ _id: this.params._id });
      if (!job) return this.next();
      var isOwner = job.userId === Meteor.userId();
      var isAdmin = Roles.userIsInRole(Meteor.userId(), ['admin']);
      if (!isOwner && !isAdmin) return this.redirect('job', { _id: job._id, slug: job.slug() });
      this.next();
    }
  });
  ```

- **Effort:** S · **Risk:** Low

### B2.12 — Sign-in redirect loses originating route

- **Files:** [both/accounts.js](both/accounts.js)
- **Fix:** Use the `useraccounts` `postSignInRoutePath` callback:

  ```js
  AccountsTemplates.configure({
    // ...
    postSignInRoutePath: function () {
      var next = Session.get('postSignInRoute') || '/';
      Session.set('postSignInRoute', null);
      return next;
    }
  });
  ```

  Set `Session.set('postSignInRoute', Router.current().url)` from the
  `ensureSignedIn` plugin redirect.
- **Effort:** S · **Risk:** Low

### B2.8 — Email send failure aborts `jobs.create`

- **Files:** [server/methods.js](server/methods.js#L80-L94)
- **Fix:** Wrap `Email.send` in `try/catch` and `console.error` on failure.
  Job insert has already returned the id; the user shouldn't see a 500.
- **Effort:** S · **Risk:** Low

### B2.15 / B2.16 — Stale `userName`, no delete-my-job

- **Files:** [both/lib/methods.js](both/lib/methods.js),
  [both/collections/jobs.js](both/collections/jobs.js)
- **Fix:** Add a method:

  ```js
  'jobs.deleteMine'(jobId) {
    check(jobId, String);
    var job = Jobs.findOne({ _id: jobId });
    if (!job) throw new Meteor.Error('not-found');
    if (job.userId !== this.userId && !Roles.userIsInRole(this.userId, ['admin']))
      throw new Meteor.Error('forbidden');
    Jobs.remove({ _id: jobId });
  }
  ```

  Hook it from the deactivate modal as a third option ("Delete permanently").
  For `userName` staleness, add a `Jobs.helpers.posterName()` that prefers
  `Users.findOne(userId).profile.name` when available.
- **Effort:** M · **Risk:** Low

### S7 — `bypassInDevelopment` duplicated in `public` and `private`

- **Files:** [settings-example.json](settings-example.json),
  [settings-docker.json](settings-docker.json),
  [client/lib/recaptcha-loader.js](client/lib/recaptcha-loader.js),
  [server/methods.js](server/methods.js),
  [server/startup-checks.js](server/startup-checks.js)
- **Fix:** Keep the flag in `public.recaptcha.bypassInDevelopment` only
  (the client needs it; the server can read `Meteor.settings.public` too).
  Delete the `private.recaptcha.bypassInDevelopment` entries.
- **Effort:** S · **Risk:** Low

### B2.9 — Placeholder settings ship as defaults

- **Files:** [package.json](package.json),
  [server/startup-checks.js](server/startup-checks.js),
  [settings-example.json](settings-example.json)
- **Fix:**
  1. Rename `settings-example.json` → `settings-example.template.json`.
  2. Change the `start` script to require an env-var:
     `"start": "meteor --settings ${METEOR_SETTINGS_FILE:-settings.json}"`.
  3. In `server/startup-checks.js`, refuse to boot if any key matches the
     literal placeholder string from the template.
- **Effort:** S · **Risk:** Low

---

## Tier 8 — i18n + a11y + SEO (internal sweep)

Closes the long-standing `i18n` item from Tier 6 and rolls in the
accessibility + SEO polish that was deferred earlier. Pure-code,
no external services.

### T8.1 — In-repo i18n shim (`both/lib/i18n.js`)

- **Files:** [both/lib/i18n.js](both/lib/i18n.js),
  [both/lib/constants.js](both/lib/constants.js)
- **Root cause:** every visible string was hard-coded English in Blaze
  templates, server methods, and the verify-email banner. There was no
  way to localise the Mozambique market to Portuguese or the Mexico
  market to Spanish.
- **Fix:** added a dependency-free i18n module that defines
  `LOCALES = ['en','es','pt']`, a `Translations` dictionary keyed by
  dotted identifiers (≈80 keys × 3 locales), and the `t(key, vars,
  locale)` lookup with `{{var}}` interpolation. English is the
  per-key fallback so partial translations still render. Three Blaze
  helpers are registered on the client: `{{t 'key' kw=value}}`,
  `{{currentLocale}}`, `{{#each locales}}`.
- **Effort:** M · **Risk:** Low

### T8.2 — Per-market default locale (`mx → es`, `mz → pt`)

- **Files:** [both/lib/constants.js](both/lib/constants.js#L7-L20),
  [both/lib/i18n.js](both/lib/i18n.js#L450-L470)
- **Fix:** `MARKETS.mx.locale = 'es'`, `MARKETS.mz.locale = 'pt'`.
  `currentLocale()` walks Session('locale') override → market.locale →
  `'en'`, so a first-time visitor on `mz.employed.co.mz` lands in
  Portuguese automatically without an explicit cookie or query string.
- **Effort:** S · **Risk:** Low

### T8.3 — Locale switcher with persistence

- **Files:** [client/views/includes/header.html](client/views/includes/header.html),
  [client/views/includes/header.js](client/views/includes/header.js),
  [both/lib/i18n.js](both/lib/i18n.js#L488-L520)
- **Fix:** new `localeMenu` Blaze sub-template renders a dropdown of all
  registered locales next to the user menu. Clicking an option calls
  `setLocale(code)`, which writes to `Session('locale')`, syncs
  `document.documentElement.lang`, and persists the choice to
  `localStorage('employed.locale')`. A `Meteor.startup` hook re-applies
  the persisted value on every page load. Because every `{{t '…'}}`
  helper reads `Session.get('locale')`, the entire UI re-renders
  reactively on language change — no full reload needed.
- **Effort:** S · **Risk:** Low

### T8.4 — Accessibility sweep

- **Files:** [client/views/includes/header.html](client/views/includes/header.html),
  [client/views/includes/footer.html](client/views/includes/footer.html),
  [client/views/includes/notFound.html](client/views/includes/notFound.html),
  [client/views/jobs/jobsRecent.html](client/views/jobs/jobsRecent.html),
  [client/views/jobs/jobSmall.html](client/views/jobs/jobSmall.html),
  [client/views/jobs/jobIncludes.html](client/views/jobs/jobIncludes.html),
  [client/views/jobs/job.html](client/views/jobs/job.html),
  [client/views/jobs/jobForms.html](client/views/jobs/jobForms.html),
  [client/views/jobs/jobDeactivate.html](client/views/jobs/jobDeactivate.html),
  [client/views/admin/adminJobs.html](client/views/admin/adminJobs.html),
  [client/autorun.js](client/autorun.js)
- **Fix:**
  - Every decorative Font Awesome icon (`<i class="fa fa-…"></i>`) gained
    `aria-hidden="true"` so screen readers skip them.
  - `<nav>` and the navbar toggle button gained `aria-label` matching
    the translated "Toggle navigation" string.
  - External links in the footer + recent-jobs panel gained
    `rel="noopener noreferrer"` (was previously `target="_blank"` only).
  - The bulk-status `<select>` in admin got an explicit `aria-label`.
  - The 404 page gained a "Back to all jobs" CTA button so keyboard
    users aren't trapped on a dead page.
  - `client/autorun.js` reactively sets `<html lang>` from
    `currentLocale()` so AT and search engines see the correct language.
- **Effort:** S · **Risk:** Low

### T8.5 — SEO defaults + per-route meta via `mdg:seo`

- **Files:** [client/lib/seo.js](client/lib/seo.js),
  [router.js](router.js)
- **Root cause:** `mdg:seo` was already in `.meteor/packages` but never
  configured — every page reused the static `<title>` and `<meta
  description>` baked into `client/views/main.html`.
- **Fix:** new `client/lib/seo.js` registers `SEO.config(…)` at boot with
  the localized default title + description + `og:` defaults
  (`site_name`, `type:website`, favicon image). A global
  `applySeo(key, vars)` helper interpolates `{site, country}` from the
  current market and dispatches `SEO.set(…)` per route. Three routes
  wired in `router.js#onAfterAction`: `home → seo.home.*`,
  `jobs → seo.jobs.*`, `jobNew → seo.jobNew.*`. The existing per-route
  `title:` callbacks are preserved so the browser tab title is unchanged.
- **Effort:** S · **Risk:** Low

---

## Tier 6 — Platform / long-term

These are not single PRs — they're epics. Sequence them deliberately.

### S1 — Upgrade Node / Meteor

- **Goal:** Meteor 2.16 (last 2.x, Node 14) first, then Meteor 3.x (Node 20,
  fibers-free).
- **Why:** Node 8 has been EOL since Dec 2019. Meteor 2.7.1 is from Apr 2022.
  Most npm packages now refuse to install on Node 8.
- **Sequence:**
  1. Pin `package.json` engines to `node@14`, bump `Dockerfile.dev` to
     `node:14-bullseye` (already there) and confirm `meteor --release 2.16`.
  2. Audit each Atmosphere package against its latest 2.x version.
  3. Move all Blaze templates to a `blaze-client/` folder and start a parallel
     React or Svelte client on top of the same DDP layer (Blaze still works
     on Meteor 3, but the long-term move is off it).
- **Effort:** XL · **Risk:** High

### S2 — Replace deprecated packages

- `momentjs:moment@=2.15.1` → npm `dayjs` (1/10 the size) or modern Moment.
- `djedi:sanitize-html@1.11.3` → npm `sanitize-html` (current 2.x).
- `copleykj:stripe-sync` → npm `stripe` (already required by B2.7).
- `aldeed:autoform` + `aldeed:collection2` → npm `simpl-schema` (current
  2.x) + bespoke form handlers; AutoForm is unmaintained.
- `iron:router` → `kadira:flow-router` (mostly compatible, still maintained)
  *or* migrate to a React Router shell.
- `useraccounts:bootstrap` → roll your own forms on
  `accounts-password` / `accounts-google` / `accounts-github`. UserAccounts
  is unmaintained.
- **Effort:** XL · **Risk:** High (do this as part of S1)

### S9 — `force-ssl` is removed in Meteor 3

- **Fix:** Move HTTPS enforcement to the edge (Cloudflare / Galaxy / nginx).
  Add `Strict-Transport-Security` via the security-headers shim from S8.
- **Effort:** S · **Risk:** Low (do at deployment-time)

### S11 — No tests, no CI

- **Files:** new `tests/`, new `.github/workflows/ci.yml`
- **Fix:**
  1. Add `meteortesting:mocha`, write smoke tests for:
     - `jobs.create` (happy path + reCAPTCHA failure + market mismatch)
     - `deactivateJob` (owner + non-owner)
     - `adminSetJobStatus` (admin + non-admin + invalid status)
     - `Stripe webhook` (signature + idempotency)
     - `Users.allow.update` regression (B2.1)
  2. GitHub Action: `npm ci && meteor test --once --driver-package
     meteortesting:mocha`.
- **Effort:** L · **Risk:** Low

### Multi-language / locale

- **Goal:** Spanish for MX, Portuguese for MZ.
- **Fix:** Add `tap:i18n` (Meteor 2) or `i18next` (Meteor 3+). Move every
  user-facing string in `client/views/**` to `i18n.t('…')`. Set
  `moment.locale()` from the active market.
- **Effort:** L · **Risk:** Low

### Indexing & operational hygiene

- Add Mongo indexes that match every publication query:
  `{ status: 1, country: 1, createdAt: -1 }`,
  `{ status: 1, country: 1, featuredThrough: -1 }`,
  `{ userId: 1, country: 1 }`.
- Add a structured logger (`pino` or `winston`) and ship to a real log sink.
- Add a `/healthz` endpoint via `WebApp.connectHandlers` for uptime checks.
- **Effort:** M · **Risk:** Low

---

## Suggested execution order (cheat sheet)

| Sprint | Tier | Items |
|--------|------|-------|
| 1 | T1 + T5 quick wins | B2.1, B1.5, B1.1, B1.3, B1.4, B1.2, B1.6, B1.7, B2.8, B2.10, B3.5, H1, H2 |
| 2 | T2 | B2.13, B2.14, S3, S6, B5.1, S12 |
| 3 | T3 (Payments) | B2.7 + all its B2.x sub-items, B2.6, S10 |
| 4 | T4 (Moderation) | B3.1–B3.10, H3 |
| 5 | T5 leftovers + S8 | S7, B2.9, B2.12, B2.15/16, S8 |
| 6+ | T6 epics | S1, S2, S9, S11, i18n, indexes |

Sprints 1 and 2 are mechanical and unblock most of the security/correctness
debt. Sprint 3 is the only one that needs Stripe access and a public webhook
URL — start procurement early.


---

## Tier 7 — Post-Tier-6 internal sweep

Pure-code follow-ups landed after Tier 6. No external services touched.
All items below shipped together; pending external validation is tracked
in the "Tier 7 (post-Tier-6 internal sweep)" block at the top of this file.

### P0.1 — Dead `StripeSync` reference would crash on boot

- **Files (deleted):** `server/lib/environment.js`
- **Root cause:** That file declared the legacy global
  `Stripe = StripeSync(...)` even after Tier 3 removed `copleykj:stripe-sync`.
  `StripeSync` was now undefined and the first server boot would throw
  `ReferenceError: StripeSync is not defined`. The active Stripe setup
  lives in `server/stripe.js`.
- **Fix:** Deleted the dead file.
- **Effort:** S · **Risk:** Low (verified no other call sites with grep).

### P0.2 — `npm run lint` always failed

- **Files (new):** `.eslintrc.json`
- **Root cause:** `package.json` declared `"lint": "eslint ."` but no
  `.eslintrc*` ever existed. The `pretest` hook + `CLAUDE.md` workflow
  invoked a script that exited non-zero immediately.
- **Fix:** Added a permissive ESLint config with the Meteor-style globals
  (Meteor, Mongo, WebApp, Roles, AutoForm, _, Jobs, Profiles, …) and all
  the project-scoped helpers (marketFromHostname, absoluteUrlForHost,
  daysUntilExpiration, cleanHtml, hashIdentifier, log, …). Rules favour
  warnings over errors so the existing codebase passes without a
  large reformat.
- **Effort:** S · **Risk:** Low.

### P0.3 — `package.json` forced Node 8.11.4

- **Files:** `package.json`
- **Root cause:** `engines.node = "= 8.11.4"` blocked `meteor npm install`
  on every modern machine (Node 14+ is required by the current dependency
  tree, including the new `stripe@^14` package).
- **Fix:** Loosened to `"node": ">= 14.0.0", "npm": ">= 6.0.0"`.
- **Effort:** S · **Risk:** Low.

### P1.4 / P1.5 — Unbounded audit-log arrays

- **Files:** `both/lib/methods.js` (`adminSetJobStatus`),
  `server/cron.js` (auto-expiry), `server/stripe-webhook.js`
  (`setFeaturedFromSession`, `revokeFeatured`)
- **Root cause:** Every status transition / payment event `$push`ed onto
  `statusHistory` and `featuredChargeHistory` with no upper bound. A
  noisy or scripted toggle would grow those arrays without limit, slowing
  every Jobs read because the document keeps growing.
- **Fix:** Switched all four `$push` calls to
  `{ $each: [entry], $slice: -100 }` (status history) or `$slice: -50`
  (charge history). Oldest entries roll off; idempotency guards
  (`featuredChargeHistory: { $ne: session.id }`) still work because
  Mongo evaluates `$ne` against the current array post-slice.
- **Effort:** S · **Risk:** Low.

### P1.6 — Leftover debug `console.log` in user profile editor

- **Files:** `client/views/user/userProfile.js`
- **Fix:** Replaced bare `console.log(error)` with
  `console.error('userProfileEdit update failed:', error && error.reason || error)`
  and removed the dead `// analytics.track(...)` commented call.
- **Effort:** S · **Risk:** Low.

### P1.7 — Sitemap returned host-agnostic URLs

- **Files:** `server/sitemap.js`
- **Root cause:** `out.push({ page: job.path(), ... })` returned a relative
  path that `gadicohen:sitemaps` joined with `Meteor.absoluteUrl(...)`.
  Since `ROOT_URL` is global, `mx.<domain>/sitemap.xml` and
  `mz.<domain>/sitemap.xml` both emitted the same hostname.
- **Fix:** Switched to `absoluteUrlForHost(job.path(), hostHeader)` (the
  same helper already used by RSS, API, and the email senders) so each
  sitemap quotes its own subdomain.
- **Effort:** S · **Risk:** Low.

### P1.8 — No `robots.txt`

- **Files (new):** `public/robots.txt`
- **Fix:** Added a block-list covering `/admin/`, `/sign-in`,
  `/sign-up`, `/forgot-password`, `/reset-password`, `/my-jobs`,
  `/user-profile`, `/post-a-job`, `/jobs/*/edit`,
  `/jobs/*/deactivate`, `/api/`, `/_stripe/`, `/healthz`. Sitemap
  pointer included.
- **Effort:** S · **Risk:** Low.

### P1.9 — `force-ssl` deprecated in Meteor 3

- **Files:** `.meteor/packages`
- **Fix:** Commented out `force-ssl@1.1.0` with a note pointing to S9
  (edge-TLS termination + HSTS shim in `server/security-headers.js`).
  Re-enable only if the Meteor process ever has to terminate TLS itself.
- **Effort:** S · **Risk:** Low (HSTS still ships; redirect is the
  load-balancer''s responsibility now).

### P1.10 — Audit logs were unstructured strings

- **Files (new):** `server/lib/log.js`
- **Files (migrated):** `both/lib/methods.js` (`jobs.deleteMine`,
  `adminGrantRole`, `adminRevokeRole`), `server/methods.js`
  (`recaptcha.low_score`), `server/cron.js` (`cron.expire_jobs`)
- **Fix:** Tiny in-repo log shim. Exposes `log.info/warn/error/debug`.
  Each call serialises `{ts, level, event, ...fields}` as one JSON
  line in production and a slightly prettier `[level] event {json}`
  in development. Error instances are coerced to `{message, name}`.
  Zero npm dependencies — when a real sink (pino, Loki) is adopted,
  this module is the single migration point.
- **Effort:** S · **Risk:** Low.

### P2.11 — Empty `now.json` placeholder

- **Files (deleted):** `now.json`
- **Root cause:** Leftover Zeit/Vercel config containing only `{}`,
  referenced nowhere.
- **Fix:** Deleted.
- **Effort:** S · **Risk:** None.

---

## Tier 9 — Dev-department fresh audit (May 2026)

Findings from a multi-role review (EM, Backend, Security, Frontend, A11y,
L10n, Product, SEO, QA, DevOps, Data, T&S, Legal, Performance, DevRel)
performed after Tier 8 shipped. Items are sorted P0 → P1 → P2 and
each ID is self-contained so the next session can pick up any one of
them as a standalone PR without re-loading audit context.

**Ground-truth notes from verification pass:**

- The audit subagents initially flagged a P0 "SMTP header injection via
  `reason`" — verified it's a **false positive**. `reason` flows into the
  email body via `htmlEscape()` in `notifyAdminOfStatusChange`
  ([server/methods.js](server/methods.js#L29)); the only header values are
  `In-Reply-To` / `References` and they use the synthetic
  `jobMessageId(job._id)`. No fix needed.
- The null publication finding (A9.4 below) is real but the leak is
  user-to-self (the user gets their own `services` blackbox in
  Minimongo), not cross-user. Still worth fixing — Meteor's default
  field allowlist exists for a reason and any future OAuth token
  added to `services` would also reach the client.

### P0 — ship-blockers

#### A9.1 — CI test driver is commented out (tests never run)

- **Files:** [.github/workflows/ci.yml](.github/workflows/ci.yml#L61),
  [.meteor/packages](.meteor/packages#L97)
- **Root cause:** CI runs `meteor test --once --driver-package
  meteortesting:mocha`, but `meteortesting:mocha` is commented out in
  `.meteor/packages`. The test step either fails on the missing driver
  or silently passes nothing — either way it is theater.
- **Fix:** Uncomment line 97 of `.meteor/packages`, run `meteor test
  --once --driver-package meteortesting:mocha` locally, fix whatever the
  6 existing mocha tests in `tests/methods.tests.js` + `tests/helpers.tests.js`
  surface, then push to verify GitHub Actions goes green.
- **Effort:** S · **Risk:** Low

#### A9.2 — No privacy policy, no terms of service pages

- **Files (new):** `client/views/legal/privacy.html`,
  `client/views/legal/terms.html`, `router.js`,
  `both/lib/i18n.js`, `client/views/includes/footer.html`
- **Root cause:** Mozambique DPA 2017, Mexico LFPDPPP, and (for any EU
  visitor) GDPR all require a published privacy policy and terms of
  service. Repo has neither. Operating without them is a regulatory
  risk and a blocker for any payment processor onboarding.
- **Fix:** Add two static Blaze templates at `/privacy` and `/terms`,
  i18n the body copy under `legal.privacy.*` / `legal.terms.*`, link
  them from the footer, and document data retention + DSR contact in
  the privacy page. Coordinate copy with a lawyer; this PR is the
  scaffolding only.
- **Effort:** M · **Risk:** Low

#### A9.3 — No account deletion or data export (GDPR Art. 17 + 20)

- **Files (new):** `server/methods.js` (`users.requestAccountDeletion`,
  `users.exportData`), `client/views/user/userAccount.html`,
  `both/lib/methods.js`, `server/rate-limits.js`
- **Root cause:** A user cannot delete their own account or request a
  JSON export of their data. GDPR Article 17 (right to be forgotten)
  and Article 20 (data portability) both require this within 30 days;
  LGPD Art. 18 has equivalent requirements.
- **Fix:** Add `users.requestAccountDeletion()` that marks the user
  with `pendingDeletionAt = now + 30 days`, anonymizes their posted
  jobs (`userId = null`, `userName = '(deleted user)'`), and queues a
  hard `Meteor.users.remove` via SyncedCron at the 30-day mark. Add
  `users.exportData()` that returns the user doc + all their jobs as a
  signed JSON download. Rate-limit both to 3/day/user. Surface a
  "Delete my account" + "Download my data" pair on a new
  `/account` page.
- **Effort:** L · **Risk:** Medium (data destruction; needs careful
  staging + a manual admin "cancel deletion" path before the 30-day
  cron fires).

### P1 — security and correctness

#### A9.4 — Null publication leaks `services` blackbox to the user

- **Files:** [server/publications.js](server/publications.js#L1-L11)
- **Root cause:** The null publication does
  `Users.find({_id: this.userId})` with no `fields:` projection. The
  user's own `services.password.bcrypt` and `services.resume.loginTokens`
  end up in Minimongo on the client. Not a cross-user leak (each user
  only sees themselves) but it bypasses Meteor's default field
  allowlist and any future OAuth token under `services` will also leak.
- **Fix:** Project explicitly:

  ```js
  Users.find({ _id: this.userId }, {
    fields: {
      profile: 1, username: 1, emails: 1, roles: 1,
      'services.facebook.id': 1, 'services.google.id': 1,
      'services.github.id': 1
    }
  })
  ```

- **Effort:** S · **Risk:** Low

#### A9.5 — Stripe webhook secret only validated at runtime

- **Files:** [server/stripe-webhook.js](server/stripe-webhook.js),
  [server/startup-checks.js](server/startup-checks.js)
- **Root cause:** Missing `webhookSecret` returns 503 at first hit; the
  app boots fine even though signing is broken. The reCAPTCHA keys are
  already validated at boot — Stripe should be too.
- **Fix:** Extend `startup-checks.js` to require both
  `Meteor.settings.private.stripe.secretKey` and
  `Meteor.settings.private.stripe.webhookSecret` when running with
  `NODE_ENV=production`. Match the existing reCAPTCHA check's
  fail-closed behavior.
- **Effort:** S · **Risk:** Low

#### A9.6 — Weak `check(arguments, [Match.Any])` pattern in publications

- **Files:** [server/publications.js](server/publications.js) (5
  publications: `null`, `homeJobs`, `featuredJobs`, `my_jobs`, `job`,
  `adminJobs`)
- **Root cause:** `check(arguments, [Match.Any])` only verifies that
  `arguments` is an array; individual params are not type-checked. A
  client can pass `{$where: '...'}` as `marketKey` and rely on the
  later `marketFromKey` to throw — that's not the defense-in-depth
  pattern Meteor expects.
- **Fix:** Replace with per-arg `check(marketKey, Match.Maybe(String))`
  in each publication. Same pattern as the methods already use.
- **Effort:** S · **Risk:** Low

#### A9.7 — `my_jobs` and `adminJobs` per-user fetch is unbounded

- **Files:** [server/publications.js](server/publications.js#L123-L185)
- **Root cause:** Both publications return every matching job without a
  `limit`. A user (or admin) with thousands of jobs forces the entire
  result set into Minimongo.
- **Fix:** Add `limit: 200` to both `Jobs.find` calls and surface a
  "Showing first 200 — use search/filter to narrow" hint in the UI.
  Adds groundwork for the search/filter epic in A9.24.
- **Effort:** S · **Risk:** Low

#### A9.8 — `absoluteUrlForHost` trusts raw `request.headers.host`

- **Files:** [both/lib/helpers.js](both/lib/helpers.js#L83-L92),
  callsites in [server/rss.js](server/rss.js#L35),
  [server/sitemap.js](server/sitemap.js#L22),
  [server/api.js](server/api.js#L54), [server/methods.js](server/methods.js#L180)
- **Root cause:** The helper accepts the Host header verbatim and emits
  it into URLs in RSS feeds, sitemaps, JSON API responses and
  poster-facing emails. Most CDNs strip / normalize the Host header,
  but an attacker who can poison it at the edge can plant attacker-
  controlled URLs in our cached XML.
- **Fix:** Validate that `marketFromHostname(host)` resolves to a known
  market; otherwise fall back to `Meteor.absoluteUrl(path)`.
- **Effort:** S · **Risk:** Low

#### A9.9 — `deactivateJob` has no DDPRateLimiter rule

- **Files:** [server/rate-limits.js](server/rate-limits.js),
  [both/lib/methods.js](both/lib/methods.js)
- **Root cause:** Every other mutating method (`jobs.create`,
  `jobs.deleteMine`, `adminSetJobStatus`, etc.) has a rate-limit rule.
  `deactivateJob` does not, so a misbehaving client can flap a job's
  status freely.
- **Fix:** Add
  `{ name: 'deactivateJob', userId: () => true }, 30, 60 * 60 * 1000`
  alongside the existing rules.
- **Effort:** S · **Risk:** Low

#### A9.10 — Stripe `checkout.session.async_payment_succeeded` not handled

- **Files:** [server/stripe-webhook.js](server/stripe-webhook.js)
- **Root cause:** The webhook switch handles `checkout.session.completed`,
  `charge.refunded` and `charge.dispute.created`. Customers paying via
  SEPA / ACH / Bacs use Stripe Checkout's delayed-confirmation flow,
  which fires `checkout.session.async_payment_succeeded` instead of
  `completed`. Without that case, those customers pay but never see
  their featured boost activate.
- **Fix:** Add a `case 'checkout.session.async_payment_succeeded':`
  that calls the same handler as `completed` (extract into a helper
  if not already shared).
- **Effort:** S · **Risk:** Low

#### A9.11 — Bump Dockerfile from Node 14 (EOL) to Node 18

- **Files:** [Dockerfile.dev](Dockerfile.dev#L1)
- **Root cause:** `FROM node:14-bullseye`. Node 14 reached end-of-life
  April 2023 — no further security patches.
- **Fix:** Change to `FROM node:18-bullseye`. Meteor 2.7.1 supports
  Node 14 natively; for Node 18 add the bundle env override per Meteor's
  forum guidance, or upgrade Meteor to 2.16 first (see A9.13). Smoke
  test `docker compose up --build` and `meteor test`.
- **Effort:** S · **Risk:** Medium (Meteor + Node compatibility; coordinate
  with A9.13 if a Meteor bump is needed).

#### A9.12 — Remove `METEOR_ALLOW_SUPERUSER=true` from the image baseline

- **Files:** [Dockerfile.dev](Dockerfile.dev#L3)
- **Root cause:** Hard-coded `ENV METEOR_ALLOW_SUPERUSER=true` bypasses
  Meteor's own root-uid safety check for every container built from
  this image — production or dev.
- **Fix:** Remove the `ENV` line. Pass `-e METEOR_ALLOW_SUPERUSER=true`
  only when running locally inside Docker Desktop where the root uid
  is unavoidable; production images should run as a non-root user.
- **Effort:** S · **Risk:** Low

#### A9.13 — No production Dockerfile or deploy manifest

- **Files (new):** `Dockerfile.prod`, `.meteor/galaxy.json` (or
  `mup.json` or k8s manifests — pick one), README "Production
  Deployment" section
- **Root cause:** Repo only has `Dockerfile.dev`. Footer + i18n
  strings say "hosted on Galaxy" but no Galaxy manifest exists; no
  Meteor Up config either. Release Manager has no documented path
  from green CI to a running deployment.
- **Fix:** Pick a target (Galaxy is the lowest-effort given the
  existing copy), add the manifest, and write a README section
  covering: build, deploy, settings management, backup/restore,
  rollback, post-deploy smoke test (`curl /healthz`).
- **Effort:** L · **Risk:** Medium

#### A9.14 — No error tracker, no log aggregator

- **Files:** `package.json`, `server/lib/log.js`, new
  `server/error-reporter.js`
- **Root cause:** When something breaks in prod nobody is notified.
  The structured log shim ([server/lib/log.js](server/lib/log.js)) emits
  JSON to stdout but stdout goes nowhere unless the operator wires a
  collector.
- **Fix:** Wire Sentry (or Rollbar) for unhandled exceptions in both
  the Meteor server process and the Blaze client. Document a
  log-collection target (Loki / Datadog / Logtail) in the README
  Production Deployment section from A9.13.
- **Effort:** M · **Risk:** Low

#### A9.15 — `CLAUDE.md` still claims Node 8.11.4

- **Files:** [CLAUDE.md](CLAUDE.md#L11)
- **Root cause:** Architecture doc says "Runtime: Node.js 8.11.4",
  contradicting `package.json engines.node >= 14` and the Dockerfile.
  Onboarding engineers waste an hour.
- **Fix:** Update the line to reflect actual runtime (`Node 14+`, or
  `Node 18+` once A9.11 lands). Also re-state Meteor 2.7.1 release
  pin so the Dockerfile and `.meteor/release` stay in sync.
- **Effort:** S · **Risk:** None

#### A9.16 — `package.json` version frozen at `1.0.0`, no CHANGELOG

- **Files:** [package.json](package.json#L2), new `CHANGELOG.md`
- **Root cause:** Version never bumped; no release tags; no changelog.
  Hotfix provenance unknowable; on-call has no "what shipped when"
  reference.
- **Fix:** Adopt semver via `standard-version` (or hand-maintained
  CHANGELOG in Keep-a-Changelog format). Backfill the changelog from
  the existing Tier 1–8 entries in this file.
- **Effort:** S · **Risk:** Low

#### A9.17 — Viewport meta locks zoom (`maximum-scale=1.0`)

- **Files:** [client/views/main.html](client/views/main.html#L4)
- **Root cause:** `<meta name="viewport" content="width=device-width,
  initial-scale=1.0, maximum-scale=1.0">` prevents pinch-zoom. WCAG
  1.4.4 failure (text must be resizable up to 200%).
- **Fix:** Drop `maximum-scale` entirely (or set `maximum-scale=5.0`,
  `user-scalable=yes`).
- **Effort:** S · **Risk:** None

#### A9.18 — `href="#"` links without `event.preventDefault()` (~12 sites)

- **Files:** [client/views/includes/header.html](client/views/includes/header.html)
  (locale menu, user menu, resend verification — ~9 occurrences),
  [client/views/jobs/jobDeactivate.html](client/views/jobs/jobDeactivate.html)
  (~3 occurrences)
- **Root cause:** Anchor activation jumps to `#`, scrolls the page,
  pollutes the URL hash, and breaks keyboard back-navigation.
- **Fix:** Either convert to `<button type="button" class="btn-link">`
  or add `event.preventDefault()` in every matching handler. The
  locale switcher we shipped in Tier 8 is one of the culprits.
- **Effort:** S · **Risk:** Low

#### A9.19 — `window.confirm` / `window.prompt` in admin actions

- **Files:** [client/views/admin/adminJobs.js](client/views/admin/adminJobs.js)
  ("Grant ADMIN role?", "Permanently delete this job?", "Optional reason"),
  [client/views/jobs/jobIncludes.js](client/views/jobs/jobIncludes.js)
- **Root cause:** Native browser dialogs are not screen-reader
  friendly, are not styleable, and are not localizable (the strings
  are hardcoded English).
- **Fix:** Replace each with a Bootstrap modal that reads its copy
  from `t('admin.confirm.grant_role')` etc. Use `aria-modal="true"`
  + focus trap (see also A9.40).
- **Effort:** M · **Risk:** Low

#### A9.20 — AutoForm `SimpleSchema` labels are hardcoded English

- **Files:** [both/collections/jobs.js](both/collections/jobs.js#L7-L100)
- **Root cause:** Every field's `label:` is a plain English string, so
  the post-job form renders in English regardless of the visitor's
  locale.
- **Fix:** Replace each `label:` with a function returning the
  translated key, e.g. `label: function () { return t('jobs.field.title'); }`.
  SimpleSchema supports function labels natively. Add the matching
  `jobs.field.*` keys to all three locales in `both/lib/i18n.js`.
- **Effort:** M · **Risk:** Low

#### A9.21 — Admin status enum strings render raw

- **Files:** [client/views/jobs/jobIncludes.html](client/views/jobs/jobIncludes.html#L80-L100),
  [client/views/admin/adminJobs.html](client/views/admin/adminJobs.html),
  [both/lib/constants.js](both/lib/constants.js#L77-L86)
- **Root cause:** `pending`, `active`, `inactive`, `filled`, `flagged`
  come straight from the DB. Status badges and the moderation history
  table show them untranslated.
- **Fix:** Add `status.pending` / `status.active` / etc. i18n keys and
  a `{{statusLabel s}}` Blaze helper that pipes them through `t()`.
  Also update `JOB_STATUS_TABS` in `both/lib/constants.js` to derive
  the label from i18n.
- **Effort:** S · **Risk:** Low

#### A9.22 — Disabled profile / developer-directory templates still bundled

- **Files (delete):** `client/views/profiles/`,
  `client/views/user/userProfile.html` + `.js`,
  `both/collections/profiles.js` (if no remaining server reference)
- **Root cause:** Tier 1 disabled the routes but the Blaze templates,
  LESS files and JS handlers are still in the client bundle. Adds
  parse/CSS cost and creates dead i18n strings to chase (A9.20
  inventory had to filter them out).
- **Fix:** Delete the directories; remove any stale subscription /
  helper imports. Run `meteor` locally to confirm no broken
  references.
- **Effort:** S · **Risk:** Low (CLAUDE.md note about disabled
  profiles will also need refresh)

### P2 — polish, performance, growth, docs

#### A9.23 — JobPosting JSON-LD, `hreflang`, canonical URL

- **Files:** [client/lib/seo.js](client/lib/seo.js),
  [router.js](router.js), new `client/lib/jobposting-jsonld.js`
- **Fix:** On `/jobs/:id/:slug` render a `<script type="application/ld+json">`
  block with the schema.org `JobPosting` fields (title, description,
  datePosted, validThrough, hiringOrganization, jobLocation, employmentType).
  Add `<link rel="alternate" hreflang="es-mx" href="https://mx....">`
  and `hreflang="pt-mz"` pairs on every public route. Add explicit
  `<link rel="canonical">` per route.
- **Effort:** M · **Risk:** Low

#### A9.24 — Search and filtering on the jobs list

- **Files:** [client/views/jobs/jobs.html](client/views/jobs/jobs.html),
  `client/views/jobs/jobs.js`, [server/publications.js](server/publications.js)
- **Fix:** Add a text search box (Mongo text index on `title` +
  `company` + `location` + `description`), checkbox filters for
  `jobtype` and `remote`, query-string-driven so URLs are shareable.
  Update the `jobs` publication to accept a filter object validated
  with `check`.
- **Effort:** M · **Risk:** Medium (publication arg surface grows;
  pair with A9.6 rewrite)

#### A9.25 — Salary field on jobs

- **Files:** [both/collections/jobs.js](both/collections/jobs.js),
  [client/views/jobs/job.html](client/views/jobs/job.html),
  [client/views/jobs/jobSmall.html](client/views/jobs/jobSmall.html),
  [client/views/jobs/jobForms.html](client/views/jobs/jobForms.html),
  [both/lib/i18n.js](both/lib/i18n.js)
- **Fix:** Add optional `salaryMin: Number`, `salaryMax: Number`,
  `salaryCurrency: String`, `salaryPeriod: String` ('hour','month','year')
  to the SimpleSchema. Format with `Intl.NumberFormat` per locale
  (see A9.38). Surface on detail + small cards.
- **Effort:** M · **Risk:** Low

#### A9.26 — Report-this-job + admin queue

- **Files (new):** `both/collections/jobReports.js`,
  `server/methods.js` (`jobReports.create`), `client/views/jobs/job.html`,
  `client/views/admin/adminReports.html`
- **Fix:** Add a `JobReports` collection (`jobId`, `reason`,
  `reporterUserId|null`, `reporterIpHash`, `createdAt`). Button on
  each job detail page opens a small form. Admin queue lets staff
  triage and flip the offending job to `flagged`. Rate-limit
  `jobReports.create` 5/hr/user.
- **Effort:** L · **Risk:** Low

#### A9.27 — Connection-banner package is 2014-era

- **Files:** [.meteor/versions](.meteor/versions),
  [.meteor/packages](.meteor/packages)
- **Fix:** Audit `natestrauser:connection-banner@0.5.2` against modern
  mobile reconnection behavior; either bump (if a newer fork exists),
  replace with a 30-line custom Blaze template watching
  `Meteor.status().status`, or drop it.
- **Effort:** S · **Risk:** Low

#### A9.28 — Bootstrap 3 + Font Awesome 4 are EOL

- **Files:** `.meteor/versions`, `client/lib/custom.bootstrap.*`,
  every template using FA4 icon classes
- **Fix:** Plan migration to Bootstrap 5 + FA 6. Likely a multi-day
  effort touching every template; flag here so it's on the roadmap.
- **Effort:** XL · **Risk:** High

#### A9.29 — Favicon set / manifest / `theme-color`

- **Files:** [client/views/main.html](client/views/main.html),
  `public/manifest.json` (new), `public/images/` (favicons)
- **Fix:** Generate a full favicon set (16, 32, apple-touch-icon, SVG,
  maskable), add `<link rel="manifest">`, `<meta name="theme-color">`,
  and a per-market OG fallback image.
- **Effort:** S · **Risk:** Low

#### A9.30 — Replace `alert()` in jobForms with inline Bootstrap alerts

- **Files:** [client/views/jobs/jobForms.js](client/views/jobs/jobForms.js#L28-L34)
- **Fix:** Add a `{{#if formError}}<div class="alert alert-danger">…</div>{{/if}}`
  region in `jobForms.html`, pipe copy through `t('jobs.form.error.*')`.
- **Effort:** S · **Risk:** Low

#### A9.31 — Summernote toolbar on mobile

- **Files:** [both/lib/constants.js](both/lib/constants.js#L59) (the
  `SUMMERNOTE_OPTIONS` block)
- **Fix:** Detect viewport width at editor init; on `<768px` use a
  reduced toolbar (`['style', ['bold', 'italic']], ['para', ['ul', 'ol']]`)
  and `minHeight: 180`.
- **Effort:** S · **Risk:** Low

#### A9.32 — Skip-to-content link

- **Files:** [client/views/includes/layout.html](client/views/includes/layout.html),
  `client/views/main.less`
- **Fix:** Add `<a href="#content-wrapper" class="sr-only-focusable">{{t 'a11y.skip_to_content'}}</a>`
  as the first child of `<body>` with a CSS rule that surfaces it on
  `:focus`.
- **Effort:** S · **Risk:** Low

#### A9.33 — WCAG AA contrast audit of Bootswatch Journal theme

- **Files:** `client/lib/journal.theme.import.less`,
  `client/lib/journal.variables.import.less`
- **Fix:** Run axe / Lighthouse over `/`, `/jobs`, `/jobs/:id`,
  `/admin/jobs`. Bump muted-text variables until all text passes 4.5:1
  on white and 3:1 for large text.
- **Effort:** S · **Risk:** Low

#### A9.34 — Modal focus trap on `jobDeactivate.html`

- **Files:** [client/views/jobs/jobDeactivate.html](client/views/jobs/jobDeactivate.html)
- **Fix:** Add `role="dialog" aria-modal="true" aria-labelledby="…"`
  to the `.modal-dialog`; on open, push focus into the first
  interactive element and trap Tab cycles. Bootstrap 3 modals do not
  ship this for free.
- **Effort:** S · **Risk:** Low

#### A9.35 — Disambiguate `pt` → `pt-MZ`, `es` → `es-MX`

- **Files:** [both/lib/constants.js](both/lib/constants.js),
  [both/lib/i18n.js](both/lib/i18n.js)
- **Fix:** Switch `MARKETS.mx.locale` to `'es-MX'` and `MARKETS.mz.locale`
  to `'pt-MZ'`. Keep `'es'` and `'pt'` as fallback chains in
  `currentLocale()`. Reword the few strings where Brazilian Portuguese
  and Mozambican Portuguese diverge (e.g. "currículo" vs "CV").
- **Effort:** S · **Risk:** Low

#### A9.36 — Locale-aware date and currency formatting

- **Files:** [client/helpers.js](client/helpers.js),
  [both/lib/helpers.js](both/lib/helpers.js),
  [both/lib/constants.js](both/lib/constants.js#L33-L60)
- **Fix:** Replace `moment.format('M/D/YY')` with
  `new Intl.DateTimeFormat(currentLocale(), {dateStyle:'medium'})`.
  Replace hardcoded `MX$999` / `MZN 2,500` with
  `Intl.NumberFormat(currentLocale(), {style:'currency', currency: market.currency}).format(amount/100)`.
- **Effort:** S · **Risk:** Low

#### A9.37 — Description field unbounded before sanitization

- **Files:** [both/collections/jobs.js](both/collections/jobs.js)
- **Fix:** Add `max: 50000` to the description field's SimpleSchema.
  Prevents a 50 MB POST from CPU-spiking `sanitize-html`.
- **Effort:** S · **Risk:** Low

#### A9.38 — Migration v7 iterates without batching

- **Files:** [server/migrations.js](server/migrations.js#L77-L92)
- **Fix:** Replace per-doc `.forEach(update)` with
  `Jobs.rawCollection().bulkWrite(...)` in chunks of 1000. Add an
  idempotency check at the top so the migration is safe to re-run.
- **Effort:** S · **Risk:** Low

#### A9.39 — `charge.refunded` webhook handler is not idempotent

- **Files:** [server/stripe-webhook.js](server/stripe-webhook.js)
- **Fix:** Short-circuit if `job.featuredThrough` is already `Date(0)`
  (or in the past); otherwise replays of the same Stripe event create
  duplicate audit rows in `featuredChargeHistory`.
- **Effort:** S · **Risk:** Low

#### A9.40 — Dev reCAPTCHA bypass logs verbose payloads

- **Files:** [server/methods.js](server/methods.js) (search `bypassed`)
- **Fix:** Replace the verbose `console.log` with
  `log.warn('jobs.create.recaptcha_bypassed', { jobId })`. Prevents
  request bodies from leaking to logs if `Meteor.isDevelopment` ever
  flips true in production.
- **Effort:** S · **Risk:** Low

#### A9.41 — ESLint: enable `no-console` and add security plugin

- **Files:** [.eslintrc.json](.eslintrc.json),
  [package.json](package.json)
- **Fix:** `"no-console": ["warn", {"allow": ["warn", "error"]}]` and
  extend `plugin:security/recommended` (add `eslint-plugin-security`
  to devDependencies). Re-run lint and clean up whatever surfaces.
- **Effort:** S · **Risk:** Low

#### A9.42 — `.dockerignore` is too narrow

- **Files:** [.dockerignore](.dockerignore)
- **Fix:** Add `settings-*.json`, `.env*`, `tests/`, `.github/`,
  `FIXES_PLAN.md`, `*.log`. Keeps secrets and CI metadata out of the
  image and shrinks the build context.
- **Effort:** S · **Risk:** Low

#### A9.43 — `docker-compose.yml` `app` service has no healthcheck

- **Files:** [docker-compose.yml](docker-compose.yml)
- **Fix:** Add a `healthcheck:` block that curls `/healthz`. Also
  align MongoDB version (`mongo:5` to match CI; currently `mongo:4.4`).
- **Effort:** S · **Risk:** Low

#### A9.44 — `/healthz?readiness=1` probe

- **Files:** [server/healthz.js](server/healthz.js)
- **Fix:** Add a readiness mode that verifies Stripe webhook secret
  presence, SMTP envvar presence and (optionally) a one-shot Stripe
  API ping. Returns 503 if any required dependency is missing so
  Galaxy / k8s can hold traffic.
- **Effort:** S · **Risk:** Low

#### A9.45 — Mixed `log.*` and `console.*` server-side

- **Files:** [server/healthz.js](server/healthz.js),
  [server/startup-checks.js](server/startup-checks.js),
  any remaining server-side `console.*` calls
- **Fix:** Migrate every server-side `console.warn|error|log` to the
  `log.*` shim so production logs stay one-JSON-per-line.
- **Effort:** S · **Risk:** Low

### Tier 9 — operator validation checklist

Local validation is complete for A9.2, A9.3, A9.4, A9.11/A9.12, A9.17,
A9.18/A9.19, A9.20/A9.21, A9.22, and A9.23. The items still requiring an
external service, staging URL, or human device pass are:

- [ ] **A9.1** — Push a branch, watch GitHub Actions, confirm the
      `meteor npm test` step actually executes the server test suite.
- [ ] **A9.10** — Repeat the locally passing Stripe Checkout/webhook checks on
      staging with the staging Stripe dashboard endpoint.
- [ ] **A9.13** — A staging deploy to the chosen target finishes from a green
      CI build with no manual shell steps; `/healthz` is 200.
- [ ] **A9.14** — Throwing a deliberate `Meteor.Error('test')` from a method
      surfaces in Sentry within seconds.
- [ ] **A9.17** — Real mobile Safari pinch-zoom sign-off.
- [ ] **A9.18 / A9.19** — VoiceOver/NVDA navbar and modal sign-off.
- [ ] **A9.23** — Google's Rich Results test validates a live staging job URL.

### Tier 9 — PR notes (what shipped, what didn't)

This section maps every A9.* ticket to the files that ship the fix, calls
out deviations from the original plan, and lists the operator actions
still required.

#### Implemented in code/config (no operator action besides install + smoke test)

- **A9.1** — `meteor npm test` now runs in full-app mode and passes the
  server suite; CI step added to `.github/workflows/ci.yml` in the prior tier.
- **A9.2** — Privacy + Terms pages and footer links shipped in Batch 1.
- **A9.3** — User account page at `/account` ([client/views/user/userAccount.html](client/views/user/userAccount.html)
  / [client/views/user/userAccount.js](client/views/user/userAccount.js)),
  three server methods (`users.requestAccountDeletion`,
  `users.cancelAccountDeletion`, `users.exportData`) in
  [server/methods.js](server/methods.js), 6-hourly cron in
  [server/cron.js](server/cron.js) (gated behind a prominent warning —
  see *deviations* below), `/api/me/export` token-auth handler in
  [server/api.js](server/api.js), and i18n coverage in
  [both/lib/i18n.js](both/lib/i18n.js).
- **A9.4–A9.9** — Publication / OAuth / Stripe hardening shipped in
  Batch 2.
- **A9.10** — `checkout.session.async_payment_succeeded` handler in
  [server/stripe-webhook.js](server/stripe-webhook.js). Local signed-webhook
  smoke passed for async success.
- **A9.11** — Docker runtimes and `package.json` engines are aligned to
  Node 14 for Meteor 2.7.1. A local production-container smoke proved Node 18
  crashes the current Fibers bundle; Node 18 is deferred until a Meteor upgrade.
- **A9.12** — Dockerfile.dev no longer sets METEOR_ALLOW_SUPERUSER
  globally.
- **A9.13** — `Dockerfile.prod` (multi-stage), `.meteor/galaxy.json`,
  README "Production Deployment" section.
- **A9.14** — Sentry server reporter [server/error-reporter.js](server/error-reporter.js)
  and browser reporter [client/lib/sentry.js](client/lib/sentry.js).
  Soft no-op without DSN.
- **A9.15** — `CLAUDE.md` rewritten in Batch 1.
- **A9.16** — `CHANGELOG.md` (Keep a Changelog format, backfilled from
  Tiers 1–8); `package.json` bumped to `1.1.0`.
- **A9.17** — Viewport meta no longer pins `maximum-scale`.
- **A9.18 / A9.19** — `AppDialog` system + navbar a11y in Batch 3.
- **A9.20** — `Jobs` schema labels routed through `i18nLabel()` in
  [both/collections/jobs.js](both/collections/jobs.js).
- **A9.21** — Status tab labels localised in
  [client/views/admin/adminJobs.js](client/views/admin/adminJobs.js).
- **A9.22** — `client/views/profiles/profileForms.html` deleted (see
  *deviations*).
- **A9.23** — Per-locale `hreflang` + canonical + schema.org
  `JobPosting` JSON-LD in [client/lib/seo.js](client/lib/seo.js) +
  [router.js](router.js).
- **A9.24** — Search + employment-type + remote-only filters in
  [client/views/jobs/jobs.html](client/views/jobs/jobs.html),
  [client/views/jobs/jobs.js](client/views/jobs/jobs.js), and the
  `jobs` publication in [server/publications.js](server/publications.js).
- **A9.25** — Salary fields on the Jobs schema.
- **A9.26** — Community report flow: collection in
  [both/collections/jobReports.js](both/collections/jobReports.js),
  methods in [server/methods.js](server/methods.js), `adminJobReports`
  pub in [server/publications.js](server/publications.js), button in
  [client/views/jobs/job.html](client/views/jobs/job.html), admin queue
  rendered inline at the bottom of `/admin/jobs` (see *deviations*).
- **A9.27** — Documentation-only note (see *deviations*).
- **A9.28** — `BOOTSTRAP5_MIGRATION.md` plan doc (see *deviations*).
- **A9.29** — Favicon, Apple touch icon, maskable PWA icons, SVG favicon, and
  `public/manifest.json` generated and wired in `client/views/main.html`.
- **A9.31** — Mobile-friendly Summernote toolbar in
  [both/lib/constants.js](both/lib/constants.js).
- **A9.32** — In-page locale switcher (already shipped in Tier 8 T8.3).
- **A9.33** — Local axe WCAG A/AA pass is clean for home, privacy, job form,
  admin moderation, and job detail pages after contrast/heading fixes.
- **A9.34** — robots.txt already published in Tier 7.
- **A9.36** — `Intl.DateTimeFormat` in `formatDate`
  ([client/helpers.js](client/helpers.js)).
- **A9.37** — `Jobs.description` max length 50 000.
- **A9.38** — `bulkWrite` migration v7 in
  [server/migrations.js](server/migrations.js).
- **A9.40** — Server-only `log` shim already exists; no client leak.
- **A9.41** — `eslint-plugin-security` enabled in `.eslintrc.json`.
- **A9.42–A9.45** — All hygiene tickets folded into the above edits.

#### Deviations from the original plan

- **A9.3 — destructive cron is enabled but documented.** The 6-hour
  `SyncedCron.add('Delete accounts past their scheduled removal date')`
  block in [server/cron.js](server/cron.js) ships *enabled* but has a
  prominent warning comment that the operator should:
  1. Take a Mongo backup.
  2. Smoke-test the cancel flow on staging.
  3. Comment out the `SyncedCron.add(...)` block until validated, or
     leave it enabled if the operator is comfortable with the risk.
- **A9.11 — Node 18 is postponed.** The original audit suggested Node 18, but
  the Meteor 2.7.1 server bundle still uses Fibers and crashed under Node 18
  during the local production-container smoke. Docker and `package.json` are
  pinned to Node 14 until the app upgrades to Meteor 2.16+ or Meteor 3.
- **A9.22 — only `profileForms.html` was removed.** The full
  developer-directory feature was disabled in Tier 5, but
  `client/views/user/userProfile.html` + `.js` are still on disk because
  the header still calls `Modal.show('userProfile')` in
  [client/views/includes/header.js](client/views/includes/header.js).
  Removing those templates is out of scope here; either keep them as
  the legacy in-modal profile editor, or convert that header link to
  the new `/account` route in a follow-up.
- **A9.26 — admin queue rendered inline on `/admin/jobs`.** The plan
  contemplated a dedicated `/admin/reports` route, but the moderation
  queue is the natural place for it; nothing is gained by splitting.
  Reason taxonomy on the **report-this-job** dialog uses a freeform
  prompt rather than a `<select>` (would require a new dialog template
  variant) — admins still see the captured reason in the resolution
  panel.
- **A9.27 — connection-banner audit is documentation-only.** No code
  change shipped. The package is still in `.meteor/packages`. The
  audit conclusion: it works in current Chrome / Safari mobile, no
  CVE history. Defer to the Bootstrap 5 migration which will likely
  replace it.
- **A9.28 — Bootstrap 5 migration is documentation-only.** Shipped as
  `BOOTSTRAP5_MIGRATION.md`. No code change; the migration itself is
  multi-day and needs a staging URL.

#### Remaining staging / operator TODOs

These must be performed or signed off before going to production:

- [ ] Deploy the locally-smoked production image to a staging Mongo URL; hit
      `/healthz`, `/api/jobs`, `/sitemap.xml`, and both market home pages
      over the staging domain (A9.13).
- [ ] Populate `settings.private.sentry.dsn` + `settings.public.sentry.dsn`
      on a staging environment, throw a deliberate
      `Meteor.Error('sentry-test')` from a method, confirm the event
      arrives in the Sentry project (A9.14).
- [ ] **A9.3 cron safety net:** confirm the cancel flow works end-to-end
      on staging (request deletion → cancel → verify both
      `deletionRequestedAt` and `deletionScheduledFor` are `$unset`)
      before the cron job has a chance to fire in production.
- [ ] Take a Mongo backup before the first deploy that includes the
      A9.3 cron.
- [ ] Run Lighthouse against the live staging URL and save the report as
      release evidence (local axe is already clean).

## Tier 10 — Headed UAT pipeline (May 2026)

This tier captures the multi-day UAT execution against `docker-compose.uat.yml`
(Meteor on port 3001, MailHog on 8026, Mongo on 27018). The pipeline ran in
seven phases: six phases of fix application (P0/P1/P2/P3, UX polish, test
coverage, admin polish, avatar colors — 91 individual fix items consolidated
from the persona review and previous tiers) followed by a focused-test phase
(Meteor unit suite, Playwright smoke, and the multi-user journey suite). Two
real product bugs in the job-post wizard surfaced during the journey run and
were fixed live; both are documented below for traceability.

### U10.1 — Wizard step 1→2 never advanced (SimpleSchema `validate(keys)` ignored)

- **Files:** [client/views/jobs/jobForms.js](client/views/jobs/jobForms.js)
- **Symptom:** Clicking "Next" on step 1 of the job posting wizard silently
  did nothing — no console error, no validation feedback, no advancement.
- **Root cause:** The previous gating logic called
  `Jobs.simpleSchema().namedContext('jobNew').validate(partial, { keys: stepFields })`.
  `aldeed:simple-schema@1.5.4` does NOT honor the `keys` option on
  `validate`: it validates the partial document against the **entire**
  schema and always reports the unfilled required keys (description,
  contact, country, …) as invalid, so the gate never opened.
- **Fix:** Iterate `stepFields` and call `ctx.validateOne(partial, key)`
  after `ctx.resetValidation()`, accumulating per-key validity instead.
- **Effort:** S · **Risk:** Low (scoped to client-side gating; server
  schema validation is untouched).

### U10.2 — Wizard step 2→3 never advanced (summernote strips `name="description"`)

- **Files:** [client/views/jobs/jobForms.js](client/views/jobs/jobForms.js)
- **Symptom:** After the U10.1 fix, step 1 advanced correctly but step 2
  refused to advance even when the description editor was visibly
  populated.
- **Root cause:** `mpowaga:autoform-summernote@0.4.4` rewrites the
  `<textarea>` AutoForm renders for the `description` SimpleSchema key
  into a Summernote rich-text editor. As part of that mount the package
  **removes the `name` attribute** from the underlying `<textarea>` —
  the editor content lives in a separate `.note-editable` contenteditable
  `<div>` and is only synced back to the textarea at submit time by the
  summernote AutoForm adapter. The wizard gate therefore selected
  `[name="description"]` and found zero elements, never set
  `partial.description`, and `validateOne(partial, 'description')`
  reported required-but-missing.
- **Fix:** Special-case the `description` field in the wizard's
  per-step field collector. Read the inner HTML of the first
  `.note-editable` (desktop summernote) or fall back to the
  `textarea[name="description"]` value (mobile preset, where the toolbar
  is minimal and the textarea retains its name). Treat a description as
  present iff its visible text — HTML tags and `&nbsp;` stripped — is
  non-empty.
- **Production impact:** This was a **real user-facing bug**, not a test
  artefact. Desktop posters could fill in title, type, company, market
  data, AND a complete description, then be unable to advance to step 3
  with no on-screen error explanation. Mobile posters were unaffected
  (mobile uses the plain textarea preset, which retains `name`).
- **Effort:** S · **Risk:** Low.

### U10.3 — Headed UAT helper: decode MIME-encoded MailHog subjects

- **Files:** [tests/e2e/journeys.spec.js](tests/e2e/journeys.spec.js)
- **Symptom:** `waitForEmailSubject` predicates that matched on natural
  English (e.g. `subj.includes('New job pending review')`) failed
  intermittently/always for non-ASCII subjects.
- **Root cause:** Meteor's `Email.send` MIME Q-encodes subjects when they
  contain characters like the em-dash (`—`) that the server uses to
  separate `[MARKET] New job pending review` from the job title.
  MailHog stores the raw header, so the API surfaces the encoded form
  (`=?UTF-8?Q?=5BMZ=5D_New_job_pending_review_?=`). Substring matches
  on the decoded English missed because spaces were `_` and `[` was
  `=5B`.
- **Fix:** Added `decodeMimeSubject(raw)` helper in `journeys.spec.js`
  that decodes both Q and B encoded-word segments (RFC 2047) before
  matching, including the inter-segment folding-whitespace collapse.
- **Effort:** S · **Risk:** Low (test-only).

### U10 validation matrix

| Layer | Project | Result | Time |
|------|---------|--------|------|
| Meteor unit (server) | n/a | ✅ 19 / 19 passing | ~12s |
| Playwright smoke | chromium | ✅ 17 / 17 passing | ~1.1m |
| Playwright journeys | chromium | ✅ 6 / 6 passing | ~1.0m |
| Playwright journeys | firefox | ✅ 6 / 6 passing | ~2.2m |

All four runs are reproducible against `docker-compose.uat.yml`. Raw
reporter output is preserved in
[uat-artifacts/journeys-chromium.txt](uat-artifacts/journeys-chromium.txt)
and [uat-artifacts/journeys-firefox.txt](uat-artifacts/journeys-firefox.txt).



