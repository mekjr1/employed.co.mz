getUserName = function(user) {
  if (!user)
    return '';

  if (user.profile && user.profile.name)
    return user.profile.name;
  if (user.profile && user.profile.firstName && user.profile.lastName)
    return user.profile.firstName + " " + user.profile.lastName;
  if (user.username)
    return user.username;
  if (user.emails && user.emails[0] && user.emails[0].address)
    return user.emails[0].address;

  return '';
};

getUserEmail = function(user) {
  if (user && user.emails && user.emails[0] && user.emails[0].address)
    return user.emails[0].address;
  else if (user && user.services && user.services.facebook && user.services.facebook.email)
    return user.services.facebook.email;
  else if (user && user.services && user.services.google && user.services.google.email)
    return user.services.google.email;
  else if (user && user.services && user.services.github && user.services.github.email)
    return user.services.github.email;
  else if (user && user.services && user.services.linkedin && user.services.linkedin.email)
    return user.services.linkedin.email;
  else if (user && user.services && user.services.twitter && user.services.twitter.email)
    return user.services.twitter.email;
  else if (user && user.services && user.services.meteor && user.services.meteor.email)
    return user.services.meteor.email;
};

daysUntilExpiration = function() {
  var daysToWait = 90;
  var daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - daysToWait);
  return daysAgo;
};

marketFromKey = function(key) {
  return MARKETS[key] || MARKETS[DEFAULT_MARKET_KEY];
};

marketFromCountry = function(country) {
  return _.find(MARKETS, function(market) {
    return market.country === country;
  }) || marketFromKey(DEFAULT_MARKET_KEY);
};

marketKeyFromHostname = function(hostname) {
  var cleanHost = (hostname || '').toLowerCase().split(':')[0];
  var firstLabel = cleanHost.split('.')[0];

  if (MARKETS[firstLabel]) {
    return firstLabel;
  }

  return DEFAULT_MARKET_KEY;
};

marketFromHostname = function(hostname) {
  return marketFromKey(marketKeyFromHostname(hostname));
};

marketFromConnection = function(connection) {
  var headers = connection && connection.httpHeaders;
  return marketFromHostname(headers && headers.host);
};

currentMarket = function() {
  if (Meteor.isClient && window && window.location) {
    return marketFromHostname(window.location.hostname);
  }

  return marketFromKey(DEFAULT_MARKET_KEY);
};

currentMarketKey = function() {
  return currentMarket().key;
};

absoluteUrlForHost = function(path, host) {
  if (!host) {
    return Meteor.absoluteUrl(path);
  }

  // A9.8 — the host string is read from `connection.httpHeaders.host`,
  // which is attacker-controlled (it's just the Host header). Without
  // validation, a malicious request like `Host: evil.com` produces RSS /
  // sitemap / email URLs that point at attacker-controlled domains. This
  // was a Host header injection (CWE-20 / OWASP A03:2021). Reject hosts
  // that don't map to a known market (or to lvh.me / localhost in dev),
  // and fall back to the canonical absolute URL the operator configured.
  var bareHost = String(host || '').split(':')[0].toLowerCase();
  var localPattern = /(^localhost$|\.localhost$|^127\.0\.0\.1$|\.lvh\.me$|^lvh\.me$)/;
  var marketKey = marketKeyFromHostname(host);

  // marketFromHostname always returns the default market, so we can't use
  // the return value alone to detect an unknown host. Instead, accept the
  // host only when (a) the first label exactly matches a configured market
  // key, or (b) the host is a recognised local development pattern.
  var firstLabel = bareHost.split('.')[0];
  var knownMarket = !!MARKETS[firstLabel];
  var isLocal = localPattern.test(bareHost);
  if (!knownMarket && !isLocal) {
    if (typeof log !== 'undefined' && log && log.warn) {
      log.warn('helpers.absoluteUrlForHost.rejected_host', { host: bareHost, marketKey: marketKey });
    }
    return Meteor.absoluteUrl(path);
  }

  var cleanPath = (path || '').replace(/^\//, '');
  var protocol = isLocal ? 'http' : 'https';

  return protocol + '://' + host + '/' + cleanPath;
};
