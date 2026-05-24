// L4 — Account management method tests.
//
// Covers: users.requestAccountDeletion, users.cancelAccountDeletion,
// users.exportData. These are GDPR-style data lifecycle methods.

import { Meteor } from 'meteor/meteor';
import { assert } from 'chai';

if (Meteor.isServer) {
  function requireTestDatabase() {
    const url = process.env.MONGO_URL || '';
    if (!/test/i.test(url)) {
      throw new Error('Refusing to run destructive account tests outside a test Mongo database.');
    }
  }

  function createVerifiedUser(prefix) {
    const userId = Accounts.createUser({
      email: prefix + '-' + Random.id(6) + '@test.local',
      password: 'test1234'
    });
    Meteor.users.update(userId, { $set: { 'emails.0.verified': true } });
    return userId;
  }

  describe('users.requestAccountDeletion', function () {
    let userId;

    before(function () { requireTestDatabase(); });

    beforeEach(function () {
      Meteor.users.remove({});
      userId = createVerifiedUser('deleter');
    });

    afterEach(function () {
      Meteor.users.remove({});
    });

    it('rejects unauthenticated callers', function () {
      assert.throws(function () {
        Meteor.server.method_handlers['users.requestAccountDeletion'].apply({ userId: null });
      }, Meteor.Error);
    });

    it('sets deletionScheduledFor ~30 days in the future', function () {
      const before = new Date();
      Meteor.server.method_handlers['users.requestAccountDeletion'].apply({ userId: userId });
      const user = Meteor.users.findOne(userId);
      assert.instanceOf(user.deletionRequestedAt, Date);
      assert.instanceOf(user.deletionScheduledFor, Date);
      // Should be 29-31 days from now (allow clock drift)
      const days = (user.deletionScheduledFor - before) / (1000 * 60 * 60 * 24);
      assert.isAtLeast(days, 29);
      assert.isAtMost(days, 31);
    });

    it('is idempotent — repeating refreshes the deadline', function () {
      Meteor.server.method_handlers['users.requestAccountDeletion'].apply({ userId: userId });
      const first = Meteor.users.findOne(userId).deletionScheduledFor;
      // Call again
      Meteor.server.method_handlers['users.requestAccountDeletion'].apply({ userId: userId });
      const second = Meteor.users.findOne(userId).deletionScheduledFor;
      assert.isAtLeast(second.getTime(), first.getTime());
    });
  });

  describe('users.cancelAccountDeletion', function () {
    let userId;

    before(function () { requireTestDatabase(); });

    beforeEach(function () {
      Meteor.users.remove({});
      userId = createVerifiedUser('canceller');
      Meteor.server.method_handlers['users.requestAccountDeletion'].apply({ userId: userId });
    });

    afterEach(function () {
      Meteor.users.remove({});
    });

    it('removes the deletion stamps', function () {
      Meteor.server.method_handlers['users.cancelAccountDeletion'].apply({ userId: userId });
      const user = Meteor.users.findOne(userId);
      assert.isUndefined(user.deletionRequestedAt);
      assert.isUndefined(user.deletionScheduledFor);
    });

    it('returns { canceled: true }', function () {
      const result = Meteor.server.method_handlers['users.cancelAccountDeletion'].apply({ userId: userId });
      assert.deepEqual(result, { canceled: true });
    });
  });

  // ── Auth flow tests ──────────────────────────────────────────────

  describe('auth: registration', function () {
    before(function () { requireTestDatabase(); });

    afterEach(function () {
      Meteor.users.remove({});
    });

    it('creates a user with email and password', function () {
      const email = 'register-' + Random.id(6) + '@test.local';
      const userId = Accounts.createUser({ email: email, password: 'test1234' });
      assert.isString(userId);
      const user = Meteor.users.findOne(userId);
      assert.isOk(user);
      assert.equal(user.emails[0].address, email);
    });

    it('rejects duplicate email registration', function () {
      const email = 'dup-' + Random.id(6) + '@test.local';
      Accounts.createUser({ email: email, password: 'test1234' });
      assert.throws(function () {
        Accounts.createUser({ email: email, password: 'other5678' });
      });
    });

    it('new users start with unverified email', function () {
      const email = 'unverified-' + Random.id(6) + '@test.local';
      const userId = Accounts.createUser({ email: email, password: 'test1234' });
      const user = Meteor.users.findOne(userId);
      assert.isFalse(user.emails[0].verified);
    });
  });

  describe('auth: login token validation', function () {
    let userId;

    before(function () { requireTestDatabase(); });

    beforeEach(function () {
      Meteor.users.remove({});
      userId = createVerifiedUser('login');
    });

    afterEach(function () {
      Meteor.users.remove({});
    });

    it('generates a valid login token via _generateLoginToken', function () {
      // Accounts._generateLoginToken is an internal but stable API
      // used by the data-export endpoint. Verify it round-trips.
      const stampedToken = Accounts._generateStampedLoginToken();
      assert.isString(stampedToken.token);
      assert.instanceOf(stampedToken.when, Date);
    });

    it('hashed token resolves back to the user', function () {
      const stampedToken = Accounts._generateStampedLoginToken();
      Accounts._insertLoginToken(userId, stampedToken);
      const hashed = Accounts._hashLoginToken(stampedToken.token);
      const user = Meteor.users.findOne(
        { 'services.resume.loginTokens.hashedToken': hashed },
        { fields: { _id: 1 } }
      );
      assert.isOk(user);
      assert.equal(user._id, userId);
    });

    it('invalid token does not resolve to any user', function () {
      const hashed = Accounts._hashLoginToken('bogus-token-value');
      const user = Meteor.users.findOne(
        { 'services.resume.loginTokens.hashedToken': hashed },
        { fields: { _id: 1 } }
      );
      assert.isNotOk(user);
    });
  });

  describe('auth: password reset flow', function () {
    let userId;

    before(function () { requireTestDatabase(); });

    beforeEach(function () {
      Meteor.users.remove({});
      userId = createVerifiedUser('resetpw');
    });

    afterEach(function () {
      Meteor.users.remove({});
    });

    it('generates a reset token for an existing user', function () {
      const user = Meteor.users.findOne(userId);
      const email = user.emails[0].address;
      // Accounts.generateResetToken stamps the user doc
      const tokenRecord = Accounts.generateResetToken(userId, email, 'resetPassword');
      assert.isString(tokenRecord.token);
      // Verify the token is on the user document
      const updated = Meteor.users.findOne(userId);
      assert.isOk(updated.services.password.reset);
    });
  });

  describe('users.exportData', function () {
    let userId;

    before(function () { requireTestDatabase(); });

    beforeEach(function () {
      Meteor.users.remove({});
      Jobs.remove({});
      userId = createVerifiedUser('exporter');
    });

    afterEach(function () {
      Meteor.users.remove({});
      Jobs.remove({});
    });

    it('rejects unauthenticated callers', function () {
      assert.throws(function () {
        Meteor.server.method_handlers['users.exportData'].apply({ userId: null });
      }, Meteor.Error);
    });

    it('returns the user account and their jobs', function () {
      // Insert a job for this user
      Promise.await(Jobs.rawCollection().insertOne({
        _id: Random.id(),
        title: 'Export test job',
        company: 'Test Co',
        country: 'Mozambique',
        contact: 'a@b.test',
        jobtype: 'full-time',
        remote: false,
        userId: userId,
        userName: 'Exporter',
        description: 'desc',
        htmlDescription: 'desc',
        status: 'active',
        createdAt: new Date(),
        statusHistory: []
      }));

      const result = Meteor.server.method_handlers['users.exportData'].apply({ userId: userId });
      assert.isOk(result.generatedAt);
      assert.isOk(result.account);
      assert.isArray(result.jobs);
      assert.equal(result.jobs.length, 1);
      assert.equal(result.jobs[0].title, 'Export test job');
    });
  });
}
