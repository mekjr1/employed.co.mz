# Markets and Locales

> How subdomains, countries, languages, and pricing connect end-to-end.

## Market resolution

```
Hostname                        Market key     Country    Default locale    Pricing
──────────────────────────────  ──────────     ───────    ──────────────    ────────────
mz.employed.xibodev.com         mz             MZ         pt                MZN 2,500
mx.employed.xibodev.com         mx             MX         es                MX$999
employed.xibodev.com            mz (default)   MZ         pt                MZN 2,500
localhost / unknown             mz (default)   MZ         pt                MZN 2,500
```

### How it works (backend)

1. `MarketMiddleware` (`backend/app/middleware/market.py`) reads the `Host` header on every request.
2. The first subdomain label (`mz`, `mx`) is looked up in `MARKETS` (`backend/app/services/market.py`).
3. If the subdomain doesn't match a known market, it falls back to `DEFAULT_MARKET_KEY = "mz"`.
4. The resolved market dict is stored in `request.state.market` and injected via `Depends(get_current_market)`.

### Market definitions

```python
# backend/app/services/market.py
MARKETS = {
    "mz": {
        "country": "MZ",
        "locale": "pt",
        "featured_job": {"amount": 250000, "currency": "mzn", "label": "MZN 2,500"},
        "payment_providers": ["mpesa", "emola", "stripe"],
    },
    "mx": {
        "country": "MX",
        "locale": "es",
        "featured_job": {"amount": 99900, "currency": "mxn", "label": "MX$999"},
        "payment_providers": ["stripe"],
    },
}
```

### How it works (frontend)

`frontend/src/lib/market.ts` resolves the market from `window.location.hostname` using the same subdomain logic. It provides the `useMarket()` hook used by components that need market-aware pricing or locale defaults.

---

## Locale resolution

The UI supports three languages: **English (`en`)**, **Spanish (`es`)**, and **Portuguese (`pt`)**.

### Priority order

1. **User override** — stored in `localStorage['employed.locale']`
2. **Market default** — `currentMarket().locale` (`mz → pt`, `mx → es`)
3. **Fallback** — `'en'`

### Translation system

Translations live in `frontend/src/lib/i18n/` as JSON files keyed by locale (`en.json`, `es.json`, `pt.json`).

Adding a translation is a three-file change — add the key to all three locale files.

Locale codes used throughout: `en`, `pt`, `es` (STANDARDS §4 — no extended tags like `pt-MZ`).

---

## Country assignment

When a job is created via `POST /jobs`:

1. Backend resolves the market from the `Host` header via `get_current_market()`
2. `job.country` is **force-set** to `market["country"]` — any client-supplied value is ignored
3. If the client sends a `market_key` that doesn't match the connection's market, the request is rejected

This prevents cross-market pollution (e.g., posting an MX job from the MZ subdomain).

---

## SEO and locale

`frontend/src/lib/seo.ts` handles search-engine localization:

- Sets `<link rel="canonical">` and `<link rel="alternate" hreflang="...">` tags
- Uses `Intl.DateTimeFormat` with the current locale for date rendering

---

## Adding a new market

1. Add an entry to `MARKETS` in `backend/app/services/market.py` with `country`, `locale`, `featured_job` pricing, and `payment_providers`
2. Add the same entry to `frontend/src/lib/market.ts`
3. Add translations for any market-specific copy to all three locale files in `frontend/src/lib/i18n/`
4. Configure DNS — point `<key>.employed.xibodev.com` (UAT) or `<key>.employed.co.mz` (prod) to the app
5. Add a Caddy reverse-proxy block for the new subdomain on Box 3
6. If the market uses a new locale, add a fourth translation file
