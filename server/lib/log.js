// Tiny structured-logger shim. Writes one JSON object per line to
// stdout/stderr so a future log collector (pino, winston, Loki, etc.)
// can ingest with zero code changes — at that point this module
// becomes the single migration point.
//
// Use:
//   log.info('jobs.deleteMine', { actor: userId, jobId: jobId });
//   log.warn('recaptcha.low_score', { score: 0.2, ipHash: 'abc' });
//   log.error('stripe.webhook.failed', { sessionId: id, err: e.message });
//
// Conventions:
//   - First argument is an event name (kebab/dotted, stable identifier).
//   - Second argument is a flat object of structured fields.
//   - Never pass raw PII (IP, email). Use `hashIdentifier()` first.
//   - Errors should be serialized to strings before logging; raw Error
//     objects don't JSON-stringify usefully.
//
// In Meteor.isDevelopment the output is human-readable. In production
// it's one JSON object per line.

(function() {
  function emit(level, event, fields) {
    var entry = {
      ts: new Date().toISOString(),
      level: level,
      event: String(event || 'unknown')
    };

    if (fields && typeof fields === 'object') {
      for (var k in fields) {
        if (!Object.prototype.hasOwnProperty.call(fields, k)) continue;
        // Coerce Error objects to a stable shape.
        var v = fields[k];
        if (v instanceof Error) {
          entry[k] = { message: v.message, name: v.name };
        } else {
          entry[k] = v;
        }
      }
    }

    var line;
    try {
      line = JSON.stringify(entry);
    } catch (e) {
      line = JSON.stringify({
        ts: entry.ts, level: 'error', event: 'log.serialize_failed',
        original: String(event), err: e && e.message
      });
    }

    if (Meteor.isDevelopment) {
      // Slightly more readable in a dev terminal.
      var stream = (level === 'error' || level === 'warn') ? console.error : console.log;
      stream('[' + level + '] ' + entry.event + ' ' + line);
    } else {
      var prod = (level === 'error' || level === 'warn') ? console.error : console.log;
      prod(line);
    }
  }

  log = {
    info: function(event, fields) { emit('info', event, fields); },
    warn: function(event, fields) { emit('warn', event, fields); },
    error: function(event, fields) { emit('error', event, fields); },
    debug: function(event, fields) {
      if (Meteor.isDevelopment) emit('debug', event, fields);
    }
  };
})();
