// B2.7: server-side Stripe SDK initialization.
//
// Replaces the old `copleykj:stripe-sync` global. We `require` the npm
// `stripe` package (listed in package.json) defensively so the server can
// still boot if dependencies haven't been installed yet or if the secret
// key isn't configured. In either case `Stripe` is `null` and the
// `featuredJob.checkout` method throws a clear "stripe-not-configured"
// error rather than crashing on startup.

Stripe = null;

Meteor.startup(function() {
  var settings = (Meteor.settings.private && Meteor.settings.private.stripe) || {};
  // Backwards-compat: the old top-level "Stripe": { "secretKey": ... }
  // block in settings continues to work.
  var legacySecret = Meteor.settings.Stripe && Meteor.settings.Stripe.secretKey;
  var envSecret = process.env.STRIPE_SECRET_KEY;
  var secretKey = envSecret || settings.secretKey || legacySecret;

  if (!secretKey) {
    log.warn('stripe.init.no_secret_key');
    return;
  }

  var stripeLib;
  try {
    stripeLib = Npm.require('stripe');
  } catch (e) {
    log.warn('stripe.init.npm_package_missing', { hint: 'meteor npm install stripe' });
    return;
  }

  try {
    Stripe = stripeLib(secretKey, {
      apiVersion: '2024-06-20',
      maxNetworkRetries: 2,
      timeout: 20000
    });
    log.info('stripe.init.ok');
  } catch (e) {
    log.error('stripe.init.failed', { error: e && e.message });
    Stripe = null;
  }
});
