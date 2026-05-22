// Server startup checks.
//
// B2.9: a fresh clone of this repo ships a `settings-example.json`
// stuffed with obvious placeholder strings. If someone copies it
// verbatim and boots the server, they get a service that "runs" but
// silently exposes broken integrations (anonymous Stripe charges,
// reCAPTCHA bypass, mail from `replace-me`, etc.). The check below
// walks every string value in `Meteor.settings` and refuses to boot
// if any of them is still a known placeholder.
//
// S7: the reCAPTCHA dev-bypass flag lives in `public.recaptcha` only
// (see settings-{example,docker}.json). This check reads from the same
// place so client and server agree.

var SETTINGS_PLACEHOLDERS = [
  'Upload Care Public Key',
  'Stripe Publishable Key',
  'Stripe Secret Key',
  'Stripe Secret Key (sk_test_... or sk_live_...)',
  'Stripe Webhook Signing Secret (whsec_...)',
  'reCAPTCHA v3 Site Key',
  'reCAPTCHA v3 Secret Key',
  'Astronomer.io App Id',
  'Kadira App ID',
  'Kadira App Secret',
  'replace-me-with-a-random-32-char-string'
];

function findPlaceholderHits(node, path, hits) {
  if (node == null) return hits;
  if (typeof node === 'string') {
    if (SETTINGS_PLACEHOLDERS.indexOf(node) !== -1) {
      hits.push({ path: path, value: node });
    }
    return hits;
  }
  if (Array.isArray(node)) {
    for (var i = 0; i < node.length; i++) {
      findPlaceholderHits(node[i], path + '[' + i + ']', hits);
    }
    return hits;
  }
  if (typeof node === 'object') {
    var keys = Object.keys(node);
    for (var j = 0; j < keys.length; j++) {
      var k = keys[j];
      findPlaceholderHits(node[k], path ? path + '.' + k : k, hits);
    }
  }
  return hits;
}

Meteor.startup(function () {
  // B2.9: scan first. If the operator forgot to fill the template, fail
  // loudly before we touch the rest of the boot path.
  var placeholderHits = findPlaceholderHits(Meteor.settings || {}, '', []);
  if (placeholderHits.length) {
    // A9.45 — emit as structured log so the orchestrator's log aggregator
    // captures it the same way as a runtime error. The block below uses
    // console.error intentionally as a final, human-readable banner for
    // operators tailing `docker logs` who don't have a JSON parser handy.
    log.error('startup.settings_placeholders_present', { hits: placeholderHits });
    console.error('');
    console.error('========================================');
    console.error('ERROR: settings.json still contains placeholder values from the template.');
    console.error('Replace these before booting:');
    placeholderHits.forEach(function (hit) {
      console.error('  - ' + hit.path + ' = "' + hit.value + '"');
    });
    console.error('========================================');
    console.error('');
    throw new Error('settings.json contains placeholder values (B2.9). Refusing to boot.');
  }

  var privateRecaptchaSettings = (Meteor.settings.private && Meteor.settings.private.recaptcha) || {};
  var publicRecaptchaSettings = (Meteor.settings.public && Meteor.settings.public.recaptcha) || {};
  var bypassInDev = Meteor.isDevelopment && publicRecaptchaSettings.bypassInDevelopment === true;

  if (bypassInDev) {
    log.warn('startup.recaptcha_bypassed_in_dev', {
      flag: 'public.recaptcha.bypassInDevelopment'
    });
    return;
  }

  // Check for required reCAPTCHA configuration
  if (!privateRecaptchaSettings.v3SecretKey) {
    log.error('startup.recaptcha_missing_secret_key', {
      hint: 'Set Meteor.settings.private.recaptcha.v3SecretKey'
    });
    throw new Error('reCAPTCHA v3 Secret Key is required but not configured in settings.json');
  }

  if (!publicRecaptchaSettings.v3SiteKey) {
    log.error('startup.recaptcha_missing_site_key', {
      hint: 'Set Meteor.settings.public.recaptcha.v3SiteKey'
    });
    throw new Error('reCAPTCHA v3 Site Key is required but not configured in settings.json');
  }

  // Log successful configuration
  log.info('startup.recaptcha_configured', {
    scoreThreshold: privateRecaptchaSettings.scoreThreshold || 0.5
  });

  // A9.5 \u2014 Stripe is the payment processor for featured listings. In dev the
  // Stripe client is allowed to be unconfigured (featured purchases are
  // disabled, the rest of the app still boots). In production a missing
  // secret key OR webhook signing secret is a security/correctness bug: the
  // checkout endpoint would 500, and any webhook delivery that did arrive
  // would be processed without signature verification (since the verifier
  // short-circuits when no secret is set). Refuse to boot loudly so the
  // operator notices in the orchestrator logs rather than after a customer
  // hits a 500 in checkout.
  if (Meteor.isProduction) {
    var stripeSettings = (Meteor.settings.private && Meteor.settings.private.stripe) || {};
    var legacySecret = Meteor.settings.Stripe && Meteor.settings.Stripe.secretKey;
    var stripeSecret = process.env.STRIPE_SECRET_KEY || stripeSettings.secretKey || legacySecret;
    var stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || stripeSettings.webhookSecret;

    if (!stripeSecret) {
      log.error('startup.stripe_missing_secret_key', {
        hint: 'Set Meteor.settings.private.stripe.secretKey or STRIPE_SECRET_KEY before booting in production.'
      });
      throw new Error('A9.5: Stripe secretKey is required in production but was not configured.');
    }
    if (!stripeWebhookSecret) {
      log.error('startup.stripe_missing_webhook_secret', {
        hint: 'Set Meteor.settings.private.stripe.webhookSecret or STRIPE_WEBHOOK_SECRET so /\\_stripe/webhook can verify Stripe signatures.'
      });
      throw new Error('A9.5: Stripe webhookSecret is required in production but was not configured.');
    }
    log.info('startup.stripe_configured', {
      mode: String(stripeSecret).indexOf('sk_live_') === 0 ? 'live' : 'test'
    });
  }
});
