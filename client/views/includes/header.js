function getNavbarToggler() {
  return document.querySelector('.navbar-toggler');
}

function closeNavbarOnMobile(event) {
  var targetButton = getNavbarToggler();
  var currentTarget = $(event.currentTarget);

  if (!targetButton || window.innerWidth >= 992) {
    return;
  }

  if (currentTarget.hasClass('dropdown-toggle') || currentTarget.hasClass('box-user-option')) {
    return;
  }

  targetButton.click();
}

function initializeDropdowns(template) {
  var bootstrapApi = window.bootstrap;

  if (!bootstrapApi || !bootstrapApi.Dropdown) {
    return;
  }

  template.$('.dropdown-toggle').each(function(index, element) {
    bootstrapApi.Dropdown.getOrCreateInstance(element);
  });
}

Template.header.events({
  'click .navbar-nav a': function(event) {
    closeNavbarOnMobile(event);
  }
});

Template.headerUserMenu.events({
  'click #signOut': function(event) {
    // A9.18: prevent the placeholder href="#" from briefly scrolling
    // to the top before Router.go runs.
    event.preventDefault();
    Meteor.logout();
    Router.go('/');
  },
  'click .navbar-nav a': function(event) {
    closeNavbarOnMobile(event);
  },
  'click #userProfile': function(event) {
    event.preventDefault();
    Modal.show('userProfile');
  },
  'click #resend-verification-menu': function(event) {
    event.preventDefault();
    Meteor.call('users.resendVerification', function(err, res) {
      // A9.19: themed dialog instead of window.alert().
      if (err) {
        AppDialog.alert({
          title: t('nav.resend_verification'),
          message: err.reason || t('verify.could_not_send')
        });
        return;
      }
      AppDialog.alert({
        title: t('nav.resend_verification'),
        message: (res && res.alreadyVerified) ? t('verify.already_verified') : t('verify.sent')
      });
    });
  }
});

Template.localeMenu.events({
  'click .set-locale': function(event) {
    event.preventDefault();
    var loc = $(event.currentTarget).data('locale');
    if (typeof setLocale === 'function') {
      setLocale(loc);
    }
  }
});

Template.localeMenu.onRendered(function() {
  initializeDropdowns(this);
});

Template.headerUserMenu.helpers({
  currentUserInitials: function() {
    var name = getUserName(Meteor.user());
    var parts = String(name || '').trim().split(/\s+/);
    if (!parts.length || !parts[0]) return '?';
    var first = parts[0].charAt(0);
    var last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return (first + last).toUpperCase();
  },
  showResendVerification: function() {
    var user = Meteor.user();
    if (!user || !user.emails || !user.emails.length) return false;
    return !user.emails[0].verified;
  }
});

Template.headerUserMenu.onRendered(function() {
  initializeDropdowns(this);
});

// S3: persistent banner under the navbar prompting unverified users to
// click the verification link we already mailed them. Hidden when there
// is no signed-in user, no email address on file (OAuth-only), or the
// address is already verified.
Template.verifyEmailBanner.onCreated(function() {
  this.resendStatus = new ReactiveVar('');
});

Template.verifyEmailBanner.helpers({
  showUnverifiedBanner: function() {
    var user = Meteor.user();
    if (!user || !user.emails || !user.emails.length) return false;
    return !user.emails[0].verified;
  },
  userEmail: function() {
    var user = Meteor.user();
    return user && user.emails && user.emails[0] && user.emails[0].address;
  },
  resendStatus: function() {
    return Template.instance().resendStatus.get();
  }
});

Template.verifyEmailBanner.events({
  'click #resend-verification-email': function(event, template) {
    event.preventDefault();
    template.resendStatus.set(t('verify.sending'));
    Meteor.call('users.resendVerification', function(err, res) {
      if (err) {
        template.resendStatus.set(err.reason || t('verify.could_not_send'));
        return;
      }
      if (res && res.alreadyVerified) {
        template.resendStatus.set(t('verify.already_verified'));
      } else {
        template.resendStatus.set(t('verify.sent'));
      }
    });
  }
});
