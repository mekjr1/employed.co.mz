// Tier 6 (operational hygiene): unauthenticated liveness probe for
// uptime checkers and load-balancer health checks.
//
// Stays cheap: NO Mongo call by default, NO settings read. If the
// process is up and the event loop accepts requests, we return 200.
// A `?db=1` query param flips on a single ping to Mongo so a deeper
// check is available when an operator wants it.
//
// A9.44 \u2014 added a separate readiness mode (`?readiness=1`). Liveness is
// \"the process is up\"; readiness is \"the process can serve requests\".
// The two differ in the boot window: Meteor.startup callbacks must
// finish before publications, methods, and the Stripe webhook handler
// are wired up. docker-compose / k8s use the readiness endpoint to gate\n// traffic so requests don't hit a half-started server.

var startupComplete = false;
Meteor.startup(function () {
  // Push this onto the next tick of the startup queue so it runs AFTER
  // every other Meteor.startup callback (which all register at module
  // load time). startupComplete=true means publications, rate limits,
  // startup checks, Stripe init, etc. are all done.
  Meteor.defer(function () { startupComplete = true; });
});

Meteor.startup(function () {
  if (typeof WebApp === 'undefined' || !WebApp.connectHandlers) {
    log.warn('healthz.no_connecthandlers');
    return;
  }

  WebApp.connectHandlers.use('/healthz', Meteor.bindEnvironment(function (req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json');

    var wantDb = req.url && req.url.indexOf('db=1') !== -1;
    var wantReadiness = req.url && req.url.indexOf('readiness=1') !== -1;
    var body = { ok: true, time: new Date().toISOString() };

    if (wantReadiness) {
      body.ready = startupComplete;
      if (!startupComplete) {
        body.ok = false;
        res.statusCode = 503;
        res.end(JSON.stringify(body));
        return;
      }
    }

    if (wantDb) {
      try {
        // Cheap server-side ping; throws if Mongo is unreachable.
        var rawDb = (typeof MongoInternals !== 'undefined') &&
          MongoInternals.defaultRemoteCollectionDriver().mongo.db;
        if (rawDb && typeof rawDb.command === 'function') {
          // Meteor 2 wraps Mongo with Fibers; this call is sync.
          rawDb.command({ ping: 1 });
        }
        body.db = 'ok';
      } catch (e) {
        body.ok = false;
        body.db = 'error';
        body.dbError = e && e.message;
        res.statusCode = 503;
        res.end(JSON.stringify(body));
        return;
      }
    }

    res.statusCode = 200;
    res.end(JSON.stringify(body));
  }));
});
