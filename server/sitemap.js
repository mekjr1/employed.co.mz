sitemaps.add('/sitemap.xml', function() {
  // Scope the sitemap to the requesting host's market so mx.* doesn't expose
  // mz.* listings and vice versa (the previous version returned every active
  // job regardless of country).
  var request = this.request || {};
  var hostHeader = request.headers && request.headers.host;
  var market = marketFromHostname(hostHeader);

  var out = [];
  Jobs.find({
    status: "active",
    country: market.country,
    createdAt: { $gte: daysUntilExpiration() }
  }, {
    sort: { createdAt: -1 }
  }).forEach(function(job) {
    // P1: emit per-host absolute URLs so the mx.* sitemap points at
    // mx.* and the mz.* sitemap points at mz.*. The default behaviour
    // (a relative `page`) lets gadicohen:sitemaps join with ROOT_URL,
    // which collapses every market onto the same hostname.
    out.push({
      page: absoluteUrlForHost(job.path(), hostHeader),
      lastmod: job.updatedAt || job.createdAt
    });
  });

  return out;
});
