// B2.14: DDP rate limits.
//
// reCAPTCHA gives us a probabilistic spam signal; these limits give us a
// hard ceiling. A single connection can't post more than 5 jobs/hour even
// if every reCAPTCHA check passes, and a single signed-in user can't
// initiate more than 3 paid feature purchases/hour (which protects us from
// runaway Stripe charges if a UI bug starts double-clicking) or hammer the
// admin moderation method.
//
// Note: connectionId/userId matchers must return truthy for the rule to
// apply. Returning `true` matches every connection/user (i.e. global cap).

DDPRateLimiter.addRule({
  type: 'method',
  name: 'jobs.create',
  connectionId: function() { return true; }
}, 5, 60 * 60 * 1000); // 5 per hour per connection

DDPRateLimiter.addRule({
  type: 'method',
  name: 'featuredJob.checkout',
  userId: function() { return true; }
}, 3, 60 * 60 * 1000); // 3 per hour per signed-in user

// B3.8: bulk moderation is a high-leverage button. Cap it tightly so a
// stolen admin cookie can’t rewrite the whole moderation queue in a
// loop. 6 calls / hour is enough for normal moderation rhythms.
DDPRateLimiter.addRule({
  type: 'method',
  name: 'adminSetJobStatusBulk',
  userId: function() { return true; }
}, 6, 60 * 60 * 1000);

// B3.7: role changes are privileged. 10/hr is generous for legitimate
// onboarding while still blunting an automated abuse loop.
DDPRateLimiter.addRule({
  type: 'method',
  name: 'adminGrantRole',
  userId: function() { return true; }
}, 10, 60 * 60 * 1000);
DDPRateLimiter.addRule({
  type: 'method',
  name: 'adminRevokeRole',
  userId: function() { return true; }
}, 10, 60 * 60 * 1000);

DDPRateLimiter.addRule({
  type: 'method',
  name: 'adminSetJobStatus',
  userId: function() { return true; }
}, 60, 60 * 1000); // 60 per minute per signed-in user (admin throughput)

// B2.15: deletion is irreversible; cap it modestly to blunt accidental
// double-clicks and any scripted abuse.
DDPRateLimiter.addRule({
  type: 'method',
  name: 'jobs.deleteMine',
  userId: function() { return true; }
}, 20, 60 * 60 * 1000); // 20 per hour per user

// S3 resend pressure relief: don't let anyone trigger mail floods from
// the banner / menu item.
DDPRateLimiter.addRule({
  type: 'method',
  name: 'users.resendVerification',
  userId: function() { return true; }
}, 3, 60 * 60 * 1000); // 3 per hour per user

// A9.9 \u2014 deactivateJob (defined in both/lib/methods.js) was missing a
// rate-limit rule. A determined caller could thrash through every job on
// the dashboard, flipping statuses faster than admins can re-approve.
// 30/hour is generous for a single human dashboarding their own posts
// while preventing scripted abuse.
DDPRateLimiter.addRule({
  type: 'method',
  name: 'deactivateJob',
  userId: function() { return true; }
}, 30, 60 * 60 * 1000);

// A9.3 \u2014 account-deletion is irreversible AND triggers cascading deletes
// of every job + admin notifications. Cap to 3/hour so a stolen session
// can't request deletion in a loop and the UI's debounce is irrelevant.
DDPRateLimiter.addRule({
  type: 'method',
  name: 'users.requestAccountDeletion',
  userId: function() { return true; }
}, 3, 60 * 60 * 1000);
DDPRateLimiter.addRule({
  type: 'method',
  name: 'users.cancelAccountDeletion',
  userId: function() { return true; }
}, 5, 60 * 60 * 1000);
// Export pulls every job/comment row owned by the user. Cap to 5/hour
// per user to bound the cost of bulk extraction.
DDPRateLimiter.addRule({
  type: 'method',
  name: 'users.exportData',
  userId: function() { return true; }
}, 5, 60 * 60 * 1000);

// A9.26 \u2014 community job-reports. Cap so a single account can't bury
// the moderation queue. 10/hour is plenty for legitimate flagging.
DDPRateLimiter.addRule({
  type: 'method',
  name: 'jobReports.create',
  userId: function() { return true; },
  connectionId: function() { return true; }
}, 10, 60 * 60 * 1000);

// A9.36 — `jobs.count` is fired on every filter / page change so the
// UI can render "Page X of Y". 120/min/connection is generous for a
// human flipping pages quickly while still capping scripted abuse.
DDPRateLimiter.addRule({
  type: 'method',
  name: 'jobs.count',
  connectionId: function() { return true; }
}, 120, 60 * 1000);

// A10.0 — multi-provider featured-job initiation. Same cap as the
// legacy `featuredJob.checkout`: 3/hour/user. M-Pesa + e-Mola + Stripe
// share the budget so a user can't open three pending pushes by
// rotating providers.
DDPRateLimiter.addRule({
  type: 'method',
  name: 'featuredJob.initiate',
  userId: function() { return true; }
}, 3, 60 * 60 * 1000);

// A10.0 — payment.status is the client-side poll. With a 3s poll cadence
// and a 90s window per intent, ~30 calls per intent is the floor.
// 120/min/user lets a tab poll one intent for ~6 minutes (or several
// intents serially) while still capping scripted abuse.
DDPRateLimiter.addRule({
  type: 'method',
  name: 'payment.status',
  userId: function() { return true; }
}, 120, 60 * 1000);

DDPRateLimiter.addRule({
  type: 'method',
  name: 'payment.cancel',
  userId: function() { return true; }
}, 12, 60 * 1000);

DDPRateLimiter.addRule({
  type: 'method',
  name: 'payment.providersForMarket',
  connectionId: function() { return true; }
}, 60, 60 * 1000);
