Meteor.startup(function() {
  var settings = Meteor.settings.private && Meteor.settings.private.devAccounts;

  if (!Meteor.isDevelopment || !settings || !settings.enabled) {
    return;
  }

  if (settings.admin) {
    ensureDevAccount(settings.admin, ['admin']);
  }

  _.each(settings.users || [], function(account) {
    ensureDevAccount(account, []);
  });
});

function ensureDevAccount(account, roles) {
  if (!account || !account.email || !account.password) {
    return;
  }

  var existingUser = Accounts.findUserByEmail(account.email);
  var userId;

  if (existingUser) {
    userId = existingUser._id;
    Accounts.setPassword(userId, account.password);
  } else {
    userId = Accounts.createUser({
      email: account.email,
      password: account.password,
      profile: {
        name: account.name || account.email
      }
    });
  }

  if (account.name) {
    Users.update(userId, {
      $set: {
        profile: {
          name: account.name
        }
      }
    });
  }

  // p3-fix-002: dev seed accounts should be email-verified so devs don't
  // bump into the "verify your email first" gate on every fresh boot.
  // assertEmailVerifiedIfSignedIn() reads emails[].verified directly.
  // We bypass collection2 validation because `emails.$[]` is a Mongo
  // positional-all operator not in the User schema.
  Promise.await(Meteor.users.rawCollection().updateOne(
    { _id: userId, 'emails.verified': { $ne: true } },
    { $set: { 'emails.$[].verified': true } }
  ));

  _.each(roles || [], function(role) {
    try {
      Roles.createRole(role);
    } catch (error) {
      if (!/already exists/i.test(error.reason || error.message || '')) {
        throw error;
      }
    }
  });

  if (roles && roles.length) {
    Roles.addUsersToRoles(userId, roles);
  }
}
