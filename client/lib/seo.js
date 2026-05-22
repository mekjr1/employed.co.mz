// T8 — SEO + per-route meta. The `mdg:seo` package was already in
// .meteor/packages but never configured. We register defaults at boot
// and per-route overrides via Router.onAfterAction.
//
// Translations are localized to the visitor's chosen locale (see
// both/lib/i18n.js). Title falls back through:
//   route.title()  →  SEO.set per-route below  →  SEO.config default.

Meteor.startup(function () {
  if (typeof SEO === 'undefined' || !SEO || typeof SEO.config !== 'function') {
    return;
  }

  var market = (typeof currentMarket === 'function') ? currentMarket() : null;
  var site = (market && market.siteName) || (typeof APP_NAME !== 'undefined' ? APP_NAME : 'Employed');

  SEO.config({
    title: t('seo.default.title'),
    meta: {
      description: t('seo.default.description')
    },
    og: {
      site_name: site,
      type: 'website',
      image: '/images/og-card.svg'
    }
  });
});

// Helper used by router.js — wrap in a global so we don't have to
// re-import inside route hooks.
applySeo = function (key, vars) {
  if (typeof SEO === 'undefined' || !SEO || typeof SEO.set !== 'function') return;
  var market = (typeof currentMarket === 'function') ? currentMarket() : null;
  var ctx = Object.assign(
    {
      site: (market && market.siteName) || 'Employed',
      country: (market && market.country) || ''
    },
    vars || {}
  );
  var titleKey = 'seo.' + key + '.title';
  var descKey = 'seo.' + key + '.description';
  SEO.set({
    title: t(titleKey, ctx),
    meta: { description: t(descKey, ctx) },
    og: {
      title: t(titleKey, ctx),
      description: t(descKey, ctx),
      type: 'website'
    }
  });

  // A9.23 — canonical + hreflang. mdg:seo doesn't expose link tags
  // natively, so we manage them by hand. Path is taken from the
  // current Iron Router controller (avoids re-deriving from the URL
  // which would include hash + query params).
  applyHreflangAndCanonical(vars && vars.canonicalPath);
};

// A9.23 — single source of truth for canonical/hreflang link tags. We
// remove any previously-injected tags before adding the new ones so
// route transitions don't accumulate stale alternates.
function applyHreflangAndCanonical(overridePath) {
  if (typeof document === 'undefined') return;
  // Drop our own previously-rendered tags. The `data-managed-by`
  // marker means we never touch link tags written by other code.
  var stale = document.querySelectorAll('link[data-managed-by="employed-seo"]');
  for (var i = 0; i < stale.length; i++) {
    stale[i].parentNode.removeChild(stale[i]);
  }

  var path = overridePath ||
    (typeof Router !== 'undefined' && Router.current && Router.current() &&
      Router.current().route && Router.current().route.path(Router.current().params)) ||
    (typeof window !== 'undefined' && window.location ? window.location.pathname : '');

  var head = document.head || document.getElementsByTagName('head')[0];
  if (!head) return;

  // Canonical: always the current market's hostname + path.
  var canonicalHref;
  try {
    canonicalHref = Meteor.absoluteUrl(path.replace(/^\//, ''));
  } catch (e) { canonicalHref = path; }
  head.appendChild(makeLink('canonical', canonicalHref));

  // hreflang: one tag per supported locale, plus an x-default that
  // points at the active locale (sensible default for crawlers that
  // don't speak any of our markets).
  var locales = (typeof LOCALES !== 'undefined' && LOCALES) || ['en'];
  for (var j = 0; j < locales.length; j++) {
    var loc = locales[j];
    head.appendChild(makeLink('alternate', canonicalHref, loc));
  }
  head.appendChild(makeLink('alternate', canonicalHref, 'x-default'));
}

function makeLink(rel, href, hreflang) {
  var el = document.createElement('link');
  el.setAttribute('rel', rel);
  el.setAttribute('href', href);
  if (hreflang) el.setAttribute('hreflang', hreflang);
  el.setAttribute('data-managed-by', 'employed-seo');
  return el;
}

// A9.23 — inject a JSON-LD `<script>` tag. Used by jobs/job.js to
// publish JobPosting structured data so postings appear in Google for
// Jobs and other crawlers that key off schema.org. Removes any prior
// JSON-LD we injected before adding the new one (one block per page).
applyJsonLd = function (obj) {
  if (typeof document === 'undefined' || !obj) return;
  var stale = document.querySelectorAll('script[data-managed-by="employed-seo-jsonld"]');
  for (var i = 0; i < stale.length; i++) {
    stale[i].parentNode.removeChild(stale[i]);
  }
  var script = document.createElement('script');
  script.setAttribute('type', 'application/ld+json');
  script.setAttribute('data-managed-by', 'employed-seo-jsonld');
  try {
    script.text = JSON.stringify(obj);
  } catch (e) { return; }
  (document.head || document.getElementsByTagName('head')[0]).appendChild(script);
};

clearJsonLd = function () {
  if (typeof document === 'undefined') return;
  var stale = document.querySelectorAll('script[data-managed-by="employed-seo-jsonld"]');
  for (var i = 0; i < stale.length; i++) {
    stale[i].parentNode.removeChild(stale[i]);
  }
};
