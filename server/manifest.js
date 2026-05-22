// A10.0 — Dynamic, per-market PWA manifest.
//
// Each subdomain (mx.* and mz.*) serves its own `/manifest.json` so the
// install banner shows the right name, theme color and language tag.
// The old static public/manifest.json is left in place as a fallback —
// if this handler fails to install (Meteor.startup error, no WebApp
// global), the static file still works for the default market.
//
// We use rawConnectHandlers so we run BEFORE the static-files middleware
// — otherwise the file in /public would shadow this dynamic response.

var PATH = '/manifest.json';
var ALT_PATH = '/manifest.webmanifest'; // RFC-recommended extension

// Fallback when a request comes from an unrecognized host (e.g. raw IP,
// localhost without a market subdomain). Mozambique is the canonical
// production deployment, so default to mz.
var DEFAULT_MARKET_KEY = 'mz';

// Per-market overrides. Keep in sync with both/lib/constants.js MARKETS.
// Background color stays neutral (#FFFFFF) per the existing static
// manifest so the splash screen doesn't flash a different color.
var MARKET_MANIFESTS = {
  mx: {
    name: 'Employed MX',
    short_name: 'Employed MX',
    description: 'Empleos locales en México — busca y publica vacantes.',
    lang: 'es-MX',
    theme_color: '#4F46E5',
    background_color: '#FFFFFF',
    start_url: '/?utm_source=pwa&market=mx',
    scope: '/',
    dir: 'ltr',
    categories: ['business', 'productivity']
  },
  mz: {
    name: 'Employed MZ',
    short_name: 'Employed MZ',
    description: 'Vagas locais em Moçambique — procurar e publicar vagas.',
    lang: 'pt-MZ',
    theme_color: '#4F46E5',
    background_color: '#FFFFFF',
    start_url: '/?utm_source=pwa&market=mz',
    scope: '/',
    dir: 'ltr',
    categories: ['business', 'productivity']
  }
};

// Shared icon set — every market uses the same artwork. If/when each
// market gets its own logo, fork this into MARKET_MANIFESTS[key].icons.
var ICONS = [
  { src: '/images/icon-192x192.png',          sizes: '192x192', type: 'image/png' },
  { src: '/images/icon-512x512.png',          sizes: '512x512', type: 'image/png' },
  { src: '/images/maskable-icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
  { src: '/images/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
];

// Quick mobile-money-style shortcuts surfaced when the user long-presses
// the installed icon (Android Chrome / Edge).
function shortcutsFor(marketKey) {
  if (marketKey === 'mz') {
    return [
      { name: 'Procurar vagas', url: '/jobs', description: 'Veja vagas em Moçambique' },
      { name: 'Publicar vaga', url: '/new',  description: 'Crie uma nova publicação' }
    ];
  }
  return [
    { name: 'Buscar empleos', url: '/jobs', description: 'Vacantes en México' },
    { name: 'Publicar empleo', url: '/new', description: 'Crear una nueva publicación' }
  ];
}

function marketKeyFromHost(host) {
  if (!host) return DEFAULT_MARKET_KEY;
  // host is e.g. 'mz.lvh.me:3001' or 'mx.employed.co.mz'
  var firstLabel = String(host).split(':')[0].split('.')[0].toLowerCase();
  if (MARKET_MANIFESTS[firstLabel]) return firstLabel;
  return DEFAULT_MARKET_KEY;
}

function buildManifest(marketKey) {
  var m = MARKET_MANIFESTS[marketKey] || MARKET_MANIFESTS[DEFAULT_MARKET_KEY];
  return {
    name: m.name,
    short_name: m.short_name,
    description: m.description,
    lang: m.lang,
    dir: m.dir,
    start_url: m.start_url,
    scope: m.scope,
    display: 'standalone',
    orientation: 'portrait',
    background_color: m.background_color,
    theme_color: m.theme_color,
    categories: m.categories,
    icons: ICONS,
    shortcuts: shortcutsFor(marketKey)
  };
}

function handle(req, res) {
  if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Method Not Allowed');
    return;
  }
  var host = req.headers && req.headers.host;
  var marketKey = marketKeyFromHost(host);
  var body = JSON.stringify(buildManifest(marketKey));

  res.statusCode = 200;
  // application/manifest+json is the canonical type; some older user
  // agents accept application/json too. The Vary header tells caches
  // to keep one copy per host so mx and mz don't collide.
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.setHeader('Vary', 'Host');
  res.end(body);
}

Meteor.startup(function() {
  if (typeof WebApp === 'undefined' || !WebApp.rawConnectHandlers) {
    log.warn('manifest.no_rawconnecthandlers');
    return;
  }

  // Intercept BOTH paths — RFC says .webmanifest is preferred; we keep
  // .json for backwards-compat with the existing main.html <link>.
  WebApp.rawConnectHandlers.use(PATH, Meteor.bindEnvironment(handle));
  WebApp.rawConnectHandlers.use(ALT_PATH, Meteor.bindEnvironment(handle));

  log.info('manifest.dynamic.installed', { paths: [PATH, ALT_PATH] });
});
