// L2 / L3 — Smoke tests for the multi-provider payment flow.
//
// These exercise `featuredJob.initiate`, `payment.status`, and
// `payment.cancel` through the method handler layer. Real provider
// calls are skipped (providers may not be registered in the test
// environment), so the tests focus on authorization, input validation,
// and idempotency guards.

import { Meteor } from 'meteor/meteor';
import { assert } from 'chai';

if (Meteor.isServer) {
  function requireTestDatabase() {
    const url = process.env.MONGO_URL || '';
    if (!/test/i.test(url)) {
      throw new Error('Refusing to run destructive payment tests outside a test Mongo database.');
    }
  }

  function insertJob(attrs) {
    const doc = Object.assign({
      _id: Random.id(),
      title: 'Payment test job',
      company: 'Test Co',
      country: 'Mozambique',
      contact: 'a@b.test',
      jobtype: 'full-time',
      remote: false,
      userName: 'Owner',
      description: 'desc',
      htmlDescription: cleanHtml('desc'),
      status: 'active',
      createdAt: new Date(),
      statusHistory: []
    }, attrs || {});
    Promise.await(Jobs.rawCollection().insertOne(doc));
    return doc._id;
  }

  function createVerifiedUser(prefix) {
    const userId = Accounts.createUser({
      email: prefix + '-' + Random.id(6) + '@test.local',
      password: 'test1234'
    });
    Meteor.users.update(userId, { $set: { 'emails.0.verified': true } });
    return userId;
  }

  describe('featuredJob.initiate', function () {
    let userId;
    let otherUserId;
    let jobId;

    before(function () { requireTestDatabase(); });

    beforeEach(function () {
      Meteor.users.remove({});
      Jobs.remove({});
      PaymentIntents.remove({});
      userId = createVerifiedUser('payer');
      otherUserId = createVerifiedUser('other');
      jobId = insertJob({ userId: userId, status: 'active' });
    });

    afterEach(function () {
      Meteor.users.remove({});
      Jobs.remove({});
      PaymentIntents.remove({});
    });

    it('rejects unauthenticated callers', function () {
      const ctx = {
        userId: null,
        connection: { clientAddress: '127.0.0.1', httpHeaders: { host: 'mz.lvh.me:3000' } }
      };
      assert.throws(function () {
        Promise.await(
          Meteor.server.method_handlers['featuredJob.initiate'].apply(ctx, [jobId, 'mpesa', '841234567'])
        );
      }, Meteor.Error);
    });

    it('rejects payment for another user\'s job', function () {
      const ctx = {
        userId: otherUserId,
        connection: { clientAddress: '127.0.0.1', httpHeaders: { host: 'mz.lvh.me:3000' } }
      };
      assert.throws(function () {
        Promise.await(
          Meteor.server.method_handlers['featuredJob.initiate'].apply(ctx, [jobId, 'mpesa', '841234567'])
        );
      }, function (err) {
        return err instanceof Meteor.Error && err.error === 'forbidden';
      });
    });

    it('rejects payment for ineligible (non-active/pending) jobs', function () {
      const inactiveJobId = insertJob({ userId: userId, status: 'rejected' });
      const ctx = {
        userId: userId,
        connection: { clientAddress: '127.0.0.1', httpHeaders: { host: 'mz.lvh.me:3000' } }
      };
      assert.throws(function () {
        Promise.await(
          Meteor.server.method_handlers['featuredJob.initiate'].apply(ctx, [inactiveJobId, 'mpesa', '841234567'])
        );
      }, function (err) {
        return err instanceof Meteor.Error && err.error === 'not-allowed';
      });
    });
  });

  describe('payment.status', function () {
    let userId;

    before(function () { requireTestDatabase(); });

    beforeEach(function () {
      Meteor.users.remove({});
      PaymentIntents.remove({});
      userId = createVerifiedUser('statususer');
    });

    afterEach(function () {
      Meteor.users.remove({});
      PaymentIntents.remove({});
    });

    it('rejects unauthenticated callers', function () {
      assert.throws(function () {
        Meteor.server.method_handlers['payment.status'].apply(
          { userId: null }, ['nonexistent']);
      }, Meteor.Error);
    });

    it('returns not-found for an intent owned by another user', function () {
      const otherUser = createVerifiedUser('other');
      Promise.await(PaymentIntents.rawCollection().insertOne({
        _id: 'intent-x',
        jobId: 'j1',
        userId: otherUser,
        providerKey: 'mpesa',
        status: 'pending',
        createdAt: new Date()
      }));
      assert.throws(function () {
        Meteor.server.method_handlers['payment.status'].apply(
          { userId: userId }, ['intent-x']);
      }, function (err) {
        return err instanceof Meteor.Error && err.error === 'not-found';
      });
    });

    it('returns the intent status for the owner', function () {
      Promise.await(PaymentIntents.rawCollection().insertOne({
        _id: 'intent-mine',
        jobId: 'j2',
        userId: userId,
        providerKey: 'emola',
        status: 'awaiting_user',
        createdAt: new Date()
      }));
      const result = Meteor.server.method_handlers['payment.status'].apply(
        { userId: userId }, ['intent-mine']);
      assert.equal(result.status, 'awaiting_user');
      assert.equal(result.providerKey, 'emola');
    });
  });

  describe('Payments registry', function () {
    before(function () { requireTestDatabase(); });

    afterEach(function () {
      // Restore the registry for other tests — _reset clears it, so we
      // must re-register the providers that other describe blocks depend
      // on. In practice the payment modules re-register on Meteor
      // startup, but we use _reset only within this block.
    });

    it('exposes the registry API surface', function () {
      assert.isFunction(Payments.register);
      assert.isFunction(Payments.get);
      assert.isFunction(Payments.listForMarket);
      assert.isFunction(Payments.snapshotForMarket);
      assert.isFunction(Payments.isAvailable);
      assert.isFunction(Payments._reset);
    });

    it('lists providers registered for a market', function () {
      var mzProviders = Payments.listForMarket('mz');
      assert.isArray(mzProviders);
      // M-Pesa and e-Mola should be registered for mz
      var keys = mzProviders.map(function (p) { return p.key; });
      assert.include(keys, 'mpesa');
      assert.include(keys, 'emola');
    });

    it('snapshotForMarket returns serializable objects without functions', function () {
      var snapshot = Payments.snapshotForMarket('mz');
      assert.isArray(snapshot);
      snapshot.forEach(function (entry) {
        assert.isString(entry.key);
        assert.isString(entry.name);
        assert.isOk(entry.ui);
        // Should not expose the initiate/status functions
        assert.isUndefined(entry.initiate);
        assert.isUndefined(entry.status);
      });
    });

    it('isAvailable returns true for registered market providers', function () {
      assert.isTrue(Payments.isAvailable('mpesa', 'mz'));
      assert.isTrue(Payments.isAvailable('emola', 'mz'));
    });

    it('isAvailable returns false for unknown providers', function () {
      assert.isFalse(Payments.isAvailable('bitcoin', 'mz'));
    });

    it('isAvailable returns false for wrong market', function () {
      // mpesa is only registered for 'mz'
      assert.isFalse(Payments.isAvailable('mpesa', 'mx'));
    });

    it('get throws for unknown provider key', function () {
      assert.throws(function () {
        Payments.get('nonexistent');
      }, Meteor.Error);
    });

    it('get returns provider object for valid key', function () {
      var provider = Payments.get('mpesa');
      assert.equal(provider.key, 'mpesa');
      assert.isFunction(provider.initiate);
    });
  });

  describe('payment.cancel', function () {
    let userId;

    before(function () { requireTestDatabase(); });

    beforeEach(function () {
      Meteor.users.remove({});
      PaymentIntents.remove({});
      userId = createVerifiedUser('canceller');
    });

    afterEach(function () {
      Meteor.users.remove({});
      PaymentIntents.remove({});
    });

    it('rejects unauthenticated callers', function () {
      assert.throws(function () {
        Meteor.server.method_handlers['payment.cancel'].apply(
          { userId: null }, ['nonexistent']);
      }, Meteor.Error);
    });

    it('cancels a pending intent owned by the caller', function () {
      Promise.await(PaymentIntents.rawCollection().insertOne({
        _id: 'intent-cancel',
        jobId: 'j3',
        userId: userId,
        providerKey: 'mpesa',
        status: 'pending',
        createdAt: new Date()
      }));
      const result = Meteor.server.method_handlers['payment.cancel'].apply(
        { userId: userId }, ['intent-cancel']);
      assert.equal(result.status, 'cancelled');
      const updated = PaymentIntents.findOne('intent-cancel');
      assert.equal(updated.status, 'cancelled');
    });

    it('is a no-op for already-terminal intents', function () {
      Promise.await(PaymentIntents.rawCollection().insertOne({
        _id: 'intent-done',
        jobId: 'j4',
        userId: userId,
        providerKey: 'emola',
        status: 'completed',
        createdAt: new Date()
      }));
      const result = Meteor.server.method_handlers['payment.cancel'].apply(
        { userId: userId }, ['intent-done']);
      assert.equal(result.status, 'completed');
    });
  });
}
