// A10.0 — Settlement helpers for Payments providers.
//
// Mirrors server/stripe-webhook.js `setFeaturedFromSession` / `revokeFeatured`
// but reads/writes the PaymentIntents collection and works for ANY
// provider (Stripe via webhook, M-Pesa/e-Mola via simulator timer or
// future webhook). The Stripe webhook can adopt these helpers when we
// next touch that file — for now both paths coexist so existing flows
// stay green.
//
// settleSimulatedIntent is exposed as a global because the simulator
// modules (server/mpesa.js, server/emola.js) need to call it from
// inside a Meteor.setTimeout closure.

if (Meteor.isServer) {

  /**
   * Settle a payment intent and, on success, extend the job's
   * featuredThrough date. Idempotent on `providerRef` via Jobs.update
   * selector — a re-delivered webhook or timer is a no-op.
   *
   * @param {String} intentId
   * @param {Object} outcome  { status: 'completed'|'failed', reason?: string }
   */
  settleSimulatedIntent = function(intentId, outcome) {
    var intent = PaymentIntents.findOne(intentId);
    if (!intent) {
      log.warn('payments.settle.intent_not_found', { intentId: intentId });
      return;
    }
    if (intent.status === 'completed' || intent.status === 'failed' ||
        intent.status === 'cancelled' || intent.status === 'expired') {
      log.info('payments.settle.already_terminal', {
        intentId: intentId,
        status: intent.status
      });
      return;
    }

    var now = new Date();

    if (outcome.status === 'completed') {
      // Re-read the job fresh in case its featuredThrough has changed
      // since the intent was created (e.g. another payment landed first).
      var job = Jobs.findOne({ _id: intent.jobId });
      if (!job) {
        log.warn('payments.settle.job_missing', { intentId: intentId, jobId: intent.jobId });
        PaymentIntents.update(intentId, {
          $set: {
            status: 'failed',
            failureReason: 'job_deleted',
            settledAt: now,
            updatedAt: now
          }
        });
        return;
      }

      // Re-compute extendedThrough at settle time so we never overwrite
      // newer paid days.
      var basis = (job.featuredThrough && job.featuredThrough > now)
        ? job.featuredThrough
        : now;
      var extendedThrough = new Date(basis.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Atomic + idempotent (matches stripe-webhook.js logic).
      var marker = intent.providerRef ||
                   (intent.providerKey + ':' + intent._id);
      var updated = Jobs.update(
        { _id: job._id, featuredChargeHistory: { $ne: marker } },
        {
          $set: { featuredThrough: extendedThrough },
          $push: {
            featuredChargeHistory: { $each: [marker], $slice: -50 }
          }
        }
      );

      PaymentIntents.update(intentId, {
        $set: {
          status: 'completed',
          extendedThrough: extendedThrough,
          settledAt: now,
          updatedAt: now
        }
      });

      log.info('payments.settle.completed', {
        intentId: intentId,
        jobId: job._id,
        providerKey: intent.providerKey,
        providerRef: intent.providerRef,
        marker: marker,
        jobUpdated: updated,
        extendedThrough: extendedThrough.toISOString()
      });
    } else {
      // Failure path. Don't touch the job.
      PaymentIntents.update(intentId, {
        $set: {
          status: 'failed',
          failureReason: outcome.reason || 'unknown',
          settledAt: now,
          updatedAt: now
        }
      });
      log.info('payments.settle.failed', {
        intentId: intentId,
        jobId: intent.jobId,
        providerKey: intent.providerKey,
        reason: outcome.reason
      });
    }
  };
}
