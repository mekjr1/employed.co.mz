// Server-side DDP method smoke tests. These touch Mongo, so they only
// run on the server architecture (the if-isServer guard).
//
// Usage: `meteor test --once --driver-package meteortesting:mocha`
// (requires `meteortesting:mocha` enabled in .meteor/packages).

import { Meteor } from 'meteor/meteor';
import { assert } from 'chai';

if (Meteor.isServer) {
  function requireTestDatabase() {
    const url = process.env.MONGO_URL || '';
    if (!/test/i.test(url)) {
      throw new Error('Refusing to run destructive method tests outside a test Mongo database.');
    }
  }

  function insertJob(attrs) {
    const doc = Object.assign({
      _id: Random.id(),
      title: 'Test job',
      company: 'Test company',
      country: 'Mexico',
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

  describe('jobs.deleteMine', function () {
    let userId;
    let otherUserId;

    before(function () {
      requireTestDatabase();
    });

    beforeEach(function () {
      Meteor.users.remove({});
      Jobs.remove({});
      userId = Accounts.createUser({
        email: 'owner-' + Random.id() + '@example.test',
        password: 'pw1234567'
      });
      otherUserId = Accounts.createUser({
        email: 'other-' + Random.id() + '@example.test',
        password: 'pw1234567'
      });
    });

    afterEach(function () {
      Meteor.users.remove({});
      Jobs.remove({});
    });

    it('lets the owner delete their own job', function () {
      const jobId = insertJob({
        title: 'Test job',
        country: 'Mexico',
        contact: 'a@b.test',
        jobtype: 'full-time',
        remote: false,
        userId: userId,
        userName: 'Owner',
        description: 'desc',
        status: 'active',
        createdAt: new Date()
      });

      const ctx = { userId: userId };
      Meteor.server.method_handlers['jobs.deleteMine'].apply(ctx, [jobId]);
      assert.isUndefined(Jobs.findOne({ _id: jobId }));
    });

    it('refuses to let a non-owner delete', function () {
      const jobId = insertJob({
        title: 'Test job',
        country: 'Mexico',
        contact: 'a@b.test',
        jobtype: 'full-time',
        remote: false,
        userId: userId,
        userName: 'Owner',
        description: 'desc',
        status: 'active',
        createdAt: new Date()
      });

      const ctx = { userId: otherUserId };
      assert.throws(function () {
        Meteor.server.method_handlers['jobs.deleteMine'].apply(ctx, [jobId]);
      }, Meteor.Error);
      assert.isOk(Jobs.findOne({ _id: jobId }));
    });

    it('requires sign-in', function () {
      const jobId = insertJob({
        title: 'Test job',
        country: 'Mexico',
        contact: 'a@b.test',
        jobtype: 'full-time',
        remote: false,
        userId: userId,
        userName: 'Owner',
        description: 'desc',
        status: 'active',
        createdAt: new Date()
      });

      const ctx = { userId: null };
      assert.throws(function () {
        Meteor.server.method_handlers['jobs.deleteMine'].apply(ctx, [jobId]);
      }, Meteor.Error);
    });
  });

  describe('adminSetJobStatus', function () {
    let adminId;
    let userId;

    before(function () {
      requireTestDatabase();
    });

    beforeEach(function () {
      Meteor.users.remove({});
      Jobs.remove({});
      adminId = Accounts.createUser({
        email: 'admin-' + Random.id() + '@example.test',
        password: 'pw1234567'
      });
      Roles.addUsersToRoles(adminId, ['admin']);
      userId = Accounts.createUser({
        email: 'user-' + Random.id() + '@example.test',
        password: 'pw1234567'
      });
    });

    afterEach(function () {
      Meteor.users.remove({});
      Jobs.remove({});
    });

    it('rejects an unknown status string', function () {
      const jobId = insertJob({
        title: 'Test job',
        country: 'Mexico',
        contact: 'a@b.test',
        jobtype: 'full-time',
        remote: false,
        userId: userId,
        userName: 'Owner',
        description: 'desc',
        status: 'pending',
        createdAt: new Date()
      });

      const ctx = { userId: adminId };
      assert.throws(function () {
        Meteor.server.method_handlers['adminSetJobStatus'].apply(ctx, [jobId, 'bogus-status', null]);
      });
    });

    it('appends a statusHistory entry on a valid transition', function () {
      const jobId = insertJob({
        title: 'Test job',
        country: 'Mexico',
        contact: 'a@b.test',
        jobtype: 'full-time',
        remote: false,
        userId: userId,
        userName: 'Owner',
        description: 'desc',
        status: 'pending',
        createdAt: new Date()
      });

      const ctx = { userId: adminId };
      Meteor.server.method_handlers['adminSetJobStatus'].apply(ctx, [jobId, 'active', 'Looks good']);
      const job = Jobs.findOne({ _id: jobId });
      assert.equal(job.status, 'active');
      assert.isArray(job.statusHistory);
      assert.equal(job.statusHistory.length, 1);
      assert.equal(job.statusHistory[0].from, 'pending');
      assert.equal(job.statusHistory[0].to, 'active');
      assert.equal(job.statusHistory[0].reason, 'Looks good');
    });

    it('refuses for non-admin users', function () {
      const jobId = insertJob({
        title: 'Test job',
        country: 'Mexico',
        contact: 'a@b.test',
        jobtype: 'full-time',
        remote: false,
        userId: userId,
        userName: 'Owner',
        description: 'desc',
        status: 'pending',
        createdAt: new Date()
      });

      const ctx = { userId: userId };
      assert.throws(function () {
        Meteor.server.method_handlers['adminSetJobStatus'].apply(ctx, [jobId, 'active', null]);
      }, Meteor.Error);
    });

    // p3-fix-011: publishedAt is set on the first transition to active
    // and never overwritten by later toggles back to active. The
    // public job page uses this date so editorial activity doesn't
    // bump a listing's age.
    it('sets publishedAt on first transition to active and preserves it on later toggles', function () {
      const jobId = insertJob({
        userId: userId,
        status: 'pending'
      });

      const ctx = { userId: adminId };
      Meteor.server.method_handlers['adminSetJobStatus'].apply(ctx, [jobId, 'active', null]);
      const firstPublishedAt = Jobs.findOne(jobId).publishedAt;
      assert.instanceOf(firstPublishedAt, Date);

      Meteor.server.method_handlers['adminSetJobStatus'].apply(ctx, [jobId, 'inactive', 'pause']);
      Meteor.server.method_handlers['adminSetJobStatus'].apply(ctx, [jobId, 'active', 'reinstate']);

      const job = Jobs.findOne(jobId);
      assert.equal(job.publishedAt.getTime(), firstPublishedAt.getTime(),
        'publishedAt must not be reset by subsequent re-activations');
    });

    it('records the actor on the statusHistory entry', function () {
      const jobId = insertJob({ userId: userId, status: 'pending' });
      const ctx = { userId: adminId };
      Meteor.server.method_handlers['adminSetJobStatus'].apply(ctx, [jobId, 'active', null]);
      const job = Jobs.findOne(jobId);
      assert.equal(job.statusHistory[0].by, adminId);
    });
  });
}
