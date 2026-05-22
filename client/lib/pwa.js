// A10.0 — PWA registration + install-prompt orchestration.
//
// Two responsibilities:
//
//   1. Register /sw.js once the page has reached `load`. Registration
//      is deferred so it never competes with the initial paint.
//
//   2. Capture the `beforeinstallprompt` event (Chrome/Edge on
//      Android + desktop) and stash the deferred prompt so the
//      installPromptBanner template can fire it on user gesture.
//
// Localhost detection is intentional: the SW only registers when we're
// over HTTPS OR on localhost — the spec requires a secure context. The
// dev origin `mz.lvh.me:3001` is technically loopback (127.0.0.1 +
// .lvh.me hostname trick) but browsers may still treat it as insecure
// for SW registration. To work around this in local dev, we register
// only when we see HTTPS, an explicit `meteor.allowInsecureSw=1` query
// param, or the literal localhost hostname.
//
// Deferred-prompt persistence:
//   localStorage 'pwa_install_dismissed_until' = ISO timestamp. The
//   installPromptBanner template reads this and stays hidden until
//   the date passes (default = 30 days after dismissal).

(function() {
  if (typeof window === 'undefined') return;

  // Expose a tiny global the banner template can call.
  window.EmpPWA = window.EmpPWA || {};
  window.EmpPWA.deferredPrompt = null;
  window.EmpPWA.canPrompt = new ReactiveVar(false);

  // ---- SW registration ----------------------------------------------
  function shouldRegisterSW() {
    if (!('serviceWorker' in navigator)) return false;
    // The spec requires a secure context. localhost is exempt; lvh.me
    // resolves to 127.0.0.1 so it's also a loopback. We err on the
    // side of registering — modern browsers will refuse if they
    // disagree.
    var loc = window.location;
    if (loc.protocol === 'https:') return true;
    if (loc.hostname === 'localhost') return true;
    if (loc.hostname === '127.0.0.1') return true;
    if (loc.hostname.indexOf('.lvh.me') !== -1) return true;
    return false;
  }

  function registerServiceWorker() {
    if (!shouldRegisterSW()) return;
    // Don't slow down the first paint.
    if (document.readyState === 'complete') {
      doRegister();
    } else {
      window.addEventListener('load', doRegister, { once: true });
    }
  }

  function doRegister() {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(function(reg) {
        // Listen for updates — if a new SW is waiting we could show an
        // "update available" toast in the future. For now we just log.
        if (reg && reg.waiting) {
          // A new SW is sitting idle — message it to take over.
          reg.waiting.postMessage('skipWaiting');
        }
        reg.addEventListener && reg.addEventListener('updatefound', function() {
          var newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', function() {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage('skipWaiting');
            }
          });
        });
      })
      .catch(function(err) {
        // Don't surface this to the user — SW is a progressive enhancement.
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('SW registration failed:', err);
        }
      });
  }

  // ---- Install prompt capture --------------------------------------
  window.addEventListener('beforeinstallprompt', function(e) {
    // Stop Chrome from showing its own banner — we want to control the
    // moment of truth (after the user has seen a job listing, not on
    // first navigation).
    e.preventDefault();
    window.EmpPWA.deferredPrompt = e;
    window.EmpPWA.canPrompt.set(true);
  });

  window.addEventListener('appinstalled', function() {
    window.EmpPWA.deferredPrompt = null;
    window.EmpPWA.canPrompt.set(false);
    try {
      window.localStorage.setItem('pwa_installed', '1');
    } catch (e) {}
  });

  // Public API used by the banner template ---------------------------
  window.EmpPWA.dismissForDays = function(days) {
    try {
      var until = new Date(Date.now() + (days || 30) * 24 * 60 * 60 * 1000);
      window.localStorage.setItem('pwa_install_dismissed_until', until.toISOString());
    } catch (e) {}
  };

  window.EmpPWA.shouldShowBanner = function() {
    if (!window.EmpPWA.canPrompt.get()) return false;
    if (!window.EmpPWA.deferredPrompt) return false;
    try {
      if (window.localStorage.getItem('pwa_installed')) return false;
      var until = window.localStorage.getItem('pwa_install_dismissed_until');
      if (until && new Date(until).getTime() > Date.now()) return false;
    } catch (e) {}
    // Only show on small viewports — install ROI is highest on phones.
    if (window.matchMedia && !window.matchMedia('(max-width: 767px)').matches) return false;
    return true;
  };

  window.EmpPWA.promptInstall = function() {
    var p = window.EmpPWA.deferredPrompt;
    if (!p) return Promise.resolve({ outcome: 'no_prompt' });
    p.prompt();
    return p.userChoice.then(function(choice) {
      window.EmpPWA.deferredPrompt = null;
      window.EmpPWA.canPrompt.set(false);
      return choice;
    });
  };

  Meteor.startup(registerServiceWorker);
})();
