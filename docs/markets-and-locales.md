# Markets and Locales

> How subdomains, countries, languages, and pricing connect end-to-end.

## Market resolution

```
Hostname                  Market key     Country    Default locale    Pricing
──────────────────────    ──────────     ───────    ──────────────    ────────────
mz.employed.co.mz        mz             MZ         pt                MZN 2,500
mx.employed.co.mz        mx             MX         es                MX$999
localhost / unknown       mz (default)   MZ         pt                MZN 2,500
```

### How it works

1. **`marketKeyFromHostname(host)`** extracts the first subdomain label
   (`mz`, `mx`) and looks it up in the `MARKETS` object
   (`both/lib/constants.js`).
2. If the subdomain doesn't match a known market, it falls back to
   `DEFAULT_MARKET_KEY = "mz"`.
3. Each market defines: `country`, `locale`, `featuredJob` (pricing),
   and `paymentProviders`.

### Market definitions

```js
// both/lib/constants.js
MARKETS = {
  mz: {
    country: 'MZ',
    locale: 'pt',
    featuredJob: { amount: 250000, currency: 'mzn', label: 'MZN 2,500' },
    paymentProviders: ['mpesa', 'emola', 'stripe']
  },
  mx: {
    country: 'MX',
    locale: 'es',
    featuredJob: { amount: 99900, currency: 'mxn', label: 'MX$999' },
    paymentProviders: ['stripe']
  }
}
```

---

## Locale resolution

The UI supports three languages: **English (`en`)**, **Spanish (`es`)**, and
**Portuguese (`pt`)**.

### Priority order

1. **User override** — `Session.get('locale')`, persisted in
   `localStorage['employed.locale']`
2. **Market default** — `currentMarket().locale`
3. **Fallback** — `'en'`

### How visitors change language

The header dropdown calls `setLocale(code)` which:
- Sets `Session('locale')` for reactive re-render
- Writes `localStorage['employed.locale']` for persistence across page loads

On startup, the stored locale is restored from `localStorage`.

### Locale buckets

Extended locale tags like `es-MX` or `pt-MZ` are stripped to the base
bucket (`es`, `pt`) by `resolveBucket()`. Only three translation buckets
exist.

### Translation system

Translations live in `both/lib/i18n.js` as a flat `Translations` object
with `en`, `es`, and `pt` keys:

```js
// Template usage
{{t 'hero.title' appName=appName}}

// JS usage
t('hero.title', { appName: 'Employed' })
```

Adding a translation is a single-file change — add the key to all three
buckets in `both/lib/i18n.js`.

---

## Country assignment

When a job is created via `jobs.create`:

1. Server resolves the market from the DDP connection's `Host` header
2. `doc.country` is **force-set** to `market.country` — the client-supplied
   value is ignored
3. If the client sends a `marketKey` that doesn't match the connection's
   market, the method throws

This prevents cross-market pollution (e.g., posting an MX job from the MZ
subdomain).

---

## SEO and locale

`client/lib/seo.js` handles search-engine localization:

- **`applySeo(routeKey, vars)`** — sets page title and `og:` tags using
  the current market name and locale-specific strings
- **`applyHreflangAndCanonical()`** — emits `<link rel="canonical">` and
  `<link rel="alternate" hreflang="...">` tags for all configured locales
- Dates are formatted via `Intl.DateTimeFormat` using the current locale

---

## Adding a new market

1. Add an entry to `MARKETS` in `both/lib/constants.js` with `country`,
   `locale`, `featuredJob` pricing, and `paymentProviders`
2. Add country to `COUNTRIES` array in the same file
3. Configure DNS — point `<key>.employed.co.mz` to the app
4. Add translations for any market-specific copy in `both/lib/i18n.js`
5. If the market uses a new locale, add a fourth translation bucket
   to `both/lib/i18n.js`
