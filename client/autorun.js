Tracker.autorun(function() {
  var current = Router.current();

  Tracker.afterFlush(function() {
    $('.content-inner').scrollTop(0);
    $(window).scrollTop(0);
  });
});

// T8 — keep <html lang="…"> in sync with the visitor's active locale
// so screen readers and search engines see the right language code.
Tracker.autorun(function () {
  var loc = typeof currentLocaleTag === 'function' ? currentLocaleTag() : 'en';
  try {
    if (document && document.documentElement) {
      document.documentElement.lang = loc;
    }
  } catch (e) { /* ignore */ }
});

// p3-fix-018: Meteor silently swallows publication errors (Match.Error,
// not-authorized, etc.) unless the caller supplies an `onStop` callback.
// Without this wrapper a broken subscription just leaves the template
// loading forever — a moderator typing a bad query never sees a hint
// in DevTools. We wrap Meteor.subscribe so EVERY subscription gets a
// default onStop that logs to the console; existing callers that
// already pass an explicit callbacks object are passed through unchanged.
(function installSubscribeErrorLogger() {
  if (typeof Meteor === 'undefined' || !Meteor.isClient) return;
  if (Meteor._subscribeWrapped) return;
  Meteor._subscribeWrapped = true;
  var orig = Meteor.subscribe.bind(Meteor);
  Meteor.subscribe = function(name) {
    var args = Array.prototype.slice.call(arguments, 1);
    var last = args[args.length - 1];
    var hasCallbacks = typeof last === 'function' ||
      (last && typeof last === 'object' &&
        (typeof last.onReady === 'function' ||
         typeof last.onStop === 'function' ||
         typeof last.onError === 'function'));
    if (!hasCallbacks) {
      args.push({
        onStop: function(err) {
          if (err) {
            try { console.error('[subscribe failed]', name, err); } catch (e) { /* ignore */ }
          }
        }
      });
    }
    return orig.apply(null, [name].concat(args));
  };
})();

// A9.33 — Always-on subscription so the AdSlot suppress check has a
// reliable view of the current user's active featured listings, no
// matter which route they are on. The publication ships a tiny doc
// per active feature (just `_id` and `featuredThrough`) so this adds
// negligible network cost. See docs/ads-strategy.md and
// `server/publications.js` (`mySponsorState`).
Tracker.autorun(function () {
  var uid = Meteor.userId();
  if (!uid) return;
  Meteor.subscribe('mySponsorState');
});

