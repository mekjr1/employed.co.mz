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
