// A9.14 — Sentry client-side wiring.
//
// **Operator setup:**
//   1. Run `meteor npm install @sentry/browser` (declared in
//      package.json once A9.14 lands).
//   2. Populate `settings.public.sentry.dsn` with the *browser* DSN.
//      (Sentry treats the browser DSN as effectively public; it only
//      identifies the project, not the writer.)
//   3. Optionally populate `settings.public.sentry.environment` and
//      `settings.public.sentry.release`.
//
// If the DSN is absent the reporter is a hard no-op.
//
// This file uses the browser SDK from `meteor/npm-mongo`-style
// `Meteor.require` pattern: `Package` is not available client-side,
// so we use the global injected by `@sentry/browser`'s UMD build if
// the operator has loaded it via a `<script>` tag, OR fall back to a
// dynamic require if Meteor's modules wrapper exposes it.

Meteor.startup(function() {
  var settings = (Meteor.settings && Meteor.settings.public && Meteor.settings.public.sentry) || {};
  var dsn = settings.dsn;

  if (!dsn || dsn === 'YOUR_SENTRY_PUBLIC_DSN_HERE') {
    return;
  }

  var Sentry = (typeof window !== 'undefined') ? window.Sentry : null;

  // If the SDK was not loaded via UMD, attempt the meteor/npm path.
  // Wrapped in try/catch so a missing module never breaks the page.
  if (!Sentry) {
    try {
      // eslint-disable-next-line global-require
      Sentry = require('@sentry/browser');
    } catch (e) {
      // Soft-fail. No console.error so the page stays clean.
      return;
    }
  }

  if (!Sentry || typeof Sentry.init !== 'function') return;

  Sentry.init({
    dsn: dsn,
    environment: settings.environment || (Meteor.isDevelopment ? 'development' : 'production'),
    release: settings.release || undefined,
    tracesSampleRate: Number(settings.tracesSampleRate || 0),
    // Strip the login token from URLs / breadcrumbs.
    beforeSend: function(event) {
      try {
        if (event.request && event.request.url) {
          event.request.url = event.request.url.replace(/([?&])token=[^&]*/g, '$1token=REDACTED');
        }
        if (event.breadcrumbs) {
          event.breadcrumbs = _.map(event.breadcrumbs, function(b) {
            if (b && b.data && b.data.url) {
              b.data.url = String(b.data.url).replace(/([?&])token=[^&]*/g, '$1token=REDACTED');
            }
            return b;
          });
        }
      } catch (e) { /* swallow */ }
      return event;
    }
  });
});
