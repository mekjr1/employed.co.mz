// A10.0 — Stripe adapter for the Payments registry.
//
// Wraps the existing `Stripe` global (initialized in server/stripe.js)
// into the Payments interface. The actual Stripe.checkout.sessions.create
// call lives here. The webhook in server/stripe-webhook.js continues to
// settle the intent — we just stamp the PaymentIntent doc with the
// session id as `providerRef` so the webhook can mark it completed.
//
// On settlement, the webhook should call `settleStripeIntent(sessionId, jobId, extendedThrough)`
// to flip the matching PaymentIntent from 'pending' to 'completed'.

if (Meteor.isServer) {
  Meteor.startup(function() {
    // Defer registration one tick so server/stripe.js has run first.
    // Both files attach their Meteor.startup; order is not guaranteed
    // across files. A bindEnvironment + setTimeout(0) is the cheap fix.
    Meteor.setTimeout(Meteor.bindEnvironment(function() {
      if (!Stripe) {
        log.warn('payments.stripe.adapter.skipped', { reason: 'Stripe not initialized' });
        // Don't register — the UI will hide the Stripe option until keys arrive.
        return;
      }

      Payments.register({
        key: 'stripe',
        name: 'Stripe',
        markets: ['mx', 'mz'],
        simulator: false,
        ui: { collect: 'redirect' },

        initiate: async function(args) {
          // args.returnUrl / cancelUrl carry the absolute job URL.
          // args.customerEmail is optional.
          var minuteBucket = Math.floor(Date.now() / 60000);
          var idempotencyKey = ['featured', args.jobId, args.userId, minuteBucket].join(':');

          var session = await Stripe.checkout.sessions.create({
            mode: 'payment',
            success_url: args.returnUrl + '?featured=success&session_id={CHECKOUT_SESSION_ID}',
            cancel_url: args.cancelUrl + '?featured=cancel',
            customer_email: args.customerEmail || undefined,
            line_items: [{
              quantity: 1,
              price_data: {
                currency: args.currency,
                unit_amount: args.amount,
                product_data: {
                  name: APP_NAME + ' \u2014 Featured Job Post (30 days)',
                  description: args.jobTitle
                }
              }
            }],
            payment_intent_data: {
              metadata: {
                jobId: args.jobId,
                userId: args.userId,
                intentId: args.intentId
              }
            },
            metadata: {
              jobId: args.jobId,
              userId: args.userId,
              marketKey: args.marketKey,
              intentId: args.intentId,
              extendedThrough: args.extendedThrough.toISOString()
            }
          }, {
            idempotencyKey: idempotencyKey
          });

          // Stamp the intent with the session id so the webhook can
          // resolve back to it.
          PaymentIntents.update(args.intentId, {
            $set: {
              providerRef: session.id,
              status: 'pending',
              simulator: false,
              updatedAt: new Date(),
              'meta.stripeUrl': session.url
            }
          });

          return {
            kind: 'redirect',
            providerRef: session.id,
            url: session.url
          };
        },

        // Stripe doesn't do polling — the webhook owns settlement. The
        // status method just reads the persisted intent so the same
        // Meteor.call('payment.status', ...) path works from the client.
        status: function(providerRef) {
          var intent = PaymentIntents.findOne({ providerRef: providerRef });
          if (!intent) return { status: 'expired', failureReason: 'unknown_ref' };
          return {
            status: intent.status,
            failureReason: intent.failureReason,
            settledAt: intent.settledAt
          };
        }
      });
    }), 100);
  });
}
