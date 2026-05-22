// A10.0 — PaymentIntents collection.
//
// Tracks every payment attempt across all providers (Stripe, M-Pesa,
// e-Mola). One doc per initiate() call, mutated as the provider returns
// status updates (webhook for Stripe; simulator timer for the mobile-
// money simulators; future real callbacks for M-Pesa Push / e-Mola).
//
// Why a separate collection (and not just stamping on Jobs)?
//   - Multiple attempts per job (a retry after a failed M-Pesa push is
//     a brand-new intent — we want to see both in the audit trail).
//   - Cross-provider idempotency: the same logical purchase may be
//     attempted via Stripe first, then M-Pesa. The Jobs.featuredChargeHistory
//     array only tracks *successful* charges; pending/failed attempts
//     belong here.
//   - Webhook/poll endpoints can resolve by `providerRef` without
//     scanning Jobs.

PaymentIntents = new Mongo.Collection('paymentIntents');

// Schema is intentionally permissive (no SimpleSchema attached) because
// providers vary in the metadata they need. Shape documented here so
// future readers know what to expect:
//
//   _id              random Mongo id
//   jobId            FK → Jobs._id
//   userId           FK → Meteor.users._id
//   marketKey        'mx' | 'mz'
//   providerKey      'stripe' | 'mpesa' | 'emola'
//   providerRef      String — provider's transaction id (Stripe session
//                    id, M-Pesa ConversationID, e-Mola RequestID, or a
//                    simulator-generated 'sim-...' string).
//   status           'pending' | 'awaiting_user' | 'completed' |
//                    'failed' | 'cancelled' | 'expired'
//                    'awaiting_user' = the provider has pushed a prompt
//                    to the payer's phone and we're waiting for them to
//                    enter their PIN.
//   amount           Integer — minor currency units (cents/centavos).
//   currency         lowercase ISO ('mzn', 'mxn', 'usd').
//   payerMsisdn      String — last 4 digits only when persisted
//                    (privacy). Mobile-money providers only.
//   payerMsisdnHash  String — SHA-256(salt + full MSISDN) for dedup
//                    without storing the number.
//   extendedThrough  Date — what featuredThrough would become on success.
//                    Computed at initiate-time so the webhook/timer
//                    doesn't need to recompute (and so the user sees the
//                    same value through the polling UI).
//   failureReason    String — provider error message on terminal failure.
//   simulator        Boolean — true when this intent was created by a
//                    simulator provider (no real money moved).
//   meta             Object — provider-specific extras (Stripe session
//                    URL, M-Pesa ResultDesc, etc.).
//   createdAt        Date
//   updatedAt        Date
//   settledAt        Date — when status reached completed/failed/cancelled.

if (Meteor.isServer) {
  Meteor.startup(function() {
    // Status + provider scans (admin panels, reconciliation jobs).
    PaymentIntents._ensureIndex({ providerKey: 1, status: 1, createdAt: -1 });
    // Webhook / poll lookups by provider tx id.
    PaymentIntents._ensureIndex({ providerRef: 1 }, { unique: false });
    // Per-job history.
    PaymentIntents._ensureIndex({ jobId: 1, createdAt: -1 });
    // Per-user (settings → my payments).
    PaymentIntents._ensureIndex({ userId: 1, createdAt: -1 });
  });

  // Server-only deny rules. Clients NEVER write to this collection
  // directly — every mutation goes through a method that the provider
  // module owns.
  PaymentIntents.deny({
    insert: function() { return true; },
    update: function() { return true; },
    remove: function() { return true; }
  });
}

PaymentIntents.helpers = (typeof PaymentIntents.helpers === 'function')
  ? PaymentIntents.helpers
  : function() {};

if (typeof PaymentIntents.helpers === 'function') {
  PaymentIntents.helpers({
    isTerminal: function() {
      return this.status === 'completed' ||
             this.status === 'failed' ||
             this.status === 'cancelled' ||
             this.status === 'expired';
    },
    isPending: function() {
      return this.status === 'pending' || this.status === 'awaiting_user';
    }
  });
}
