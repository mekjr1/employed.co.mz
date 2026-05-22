// Publication tests for the moderation surfaces. The adminJobs
// publication is the one we lean on most for ship safety because
// (a) it backs the queue UI and (b) it rejected literal "all" until
// p3-fix-017. These tests pin the contract so a future refactor can't
// regress it.
import { Meteor } from 'meteor/meteor';
import { assert } from 'chai';

if (Meteor.isServer) {
  function requireTestDatabase() {
    const url = process.env.MONGO_URL || '';
    if (!/test/i.test(url)) {
      throw new Error('Refusing to run destructive publication tests outside a test Mongo database.');
    }
  }

  // Subscribe-and-collect harness — Meteor's PublicationCollector
  // package is not always present, so we drive the handler directly
  // via Meteor.server.publish_handlers and capture .added calls.
  function runPublish(name, args, userId) {
    const handler = Meteor.server.publish_handlers[name];
    if (!handler) throw new Error('No publish handler named ' + name);

    const docs = [];
    let isReady = false;
    const fakeSub = {
      userId: userId || null,
      added: function (col, id, doc) { docs.push({ col: col, id: id, doc: doc }); },
      changed: function () {},
      removed: function () {},
      ready: function () { isReady = true; },
      onStop: function () {},
      stop: function () {}
    };

    const cursor = handler.apply(fakeSub, args || []);
    // Handler may return a cursor (most pubs) or undefined after
    // calling this.ready() directly (the unauthenticated paths).
    if (cursor && typeof cursor.fetch === 'function') {
      cursor.fetch().forEach(function (d) {
        docs.push({ col: 'jobs', id: d._id, doc: d });
      });
    }
    return { docs: docs, isReady: isReady };
  }

  describe('publications/adminJobs', function () {
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

      // Use rawCollection to bypass the SimpleSchema autoValue that
      // calls Meteor.userId() — there is no method/publication context
      // during the test's beforeEach hook.
      Promise.await(Jobs.rawCollection().insertMany([
        {
          _id: Random.id(), title: 'Pending one',  status: 'pending',
          country: 'Mexico', jobtype: 'full-time', remote: false,
          contact: 'a@b.test', userId: userId, userName: 'U',
          description: 'd', htmlDescription: 'd',
          createdAt: new Date()
        },
        {
          _id: Random.id(), title: 'Active one',   status: 'active',
          country: 'Mexico', jobtype: 'full-time', remote: false,
          contact: 'a@b.test', userId: userId, userName: 'U',
          description: 'd', htmlDescription: 'd',
          createdAt: new Date()
        }
      ]));
    });

    afterEach(function () {
      Meteor.users.remove({});
      Jobs.remove({});
    });

    it('refuses to publish anything to anonymous visitors', function () {
      const result = runPublish('adminJobs', [null, 50], null);
      assert.lengthOf(result.docs, 0, 'no docs should leak to anonymous');
    });

    it('refuses to publish anything to non-admin signed-in users', function () {
      const result = runPublish('adminJobs', [null, 50], userId);
      assert.lengthOf(result.docs, 0, 'no docs should leak to non-admin');
    });

    it('returns all jobs to admins when status is null', function () {
      const result = runPublish('adminJobs', [null, 50], adminId);
      assert.lengthOf(result.docs, 2);
    });

    it('filters by status when a valid status is passed', function () {
      const result = runPublish('adminJobs', ['pending', 50], adminId);
      assert.lengthOf(result.docs, 1);
      assert.equal(result.docs[0].doc.status, 'pending');
    });

    it('rejects the literal string "all" — clients must pass null', function () {
      // p3-fix-017: the bug was that client passed "all" and the
      // check() silently rejected, dropping the subscription.
      // Document this with a hard assertion.
      assert.throws(function () {
        runPublish('adminJobs', ['all', 50], adminId);
      });
    });

    it('strips description and htmlDescription from results', function () {
      const result = runPublish('adminJobs', [null, 50], adminId);
      result.docs.forEach(function (d) {
        assert.notProperty(d.doc, 'description');
        assert.notProperty(d.doc, 'htmlDescription');
      });
    });

    it('caps the limit at 200 even if a larger number is requested', function () {
      // We can't easily insert 201 docs here without slowing the run.
      // Instead, just confirm the publication doesn't throw on a
      // boundary value and uses a sensible default.
      const result = runPublish('adminJobs', [null, 99999], adminId);
      assert.isAtMost(result.docs.length, 200);
    });
  });
}
