// A9.3 — client-side account self-service. The page is gated by the
// `userAccount` route which uses Iron Router's `ensureSignedIn`
// plugin, so by the time these helpers/events fire `Meteor.user()` is
// guaranteed to exist.

Template.userAccount.helpers({
  accountEmail: function() {
    var u = Meteor.user();
    return (u && u.emails && u.emails[0] && u.emails[0].address) || '';
  },
  accountEmailVerified: function() {
    var u = Meteor.user();
    return !!(u && u.emails && u.emails[0] && u.emails[0].verified);
  },
  accountCreatedAt: function() {
    var u = Meteor.user();
    return u && u.createdAt;
  },
  deletionPending: function() {
    var u = Meteor.user();
    return !!(u && u.deletionScheduledFor);
  },
  deletionScheduledFor: function() {
    var u = Meteor.user();
    return u && u.deletionScheduledFor;
  },
  cancelLinkLabel: function() {
    return t('account.delete.cancel');
  }
});

Template.userAccount.events({
  // A9.3 — download. We grab the resume login token from
  // localStorage and append it as a query string. This is what Meteor
  // sets on login; no extra method round-trip needed.
  'click #download-export': function(event) {
    event.preventDefault();
    var token = '';
    try {
      token = (typeof localStorage !== 'undefined' &&
        localStorage.getItem('Meteor.loginToken')) || '';
    } catch (e) { /* private mode etc */ }
    if (!token) {
      AppDialog.alert({
        title: t('account.export.heading'),
        message: t('account.export.error')
      });
      return;
    }
    var url = '/api/me/export?token=' + encodeURIComponent(token);
    // Trigger a download in a new tab. Browsers respect the
    // Content-Disposition header set by the endpoint.
    window.location.href = url;
  },

  'click #request-deletion': function(event) {
    event.preventDefault();
    AppDialog.confirm({
      title: t('account.delete.heading'),
      message: t('account.delete.body'),
      submitClass: 'btn-danger',
      submitLabel: t('account.delete.button'),
      cancelLabel: t('modal.cancel')
    }, function(ok) {
      if (!ok) return;
      Meteor.call('users.requestAccountDeletion', function(error) {
        if (error) {
          AppDialog.alert({
            title: t('account.delete.heading'),
            message: (error && error.reason) || t('account.export.error')
          });
          return;
        }
        // No further action needed — the helper reactivity will swap
        // the panel to the "deletion scheduled" state on next user
        // document sync.
      });
    });
  },

  'click #cancel-deletion': function(event) {
    event.preventDefault();
    AppDialog.confirm({
      title: t('account.delete.cancel'),
      message: t('account.delete.canceled'),
      submitLabel: t('account.delete.cancel'),
      cancelLabel: t('modal.cancel')
    }, function(ok) {
      if (!ok) return;
      Meteor.call('users.cancelAccountDeletion', function(error) {
        if (error) {
          AppDialog.alert({
            title: t('account.delete.cancel'),
            message: (error && error.reason) || t('account.export.error')
          });
        }
      });
    });
  }
});
