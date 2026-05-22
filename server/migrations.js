Migrations.add({
  version: 1,
  // S6: original migration computed an MD5 emailHash for every user so
  // Gravatar could find their avatar. We dropped Gravatar (MD5 over email
  // addresses is reversible), so this migration is now a no-op. Kept here
  // only to preserve the migration version sequence for existing DBs.
  name: 'Adds emailHash for all existing users (no-op since S6)',
  up: function() {},
  down: function() {}
});

Migrations.add({
  version: 2,
  name: 'Adds isDeveloper for all existing users',
  up: function() {
    var profileUserIds = _.pluck(Profiles.find().fetch(), 'userId');
    Users.update({
      _id: {
        $in: profileUserIds
      }
    }, {
      $set: {
        isDeveloper: true
      }
    }, {
      multi: true
    });
    Users.update({
      _id: {
        $nin: profileUserIds
      }
    }, {
      $set: {
        isDeveloper: false
      }
    }, {
      multi: true
    });
  },
  down: function() {}
});

Migrations.add({
  version: 3,
  name: 'Adds randomSorter for all developers',
  up: function() {
    Profiles.find({}).forEach(function(profile) {
      Profiles.update({
        _id: profile._id
      }, {
        $set: {
          randomSorter: Math.floor(Math.random() * 10000)
        }
      });
    });
  },
  down: function() {}
});

Migrations.add({
  version: 4,
  name: 'Copy htmlDescription over to description',
  up: function() {
    Profiles.find({}).forEach(function(profile) {
      if (profile.htmlDescription)
        Profiles.update({
          _id: profile._id
        }, {
          $set: {
            description: profile.htmlDescription,
            htmlDescription: cleanHtml(profile.htmlDescription)
          }
        });
    });

    Jobs.find({}).forEach(function(job) {
      if (job.htmlDescription)
        Jobs.update({
          _id: job._id
        }, {
          $set: {
            description: job.htmlDescription,
            htmlDescription: cleanHtml(job.htmlDescription)
          }
        });
    });

  },
  down: function() {}
});

Migrations.add({
  version: 5,
  name: 'Set status for all profiles/jobs',
  up: function() {
    Profiles.update({}, { $set: { status: "active" } }, { multi: true });
    Jobs.update({}, { $set: { status: "active" } }, { multi: true });
  },
  down: function() {}
});


Migrations.add({
  version: 6,
  name: 'Ensure https urls for all profile custom images',
  up: function() {
    Profiles.find({ customImageUrl: { $exists: true } }).forEach(function(profile) {
      if (profile.customImageUrl !== "") {
        var newUrl = profile.customImageUrl.replace("http://www.ucarecdn.com", "https://ucarecdn.com");
        if (newUrl !== profile.customImageUrl)
          Profiles.update({ _id: profile._id }, { $set: { customImageUrl: newUrl } });
      }
    });
  },
  down: function() {}
});

// v7 re-runs the (now attribute-aware) cleanHtml sanitizer over every existing
// job/profile description. Before this migration the sanitizer stripped all
// attributes — including `href` on <a> tags — so historic posts displayed
// links as inert text. Re-sanitizing in place restores them.
//
// A9.38 — rewritten to use rawCollection().bulkWrite() in batches of 500
// instead of a Mongo update per document. On a database with thousands
// of jobs the original forEach was issuing a round-trip per record and
// blocking the startup migration step for minutes. The per-doc
// `migrationV7Done` flag makes the migration idempotent: if it fails
// halfway it can be re-run safely without re-sanitising records that
// already ran.
Migrations.add({
  version: 7,
  name: 'Re-sanitize htmlDescription to preserve link href attributes',
  up: function() {
    var BATCH = 500;

    function flushBulk(rawColl, ops) {
      if (!ops.length) return;
      // ordered: false lets Mongo continue past per-op errors and report
      // them all rather than aborting on the first.
      rawColl.bulkWrite(ops, { ordered: false });
    }

    function migrate(coll, label) {
      var rawColl = coll.rawCollection();
      var cursor = coll.find({
        description: { $exists: true, $ne: '' },
        migrationV7Done: { $ne: true }
      }, { fields: { description: 1 } });
      var ops = [];
      var total = 0;
      cursor.forEach(function(doc) {
        ops.push({
          updateOne: {
            filter: { _id: doc._id },
            update: {
              $set: {
                htmlDescription: cleanHtml(doc.description),
                migrationV7Done: true
              }
            }
          }
        });
        if (ops.length >= BATCH) {
          flushBulk(rawColl, ops);
          total += ops.length;
          ops = [];
        }
      });
      if (ops.length) {
        flushBulk(rawColl, ops);
        total += ops.length;
      }
      log.info('migrations.v7.complete', { collection: label, updated: total });
    }

    migrate(Jobs, 'jobs');
    migrate(Profiles, 'profiles');
  },
  down: function() {}
});

Meteor.startup(function() {
  Migrations.migrateTo('latest');
});
