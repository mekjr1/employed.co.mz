Template.jobExpiredAlert.helpers({
  expired: function() {
    if (this.userId === Meteor.userId()) {
      if ((this.createdAt < daysUntilExpiration()) && (this.updatedAt < daysUntilExpiration())) {
        return true;
      } else if ((this.createdAt < daysUntilExpiration()) && (this.updatedAt === undefined)) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }
});

Template.jobStatusToggle.helpers({
  "statuses": function() {
    return STATUSES;
  },
  // B3.10: admin-visible flag for jobs past the 90-day listing window.
  isExpired: function() {
    return this.isExpired && this.isExpired();
  }
});

Template.jobStatusToggle.events({
  "click .set-status": function(event, template) {
    event.preventDefault();
    var newStatus = String(this);
    var jobId = template.data._id;
    // B3.6 / A9.19: capture an optional reason via AppDialog so it can
    // be themed, localised, and announced by screen readers. Cancelling
    // aborts the status change.
    AppDialog.prompt({
      title: t('action.update'),
      message: t('admin.confirm.set_status', { status: t('status.' + newStatus) }),
      submitClass: 'btn-primary',
      submitLabel: t('action.update'),
      cancelLabel: t('action.cancel'),
      promptPlaceholder: t('admin.confirm.bulk_reason')
    }, function(reason) {
      if (reason === null) return;
      Meteor.call("adminSetJobStatus", jobId, newStatus, reason || undefined,
        function(err) {
          if (err) {
            AppDialog.alert({
              title: t('admin.title'),
              message: err.reason || err.message || 'Could not change status.'
            });
          }
        });
    });
  }
});

// B3.6: helpers for the moderation audit timeline.
Template.jobStatusHistory.helpers({
  hasHistory: function() {
    return this.statusHistory && this.statusHistory.length;
  },
  historyEntries: function() {
    // Most-recent first.
    return _.sortBy(this.statusHistory || [], function(e) {
      return -(new Date(e.at)).getTime();
    });
  }
});


Template.jobFeatured.events({
  // A10.0 — multi-provider checkout. Opens a modal that lets the user
  // pick Stripe, M-Pesa, or e-Mola (filtered by the active market).
  // Replaces the historical Stripe-only redirect path; the legacy
  // `featuredJob.checkout` server method is still available for older
  // clients / scripts.
  "click #buy-featured": function(event, template) {
    event.preventDefault();
    var job = template.data;
    if (typeof FeaturedCheckout !== 'undefined' && FeaturedCheckout.open) {
      FeaturedCheckout.open(job);
      return;
    }
    // Fallback: if the new modal hasn't loaded for some reason, fall
    // through to the legacy single-provider flow so the user can still
    // pay rather than see a dead button.
    var btn = $(event.currentTarget);
    btn.button('loading');
    Meteor.call('featuredJob.checkout', job._id, function(error, result) {
      if (error) {
        btn.button('reset');
        AppDialog.alert({
          title: t('job.featured.title'),
          message: error.reason || error.message || 'Could not start checkout.'
        });
        return;
      }
      if (!result || !result.url) {
        btn.button('reset');
        AppDialog.alert({
          title: t('job.featured.title'),
          message: 'Checkout session did not return a redirect URL.'
        });
        return;
      }
      window.location.assign(result.url);
    });
  }
});
