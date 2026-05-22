Jobs = new Mongo.Collection("jobs");

// A9.20: label() functions so AutoForm renders localised field labels.
// `t` is a global declared in both/lib/i18n.js. On the server (where we
// don't have a per-request locale) `t` returns the English fallback —
// which is acceptable for server-side validation messages and admin
// CLIs. The function is invoked each render so client locale switches
// re-label live.
function i18nLabel(key, fallback) {
  return function() {
    if (typeof t === 'function') {
      try { return t(key); } catch (e) { /* boot-order safety */ }
    }
    return fallback;
  };
}

Jobs.attachSchema(
  new SimpleSchema({
    title: {
      type: String,
      label: i18nLabel('jobs.field.title', 'Job Title'),
      max: 128
    },
    company: {
      type: String,
      label: i18nLabel('jobs.field.company', 'Company'),
      max: 128,
      optional: true
    },
    country: {
      type: String,
      label: i18nLabel('jobs.field.country', 'Country'),
      allowedValues: COUNTRIES
    },
    location: {
      type: String,
      label: i18nLabel('jobs.field.location', 'City or Region'),
      max: 128,
      optional: true
    },
    url: {
      type: String,
      label: i18nLabel('jobs.field.url', 'URL'),
      max: 256,
      optional: true,
      regEx: SimpleSchema.RegEx.Url
    },
    contact: {
      type: String,
      label: i18nLabel('jobs.field.contact', 'Contact Info'),
      max: 128
    },
    // A10.0 — WhatsApp apply. Optional E.164-ish phone number. We
    // intentionally allow `+`, digits, spaces, dashes and parens so
    // posters can paste numbers in whatever format they have on hand;
    // the client-side renderer strips non-digits before building the
    // `wa.me/<digits>` URL.
    applyWhatsApp: {
      type: String,
      label: i18nLabel('job.apply_whatsapp.label', 'WhatsApp apply number'),
      max: 32,
      optional: true,
      regEx: /^\+?[0-9 ()\-]{7,32}$/
    },
    jobtype: {
      type: String,
      label: i18nLabel('jobs.field.jobtype', 'Job Type'),
      allowedValues: JOB_TYPES
    },
    remote: {
      type: Boolean,
      label: i18nLabel('jobs.field.remote', 'This is a remote position.')
    },
    // A9.25: structured salary fields. All optional so existing
    // postings remain valid. UI rendering is in client/views/jobs/job.html.
    salaryMin: {
      type: Number,
      label: i18nLabel('jobs.field.salary_min', 'Salary (minimum)'),
      optional: true,
      min: 0
    },
    salaryMax: {
      type: Number,
      label: i18nLabel('jobs.field.salary_max', 'Salary (maximum)'),
      optional: true,
      min: 0
    },
    salaryCurrency: {
      type: String,
      label: i18nLabel('jobs.field.salary_currency', 'Salary currency'),
      optional: true,
      allowedValues: ['MXN', 'MZN', 'USD', 'EUR', 'ZAR']
    },
    salaryPeriod: {
      type: String,
      label: i18nLabel('jobs.field.salary_period', 'Salary period'),
      optional: true,
      allowedValues: ['hour', 'day', 'week', 'month', 'year']
    },
    userId: {
      type: String,
      label: "User Id",
      autoValue: function() {
        if (this.isInsert) {
          return Meteor.userId();
        } else if (this.isUpsert) {
          return {
            $setOnInsert: Meteor.userId()
          };
        } else {
          this.unset();
        }
      },
      denyUpdate: true
    },
    userName: {
      type: String,
      label: "User Name",
      autoValue: function() {
        if (this.isInsert) {
          return getUserName(Meteor.user());
        } else if (this.isUpsert) {
          return {
            $setOnInsert: getUserName(Meteor.user())
          };
        } else {
          this.unset();
        }
      }
    },
    description: {
      type: String,
      label: i18nLabel('jobs.field.description', 'Job Description'),
      // A9.37: bumped from 20000 to 50000 to accommodate longer roles
      // with structured benefit lists and multi-language postings.
      max: 50000,
      autoform: {
        afFieldInput: SUMMERNOTE_OPTIONS
      }
    },
    status: {
      type: String,
      label: i18nLabel('jobs.field.status', 'Status'),
      allowedValues: STATUSES,
      autoValue: function() {
        if (this.isInsert) {
          return 'pending';
        } else if (this.isUpsert) {
          return {
            $setOnInsert: 'pending'
          };
        }
      },
    },
    featuredThrough: {
      type: Date,
      optional: true
    },
    featuredChargeHistory: {
      type: [String],
      optional: true
    },
    // B3.6: every admin status change appends an entry here so we have an
    // audit trail for moderation. `from` is optional because the first
    // entry (initial submission → pending) has no prior state.
    statusHistory: {
      type: Array,
      optional: true,
      defaultValue: []
    },
    'statusHistory.$': {
      type: Object
    },
    'statusHistory.$.at': {
      type: Date
    },
    'statusHistory.$.by': {
      type: String
    },
    'statusHistory.$.from': {
      type: String,
      optional: true
    },
    'statusHistory.$.to': {
      type: String,
      allowedValues: STATUSES
    },
    'statusHistory.$.reason': {
      type: String,
      optional: true,
      max: 500
    },
    // H3: stamped by the expiry cron when a 90-day-old `active` job is
    // flipped to `inactive`, so we can distinguish auto-expiry from a
    // moderator deactivation.
    expiredAt: {
      type: Date,
      optional: true
    },
    // p3-fix-011: when an admin first flips a job to `active`, stamp
    // the publication time so the public job detail page can display
    // "Publicado em <publishedAt>" (creation time leaks the gap
    // between submission and approval, which surprises posters).
    publishedAt: {
      type: Date,
      optional: true
    },
    // Automatically set HTML content based on markdown content
    // whenever the markdown content is set.
    htmlDescription: {
      type: String,
      optional: true,
      autoValue: function(doc) {
        var htmlContent = this.field("description");
        if (Meteor.isServer && htmlContent.isSet) {
          return cleanHtml(htmlContent.value);
        }
      }
    },
    // Force value to be current date (on server) upon insert
    // and prevent updates thereafter.
    createdAt: {
      type: Date,
      autoValue: function() {
        if (this.isInsert) {
          return new Date();
        } else if (this.isUpsert) {
          return {
            $setOnInsert: new Date()
          };
        } else {
          this.unset();
        }
      },
      denyUpdate: true
    },
    // Force value to be current date (on server) upon update
    // and don't allow it to be set upon insert.
    updatedAt: {
      type: Date,
      autoValue: function() {
        if (this.isUpdate) {
          return new Date();
        }
      },
      denyInsert: true,
      optional: true
    }
  })
);

Jobs.helpers({
  path: function() {
    return 'jobs/' + this._id + '/' + this.slug();
  },
  slug: function() {
    return getSlug(this.title);
  },
  featured: function() {
    return this.featuredThrough && moment().isBefore(this.featuredThrough);
  },
  featuredAllowed: function() {
    return this.status === "pending" || this.status === "active";
  },
  // B3.10: true once the job is older than the 90-day listing window
  // (and there's been no edit since). Used by the admin status panel so
  // moderators can see that an `active` toggle would still expire today.
  isExpired: function() {
    var cutoff = daysUntilExpiration();
    if (!this.createdAt) return false;
    if (this.createdAt >= cutoff) return false;
    if (this.updatedAt && this.updatedAt >= cutoff) return false;
    return true;
  },
  // B2.16: render the original poster's name even after a delete by
  // preferring the live user document, falling back to the snapshot
  // we stored on the job at creation time.
  posterName: function() {
    if (this.userId) {
      var user = Meteor.users.findOne({ _id: this.userId });
      if (user) {
        var live = getUserName(user);
        if (live) return live;
      }
    }
    return this.userName || 'Unknown';
  }
});

// Block client-side inserts - all job creation goes through server methods with reCAPTCHA
// Keep update rules to allow users to edit their own jobs after creation
Jobs.allow({
  insert: function(userId, doc) {
    return false; // Prevent all client-side inserts
  },
  update: function(userId, doc, fieldNames, modifier) {
    return Roles.userIsInRole(userId, ['admin']) ||
      (!_.contains(fieldNames, 'htmlDescription') && !_.contains(fieldNames, 'status') && !_.contains(fieldNames, 'statusHistory') && !_.contains(fieldNames, 'featuredThrough') && !_.contains(fieldNames, 'featuredChargeHistory') && /*doc.status === "pending" &&*/ userId && doc && userId === doc.userId);
  },
  remove: function(userId, doc) {
    return false;
  },
  fetch: ['userId', 'status']
});

// Tier 6 — operational hygiene: indexes for every publication and API
// read path. Without these the moderation queue and the public /jobs
// list cause full collection scans once the dataset gets non-trivial.
// `_ensureIndex` is a no-op when the index already exists, so it's safe
// to keep at the bottom of the schema file.
if (Meteor.isServer) {
  Meteor.startup(function () {
    try {
      // Public homepage + /jobs API + RSS feed.
      Jobs._ensureIndex({ status: 1, country: 1, createdAt: -1 });
      // Featured jobs lane (home + featuredJobs publication).
      Jobs._ensureIndex({ status: 1, country: 1, featuredThrough: -1 });
      // myJobs + adminJobs publications (filter by userId or status).
      Jobs._ensureIndex({ userId: 1, country: 1 });
      Jobs._ensureIndex({ status: 1, createdAt: -1 });
      // H3 expiry cron's selector.
      Jobs._ensureIndex({ status: 1, createdAt: 1 });
    } catch (e) {
      // A9.45 \u2014 server-only; log shim is safe here.
      log.error('jobs.ensure_index.failed', { error: e && e.message });
    }
  });
}
