// ============================================================
// A9.32 — Hand-rolled auth handlers (PR 2 of BS5 migration)
// ----------------------------------------------------------
// Replaces useraccounts:bootstrap. Wires the five auth templates in
// auth.html to Meteor's `Accounts.*` API directly. See auth.html for
// markup notes and rollback strategy.
//
// SSR / Iron Router note: the iron-router routes for these templates
// are registered in router.js. The router passes `:token` URL params
// to `resetPwd` / `verifyEmail` via Router.current().params.token —
// which we read inside Template.*.onCreated.
// ============================================================

// Shared post-auth redirect helper.
// Duplicated locally instead of importing from both/accounts.js so this
// file stays self-contained. The logic mirrors `redirectAfterAuth` in
// both/accounts.js — keep the two in sync if either changes.
function redirectAfterAuth() {
  var path = '/';
  try {
    var next = Session.get('postSignInRoute');
    if (next) {
      Session.set('postSignInRoute', null);
      path = next;
    }
  } catch (e) {
    // Session unavailable in non-browser contexts; the file is
    // client-only but guarded anyway.
  }
  Router.go(path);
}

// Map common Meteor accounts-password errors to localized strings.
// Falls back to `err.reason` (server-supplied) or a generic message.
function localizeAccountsError(err, fallbackKey) {
  if (!err) return t(fallbackKey || 'accounts.error.signin_failed');
  // accounts-password errors carry stable `error` strings we can match.
  if (err.error === 403 && /incorrect password/i.test(err.reason || '')) {
    return t('accounts.error.signin_failed');
  }
  if (err.error === 403 && /user not found/i.test(err.reason || '')) {
    return t('accounts.error.signin_failed');
  }
  if (err.error === 403 && /email already exists/i.test(err.reason || '')) {
    return t('accounts.error.email_in_use');
  }
  if (err.error === 'token-expired' || /expired/i.test(err.reason || '')) {
    return t('accounts.resetPwd.invalid_token');
  }
  return err.reason || err.message || t(fallbackKey || 'accounts.error.signin_failed');
}

// Reactive state factory — every auth template uses the same trio:
// loading flag, error message, optional success message.
function makeAuthState() {
  return {
    loading: new ReactiveVar(false),
    error: new ReactiveVar(null),
    success: new ReactiveVar(null)
  };
}

// Helper to inject shared helpers + events into a template instance.
function wireSharedAuthHelpers(template) {
  template.state = makeAuthState();
}

// Shared helpers usable by every auth template.
var sharedHelpers = {
  isLoading: function() {
    var inst = Template.instance();
    return inst.state && inst.state.loading.get();
  },
  errorMessage: function() {
    var inst = Template.instance();
    return inst.state && inst.state.error.get();
  },
  successMessage: function() {
    var inst = Template.instance();
    return inst.state && inst.state.success.get();
  },
  appName: function() {
    return (typeof APP_NAME !== 'undefined') ? APP_NAME : 'Employed';
  }
};

// Small helper: disable / re-enable the submit button safely.
function setSubmitDisabled(template, disabled) {
  var btn = template.find("button[data-action='submit']");
  if (btn) btn.disabled = !!disabled;
}

// ────────────────────────── Sign in ──────────────────────────
Template.signIn.onCreated(function() { wireSharedAuthHelpers(this); });
Template.signIn.helpers(sharedHelpers);
Template.signIn.events({
  'submit #signInForm': function(event, template) {
    event.preventDefault();
    var email = String(template.find("[name='email']").value || '').trim();
    var password = String(template.find("[name='password']").value || '');

    if (!email) {
      template.state.error.set(t('accounts.error.email_required'));
      return;
    }
    if (!password) {
      template.state.error.set(t('accounts.error.password_required'));
      return;
    }

    template.state.error.set(null);
    template.state.loading.set(true);
    setSubmitDisabled(template, true);
    Meteor.loginWithPassword(email, password, function(err) {
      template.state.loading.set(false);
      setSubmitDisabled(template, false);
      if (err) {
        template.state.error.set(localizeAccountsError(err, 'accounts.error.signin_failed'));
        return;
      }
      // The signIn route's `onBeforeAction` reads `Meteor.userId()`
      // non-reactively (see router.js) so the callback owns the
      // post-login redirect. `redirectAfterAuth` consumes
      // `postSignInRoute` set by the guarded-route hook in router.js
      // and falls back to '/' when nothing was saved.
      redirectAfterAuth();
    });
  }
});

// ──────────────────────── Sign up ────────────────────────
Template.signUp.onCreated(function() { wireSharedAuthHelpers(this); });
Template.signUp.helpers(sharedHelpers);
Template.signUp.events({
  'submit #signUpForm': function(event, template) {
    event.preventDefault();
    var email = String(template.find("[name='email']").value || '').trim();
    var password = String(template.find("[name='password']").value || '');
    var password2 = String(template.find("[name='password2']").value || '');

    if (!email) {
      template.state.error.set(t('accounts.error.email_required'));
      return;
    }
    if (!password) {
      template.state.error.set(t('accounts.error.password_required'));
      return;
    }
    if (password.length < 8) {
      template.state.error.set(t('accounts.error.password_min'));
      return;
    }
    if (password !== password2) {
      template.state.error.set(t('accounts.error.password_mismatch'));
      return;
    }

    template.state.error.set(null);
    template.state.loading.set(true);
    setSubmitDisabled(template, true);
    Accounts.createUser({ email: email, password: password }, function(err) {
      template.state.loading.set(false);
      setSubmitDisabled(template, false);
      if (err) {
        template.state.error.set(localizeAccountsError(err, 'accounts.error.signin_failed'));
        return;
      }
      // Accounts.createUser auto-signs-in on success. The verification
      // email is sent server-side because
      // `Accounts.config({ sendVerificationEmail: true })` is set in
      // server/accounts.js (formerly via AccountsTemplates).
      redirectAfterAuth();
    });
  }
});

// ─────────────────────── Forgot password ───────────────────────
Template.forgotPwd.onCreated(function() { wireSharedAuthHelpers(this); });
Template.forgotPwd.helpers(sharedHelpers);
Template.forgotPwd.events({
  'submit #forgotPwdForm': function(event, template) {
    event.preventDefault();
    var email = String(template.find("[name='email']").value || '').trim();

    if (!email) {
      template.state.error.set(t('accounts.error.email_required'));
      return;
    }

    template.state.error.set(null);
    template.state.loading.set(true);
    setSubmitDisabled(template, true);
    Accounts.forgotPassword({ email: email }, function(err) {
      template.state.loading.set(false);
      setSubmitDisabled(template, false);
      // Deliberately show the same success message regardless of whether
      // the email exists — prevents user enumeration via the reset form.
      if (err && err.error && err.error !== 403) {
        // Surface only unexpected errors (e.g. mail server down).
        template.state.error.set(localizeAccountsError(err));
        return;
      }
      template.state.success.set(t('accounts.forgotPwd.success'));
    });
  }
});

// ──────────────────────── Reset password ────────────────────────
Template.resetPwd.onCreated(function() {
  wireSharedAuthHelpers(this);
  // Token is on the URL: /reset-password/:token. Iron-router exposes it
  // through Router.current().params.
  var current = Router.current();
  this.token = (current && current.params && current.params.token) || null;
  if (!this.token) {
    this.state.error.set(t('accounts.resetPwd.invalid_token'));
  }
});
Template.resetPwd.helpers(sharedHelpers);
Template.resetPwd.events({
  'submit #resetPwdForm': function(event, template) {
    event.preventDefault();
    var password = String(template.find("[name='password']").value || '');
    var password2 = String(template.find("[name='password2']").value || '');

    if (!template.token) {
      template.state.error.set(t('accounts.resetPwd.invalid_token'));
      return;
    }
    if (password.length < 8) {
      template.state.error.set(t('accounts.error.password_min'));
      return;
    }
    if (password !== password2) {
      template.state.error.set(t('accounts.error.password_mismatch'));
      return;
    }

    template.state.error.set(null);
    template.state.loading.set(true);
    setSubmitDisabled(template, true);
    Accounts.resetPassword(template.token, password, function(err) {
      template.state.loading.set(false);
      setSubmitDisabled(template, false);
      if (err) {
        template.state.error.set(localizeAccountsError(err, 'accounts.resetPwd.invalid_token'));
        return;
      }
      // Accounts.resetPassword auto-signs-in on success.
      template.state.success.set(t('accounts.resetPwd.success'));
      // Short pause so the user sees the success state, then home.
      Meteor.setTimeout(function() {
        try { Router.go('/'); } catch (e) {}
      }, 1500);
    });
  }
});

// ──────────────────────── Verify email ────────────────────────
// Token is on the URL: /verify-email/:token. We fire the verification
// call from onCreated so the user sees the "verifying…" state immediately.
Template.verifyEmail.onCreated(function() {
  wireSharedAuthHelpers(this);
  this.verifying = new ReactiveVar(true);
  var current = Router.current();
  var token = (current && current.params && current.params.token) || null;
  var template = this;

  if (!token) {
    template.verifying.set(false);
    template.state.error.set(t('accounts.verifyEmail.error'));
    return;
  }

  Accounts.verifyEmail(token, function(err) {
    template.verifying.set(false);
    if (err) {
      template.state.error.set(t('accounts.verifyEmail.error'));
      return;
    }
    template.state.success.set(t('accounts.verifyEmail.success'));
  });
});
Template.verifyEmail.helpers(Object.assign({}, sharedHelpers, {
  isVerifying: function() {
    var inst = Template.instance();
    return inst.verifying && inst.verifying.get();
  }
}));
