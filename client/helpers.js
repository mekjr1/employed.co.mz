// A9.36 — render dates with the visitor's active translation bucket from
// currentLocale() using the native Intl.DateTimeFormat. Falls back to
// the historical moment().format('M/D/YY') only if Intl is unavailable
// (very old browsers) so we don't break the UI on a missing locale.
UI.registerHelper("formatDate", function(timestamp) {
  if (!timestamp) return '';
  var d = (timestamp instanceof Date) ? timestamp : new Date(timestamp);
  if (isNaN(d.getTime())) return '';
  try {
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      var locale = (typeof currentLocale === 'function') ? currentLocale() : 'en';
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric', month: 'short', day: 'numeric'
      }).format(d);
    }
  } catch (e) { /* fall through */ }
  return moment(d).format('M/D/YY');
});

UI.registerHelper("currentUserDisplayName", function() {
  return getUserName(Meteor.user());
});

UI.registerHelper("currentUserEmail", function() {
  return getUserEmail(Meteor.user());
});

UI.registerHelper("featuredJobPriceLabel", function() {
  // B2.6: pull the localized label out of the active market instead of
  // the global FEATURED_JOB_PRICE_LABEL (which was hard-coded to US$100).
  var market = currentMarket();
  return (market && market.featuredJob && market.featuredJob.label) ||
    FEATURED_JOB_PRICE_LABEL;
});

UI.registerHelper("activeMarket", function() {
  return currentMarket();
});

UI.registerHelper("activeMarketSiteName", function() {
  return currentMarket().siteName;
});

UI.registerHelper("activeMarketTagline", function() {
  return currentMarket().tagline;
});

// Redesign 2026 — company initial for job card avatars
UI.registerHelper("companyInitial", function() {
  var name = this.company || this.title || '?';
  return name.charAt(0).toUpperCase();
});

// ux-fix-018 — deterministic colour for the company avatar tile based
// on a tiny hash of the company name. Without this, every card on
// /jobs renders with the same indigo block.
UI.registerHelper("avatarColorClass", function() {
  var name = (this.company || this.title || '?').toLowerCase();
  var h = 0;
  for (var i = 0; i < name.length; i++) {
    h = ((h << 5) - h) + name.charCodeAt(i);
    h |= 0;
  }
  // 8 buckets — matches the .avatar-c0 … .avatar-c7 CSS classes.
  var bucket = Math.abs(h) % 8;
  return 'avatar-c' + bucket;
});

// Redesign 2026 — active job count for hero trust bar
UI.registerHelper("activeJobCount", function() {
  return Jobs.find({ status: 'active', country: currentMarket().country }).count();
});

// Redesign 2026 — status badge CSS class
UI.registerHelper("statusBadgeClass", function(status) {
  return 'status-badge status-' + (status || 'pending');
});

UI.registerHelper("statusDotClass", function(status) {
  return 'status-dot status-' + (status || 'pending');
});

// p3-fix-007 — relative age label for the admin queue. The admin needs
// to triage quickly without reading the full date. Returns "2 days ago",
// "3 hours ago", etc., localised via i18n keys with a {{n}} variable.
UI.registerHelper("ageLabel", function(timestamp) {
  if (!timestamp) return '';
  var d = (timestamp instanceof Date) ? timestamp : new Date(timestamp);
  if (isNaN(d.getTime())) return '';
  var diffMs = Date.now() - d.getTime();
  var mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return t('age.just_now');
  if (mins < 60) return t(mins === 1 ? 'age.minute' : 'age.minutes', { n: mins });
  var hours = Math.floor(mins / 60);
  if (hours < 24) return t(hours === 1 ? 'age.hour' : 'age.hours', { n: hours });
  var days = Math.floor(hours / 24);
  if (days < 30) return t(days === 1 ? 'age.day' : 'age.days', { n: days });
  var months = Math.floor(days / 30);
  if (months < 12) return t(months === 1 ? 'age.month' : 'age.months', { n: months });
  var years = Math.floor(months / 12);
  return t(years === 1 ? 'age.year' : 'age.years', { n: years });
});

// A9.35 — descExcerpt: short plain-text preview for the job card tile.
// The list view used to be one row per job with no flavour beyond
// title/company/location; tile cards have room for ~2 lines of body,
// so this helper trims the description to the first paragraph, strips
// any markdown bullet markers, and caps at ~160 chars with an ellipsis.
UI.registerHelper("descExcerpt", function(maxChars) {
  var raw = (this.description || '').toString();
  if (!raw) return '';
  // Take everything up to the first blank line so we get just the
  // intro sentence, not the "What you will do" bullet list.
  var firstPara = raw.split(/\n\s*\n/)[0] || raw;
  var clean = firstPara.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  var max = (typeof maxChars === 'number') ? maxChars : 160;
  if (clean.length <= max) return clean;
  // Trim back to last space so we don't cut a word in half.
  var slice = clean.slice(0, max);
  var lastSpace = slice.lastIndexOf(' ');
  if (lastSpace > max * 0.6) slice = slice.slice(0, lastSpace);
  return slice + '…';
});

// A9.35 — salaryLabel: compact "MZN 25,000 – 60,000 / month" chip for
// the card tile. Returns empty string if no salary fields set, so the
// template can `{{#if salaryLabel}}` to omit the chip entirely.
UI.registerHelper("salaryLabel", function() {
  var min = this.salaryMin;
  var max = this.salaryMax;
  var currency = this.salaryCurrency;
  var period = this.salaryPeriod;
  if (!currency || (!min && !max)) return '';

  function fmt(n) {
    if (n == null) return '';
    return Number(n).toLocaleString('en-US');
  }

  var amount;
  if (min && max && min !== max) {
    amount = fmt(min) + ' – ' + fmt(max);
  } else {
    amount = fmt(min || max);
  }

  var periodLabel = period ? t('jobs.salary.per.' + period) : '';
  // If the i18n lookup failed (returns the key back), fall back to the
  // raw period word so we don't leak the key into the UI.
  if (periodLabel && periodLabel.indexOf('jobs.salary.per.') === 0) {
    periodLabel = period;
  }

  return currency + ' ' + amount + (periodLabel ? ' / ' + periodLabel : '');
});

// A10.0 — Tiny string-concat helper for templates. Lets us assemble
// dotted i18n keys like `(concat 'foo.' selectedProvider)` without
// adding a one-off helper for every callsite. Coerces nullish args to
// empty strings.
UI.registerHelper("concat", function() {
  var parts = [];
  for (var i = 0; i < arguments.length; i++) {
    var a = arguments[i];
    if (a == null) continue;
    // Skip the Spacebars kwHash object that's appended to every helper
    // call. It exposes only a `hash` property — never a meaningful
    // string we'd want to concatenate.
    if (typeof a === 'object' && 'hash' in a) continue;
    parts.push(String(a));
  }
  return parts.join('');
});
