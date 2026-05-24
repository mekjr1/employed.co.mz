import { Meteor } from 'meteor/meteor';
import { assert } from 'chai';

if (Meteor.isServer) {
  function requireTestDatabase() {
    const url = process.env.MONGO_URL || '';
    if (!/test/i.test(url)) {
      throw new Error('Refusing to run destructive cron tests outside a test Mongo database.');
    }
  }

  function insertJob(attrs) {
    const doc = Object.assign({
      _id: Random.id(),
      title: 'Expiring job',
      company: 'Test company',
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

  describe('cron job expiry', function () {
    before(function () {
      requireTestDatabase();
    });

    beforeEach(function () {
      Jobs.remove({});
    });

    afterEach(function () {
      Jobs.remove({});
    });

    it('expires active jobs older than 90 days', function () {
      const oldCreatedAt = new Date();
      oldCreatedAt.setDate(oldCreatedAt.getDate() - 91);
      const jobId = insertJob({
        createdAt: oldCreatedAt,
        status: 'active'
      });
      const entry = _.find(_.values(SyncedCron._entries || {}), function (candidate) {
        return candidate.name === 'Expire 90-day-old active jobs';
      });

      assert.isOk(entry, 'expected the expiry cron entry to be registered');
      entry.job();

      const job = Jobs.findOne({ _id: jobId });
      assert.equal(job.status, 'inactive');
      assert.instanceOf(job.expiredAt, Date);
      assert.equal(job.statusHistory[job.statusHistory.length - 1].reason, 'Auto-expired after 90 days');
    });
  });
}
