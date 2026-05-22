// S8: defence-in-depth HTTP / CSP headers.
//
// Meteor serves no Content-Security-Policy by default. The Blaze layer
// renders `htmlDescription` as raw HTML (already sanitized via
// djedi:sanitize-html, see B1.5), so CSP is our second line of defence
// against XSS slipping through the sanitizer.
//
// We intentionally do NOT call `BrowserPolicy.content.disallowInlineScripts()`
// because useraccounts:bootstrap and AutoForm inject a handful of inline
// helpers; flipping that would break the sign-in dialog. The other
// directives are strict enough to be useful without breaking the app.

Meteor.startup(function () {
  if (typeof BrowserPolicy === 'undefined') {
    log.warn('security-headers.no_browser_policy');
    return;
  }

  // Block clickjacking from third-party origins.
  BrowserPolicy.framing.disallow();

  BrowserPolicy.content.setPolicy([
    "default-src 'self' https://www.google.com https://www.gstatic.com https://js.stripe.com https://checkout.stripe.com https://api.stripe.com",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com https://js.stripe.com https://checkout.stripe.com https://api.stripe.com",
    "connect-src * 'self' https://www.google.com https://www.gstatic.com https://js.stripe.com https://checkout.stripe.com https://api.stripe.com",
    "img-src data: 'self' https://www.google.com https://www.gstatic.com https://js.stripe.com https://checkout.stripe.com https://api.stripe.com https://*.gravatar.com https://secure.gravatar.com https://*.ucarecdn.com",
    "style-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com https://js.stripe.com https://checkout.stripe.com https://api.stripe.com https://fonts.googleapis.com https://maxcdn.bootstrapcdn.com",
    "font-src 'self' data: https://www.google.com https://www.gstatic.com https://js.stripe.com https://checkout.stripe.com https://api.stripe.com https://fonts.gstatic.com https://maxcdn.bootstrapcdn.com",
    "frame-src 'self' https://www.google.com https://www.gstatic.com https://js.stripe.com https://checkout.stripe.com https://api.stripe.com",
    "object-src 'none'"
  ].join('; '));
});

// Referrer-Policy + HSTS are not exposed by browser-policy; layer them on
// via WebApp directly. (force-ssl handles the redirect; HSTS handles the
// "never downgrade" hint that survives Meteor 3's force-ssl removal —
// see S9 in FIXES_PLAN.md.)
Meteor.startup(function () {
  if (typeof WebApp === 'undefined' || !WebApp.connectHandlers) {
    log.warn('security-headers.no_connecthandlers');
    return;
  }

  WebApp.connectHandlers.use(function (req, res, next) {
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // HSTS only when the request actually arrived over HTTPS or via a
    // proxy that forwarded the original scheme; otherwise we'd lock
    // local dev users out.
    var xfProto = req.headers && req.headers['x-forwarded-proto'];
    var isHttps = (req.connection && req.connection.encrypted) ||
      (xfProto && xfProto.split(',')[0].trim() === 'https');
    if (isHttps) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    next();
  });
});
