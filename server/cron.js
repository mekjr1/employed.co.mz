// H3: scheduled job that flips `active` listings older than the 90-day
// window to `inactive`. Previously the codebase only filtered expired
// jobs at read time in publications, which meant `myJobs` / admin views
// kept showing them as "active" forever. Runs every 6 hours; on a fresh
// boot it also fires once so backfills run immediately.

// M7: import Sentry for cron error reporting.
var Sentry;
try {
  Sentry = require('@sentry/node');
} catch (_e) { /* Sentry not installed — graceful degrade */ }

var cronOptions = {
  log: true,
  collectionName: 'syncedCronHistory',
  utc: false
};

if (typeof SyncedCron.config === 'function') {
  SyncedCron.config(cronOptions);
} else {
  _.extend(SyncedCron.options, cronOptions);
}

SyncedCron.add({
  name: 'Expire 90-day-old active jobs',
  schedule: function(parser) {
    return parser.text('every 6 hours');
  },
  job: function() {
   try {
    var cutoff = daysUntilExpiration();
    var now = new Date();
    var result = Jobs.update({
      status: 'active',
      createdAt: { $lt: cutoff },
      $or: [
        { updatedAt: { $exists: false } },
        { updatedAt: { $lt: cutoff } }
      ]
    }, {
      $set: {
        status: 'inactive',
        expiredAt: now
      },
      // P1: bound the audit log to the last 100 entries (see
      // both/lib/methods.js for the same cap in admin transitions).
      $push: {
        statusHistory: {
          $each: [{
            at: now,
            by: 'system',
            from: 'active',
            to: 'inactive',
            reason: 'Auto-expired after 90 days'
          }],
          $slice: -100
        }
      }
    }, { multi: true });

    log.info('cron.expire_jobs', { expired: result });
    return result;
   } catch (e) {
    log.error('cron.expire_jobs.failed', { error: e && e.message });
    if (typeof Sentry !== 'undefined' && Sentry.captureException) {
      Sentry.captureException(e);
    }
    throw e;
   }
  }
});

// A9.3 — destructive sweep that removes accounts whose 30-day deletion
// deadline has passed. The user requests deletion via
// 'users.requestAccountDeletion', which stamps `deletionScheduledFor`;
// this cron then removes the account, its sessions, and every job they
// posted.
//
// ⚠️ WARNING — this cron is irreversibly destructive. Before enabling
// in production:
//   1. Verify that 'users.cancelAccountDeletion' is reachable from the
//      account page (client/views/user/userAccount.html) so a user can
//      back out before the deadline.
//   2. Take a Mongo backup. Operators are responsible for retention; we
//      do not soft-delete or archive removed records.
//   3. Smoke-test against a staging dataset:
//        - confirm the cron only matches users whose
//          deletionScheduledFor is in the past;
//        - confirm Stripe charge history etc. is *not* needed for
//          accounting once the user record is gone (we retain Stripe-
//          side data via the webhook event log).
//
// Marked as TODO-for-operator: until you've taken those steps, comment
// out the SyncedCron.add() block below to leave the methods exposed
// without auto-removal.
SyncedCron.add({
  name: 'Delete accounts past their scheduled removal date',
  schedule: function(parser) {
    return parser.text('every 6 hours');
  },
  job: function() {
   try {
    var now = new Date();
    var due = Meteor.users.find({
      deletionScheduledFor: { $lte: now }
    }, { fields: { _id: 1 } }).fetch();
    if (!due.length) {
      log.info('cron.delete_accounts.none_due');
      return 0;
    }
    var removed = 0;
    due.forEach(function(u) {
      try {
        var jobsRemoved = Jobs.remove({ userId: u._id });
        Meteor.users.remove({ _id: u._id });
        log.warn('cron.delete_accounts.removed', {
          userId: hashIdentifier(u._id),
          jobsRemoved: jobsRemoved
        });
        removed += 1;
      } catch (e) {
        log.error('cron.delete_accounts.failed', {
          userId: hashIdentifier(u._id),
          error: e && e.message
        });
      }
    });
    log.info('cron.delete_accounts.summary', { matched: due.length, removed: removed });
    return removed;
   } catch (e) {
    log.error('cron.delete_accounts.outer_error', { error: e && e.message });
    if (Sentry && Sentry.captureException) {
      Sentry.captureException(e);
    }
    throw e;
   }
  }
});

Meteor.startup(function() {
  SyncedCron.start();
});
