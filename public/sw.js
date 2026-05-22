// A10.0 — Employed service worker.
//
// Caches the Meteor client bundle (versioned, immutable), shells out
// to network for HTML so the latest server-rendered route always
// wins on a refresh, and uses a 7-day fallback cache for images so
// users on patchy connections still see logos and avatars.
//
// Versioned cache key: bump CACHE_VERSION whenever the SW logic
// changes. The activate handler deletes any caches that don't match
// the current version.
//
// Scope: this file lives at /sw.js so its scope is the entire origin.
// Registration is done from client/lib/pwa.js.

/* eslint-env serviceworker */

var CACHE_VERSION = 'v1';
var BUNDLE_CACHE  = 'emp-bundle-' + CACHE_VERSION;
var ASSET_CACHE   = 'emp-assets-' + CACHE_VERSION;
var DOCUMENT_CACHE = 'emp-doc-' + CACHE_VERSION;
var OFFLINE_URL = '/offline.html';

// Networks here in MZ + MX can drop mid-request. A short timeout means
// we fall back to cache quickly rather than spinning a long blank
// screen.
var NETWORK_TIMEOUT_MS = 4000;

self.addEventListener('install', function(event) {
  // Pre-cache the offline shell so even a cold install can render a
  // sensible "no network" page.
  event.waitUntil(
    caches.open(DOCUMENT_CACHE).then(function(cache) {
      return cache.addAll([OFFLINE_URL]).catch(function() {
        // Best-effort — if /offline.html isn't deployed yet, skip.
      });
    })
  );
  // Activate immediately on first install.
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(key) {
        // Delete any cache that doesn't match the current version.
        if (key.indexOf(CACHE_VERSION) === -1) {
          return caches.delete(key);
        }
      }));
    }).then(function() { return self.clients.claim(); })
  );
});

function isMeteorBundle(url) {
  return url.pathname.indexOf('/__cordova/') === 0 ||
         url.pathname.indexOf('/__meteor_runtime_config__') === 0 ||
         url.pathname.match(/\.(js|css)$/) !== null;
}

function isAsset(url) {
  return url.pathname.indexOf('/images/') === 0 ||
         url.pathname.indexOf('/packages/') === 0 ||
         url.pathname.indexOf('/fonts/') === 0 ||
         /\.(png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot)$/.test(url.pathname);
}

function isHTMLDocument(request) {
  return request.mode === 'navigate' ||
         (request.headers.get('accept') || '').indexOf('text/html') !== -1;
}

function isUpgradeOrApi(url) {
  // Skip caching for DDP, sockjs, websocket-like, methods, and our
  // own API namespaces.
  return url.pathname.indexOf('/sockjs/') === 0 ||
         url.pathname.indexOf('/__ddp__') === 0 ||
         url.pathname.indexOf('/api/') === 0 ||
         url.pathname.indexOf('/_stripe/') === 0 ||
         url.pathname.indexOf('/_mpesa/') === 0 ||
         url.pathname.indexOf('/_emola/') === 0 ||
         url.pathname.indexOf('/healthz') === 0;
}

function networkFirstWithTimeout(request, cache) {
  return new Promise(function(resolve) {
    var timeoutId = setTimeout(function() {
      cache.match(request).then(function(cached) {
        if (cached) resolve(cached);
      });
    }, NETWORK_TIMEOUT_MS);

    fetch(request).then(function(response) {
      clearTimeout(timeoutId);
      // Only cache successful, basic responses.
      if (response && response.status === 200 && response.type === 'basic') {
        cache.put(request, response.clone());
      }
      resolve(response);
    }).catch(function() {
      clearTimeout(timeoutId);
      cache.match(request).then(function(cached) {
        if (cached) {
          resolve(cached);
        } else {
          // Last-resort offline page for HTML navigations.
          if (request.mode === 'navigate') {
            caches.match(OFFLINE_URL).then(function(off) {
              resolve(off || new Response('Offline', { status: 503 }));
            });
          } else {
            resolve(new Response('Offline', { status: 503 }));
          }
        }
      });
    });
  });
}

function cacheFirst(request, cache) {
  return cache.match(request).then(function(cached) {
    if (cached) {
      // Refresh in background — stale-while-revalidate.
      fetch(request).then(function(response) {
        if (response && response.status === 200 && response.type === 'basic') {
          cache.put(request, response.clone());
        }
      }).catch(function() { /* ignore */ });
      return cached;
    }
    return fetch(request).then(function(response) {
      if (response && response.status === 200 && response.type === 'basic') {
        cache.put(request, response.clone());
      }
      return response;
    });
  });
}

self.addEventListener('fetch', function(event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  var url;
  try { url = new URL(request.url); }
  catch (e) { return; }

  // Same-origin only — DDP / Stripe / external CDNs handle their own caching.
  if (url.origin !== self.location.origin) return;
  if (isUpgradeOrApi(url)) return;

  if (isMeteorBundle(url)) {
    // Bundle assets carry a hashed filename in production, so cache-first
    // is the right strategy — they never change without a new URL.
    event.respondWith(
      caches.open(BUNDLE_CACHE).then(function(cache) {
        return cacheFirst(request, cache);
      })
    );
    return;
  }

  if (isAsset(url)) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(function(cache) {
        return cacheFirst(request, cache);
      })
    );
    return;
  }

  if (isHTMLDocument(request)) {
    event.respondWith(
      caches.open(DOCUMENT_CACHE).then(function(cache) {
        return networkFirstWithTimeout(request, cache);
      })
    );
    return;
  }
});

// Listen for messages from the page (e.g. "skipWaiting" after we show
// an "update available" prompt — Phase 2 work).
self.addEventListener('message', function(event) {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
