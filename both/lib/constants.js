APP_NAME = "Employed";
APP_TAGLINE = "Local jobs. Local hiring.";

DEFAULT_MARKET_KEY = "mz";

MARKETS = {
  mx: {
    key: "mx",
    country: "Mexico",
    // T8: per-subdomain default UI locale. The client uses this to pick
    // a Translations bucket unless the visitor overrides via the locale
    // switcher (Session 'locale'). A9.35: BCP-47 region tag; i18n.js
    // strips the region to fall back to the base bucket ("es", "pt").
    locale: "es-MX",
    siteName: "Employed MX",
    tagline: "Local jobs. Local hiring.",
    host: "mx.employed.co.mz",
    localHost: "mx.lvh.me:3000",
    locationPlaceholder: "City or region",
    suggestedTag: "#EmployedMX",
    // B2.6: per-market featured pricing. `amount` is in the currency's
    // minor unit (cents/centavos). `currency` matches Stripe's ISO code.
    // `label` is what we render in the UI — Stripe will charge `amount`.
    featuredJob: {
      amount: 99900,
      currency: "mxn",
      label: "MX$999"
    },
    // A10.0: payment provider preference order shown in the checkout UI.
    // The actual availability is filtered server-side via
    // Payments.listForMarket(marketKey) — entries here that aren't
    // registered (missing settings) are silently dropped.
    paymentProviders: ["stripe"]
  },
  mz: {
    key: "mz",
    country: "Mozambique",
    locale: "pt-MZ",
    siteName: "Employed MZ",
    tagline: "Local jobs. Local hiring.",
    host: "mz.employed.co.mz",
    localHost: "mz.lvh.me:3000",
    locationPlaceholder: "City or province",
    suggestedTag: "#EmployedMZ",
    featuredJob: {
      amount: 250000,
      currency: "mzn",
      label: "MZN 2,500"
    },
    // A10.0: mobile-money first in MZ — that's how most people pay.
    // Stripe stays as a fallback for foreign card holders.
    paymentProviders: ["mpesa", "emola", "stripe"]
  }
};

COUNTRIES = ["Mexico", "Mozambique"];

JOB_TYPES = ["Full Time", "Part Time", "Contract", "Temporary", "Internship", "Freelance", "Remote", "Volunteer", "Other"];

// B2.6: legacy constants retained as deprecated aliases so any unmigrated
// code paths still see *something*. New code MUST read from
// `currentMarket().featuredJob` (or `marketFromConnection(...)` on the
// server) so MX users are not charged in MZN and vice versa.
FEATURED_JOB_AMOUNT_CENTS = MARKETS[DEFAULT_MARKET_KEY].featuredJob.amount;
FEATURED_JOB_CURRENCY = MARKETS[DEFAULT_MARKET_KEY].featuredJob.currency;
FEATURED_JOB_PRICE_LABEL = MARKETS[DEFAULT_MARKET_KEY].featuredJob.label;

// A9.31: mobile devices render Summernote's full toolbar in two crammed
// rows that overflow narrow viewports. We expose two presets — desktop
// (the historical layout) and mobile (a slimmer subset focused on the
// formatting controls visitors actually use on phones). The client
// chooses between them via SUMMERNOTE_OPTIONS_FOR_VIEWPORT().
SUMMERNOTE_OPTIONS = {
  type: 'summernote',
  height: 300,
  minHeight: 300,
  toolbar: [
    ['style', ['style']],
    ['font', ['bold', 'italic', 'underline', 'clear']],
    ['para', ['ul', 'ol']],
    ['insert', ['link', 'hr']],
    ['misc', ['codeview']]
  ],
  styleWithSpan: false
};

SUMMERNOTE_OPTIONS_MOBILE = {
  type: 'summernote',
  height: 240,
  minHeight: 240,
  toolbar: [
    ['style', ['bold', 'italic']],
    ['para', ['ul', 'ol']],
    ['insert', ['link']]
  ],
  styleWithSpan: false
};

// Client-side helper that swaps presets based on viewport width. Uses
// the matchMedia query that aligns with Bootstrap 3's `xs` breakpoint
// so we degrade exactly when the layout collapses to a single column.
SUMMERNOTE_OPTIONS_FOR_VIEWPORT = function() {
  if (typeof window === 'undefined' || !window.matchMedia) return SUMMERNOTE_OPTIONS;
  return window.matchMedia('(max-width: 767px)').matches
    ? SUMMERNOTE_OPTIONS_MOBILE
    : SUMMERNOTE_OPTIONS;
};

STATUSES = ["pending", "active", "flagged", "inactive", "filled"];
PROFILE_STATUSES = ["pending", "active", "flagged"];

// B3.4: tabs that the admin moderation page exposes. `key` is what the
// reactive subscription passes to the `adminJobs` publication; `null`
// means "no status filter" (the All tab).
JOB_STATUS_TABS = [
  { key: "pending",  label: "Pending"  },
  { key: "active",   label: "Active"   },
  { key: "flagged",  label: "Flagged"  },
  { key: "inactive", label: "Inactive" },
  { key: "filled",   label: "Filled"   },
  { key: null,       label: "All"      }
];

// B3.7: which roles an admin may grant or revoke from the admin UI.
// Hard-coded to a tight allowlist so admins can’t accidentally invent
// new privileged roles. Bootstrap of the very first admin still has to
// happen out-of-band (Mongo shell or `server/dev-accounts.js`).
ADMIN_GRANTABLE_ROLES = ["admin"];

// A9.33: Ads Phase 0 — see docs/ads-strategy.md.
//
// The `AdSlot` Blaze template renders **only** when its rendering
// ancestor matches a template in this allowlist. Enforced inside the
// component (not at the call site) so a future operator dropping
// `{{> adSlot}}` on a forbidden page (job detail, post-a-job, my-jobs,
// sign-in, admin) does not silently leak ads onto a paying-employer or
// apply-intent surface.
//
// We allowlist by **template** rather than by route because iron-router
// keeps the original route name in `Router.current()` even when the
// `dataNotFound` plugin substitutes the `notFound` template (e.g. user
// hits /jobs/<bad-id>). Template ancestry tracks what is actually in
// the DOM.
//
// To add a surface, append the template name AND document it in
// docs/ads-strategy.md “surface map”.
AD_ALLOWED_TEMPLATES = [
  'home',      // homepage `home-spotlight` slot, below recent jobs
  'jobs',      // browse list `feed-sponsor` slot, results-footer position
  'notFound'   // 404 / data-not-found `empty-state` slot
];

// Max ad density per page across all `AdSlot` mounts. Used as a soft
// budget so a future contributor cannot stack three slots on /jobs by
// accident. Phase 0 always renders 1 mock; Phase 2+ may exceed this on
// pages with a real in-feed cadence (will be revisited then).
AD_DENSITY_PER_PAGE = 1;
