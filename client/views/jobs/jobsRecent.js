Template.jobsRecent.helpers({
  'timeFromLastJob': function() {
    // Only consider live, on-market jobs — otherwise a user's own pending or
    // inactive post could make the homepage say "Last post about a few
    // seconds ago" even though nothing public has changed.
    var mostRecentJob = Jobs.findOne({
      status: 'active',
      country: currentMarket().country
    }, {
      sort: { createdAt: -1 }
    });
    if (mostRecentJob)
      return moment(mostRecentJob.createdAt).fromNow();
  },
  // A9.35 — Tile grid wrapper renders once and contains both featured
  // and recent loops, so we need a single boolean to decide whether to
  // mount the grid or the empty state. `jobs`/`featuredJobs` from the
  // route data are Mongo cursors and are always truthy, so we have to
  // peek at counts.
  // A9.36 — split into `hasFeatured` + `hasRecent` so the home can
  // render each strip independently.
  'hasJobs': function() {
    var d = this;
    return (d.jobs && d.jobs.count && d.jobs.count() > 0) ||
           (d.featuredJobs && d.featuredJobs.count && d.featuredJobs.count() > 0);
  },
  'hasFeatured': function() {
    var d = this;
    return !!(d.featuredJobs && d.featuredJobs.count && d.featuredJobs.count() > 0);
  },
  'hasRecent': function() {
    var d = this;
    return !!(d.jobs && d.jobs.count && d.jobs.count() > 0);
  }
});

