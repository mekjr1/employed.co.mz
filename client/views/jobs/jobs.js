// Template.jobs.onCreated(function() {
//   this.infiniteScroll({
//     perPage: 30,
//     subManager: subs,
//     collection: Jobs,
//     publication: 'jobs'
//   });
// });

// A9.24 — JobsFilter is a thin wrapper over Session so we don't have
// to depend on the reactive-dict package separately. Session is itself
// a ReactiveDict; we just namespace under `jobsFilter.*` to avoid
// colliding with any future Session keys.
// A9.36 — `page` (0-indexed) and `pageSize` (allowlisted) live in the
// same bag so the iron-router subscription re-fires when either
// changes, server fetches a fresh slice, and back-button + same-tab
// session restore both Just Work.
JOBS_PAGE_SIZES = [12, 24, 48];
JOBS_DEFAULT_PAGE_SIZE = 12;
// A9.36 — every 4 rows is followed by one ad. With the default 3-col
// desktop grid that's `4 * 3 = 12` job tiles per ad cycle, so:
//   - 12/page = 1 ad (after row 4 of 4)
//   - 24/page = 2 ads (after rows 4 and 8)
//   - 48/page = 4 ads (after rows 4, 8, 12, 16)
// Mobile/tablet keep the same job-count cadence; the ad always spans
// the full grid row via `grid-column: 1 / -1`.
JOBS_AD_EVERY = 12;

JobsFilter = {
  _key: function(k) { return 'jobsFilter.' + k; },
  get: function(k) { return Session.get(this._key(k)); },
  set: function(k, v) { Session.set(this._key(k), v); },
  snapshot: function() {
    var pageSize = this.get('pageSize');
    if (JOBS_PAGE_SIZES.indexOf(pageSize) === -1) pageSize = JOBS_DEFAULT_PAGE_SIZE;
    var page = this.get('page');
    if (typeof page !== 'number' || page < 0) page = 0;
    return {
      query: this.get('query') || '',
      jobtype: this.get('jobtype') || '',
      remote: !!this.get('remote'),
      page: page,
      pageSize: pageSize
    };
  },
  hasActive: function() {
    var s = this.snapshot();
    return !!(s.query || s.jobtype || s.remote);
  },
  // A9.36 — any filter change resets pagination to page 0 so the user
  // doesn't land on "page 5 of 1" after narrowing the result set.
  resetPage: function() { this.set('page', 0); }
};

// Debounce so we don't fire one resubscribe per keystroke.
function debounce(fn, ms) {
  var t;
  return function() {
    var ctx = this, args = arguments;
    clearTimeout(t);
    t = setTimeout(function() { fn.apply(ctx, args); }, ms);
  };
}

// A9.36 — total-count cache. The `jobs` publication ships only the
// current page, so MiniMongo can't answer "how many pages are there?".
// This ReactiveVar holds the server's count for the *current* filter
// snapshot; it's refreshed by `refreshTotalCount` whenever filters
// change. A snapshot fingerprint is stored alongside so we don't fire
// the method for filter shapes we already have an answer for.
JobsTotal = new ReactiveVar(null);
JobsTotalFingerprint = null;
function fingerprint(s) {
  // Page index is excluded because total is independent of which page
  // is being viewed.
  return [s.query || '', s.jobtype || '', s.remote ? '1' : '0',
          s.pageSize].join('|');
}
refreshTotalCount = function() {
  var s = JobsFilter.snapshot();
  var fp = fingerprint(s);
  if (fp === JobsTotalFingerprint) return;
  JobsTotalFingerprint = fp;
  Meteor.call('jobs.count', currentMarketKey(), s, function(err, total) {
    // Bail if a newer fingerprint already supersedes this response.
    if (fingerprint(JobsFilter.snapshot()) !== fp) return;
    if (err) {
      // On error leave the previous value in place rather than
      // flashing a misleading zero.
      return;
    }
    JobsTotal.set(typeof total === 'number' ? total : null);
  });
};

Template.jobs.onCreated(function() {
  var self = this;
  // Keep the total count in sync with whatever the user has filtered
  // down to. Skipping pagination args inside the fingerprint means
  // page navigation alone does NOT re-fire this method.
  self.autorun(function() {
    JobsFilter.snapshot(); // re-run on any filter change
    refreshTotalCount();
  });
});

Template.jobs.helpers({
  "jobs": function() {
    var filters = JobsFilter.snapshot();
    var selector = {
      country: currentMarket().country,
      status: 'active',
      // A9.36 — featured docs land in MiniMongo via the
      // `featuredJobs` sample subscription; keep them out of the main
      // grid so they don't appear twice.
      $or: [
        { featuredThrough: { $exists: false } },
        { featuredThrough: { $lt: new Date() } }
      ]
    };
    if (filters.query && filters.query.length >= 2) {
      var safe = filters.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var rx = new RegExp(safe, 'i');
      selector.$and = [
        { $or: selector.$or },
        { $or: [{ title: rx }, { company: rx }, { location: rx }] }
      ];
      delete selector.$or;
    }
    if (filters.jobtype) selector.jobtype = filters.jobtype;
    if (filters.remote) selector.remote = true;

    return Jobs.find(selector, {
      sort: { createdAt: -1 }
    });
  },
  // A9.36 — featured strip cursor (one grid row of random samples).
  // Reads the same MiniMongo `Jobs` collection the page populates;
  // the random-sample subscription puts exactly N docs in there.
  featuredJobs: function() {
    var d = Template.currentData();
    return d && d.featuredJobs;
  },
  hasFeatured: function() {
    var d = Template.currentData();
    return !!(d && d.featuredJobs && d.featuredJobs.count && d.featuredJobs.count() > 0);
  },
  // A9.36 — interleave one ad tile after every N job tiles (N = 12 by
  // default, see JOBS_AD_EVERY). The returned items carry either a
  // `job` payload (rendered via `{{> jobSmall job}}`) or an `isAd`
  // flag (rendered as a `grid-column: 1 / -1` strip). Iron-router
  // re-subscribes when `page`/`pageSize` change, so the cursor returned
  // by the `jobs` helper above is already the correct slice.
  jobsWithAds: function() {
    var helper = Template.instance().__helpers || null;
    // Re-run the `jobs` selector here rather than calling another
    // helper from inside this one (Blaze helpers can't call each
    // other directly).
    var filters = JobsFilter.snapshot();
    var selector = {
      country: currentMarket().country,
      status: 'active',
      $or: [
        { featuredThrough: { $exists: false } },
        { featuredThrough: { $lt: new Date() } }
      ]
    };
    if (filters.query && filters.query.length >= 2) {
      var safe = filters.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var rx = new RegExp(safe, 'i');
      selector.$and = [
        { $or: selector.$or },
        { $or: [{ title: rx }, { company: rx }, { location: rx }] }
      ];
      delete selector.$or;
    }
    if (filters.jobtype) selector.jobtype = filters.jobtype;
    if (filters.remote) selector.remote = true;

    // SubsManager keeps the previous page's docs cached in MiniMongo
    // for a while, so a plain `find()` would render both pages at
    // once. Slice the cursor with the same skip/limit the publication
    // applies so only the active page renders.
    var docs = Jobs.find(selector, {
      sort: { createdAt: -1 },
      skip: filters.page * filters.pageSize,
      limit: filters.pageSize
    }).fetch();
    var out = [];
    docs.forEach(function(job, i) {
      out.push({ _id: job._id, isAd: false, job: job });
      // A9.36 — insert an ad after every full block of N tiles. On a
      // 12/page view that's exactly one trailing ad; on 24/page it's
      // two (mid + trailing); on 48/page it's four. We *do* allow the
      // ad to sit at the very end of the page — the user requested
      // "every 4 rows followed by ad", and on a 12-job page that
      // makes the trailing slot the only place the ad fits.
      if (((i + 1) % JOBS_AD_EVERY) === 0) {
        out.push({ _id: 'ad-' + (i + 1), isAd: true });
      }
    });
    return out;
  },
  jobCount: function() {
    // Local count is now bounded by pageSize (publication only ships a
    // single page), so for "is there anything to show?" gating we
    // prefer the server-backed total when available.
    var total = JobsTotal.get();
    if (typeof total === 'number') return total > 0 ? total : null;
    // Fallback to MiniMongo while the count round-trip is in flight.
    var filters = JobsFilter.snapshot();
    var selector = {
      country: currentMarket().country,
      status: 'active',
      $or: [
        { featuredThrough: { $exists: false } },
        { featuredThrough: { $lt: new Date() } }
      ]
    };
    if (filters.query && filters.query.length >= 2) {
      var safe = filters.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var rx = new RegExp(safe, 'i');
      selector.$and = [
        { $or: selector.$or },
        { $or: [{ title: rx }, { company: rx }, { location: rx }] }
      ];
      delete selector.$or;
    }
    if (filters.jobtype) selector.jobtype = filters.jobtype;
    if (filters.remote) selector.remote = true;
    var count = Jobs.find(selector).count();
    return count > 0 ? count : null;
  },
  // A9.36 — pagination state and labels.
  pageSizeOptions: function() { return JOBS_PAGE_SIZES; },
  currentPageSize: function() { return JobsFilter.snapshot().pageSize; },
  totalCount: function() { return JobsTotal.get() || 0; },
  totalPages: function() {
    var total = JobsTotal.get() || 0;
    var size = JobsFilter.snapshot().pageSize;
    return Math.max(1, Math.ceil(total / size));
  },
  currentPageLabel: function() { return JobsFilter.snapshot().page + 1; },
  pageFromLabel: function() {
    var s = JobsFilter.snapshot();
    var total = JobsTotal.get() || 0;
    if (total === 0) return 0;
    return s.page * s.pageSize + 1;
  },
  pageToLabel: function() {
    var s = JobsFilter.snapshot();
    var total = JobsTotal.get() || 0;
    return Math.min(total, (s.page + 1) * s.pageSize);
  },
  prevDisabled: function() { return JobsFilter.snapshot().page <= 0; },
  nextDisabled: function() {
    var s = JobsFilter.snapshot();
    var total = JobsTotal.get() || 0;
    var pages = Math.max(1, Math.ceil(total / s.pageSize));
    return s.page >= pages - 1;
  },
  disabledAttr: function(v) { return v ? 'disabled' : ''; },
  filterQuery: function() { return JobsFilter.get('query'); },
  filterType: function() { return JobsFilter.get('jobtype'); },
  filterRemote: function() { return JobsFilter.get('remote'); },
  filtersActive: function() { return JobsFilter.hasActive(); },
  jobTypes: function() { return JOB_TYPES; },
  selectedAttr: function(current, option) {
    return String(current) === String(option) ? 'selected' : '';
  },
  checkedAttr: function(v) { return v ? 'checked' : ''; }
});

Template.jobs.events({
  'input #jobFilterQuery': debounce(function(event) {
    JobsFilter.set('query', event.target.value || '');
    JobsFilter.resetPage();
  }, 250),
  'change #jobFilterType': function(event) {
    JobsFilter.set('jobtype', event.target.value || '');
    JobsFilter.resetPage();
  },
  'change #jobFilterRemote': function(event) {
    JobsFilter.set('remote', !!event.target.checked);
    JobsFilter.resetPage();
  },
  'click #jobFilterClear': function(event) {
    event.preventDefault();
    JobsFilter.set('query', '');
    JobsFilter.set('jobtype', '');
    JobsFilter.set('remote', false);
    JobsFilter.resetPage();
  },
  'click #jobFilterClearEmpty': function(event) {
    event.preventDefault();
    JobsFilter.set('query', '');
    JobsFilter.set('jobtype', '');
    JobsFilter.set('remote', false);
    JobsFilter.resetPage();
  },
  'submit #jobFilters': function(event) {
    // Prevent the browser from reloading the page on Enter.
    event.preventDefault();
  },
  // A9.36 — pagination.
  'change #jobPageSize': function(event) {
    var v = parseInt(event.target.value, 10);
    if (JOBS_PAGE_SIZES.indexOf(v) === -1) v = JOBS_DEFAULT_PAGE_SIZE;
    JobsFilter.set('pageSize', v);
    // Clamp current page to the new max so we don't end up requesting
    // page 9 with pageSize 48 just because we were on page 9 of 12s.
    JobsFilter.set('page', 0);
  },
  'click #jobPagePrev': function(event) {
    event.preventDefault();
    var p = JobsFilter.snapshot().page;
    if (p > 0) {
      JobsFilter.set('page', p - 1);
      // Scroll to top of the main grid so the user sees the new page
      // start, not the bottom of the prev page.
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  },
  'click #jobPageNext': function(event) {
    event.preventDefault();
    var s = JobsFilter.snapshot();
    var total = JobsTotal.get() || 0;
    var pages = Math.max(1, Math.ceil(total / s.pageSize));
    if (s.page < pages - 1) {
      JobsFilter.set('page', s.page + 1);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
});
