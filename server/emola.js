// A10.0 — e-Mola (Movitel Moçambique) provider (simulator + real-key stub).
//
// Mozambique's #2 mobile-money rail, run by Movitel. Real integration
// follows the same general shape as M-Pesa (POST request, payer enters
// PIN on a phone prompt, callback POST settles the intent). The
// provider's API docs live behind a partner agreement so the stub
// here is conservative: it just throws when simulate is false.
//
// MOVITEL MSISDN PREFIXES: 86 or 87 (9-digit subscriber number).
//
// SIMULATOR TEST MSISDNs
//   861111111   → succeeds in ~1s
//   862222222   → succeeds in ~5s (default happy path)
//   863333333   → fails: 'insufficient_funds'
//   864444444   → fails: 'user_timeout'
//   868888888   → fails: 'wrong_pin'
//   anything else → succeeds in ~5s
//
// See server/mpesa.js for the full rationale on simulator design,
// privacy handling (hash + last-4), and the settlement timer.

if (Meteor.isServer) {
  var crypto = Npm.require('crypto');

  /* global verifyEmolaWebhookSignature:true */
  /**
   * Verify the HMAC-SHA256 signature on an inbound e-Mola webhook callback.
   * Mirrors the M-Pesa verifier — same pattern, different settings key.
   *
   * @param {Object} req      — incoming HTTP request (Node IncomingMessage)
   * @param {String} rawBody  — raw request body as a string
   * @returns {Boolean}       — true when the signature is valid (or skipped)
   * @throws {Meteor.Error}   when the signature is present but invalid
   */
  verifyEmolaWebhookSignature = function(req, rawBody) {
    var secret = Meteor.settings.private &&
                 Meteor.settings.private.emola &&
                 Meteor.settings.private.emola.webhookSecret;

    if (!secret) {
      log.warn('emola.webhook.no_secret', {
        hint: 'Set Meteor.settings.private.emola.webhookSecret to enable signature verification.'
      });
      return true; // allow in dev/simulator
    }

    var signature = req.headers['x-emola-signature'] ||
                    req.headers['x-callback-signature'] || '';
    if (!signature) {
      throw new Meteor.Error('emola-webhook-unsigned',
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
      log.warn('emola.webhook.bad_signature', {
        receivedPrefix: signature.slice(0, 8) + '…'
      });
      throw new Meteor.Error('emola-webhook-invalid-signature',
        'Webhook signature verification failed.');
    }
    return true;
  };

  function normalizeMsisdn(raw) {
    if (!raw || typeof raw !== 'string') return null;
    var digits = raw.replace(/\D+/g, '');
    if (digits.length === 9) return digits;
    if (digits.length === 12 && digits.indexOf('258') === 0) return digits.slice(3);
    if (digits.length === 11 && digits.indexOf('258') === 0) return digits.slice(3);
    return null;
  }

  function isEmolaMsisdn(msisdn) {
    return /^8[67]\d{7}$/.test(msisdn);
  }

  function hashMsisdn(msisdn) {
    var salt = (Meteor.settings.private && Meteor.settings.private.ipSalt) || 'unsalted';
    return crypto.createHash('sha256').update(salt + ':' + msisdn).digest('hex').slice(0, 32);
  }

  function simulatorOutcomeFor(msisdn) {
    switch (msisdn) {
      case '861111111': return { status: 'completed', delayMs: 1000 };
      case '863333333': return { status: 'failed', delayMs: 3500, reason: 'insufficient_funds' };
      case '864444444': return { status: 'failed', delayMs: 30000, reason: 'user_timeout' };
      case '868888888': return { status: 'failed', delayMs: 2500, reason: 'wrong_pin' };
      default:          return { status: 'completed', delayMs: 5000 };
    }
  }

  Meteor.startup(function() {
    var cfg = (Meteor.settings.private && Meteor.settings.private.emola) || {};
    var simulate = (cfg.simulate !== false) || !cfg.partnerId;

    if (!simulate) {
      log.warn('emola.init.real_mode_not_implemented');
    }

    Payments.register({
      key: 'emola',
      name: 'e-Mola',
      markets: ['mz'],
      simulator: simulate,
      ui: { collect: 'msisdn' },

      initiate: function(args) {
        if (!simulate) {
          throw new Meteor.Error('emola-not-implemented',
            'e-Mola real-mode integration is not yet wired up. Set ' +
            'Meteor.settings.private.emola.simulate = true to use the simulator.');
        }

        var msisdn = normalizeMsisdn(args.payerMsisdn);
        if (!msisdn || !isEmolaMsisdn(msisdn)) {
          throw new Meteor.Error('emola-invalid-msisdn',
            'Please enter a valid Movitel e-Mola number (starts with 86 or 87).');
        }

        var providerRef = 'sim-emola-' + Random.id(12);
        var outcome = simulatorOutcomeFor(msisdn);

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

        Meteor.setTimeout(Meteor.bindEnvironment(function() {
          settleSimulatedIntent(args.intentId, outcome);
        }), outcome.delayMs);

        log.info('emola.simulate.initiated', {
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
          prompt: 'emola.prompt.check_phone'
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
