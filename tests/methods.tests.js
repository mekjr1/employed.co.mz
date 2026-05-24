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

  function createVerifiedUser(emailPrefix) {
    const userId = Accounts.createUser({
      email: emailPrefix + '-' + Random.id() + '@example.test',
      password: 'pw1234567'
    });

    Meteor.users.update({ _id: userId }, {
      $set: {
        'emails.0.verified': true
      }
    });

    return userId;
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

  describe('jobs.create', function () {
    let userId;

    before(function () {
      requireTestDatabase();
    });

    beforeEach(function () {
      Meteor.users.remove({});
      Jobs.remove({});
      JobReports.remove({});
      userId = createVerifiedUser('poster');
    });

    afterEach(function () {
      Meteor.users.remove({});
      Jobs.remove({});
      JobReports.remove({});
    });

    it('rejects with missing required fields', function () {
      const ctx = {
        userId: userId,
        connection: {
          clientAddress: '127.0.0.1',
          httpHeaders: { host: 'mz.lvh.me:3000' }
        }
      };

      assert.throws(function () {
        Meteor.server.method_handlers['jobs.create'].apply(ctx, [{}, null, 'mz']);
      });
    });

    it('creates a job with valid fields', function () {
      const ctx = {
        userId: userId,
        connection: {
          clientAddress: '127.0.0.1',
          httpHeaders: { host: 'mz.lvh.me:3000' }
        }
      };
      const jobId = Meteor.server.method_handlers['jobs.create'].apply(ctx, [{
        title: 'Backend Engineer',
        company: 'Example Co',
        contact: 'jobs@example.test',
        jobtype: 'Full Time',
        remote: false,
        description: 'Build useful things.'
      }, null, 'mz']);
      const job = Jobs.findOne({ _id: jobId });

      assert.isOk(job);
      assert.equal(job.country, 'Mozambique');
    });

    it('sets status to pending on creation', function () {
      const ctx = {
        userId: userId,
        connection: {
          clientAddress: '127.0.0.1',
          httpHeaders: { host: 'mz.lvh.me:3000' }
        }
      };
      const jobId = Meteor.server.method_handlers['jobs.create'].apply(ctx, [{
        title: 'Frontend Engineer',
        company: 'Example Co',
        contact: 'jobs@example.test',
        jobtype: 'Full Time',
        remote: true,
        description: 'Ship polished UI.'
      }, null, 'mz']);
      const job = Jobs.findOne({ _id: jobId });

      assert.equal(job.status, 'pending');
    });

    it('rejects market mismatch', function () {
      const ctx = {
        userId: userId,
        connection: {
          clientAddress: '127.0.0.1',
          httpHeaders: { host: 'mz.lvh.me:3000' }
        }
      };

      assert.throws(function () {
        Meteor.server.method_handlers['jobs.create'].apply(ctx, [{
          title: 'Support Engineer',
          company: 'Example Co',
          contact: 'jobs@example.test',
          jobtype: 'Full Time',
          remote: false,
          description: 'Help customers succeed.'
        }, null, 'mx']);
      }, function (error) {
        return error instanceof Meteor.Error && error.error === 'market-mismatch';
      });
    });
  });

  describe('deactivateJob', function () {
    let ownerId;
    let otherUserId;
    let adminId;

    before(function () {
      requireTestDatabase();
    });

    beforeEach(function () {
      Meteor.users.remove({});
      Jobs.remove({});
      ownerId = createVerifiedUser('owner');
      otherUserId = createVerifiedUser('other');
      adminId = createVerifiedUser('admin');
      Roles.addUsersToRoles(adminId, ['admin']);
    });

    afterEach(function () {
      Meteor.users.remove({});
      Jobs.remove({});
    });

    it('lets the owner mark their active job as filled', function () {
      const jobId = insertJob({ userId: ownerId, status: 'active' });

      Meteor.server.method_handlers['deactivateJob'].apply({ userId: ownerId }, [jobId, true]);
      assert.equal(Jobs.findOne({ _id: jobId }).status, 'filled');
    });

    it('lets the owner deactivate their active job without filling it', function () {
      const jobId = insertJob({ userId: ownerId, status: 'active' });

      Meteor.server.method_handlers['deactivateJob'].apply({ userId: ownerId }, [jobId, false]);
      assert.equal(Jobs.findOne({ _id: jobId }).status, 'inactive');
    });

    it('refuses to let a non-owner deactivate another user\'s job', function () {
      const jobId = insertJob({ userId: ownerId, status: 'active' });

      assert.throws(function () {
        Meteor.server.method_handlers['deactivateJob'].apply({ userId: otherUserId }, [jobId, false]);
      }, Meteor.Error);
      assert.equal(Jobs.findOne({ _id: jobId }).status, 'active');
    });

    it('rejects attempts to deactivate non-active jobs', function () {
      const jobId = insertJob({ userId: ownerId, status: 'pending' });

      assert.throws(function () {
        Meteor.server.method_handlers['deactivateJob'].apply({ userId: ownerId }, [jobId, false]);
      }, Meteor.Error);
      assert.equal(Jobs.findOne({ _id: jobId }).status, 'pending');
    });

    it('lets an admin deactivate another user\'s active job', function () {
      const jobId = insertJob({ userId: ownerId, status: 'active' });

      Meteor.server.method_handlers['deactivateJob'].apply({ userId: adminId }, [jobId, false]);
      assert.equal(Jobs.findOne({ _id: jobId }).status, 'inactive');
    });
  });

  describe('jobReports.create', function () {
    let ownerId;
    let reporterId;
    let jobId;

    before(function () {
      requireTestDatabase();
    });

    beforeEach(function () {
      Meteor.users.remove({});
      Jobs.remove({});
      JobReports.remove({});
      ownerId = createVerifiedUser('owner');
      reporterId = createVerifiedUser('reporter');
      jobId = insertJob({ userId: ownerId, status: 'active' });
    });

    afterEach(function () {
      Meteor.users.remove({});
      Jobs.remove({});
      JobReports.remove({});
    });

    it('creates a report with a valid reason', function () {
      const result = Meteor.server.method_handlers['jobReports.create'].apply({
        userId: reporterId,
        connection: { clientAddress: '127.0.0.1' }
      }, [{
        jobId: jobId,
        reason: 'spam',
        details: 'Suspicious listing.'
      }]);
      const report = JobReports.findOne({ jobId: jobId });

      assert.deepEqual(result, { ok: true });
      assert.isOk(report);
      assert.equal(report.reason, 'spam');
    });

    it('rejects an invalid reason enum value', function () {
      assert.throws(function () {
        Meteor.server.method_handlers['jobReports.create'].apply({
          userId: reporterId,
          connection: { clientAddress: '127.0.0.1' }
        }, [{
          jobId: jobId,
          reason: 'not-a-real-reason',
          details: 'Bad enum.'
        }]);
      }, function (error) {
        return error instanceof Meteor.Error && error.error === 'bad-reason';
      });
      assert.equal(JobReports.find().count(), 0);
    });

    it('sets resolution to pending automatically', function () {
      Meteor.server.method_handlers['jobReports.create'].apply({
        userId: reporterId,
        connection: { clientAddress: '127.0.0.1' }
      }, [{
        jobId: jobId,
        reason: 'duplicate',
        details: 'Already posted.'
      }]);
      const report = JobReports.findOne({ jobId: jobId, reason: 'duplicate' });

      assert.equal(report.resolution, 'pending');
    });
  });

  describe('adminGrantRole / adminRevokeRole', function () {
    let adminId;
    let userId;
    let otherUserId;

    before(function () {
      requireTestDatabase();
    });

    beforeEach(function () {
      Meteor.users.remove({});
      adminId = createVerifiedUser('admin');
      userId = createVerifiedUser('user');
      otherUserId = createVerifiedUser('other');
      Roles.addUsersToRoles(adminId, ['admin']);
    });

    afterEach(function () {
      Meteor.users.remove({});
    });

    it('lets an admin grant a role', function () {
      Meteor.server.method_handlers['adminGrantRole'].apply({ userId: adminId }, [userId, 'admin']);
      assert.isTrue(Roles.userIsInRole(userId, ['admin']));
    });

    it('refuses to let a non-admin grant a role', function () {
      assert.throws(function () {
        Meteor.server.method_handlers['adminGrantRole'].apply({ userId: otherUserId }, [userId, 'admin']);
      }, Meteor.Error);
      assert.isFalse(Roles.userIsInRole(userId, ['admin']));
    });

    it('prevents an admin from revoking their own admin role', function () {
      assert.throws(function () {
        Meteor.server.method_handlers['adminRevokeRole'].apply({ userId: adminId }, [adminId, 'admin']);
      }, function (error) {
        return error instanceof Meteor.Error && error.error === 'self-revoke';
      });
      assert.isTrue(Roles.userIsInRole(adminId, ['admin']));
    });
  });

  describe('rate limits', function () {
    it('exposes the DDP rate-limiter rule registration function', function () {
      assert.isOk(DDPRateLimiter);
      assert.isFunction(DDPRateLimiter.addRule);
    });
  });
}
