// A9.26 — community moderation hook.
//
// Anyone (signed-in or anonymous) can flag a job that breaks the site
// rules. We capture a small reason set so the admin queue stays
// glanceable; freeform `details` lets the reporter give context. The
// jobReports.create method (server/methods.js) is rate-limited
// (10/min/IP, 50/hr/user) in server/rate-limits.js.
//
// Schema decisions:
//   - `jobId` is required and is checked against Jobs at write time so
//     reports never reference deleted postings.
//   - `reason` is an enum (no "other") so the admin queue can group by
//     reason without sanitising free text.
//   - `resolution` mirrors the lifecycle: pending → reviewed → resolved.
//   - `resolvedBy` / `resolvedAt` are stamped by the admin UI when the
//     admin clicks Approve/Reject; never set client-side.

JobReports = new Mongo.Collection('jobReports');

JOB_REPORT_REASONS = [
  'spam',
  'scam',
  'discriminatory',
  'wrong_country',
  'expired_or_filled',
  'duplicate'
];

JOB_REPORT_RESOLUTIONS = ['pending', 'reviewed', 'dismissed', 'job_removed'];

JobReports.attachSchema(new SimpleSchema({
  jobId: {
    type: String,
    max: 64
  },
  reason: {
    type: String,
    allowedValues: JOB_REPORT_REASONS
  },
  details: {
    type: String,
    optional: true,
    max: 2000
  },
  // Hashed IP — we don't store the raw address; the hashIdentifier
  // helper is the same one used in cron logs.
  reporterIpHash: {
    type: String,
    optional: true,
    max: 64
  },
  reporterUserId: {
    type: String,
    optional: true,
    max: 64
  },
  resolution: {
    type: String,
    allowedValues: JOB_REPORT_RESOLUTIONS,
    autoValue: function() {
      if (this.isInsert) return 'pending';
    }
  },
  resolvedBy: {
    type: String,
    optional: true,
    max: 64
  },
  resolvedAt: {
    type: Date,
    optional: true
  },
  createdAt: {
    type: Date,
    autoValue: function() {
      if (this.isInsert) return new Date();
      if (this.isUpsert) return { $setOnInsert: new Date() };
      this.unset();
    }
  }
}));

// Default-deny: no client-side writes ever. Inserts go through the
// 'jobReports.create' method on the server; updates through admin
// methods only.
JobReports.deny({
  insert: function() { return true; },
  update: function() { return true; },
  remove: function() { return true; }
});
