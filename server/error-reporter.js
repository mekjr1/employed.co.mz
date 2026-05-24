// A9.14 — Sentry server-side wiring.
//
// **Operator setup (DO NOT skip):**
//   1. Run `meteor npm install @sentry/node` (declared in package.json
//      once A9.14 lands; the package is NOT vendored).
//   2. Populate `settings.private.sentry.dsn` with the Node DSN.
//   3. Optionally populate `settings.private.sentry.environment`
//      (`production` / `staging`). Defaults to NODE_ENV.
//   4. Optionally populate `settings.private.sentry.release` with the
//      git SHA so source maps from the build pipeline line up.
//
// If the DSN is absent the reporter is a hard no-op. This keeps
// development and the existing CI / docker-compose flow unaffected.
//
// What this module does:
//   * Initialises Sentry at startup.
//   * Wraps Meteor.methods and Meteor.publish so a thrown exception
//     inside a method/pub handler is captured *with* its method name,
//     userId (hashed), and arguments shape (NOT values).
//   * Captures unhandled promise rejections and uncaughtException so a
//     stray async error doesn't silently kill a worker.
//
// What this module does NOT do:
//   * It does not log PII. Arguments are reported by shape only
//     (`['string', 'object', 'number']`), never values.
//   * It does not replace `server/lib/log.js`. Structured logs still
//     flow to stdout; Sentry is purely for unhandled / thrown errors.
//
// **Load order matters.** Meteor loads `server/` files alphabetically
// by default, and `e` < `m` < `p`, so this file is loaded before
// `methods.js`, `publications.js`, `cron.js`, `api.js`, etc. The
// Meteor.methods / Meteor.publish monkey patches are installed
// synchronously at module load (NOT inside Meteor.startup) so they
// catch every subsequent method/publish registration.

(function() {
  var sentryInstance = null;

  function argShape(args) {
    if (!args || !args.length) return [];
    return _.map(args, function(a) {
      if (a === null) return 'null';
      if (a === undefined) return 'undefined';
      if (Array.isArray(a)) return 'array';
      return typeof a;
    });
  }

  function hashedUserId(uid) {
    if (!uid) return null;
    try {
      return (typeof hashIdentifier === 'function') ? hashIdentifier(uid) : null;
    } catch (e) {
      return null;
    }
  }

  function wrapHandler(kind, name, handler) {
    return function() {
      var args = Array.prototype.slice.call(arguments);
      var self = this;
      try {
        return handler.apply(self, args);
      } catch (err) {
        if (sentryInstance) {
          try {
            sentryInstance.withScope(function(scope) {
              scope.setTag('handler.kind', kind);
              scope.setTag('handler.name', name);
              scope.setUser({ id: hashedUserId(self && self.userId) });
              scope.setContext('handler', {
                name: name,
                kind: kind,
                argShape: argShape(args)
              });
              sentryInstance.captureException(err);
            });
          } catch (innerErr) {
            // Never let Sentry's own failure mask the original error.
            if (typeof log !== 'undefined') {
              log.error('sentry.capture_failed', { err: innerErr && innerErr.message });
            }
          }
        }
        throw err;
      }
    };
  }

  // Install the monkey patches immediately, before any method/publish
  // is registered. They are inert until sentryInstance is populated
  // inside Meteor.startup below.
  var origMethods = Meteor.methods;
  Meteor.methods = function(map) {
    var wrapped = {};
    _.each(map, function(fn, name) {
      wrapped[name] = (typeof fn === 'function') ? wrapHandler('method', name, fn) : fn;
    });
    return origMethods.call(this, wrapped);
  };

  var origPublish = Meteor.publish;
  Meteor.publish = function(name, handler, options) {
    if (typeof handler === 'function') {
      return origPublish.call(this, name, wrapHandler('publication', String(name || '<anonymous>'), handler), options);
    }
    return origPublish.call(this, name, handler, options);
  };

  Meteor.startup(function() {
    var settings = (Meteor.settings && Meteor.settings.private && Meteor.settings.private.sentry) || {};
    var dsn = process.env.SENTRY_DSN || settings.dsn;

    if (!dsn || dsn === 'YOUR_SENTRY_DSN_HERE') {
      if (typeof log !== 'undefined') {
        log.info('sentry.disabled', { reason: 'no_dsn' });
      }
      return;
    }

    var Sentry;
    try {
      Sentry = Npm.require('@sentry/node');
    } catch (e) {
      if (typeof log !== 'undefined') {
        log.warn('sentry.module_missing', { err: e && e.message });
      }
      return;
    }

    Sentry.init({
      dsn: dsn,
      environment: process.env.SENTRY_ENVIRONMENT || settings.environment || process.env.NODE_ENV || 'development',
      release: settings.release || process.env.SENTRY_RELEASE || undefined,
      tracesSampleRate: Number(settings.tracesSampleRate || 0),
      beforeSend: function(event) {
        if (event.request) {
          delete event.request.cookies;
          if (event.request.headers) {
            delete event.request.headers.cookie;
            delete event.request.headers['x-auth-token'];
          }
        }
        return event;
      }
    });

    process.on('unhandledRejection', function(reason) {
      Sentry.captureException(reason);
    });
    process.on('uncaughtException', function(err) {
      Sentry.captureException(err);
    });

    sentryInstance = Sentry;

    if (typeof log !== 'undefined') {
      log.info('sentry.initialised', {
        environment: settings.environment || process.env.NODE_ENV || 'development'
      });
    }
  });
})();
