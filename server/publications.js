// A9.4 — the null publication used to ship `Meteor.users` documents with
// **no** field projection. That meant every signed-in client received
// `services.password.bcrypt`, `services.resume.loginTokens` (hashed but
// still token-shaped), and every linked OAuth refresh-token payload. The
// fix below ships only the columns the client actually renders: the
// account display profile, the username, the verified emails, the role
// array, and the *id* portion of each OAuth provider (used by Avatar to
// pick a service icon — never the access token).
//
// A9.6 — `check(arguments, [Match.Any])` was effectively `check.disabled`;
// it accepted any number of any-typed args. The null publication takes
// none, so assert that explicitly.
Meteor.publish(null, function () {
  check(arguments.length, Match.Where(function (n) { return n === 0; }));
  if (this.userId) {
    return [
      Meteor.users.find({ _id: this.userId }, {
        fields: {
          'profile': 1,
          'username': 1,
          'emails': 1,
          'roles': 1,
          'createdAt': 1,
          'services.facebook.id': 1,
          'services.google.id': 1,
          'services.github.id': 1,
          'services.twitter.id': 1,
          // A9.3 — surface deletion state so the account-management UI can
          // show "deletion scheduled for X" without an extra round-trip.
          'deletionRequestedAt': 1,
          'deletionScheduledFor': 1
        }
      })
    ];
  }
  this.ready();
});

Meteor.publish("homeJobs", function (marketKey) {
  // A9.6 — per-arg check instead of [Match.Any].
  check(marketKey, Match.Maybe(String));
  var market = marketKey ? marketFromKey(marketKey) : marketFromConnection(this.connection);

  return [
    Jobs.find({
      featuredThrough: {
        $exists: false
      },
      createdAt: {
        $gte: daysUntilExpiration()
      },
      status: "active",
      country: market.country
    }, {
      sort: {
        createdAt: -1
      },
      limit: 10,
      fields: {
        title: true,
        company: true,
        country: true,
        location: true,
        createdAt: true,
        updatedAt: true,
        remote: true,
        jobtype: true,
        status: true,
        featuredThrough: true,
        // A9.35 — tile cards show a description excerpt + salary chip.
        description: true,
        salaryMin: true,
        salaryMax: true,
        salaryCurrency: true,
        salaryPeriod: true
      }
    })
  ];
});

// A9.36 — featured strip is exactly **one grid row** (≤ `size` tiles,
// default 3) randomly sampled per subscription from the pool of active,
// fresh, currently-featured jobs. Previously this pub shipped *every*
// active-featured doc (27 in the seeded stack) sorted by
// `featuredThrough`, which (a) flooded the home page with too many
// gold-bordered tiles and (b) was deterministic — refresh after refresh
// the same handful of jobs dominated. `$sample` rotates the spotlight
// without server-side state, and `this.added()` channels the sampled
// docs directly into the client `jobs` collection so the existing
// `jobSmall` template + `Jobs.helpers({ featured, path, ... })` work
// unchanged. SubsManager caches subs for 5 min, so the same visitor
// gets a stable strip during a browsing session but a fresh roll on
// the next visit (or after the cache window).
Meteor.publish("featuredJobs", function (marketKey, size) {
  check(marketKey, Match.Maybe(String));
  check(size, Match.Maybe(Match.Where(function (n) {
    return typeof n === 'number' && n >= 1 && n <= 12;
  })));
  var market = marketKey ? marketFromKey(marketKey) : marketFromConnection(this.connection);
  var n = (typeof size === 'number') ? size : 3;
  var self = this;

  var matchStage = {
    featuredThrough: { $gte: new Date() },
    // Match the listing window: hide jobs older than the 90-day cutoff
    // even when their paid feature window is still open.
    createdAt: { $gte: daysUntilExpiration() },
    status: 'active',
    country: market.country
  };

  // Mirror the cursor-based fields() projection so the wire shape stays
  // identical to what jobSmall.html / Jobs.helpers expect.
  var projectStage = {
    title: 1, company: 1, country: 1, location: 1,
    createdAt: 1, updatedAt: 1, remote: 1, jobtype: 1,
    status: 1, featuredThrough: 1,
    // A9.35 — tile cards show a description excerpt + salary chip.
    description: 1, salaryMin: 1, salaryMax: 1,
    salaryCurrency: 1, salaryPeriod: 1
  };

  try {
    var docs = Promise.await(
      Jobs.rawCollection().aggregate([
        { $match: matchStage },
        { $sample: { size: n } },
        { $project: projectStage }
      ]).toArray()
    );
    docs.forEach(function (doc) {
      var id = doc._id;
      delete doc._id;
      self.added('jobs', id, doc);
    });
  } catch (e) {
    log.error('publications.featuredJobs.sample_failed',
      { err: e && e.message, market: market.key });
  }
  self.ready();
});

Meteor.publish("jobs", function (marketKey, filters) {
  // A9.36 — pagination, plus exclusion of currently-featured jobs.
  // Signature was previously `(limit, marketKey, filters)`; the leading
  // `limit` arg is gone now that page size travels inside `filters`.
  check(marketKey, Match.Maybe(String));
  // A9.24 — optional filter bag. All keys are individually optional
  // so the existing call sites continue to work. The query is capped
  // server-side to avoid abuse via wildcard regex.
  check(filters, Match.Maybe({
    query: Match.Maybe(String),
    jobtype: Match.Maybe(String),
    remote: Match.Maybe(Boolean),
    // A9.36 — pagination. `page` is 0-indexed; `pageSize` is clamped to
    // the allowlist below so a hand-crafted DDP message can't ask for
    // 10 000 docs in a single round-trip.
    page: Match.Maybe(Match.Integer),
    pageSize: Match.Maybe(Match.Integer)
  }));

  var market = marketKey ? marketFromKey(marketKey) : marketFromConnection(this.connection);

  var selector = {
    createdAt: {
      $gte: daysUntilExpiration()
    },
    status: "active",
    country: market.country,
    // A9.36 — featured jobs render in their own one-row strip via the
    // `featuredJobs` random-sample pub. Excluding them here keeps the
    // main grid from double-counting them and lets pagination math
    // align cleanly (page X of Y = non-featured pages only).
    $or: [
      { featuredThrough: { $exists: false } },
      { featuredThrough: { $lt: new Date() } }
    ]
  };

  if (filters) {
    // A9.24 — server-side filtering. We use case-insensitive substring
    // regex over title/company/location because Mongo text indexes
    // aren't part of the schema (operators can add one and we'll move
    // to $text if/when that ships). Limit to 80 chars to prevent
    // pathological regex DoS via long backtracking patterns.
    if (filters.query) {
      var q = String(filters.query).slice(0, 80).trim();
      if (q.length >= 2) {
        // Escape regex meta-characters; we want a literal substring search.
        var safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        var rx = new RegExp(safe, 'i');
        // Combine the keyword match with the existing $or by promoting
        // both into $and. Mongo would silently drop the first $or
        // otherwise.
        selector.$and = [
          { $or: selector.$or },
          { $or: [{ title: rx }, { company: rx }, { location: rx }] }
        ];
        delete selector.$or;
      }
    }
    if (filters.jobtype && JOB_TYPES.indexOf(filters.jobtype) !== -1) {
      selector.jobtype = filters.jobtype;
    }
    if (filters.remote === true) {
      selector.remote = true;
    }
  }

  // A9.36 — pagination. Allowlist the page sizes the UI offers so a
  // hand-crafted request can't run a 10 000-doc query. Default 12 to
  // match the UI's default selector.
  var ALLOWED_PAGE_SIZES = [12, 24, 48];
  var pageSize = (filters && ALLOWED_PAGE_SIZES.indexOf(filters.pageSize) !== -1)
    ? filters.pageSize
    : 12;
  var page = (filters && typeof filters.page === 'number' && filters.page >= 0)
    ? filters.page
    : 0;
  // Cap skip at a sane upper bound (1000 pages × 48 = 48 000 docs back)
  // so a malicious caller can't ask Mongo for arbitrarily deep scans.
  var skip = Math.min(page * pageSize, 48000);

  return Jobs.find(selector, {
    fields: {
      title: true,
      company: true,
      country: true,
      location: true,
      createdAt: true,
      updatedAt: true,
      remote: true,
      jobtype: true,
      status: true,
      featuredThrough: true,
      // A9.35 — tile cards show a description excerpt + salary chip.
      description: true,
      salaryMin: true,
      salaryMax: true,
      salaryCurrency: true,
      salaryPeriod: true
    },
    sort: {
      createdAt: -1
    },
    skip: skip,
    limit: pageSize
  });
});

Meteor.publish("my_jobs", function (marketKey) {
  // A9.6 — per-arg check instead of [Match.Any].
  check(marketKey, Match.Maybe(String));
  var market = marketKey ? marketFromKey(marketKey) : marketFromConnection(this.connection);

  if (this.userId) {
    return [
      Jobs.find({
        userId: this.userId,
        country: market.country
        // A9.7 — a single account with thousands of jobs would otherwise
        // ship the whole pile to the client on every dashboard load.
      }, {
        sort: { createdAt: -1 },
        limit: 200
      })
    ];
  }
  this.ready();
});

// B3.3: tighten the admin publication. We used to ship every field of
// every job to every connected admin tab. Now we accept a status filter
// and a limit, cap the latter, and project away large/sensitive fields
// (descriptions and Stripe charge ids). statusHistory ships so the
// admin timeline can render without an extra round-trip.
//
// POSTER-N1: also publish the minimal user docs for the job owners so
// the client-side posterName() helper resolves from MiniMongo without
// triggering an N+1 query per row.
Meteor.publish("adminJobs", function (status, limit) {
  check(status, Match.OneOf(null, undefined, Match.Where(function (s) {
    return _.contains(STATUSES, s);
  })));
  check(limit, Match.OneOf(null, undefined, Number));

  if (!this.userId || !Roles.userIsInRole(this.userId, ['admin'])) {
    this.ready();
    return;
  }

  var selector = status ? { status: status } : {};
  var capped = Math.min(Math.max(Number(limit) || 50, 1), 200);

  var jobsCursor = Jobs.find(selector, {
    sort: { createdAt: -1 },
    limit: capped,
    fields: {
      description: 0,
      htmlDescription: 0,
      featuredChargeHistory: 0
    }
  });

  // Collect distinct userIds from the matched jobs and publish a
  // lightweight user cursor so posterName() resolves locally.
  var userIds = _.uniq(jobsCursor.fetch().map(function (j) { return j.userId; }).filter(Boolean));
  var usersCursor = Meteor.users.find(
    { _id: { $in: userIds } },
    { fields: { 'profile.name': 1, 'emails.address': 1, username: 1 } }
  );

  return [jobsCursor, usersCursor];
});

// B3.7: publish the small list of users that currently hold the admin
// role so the moderation page can render an Admins panel and the
// revoke-role button can target real ids. Fields are kept narrow.
Meteor.publish("adminUsers", function () {
  if (!this.userId || !Roles.userIsInRole(this.userId, ['admin'])) {
    this.ready();
    return;
  }
  return Meteor.users.find({ roles: 'admin' }, {
    fields: {
      'emails.address': 1,
      'emails.verified': 1,
      'profile.name': 1,
      'roles': 1,
      'createdAt': 1
    },
    limit: 100
  });
});

// A9.26 — community-flag queue for the moderation page. Pending
// reports are surfaced by default; passing `status: 'all'` returns the
// full history (capped). Admin-only; non-admins get an empty cursor.
Meteor.publish("adminJobReports", function (status, limit) {
  check(status, Match.OneOf(null, undefined, String));
  check(limit, Match.OneOf(null, undefined, Number));

  if (!this.userId || !Roles.userIsInRole(this.userId, ['admin'])) {
    this.ready();
    return;
  }

  var selector = {};
  if (status === 'all') {
    // no filter
  } else if (status && JOB_REPORT_RESOLUTIONS.indexOf(status) !== -1) {
    selector.resolution = status;
  } else {
    selector.resolution = 'pending';
  }

  var capped = Math.min(Math.max(Number(limit) || 50, 1), 200);
  return JobReports.find(selector, {
    sort: { createdAt: -1 },
    limit: capped
  });
});

Meteor.publish("job", function (jobId, marketKey) {
  // A9.6 — per-arg check instead of [Match.Any].
  check(jobId, String);
  check(marketKey, Match.Maybe(String));
  var market = marketKey ? marketFromKey(marketKey) : marketFromConnection(this.connection);

  // Check authorization
  const isAdmin = Roles.userIsInRole(this.userId, 'admin');

  // Build query with authorization logic
  const query = { _id: jobId };

  if (!isAdmin) {
    // Non-admins can only see active jobs OR their own jobs
    query.$or = [
      { status: "active", country: market.country },
      { userId: this.userId }
    ];
  }

  return Jobs.find(query);
});

// A9.33 — Minimal subscription used by the AdSlot helper to suppress
// ads for users who currently have an active featured listing. We
// publish only the bare minimum (`_id`, `userId`, `featuredThrough`)
// so the payload is one tiny doc per active feature; subscribed
// always-on from `client/autorun.js`. `userId` is included so the
// client-side MiniMongo check can still scope by owner — public
// publications (`homeJobs`, `featuredJobs`) strip it. See
// docs/ads-strategy.md.
Meteor.publish("mySponsorState", function () {
  if (!this.userId) {
    this.ready();
    return;
  }
  return Jobs.find(
    { userId: this.userId, featuredThrough: { $gt: new Date() } },
    { fields: { _id: 1, userId: 1, featuredThrough: 1 } }
  );
});
