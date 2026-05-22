RssFeed.publish('jobs', function(query) {
  var self = this;
  var request = self.request || {};
  var market = marketFromHostname(request.headers && request.headers.host);
  var pubDate = new Date();
  var lastBuildDate = new Date();
  var selector = {
    country: market.country
  };
  var activeSelector = {
    createdAt: {
      $gte: daysUntilExpiration()
    },
    status: "active",
    country: market.country
  };
  var mostRecent = Jobs.findOne(selector, {
    sort: {
      createdAt: -1
    }
  });
  var secondMostRecent = Jobs.findOne(selector, {
    sort: {
      createdAt: -1
    },
    skip: 1
  });
  if (mostRecent)
    pubDate = mostRecent.createdAt;
  if (secondMostRecent)
    lastBuildDate = secondMostRecent.createdAt;

  self.setValue('title', self.cdata(market.siteName + ' - Recent Jobs'));
  self.setValue('description', self.cdata('This is a feed of recent jobs posted to ' + market.siteName + '.'));
  self.setValue('link', absoluteUrlForHost('', request.headers && request.headers.host));
  self.setValue('lastBuildDate', lastBuildDate);
  self.setValue('pubDate', pubDate);
  self.setValue('ttl', 1);

  Jobs.find(activeSelector, {
    sort: {
      createdAt: -1
    },
    // B5.1: cap the RSS feed at the same upper bound the JSON API uses
    // so a single GET to /feed cannot dump the entire active dataset.
    limit: 200
  }).forEach(function(job) {
    self.addItem({
      title: self.cdata(job.title),
      description: self.cdata(job.htmlDescription),
      link: absoluteUrlForHost(job.path(), request.headers && request.headers.host),
      guid: absoluteUrlForHost(job.path(), request.headers && request.headers.host),
      pubDate: job.createdAt
    });
  });
});
