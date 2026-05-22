Meteor.methods({
  deactivateJob: function(jobId, filled) {
    check(jobId, String);
    check(filled, Boolean);

    var job = Jobs.findOne({
      _id: jobId
    });
    if (!job)
      throw new Meteor.Error("Could not find job.");

    if (this.userId !== job.userId)
      throw new Meteor.Error("You can only deactivate your own job.");

    if (job.status !== "active")
      throw new Meteor.Error("You can only deactivate an active job.");

    Jobs.update({
      _id: jobId
    }, {
      $set: {
        status: (filled ? "filled" : "inactive")
      }
    });
  },
  // B2.15: let the original poster delete their own job posting.
  // Allowed at any status so users can purge mistakes; admins can also
  // call it. Stripe charges and audit history are intentionally NOT
  // refunded — refunds remain a manual admin action via the webhook.
  'jobs.deleteMine': function(jobId) {
    check(jobId, String);

    if (!this.userId) {
      throw new Meteor.Error('not-signed-in', 'You must be signed in.');
    }

    var job = Jobs.findOne({ _id: jobId }, { fields: { userId: 1 } });
    if (!job) {
      throw new Meteor.Error('not-found', 'Could not find job.');
    }

    var isOwner = job.userId === this.userId;
    var isAdmin = Roles.userIsInRole(this.userId, ['admin']);
    if (!isOwner && !isAdmin) {
      throw new Meteor.Error('forbidden', 'You can only delete your own job.');
    }

    Jobs.remove({ _id: jobId });
    if (Meteor.isServer) {
      log.info('jobs.deleteMine', { actor: this.userId, jobId: jobId, asAdmin: !isOwner && isAdmin });
    }
  },
  // B3.1 + B3.2 + B3.6: change a job’s moderation status.
  //   B3.1 Removed the silent `featuredThrough = now + 30d` side-effect.
  //        Featured time is a paid product (B2.7) — admins no longer
  //        grant it as a moderation freebie.
  //   B3.2 `status` is now constrained to the STATUSES enum instead of
  //        any string.
  //   B3.6 Every transition is appended to `statusHistory` so we have an
  //        auditable record of who flipped what and why.
  adminSetJobStatus: function(jobId, status, reason) {
    check(jobId, String);
    check(status, Match.Where(function(s) {
      return _.contains(STATUSES, s);
    }));
    check(reason, Match.Maybe(String));

    var job = Jobs.findOne({
      _id: jobId
    });
    if (!job)
      throw new Meteor.Error("not-found", "Could not find job.");

    if (!Roles.userIsInRole(this.userId, ['admin']))
      throw new Meteor.Error("forbidden", "Only admins can set job status.");

    if (job.status === status) {
      // No-op transition. Don’t pollute the audit log.
      return;
    }

    var modifier = {
      $set: { status: status },
      // P1: bound the audit log to the last 100 entries. Without `$slice`
      // a noisy job (or scripted toggling) could grow this array without
      // limit, ballooning every Jobs.findOne / publication read.
      $push: {
        statusHistory: {
          $each: [{
            at: new Date(),
            by: this.userId,
            from: job.status,
            to: status,
            reason: (reason && String(reason).slice(0, 500)) || undefined
          }],
          $slice: -100
        }
      }
    };

    // p3-fix-011: stamp publishedAt the first time a job goes live.
    // Subsequent toggles (active -> inactive -> active) do NOT update
    // publishedAt, so the public-facing "posted on" date is stable.
    if (status === 'active' && !job.publishedAt) {
      modifier.$set.publishedAt = new Date();
    }

    Jobs.update({ _id: jobId }, modifier);

    if (Meteor.isServer && typeof notifyAdminOfStatusChange === 'function') {
      // B3.9: best-effort follow-up email — wrapped so an SMTP outage
      // never breaks the moderation flow itself.
      try {
        notifyAdminOfStatusChange(job, status, reason, this.userId);
      } catch (e) {
        log.error('notifyAdminOfStatusChange.failed', { jobId: jobId, error: e && e.message });
      }
    }

    // p3-fix-012: poster notification on every status transition. Same
    // best-effort pattern as the admin notification: we never throw out
    // of the moderation flow if SMTP burps.
    if (Meteor.isServer && typeof notifyPosterOfStatusChange === 'function') {
      try {
        notifyPosterOfStatusChange(job, status, reason, this.userId);
      } catch (e) {
        log.error('notifyPosterOfStatusChange.failed', { jobId: jobId, error: e && e.message });
      }
    }
  },

  // B3.8: apply a status to many jobs in one call. The server method
  // iterates and re-applies all of the single-item validation; the cap
  // prevents a runaway client from rewriting the entire collection.
  adminSetJobStatusBulk: function(jobIds, status, reason) {
    check(jobIds, [String]);
    check(status, Match.Where(function(s) {
      return _.contains(STATUSES, s);
    }));
    check(reason, Match.Maybe(String));

    if (!Roles.userIsInRole(this.userId, ['admin']))
      throw new Meteor.Error("forbidden", "Only admins can set job status.");

    if (jobIds.length === 0)
      throw new Meteor.Error("empty", "Select at least one job.");
    if (jobIds.length > 200)
      throw new Meteor.Error("too-many", "Cannot update more than 200 jobs at once.");

    var updated = 0;
    var self = this;
    _.each(jobIds, function(jobId) {
      try {
        Meteor.call('adminSetJobStatus', jobId, status, reason);
        updated += 1;
      } catch (e) {
        // Skip individual failures so one bad id doesn’t roll back the
        // whole batch. The caller sees how many were applied.
        if (Meteor.isServer) {
          log.warn('adminSetJobStatusBulk.skipped', { jobId: jobId, error: e && e.message });
        }
      }
    });
    return { requested: jobIds.length, updated: updated };
  },

  // B3.7: grant `role` to `targetUserId`. Only existing admins may call
  // this, and only roles in ADMIN_GRANTABLE_ROLES can be granted. The
  // very first admin must still be promoted out-of-band (Mongo shell or
  // `server/dev-accounts.js`) so a brand-new install can’t bootstrap
  // itself into an admin via the public DDP surface.
  adminGrantRole: function(targetUserId, role) {
    check(targetUserId, String);
    check(role, Match.Where(function(r) {
      return _.contains(ADMIN_GRANTABLE_ROLES, r);
    }));

    if (!Roles.userIsInRole(this.userId, ['admin']))
      throw new Meteor.Error("forbidden", "Only admins can grant roles.");

    if (Meteor.isServer) {
      var target = Meteor.users.findOne({ _id: targetUserId }, { fields: { _id: 1 } });
      if (!target) throw new Meteor.Error("not-found", "User not found.");
      Roles.addUsersToRoles(targetUserId, role);
      log.info('adminGrantRole', { actor: this.userId, target: targetUserId, role: role });
    }
  },

  adminRevokeRole: function(targetUserId, role) {
    check(targetUserId, String);
    check(role, Match.Where(function(r) {
      return _.contains(ADMIN_GRANTABLE_ROLES, r);
    }));

    if (!Roles.userIsInRole(this.userId, ['admin']))
      throw new Meteor.Error("forbidden", "Only admins can revoke roles.");

    if (targetUserId === this.userId)
      throw new Meteor.Error("self-revoke",
        "You cannot revoke your own admin role — ask another admin.");

    if (Meteor.isServer) {
      Roles.removeUsersFromRoles(targetUserId, role);
      log.info('adminRevokeRole', { actor: this.userId, target: targetUserId, role: role });
    }
  }
  // B2.7: `createFeaturedJobCharge` was removed. It used the deprecated
  // Stripe Charges API (no SCA/3DS support) and trusted the client's
  // optimistic Mongo write for confirmation. Replaced by the server-only
  // method `featuredJob.checkout` (see server/methods.js) plus the
  // signed Stripe webhook at /_stripe/webhook.
});
