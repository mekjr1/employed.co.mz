// API must be configured and built after startup!
Meteor.startup(function() {

  // B5.1: per-IP rate limit at the Restivus layer. 60 requests/min/IP is
  // generous for legitimate aggregators but kills naive scrapers fast.
  var Api = new Restivus({
    useDefaultAuth: false,
    rateLimit: { intervalMs: 60000, requestsPerInterval: 60 }
  });

  // Parse and clamp the `limit`/`skip` query params used by the
  // pagination-friendly endpoints below. Defaults: 50, max 200.
  var parseLimit = function(raw) {
    var n = parseInt(raw, 10);
    if (isNaN(n) || n <= 0) return 50;
    return Math.min(n, 200);
  };
  var parseSkip = function(raw) {
    var n = parseInt(raw, 10);
    if (isNaN(n) || n < 0) return 0;
    return n;
  };

  Api.addRoute('jobs', {
    get: function() {
      var market = marketFromHostname(this.request && this.request.headers && this.request.headers.host);
      var limit = parseLimit(this.queryParams && this.queryParams.limit);
      var skip = parseSkip(this.queryParams && this.queryParams.skip);
      var hostHeader = this.request && this.request.headers && this.request.headers.host;

      return {
        status: "success",
        data: Jobs.find({
          createdAt: {
            $gte: daysUntilExpiration()
          },
          status: "active",
          country: market.country
        }, {
          sort: {
            createdAt: -1
          },
          skip: skip,
          limit: limit,
          fields: {
            // B5.1: strip `contact` from the public listing. Scrapers
            // who want it can follow `siteUrl`. Also strips userId/userName
            // for the same reason — not for use in third-party indexes.
            userId: false,
            userName: false,
            contact: false
          },
          transform: function(doc) {
            doc.siteUrl = absoluteUrlForHost("jobs/" + doc._id + "/" + getSlug(doc.title), hostHeader);
            return doc;
          }
        }).fetch()
      };
    }
  });

  Api.addRoute('featuredJobs', {
    get: function() {
      var market = marketFromHostname(this.request && this.request.headers && this.request.headers.host);
      var limit = parseLimit(this.queryParams && this.queryParams.limit);
      var skip = parseSkip(this.queryParams && this.queryParams.skip);
      var hostHeader = this.request && this.request.headers && this.request.headers.host;

      return {
        status: "success",
        data: Jobs.find({
          featuredThrough: {
            $gte: new Date()
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
          skip: skip,
          limit: limit,
          fields: {
            userId: false,
            userName: false,
            contact: false
          },
          transform: function(doc) {
            doc.siteUrl = absoluteUrlForHost("jobs/" + doc._id + "/" + getSlug(doc.title), hostHeader);
            return doc;
          }
        }).fetch()
      };
    }
  });
});

// A9.3 — GET /api/me/export. Auth is by login token, passed either as
// `?token=...` (so users can paste the URL into a download manager) or
// as an `X-Auth-Token` header. We resolve the token to a userId via
// Meteor's hashed services.resume.loginTokens, then call the
// 'users.exportData' method on the user's behalf and stream the JSON.
Meteor.startup(function () {
  if (typeof WebApp === 'undefined' || !WebApp.connectHandlers) {
    log.warn('api.me_export.no_connecthandlers');
    return;
  }

  WebApp.connectHandlers.use('/api/me/export', Meteor.bindEnvironment(function (req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json');

    // Token from query string (?token=) or header.
    var url = req.url || '';
    var tokenMatch = url.match(/[?&]token=([^&]+)/);
    var rawToken = (tokenMatch && decodeURIComponent(tokenMatch[1])) ||
      req.headers['x-auth-token'] || req.headers['X-Auth-Token'];

    if (!rawToken) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: 'unauthenticated', message: 'Login token required.' }));
      return;
    }

    var hashed = Accounts._hashLoginToken(rawToken);
    var user = Meteor.users.findOne(
      { 'services.resume.loginTokens.hashedToken': hashed },
      { fields: { _id: 1 } }
    );

    if (!user) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: 'unauthenticated', message: 'Invalid or expired token.' }));
      return;
    }

    // DDPRateLimiter is applied to the underlying method, so the
    // /api/me/export endpoint inherits the same 5/hr/user ceiling.
    var payload;
    try {
      // Run the method in a context where this.userId = user._id by
      // calling it directly with that binding.
      var methodHandler = Meteor.server.method_handlers['users.exportData'];
      payload = methodHandler.call({ userId: user._id });
    } catch (e) {
      log.error('api.me_export.failed', { error: e && e.message });
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'export-failed', message: 'Could not produce export.' }));
      return;
    }

    var ts = new Date().toISOString().replace(/[:.]/g, '-');
    res.setHeader('Content-Disposition', 'attachment; filename="employed-export-' + ts + '.json"');
    res.statusCode = 200;
    res.end(JSON.stringify(payload, null, 2));
  }));
});
