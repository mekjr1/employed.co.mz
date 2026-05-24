// A10.0 — M-Pesa Vodacom Moçambique provider (simulator + real-key stub).
//
// Mozambique's #1 mobile-money rail. Real integration uses Vodacom's
// "M-Pesa Push" REST API (https://developer.mpesa.vm.co.mz/) — the
// merchant POSTs a C2B (customer-to-business) transaction request, the
// payer's phone gets an STK-like prompt asking for their PIN, and the
// settled status is POSTed back to a configured callback URL.
//
// This module supports two modes selected by settings.private.mpesa.simulate:
//
//   simulate: true  (default, no real API keys required)
//     We mint a synthetic providerRef, immediately set the intent to
//     'awaiting_user', then schedule a Meteor.setTimeout to settle the
//     intent (success or simulated failure) after ~6 seconds. The UI
//     polls payment.status and sees the transition.
//
//   simulate: false (real Vodacom API)
//     Stub — throws 'not-implemented'. When real keys arrive, this
//     branch wires up the HTTP call to apisandbox.developer.mpesa.vm.co.mz
//     (sandbox) or api.mpesa.vm.co.mz (prod), persists the ConversationID
//     as providerRef, and the inbound webhook (server/mpesa-webhook.js,
//     to be added in the same PR as real keys) does the settlement.
//
// SIMULATOR TEST MSISDNs (Mozambique format, +258 prefix optional)
//   841111111   → succeeds in ~1s (smoke test)
//   842222222   → succeeds in ~6s (default happy path)
//   843333333   → fails: 'insufficient_funds'
//   844444444   → fails: 'user_timeout' (PIN not entered)
//   848888888   → fails: 'wrong_pin'
//   anything else → succeeds in ~6s
//
// Privacy: only the last 4 digits of the MSISDN are persisted on the
// PaymentIntent. The full number is SHA-256 hashed with private.ipSalt
// for the rare reconciliation case where we need to match two intents
// to the same payer without storing PII.

if (Meteor.isServer) {
  var crypto = Npm.require('crypto');

  /* global verifyMpesaWebhookSignature:true */
  /**
   * Verify the HMAC-SHA256 signature on an inbound M-Pesa webhook callback.
   * The provider POSTs a JSON body and signs it with the shared secret
   * configured in settings.private.mpesa.webhookSecret. When no secret is
   * configured (simulator mode), verification is skipped and a log warning
   * is emitted so operators see it in production monitoring.
   *
   * @param {Object} req  — incoming HTTP request (Node IncomingMessage)
   * @returns {Boolean}   — true when the signature is valid (or skipped)
   * @throws {Meteor.Error} when the signature is present but invalid
   */
  verifyMpesaWebhookSignature = function(req, rawBody) {
    var secret = Meteor.settings.private &&
                 Meteor.settings.private.mpesa &&
                 Meteor.settings.private.mpesa.webhookSecret;

    if (!secret) {
      log.warn('mpesa.webhook.no_secret', {
        hint: 'Set Meteor.settings.private.mpesa.webhookSecret to enable signature verification.'
      });
      return true; // allow in dev/simulator
    }

    var signature = req.headers['x-mpesa-signature'] ||
                    req.headers['x-callback-signature'] || '';
    if (!signature) {
      throw new Meteor.Error('mpesa-webhook-unsigned',
        'Missing webhook signature header.');
    }

    var expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody || '')
      .digest('hex');

    var valid = crypto.timingSafeEqual
      ? crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))
      : (signature === expected);

    if (!valid) {
      log.warn('mpesa.webhook.bad_signature', {
        receivedPrefix: signature.slice(0, 8) + '…'
      });
      throw new Meteor.Error('mpesa-webhook-invalid-signature',
        'Webhook signature verification failed.');
    }
    return true;
  };

  /**
   * Normalize a Mozambique MSISDN. Accepts:
   *   84xxxxxxx, 85xxxxxxx          (9 digits, no country code)
   *   25884xxxxxxx                  (with country code)
   *   +25884xxxxxxx                 (E.164)
   * Returns the bare 9-digit subscriber number (e.g. '841234567')
   * or null if it doesn't look like a valid MZ Vodacom/Movitel number.
   */
  function normalizeMsisdn(raw) {
    if (!raw || typeof raw !== 'string') return null;
    var digits = raw.replace(/\D+/g, '');
    if (digits.length === 9) return digits;
    if (digits.length === 12 && digits.indexOf('258') === 0) return digits.slice(3);
    if (digits.length === 11 && digits.indexOf('258') === 0) return digits.slice(3);
    return null;
  }

  function isMpesaMsisdn(msisdn) {
    // Vodacom MZ prefix is 84 or 85. (e-Mola/Movitel = 86/87.)
    return /^8[45]\d{7}$/.test(msisdn);
  }

  function hashMsisdn(msisdn) {
    var salt = (Meteor.settings.private && Meteor.settings.private.ipSalt) || 'unsalted';
    return crypto.createHash('sha256').update(salt + ':' + msisdn).digest('hex').slice(0, 32);
  }

  // Decide simulator outcome from the test MSISDN above.
  function simulatorOutcomeFor(msisdn) {
    switch (msisdn) {
      case '841111111': return { status: 'completed', delayMs: 1000 };
      case '843333333': return { status: 'failed', delayMs: 4000, reason: 'insufficient_funds' };
      case '844444444': return { status: 'failed', delayMs: 30000, reason: 'user_timeout' };
      case '848888888': return { status: 'failed', delayMs: 3000, reason: 'wrong_pin' };
      default:          return { status: 'completed', delayMs: 6000 };
    }
  }

  Meteor.startup(function() {
    var cfg = (Meteor.settings.private && Meteor.settings.private.mpesa) || {};
    // Default to simulator mode when no shortcode is configured. This
    // keeps the dev/UAT path working out of the box once the user has
    // applied this PR but hasn't obtained Vodacom keys yet.
    var simulate = (cfg.simulate !== false) || !cfg.shortcode;

    if (!simulate) {
      log.warn('mpesa.init.real_mode_not_implemented', {
        hint: 'Vodacom REST integration ships in a separate PR'
      });
      // Still register so the UI can show the button — but initiate()
      // will throw a clear error. Better than silently hiding it and
      // having the user wonder why.
    }

    Payments.register({
      key: 'mpesa',
      name: 'M-Pesa',
      markets: ['mz'],
      simulator: simulate,
      ui: { collect: 'msisdn' },

      initiate: function(args) {
        if (!simulate) {
          throw new Meteor.Error('mpesa-not-implemented',
            'M-Pesa real-mode integration is not yet wired up. Set ' +
            'Meteor.settings.private.mpesa.simulate = true to use the simulator.');
        }

        var msisdn = normalizeMsisdn(args.payerMsisdn);
        if (!msisdn || !isMpesaMsisdn(msisdn)) {
          throw new Meteor.Error('mpesa-invalid-msisdn',
            'Please enter a valid Vodacom M-Pesa number (starts with 84 or 85).');
        }

        var providerRef = 'sim-mpesa-' + Random.id(12);
        var outcome = simulatorOutcomeFor(msisdn);

        // Stamp the intent immediately so the client poll sees something.
        PaymentIntents.update(args.intentId, {
          $set: {
            providerRef: providerRef,
            status: 'awaiting_user',
            payerMsisdn: msisdn.slice(-4),
            payerMsisdnHash: hashMsisdn(msisdn),
            simulator: true,
            updatedAt: new Date(),
            'meta.simulatorOutcome': outcome.status,
            'meta.simulatorReason': outcome.reason || null
          }
        });

        // Schedule the settlement. Meteor.setTimeout binds Fibers
        // correctly so the closure has a valid Meteor context.
        Meteor.setTimeout(Meteor.bindEnvironment(function() {
          settleSimulatedIntent(args.intentId, outcome);
        }), outcome.delayMs);

        log.info('mpesa.simulate.initiated', {
          intentId: args.intentId,
          jobId: args.jobId,
          providerRef: providerRef,
          msisdnLast4: msisdn.slice(-4),
          plannedOutcome: outcome.status,
          delayMs: outcome.delayMs
        });

        return {
          kind: 'await',
          providerRef: providerRef,
          // The client renders this as "Check your phone..." copy.
          prompt: 'mpesa.prompt.check_phone'
        };
      },

      status: function(providerRef) {
        var intent = PaymentIntents.findOne({ providerRef: providerRef });
        if (!intent) {
          return { status: 'expired', failureReason: 'unknown_ref' };
        }
        return {
          status: intent.status,
          failureReason: intent.failureReason,
          settledAt: intent.settledAt
        };
      }
    });
  });
}
