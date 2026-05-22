Accounts.emailTemplates.siteName = APP_NAME;
Accounts.emailTemplates.from = FROM_EMAIL;

// A9.32 — PR 2 of BS5 migration. Two things AccountsTemplates used to
// do for us that we now have to do ourselves:
//
//   1. Trigger the verification email after Accounts.createUser.
//      `useraccounts:bootstrap` set `sendVerificationEmail: true` on
//      the AccountsTemplates side; the canonical accounts-password
//      equivalent is `Accounts.config({ sendVerificationEmail: true })`.
//
//   2. Pin the email URLs to a clean path (no hash-router prefix).
//      Meteor's default is `Meteor.absoluteUrl('#/verify-email/' + t)`
//      which was correct for the old hashband router that
//      useraccounts:iron-routing used. Iron-router uses pushState, so
//      we emit `/verify-email/{token}` and `/reset-password/{token}`
//      directly. Both URLs are registered as named routes in router.js.
Accounts.config({ sendVerificationEmail: true });
Accounts.urls.verifyEmail = function(token) {
  return Meteor.absoluteUrl('verify-email/' + token);
};
Accounts.urls.resetPassword = function(token) {
  return Meteor.absoluteUrl('reset-password/' + token);
};

// A9.30 — brand-chrome the auth-flow emails (verify address, reset
// password). Kept terse: title + one explanatory line + the button.
// `brandedEmail` lives in server/lib/helpers.js (loads first) so it is
// already defined by the time these template fns are invoked.
function brandedAuthEmail(opts) {
  var heading = opts.heading || 'Employed';
  var body = opts.body || '';
  var ctaLabel = opts.ctaLabel || 'Open';
  var ctaUrl = opts.ctaUrl || '#';
  var fallback = opts.fallback || 'If the button does not work, paste this link into your browser:';
  var safeUrl = String(ctaUrl).replace(/"/g, '&quot;');
  var html =
    '<h2 style="margin:0 0 16px;font-family:Trebuchet MS,Arial,sans-serif;font-weight:800;font-size:20px;color:#111827;">' + heading + '</h2>' +
    '<p style="margin:0 0 20px;">' + body + '</p>' +
    '<p style="margin:0 0 24px;"><a href="' + safeUrl + '" style="display:inline-block;background:#4F46E5;color:#FFFFFF;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">' + ctaLabel + '</a></p>' +
    '<p style="margin:0;font-size:13px;color:#6B7280;">' + fallback + '<br><a href="' + safeUrl + '" style="color:#4F46E5;word-break:break-all;">' + safeUrl + '</a></p>';
  return brandedEmail(html);
}

Accounts.emailTemplates.verifyEmail = {
  subject: function() { return '[Employed] Verify your email'; },
  text: function(user, url) {
    return 'Welcome to Employed.\n\nVerify your email address by opening:\n' + url + '\n\nIf you did not sign up, ignore this message.';
  },
  html: function(user, url) {
    return brandedAuthEmail({
      heading: 'Verify your email',
      body: 'Welcome to Employed. Click the button below to verify your email address so you can post jobs.',
      ctaLabel: 'Verify email',
      ctaUrl: url
    });
  }
};

Accounts.emailTemplates.resetPassword = {
  subject: function() { return '[Employed] Reset your password'; },
  text: function(user, url) {
    return 'A password reset was requested for your Employed account.\n\nReset it by opening:\n' + url + '\n\nIf you did not request this, you can safely ignore this email.';
  },
  html: function(user, url) {
    return brandedAuthEmail({
      heading: 'Reset your password',
      body: 'A password reset was requested for your Employed account. If this was you, click the button to set a new password.',
      ctaLabel: 'Reset password',
      ctaUrl: url,
      fallback: 'If you did not request this, you can ignore this email. The link expires in a few hours.'
    });
  }
};

Accounts.onCreateUser(function(options, user) {
  if (options.profile)
    user.profile = options.profile;

  // S6: emailHash (Gravatar) intentionally removed. MD5 over the small
  // email-address space is reversible with off-the-shelf rainbow tables,
  // and we don't want to publish a hash that effectively leaks the user's
  // email address. Avatars now fall back to the local default image.

  return user;
});
