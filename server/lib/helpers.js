// crypto is a Node built-in; available on any Meteor server
var nodeCrypto = Npm.require('crypto');

// S12: hash a client IP (or similar identifier) with a private salt so it
// can be correlated across log lines without persisting raw PII. Returns
// `null` for empty input so callers can omit the field entirely.
hashIdentifier = function(value) {
  if (!value) return null;
  var salt = (Meteor.settings.private && Meteor.settings.private.ipSalt) || '';
  return nodeCrypto.createHash('sha256').update(String(value) + salt).digest('hex').slice(0, 12);
};

// S3: throw if a signed-in user has not verified their email. OAuth-only
// users (no emails[] entry on the user doc) are treated as verified.
assertEmailVerifiedIfSignedIn = function(userId) {
  if (!userId) return;
  var user = Meteor.users.findOne(userId, { fields: { emails: 1 } });
  if (!user || !user.emails || !user.emails.length) return;
  if (!user.emails[0].verified) {
    throw new Meteor.Error('email-unverified',
      'Please verify your email address before posting. Check your inbox for a verification link.');
  }
};

cleanHtml = function(s) {
  if (s == null) return s;

  return sanitizeHtml(s, {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul',
      'ol', 'nl', 'li', 'b', 'i', 'strong', 'em', 'strike',
      'code', 'hr', 'br', 'pre'
    ],
    // Without an explicit allowedAttributes whitelist, sanitize-html defaults
    // to stripping all attributes — which silently removed `href` from every
    // <a> tag in job descriptions. Keep links functional and force them to
    // open safely in a new tab.
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel']
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    transformTags: {
      a: function(tagName, attribs) {
        return {
          tagName: 'a',
          attribs: _.extend({}, attribs, {
            rel: 'nofollow noopener noreferrer',
            target: '_blank'
          })
        };
      }
    }
  });
};

// A9.30 — Wrap a transactional HTML body in the Employed brand chrome.
// Used by server/methods.js (4 sites) and server/accounts.js (verify
// email + reset password). Idempotent: if a body already starts with
// `<!doctype` we pass it through untouched, so future callers that
// already render full documents don't double-wrap.
htmlEscapeForEmail = function(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};

brandedEmail = function(innerHtml) {
  if (typeof innerHtml !== 'string') return innerHtml;
  if (/^\s*<!doctype/i.test(innerHtml)) return innerHtml;
  var siteUrl = '';
  try { siteUrl = Meteor.absoluteUrl(''); } catch (e) { siteUrl = ''; }
  var logoUrl = (siteUrl || '') + 'images/icon-192x192.png';
  return (
    '<!doctype html>' +
    '<html><head><meta charset="utf-8"><title>Employed</title></head>' +
    '<body style="margin:0;padding:0;background:#F9FAFB;font-family:Inter,Arial,sans-serif;color:#374151;">' +
      '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F9FAFB;"><tr><td align="center">' +
        '<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;margin:24px auto;">' +
          '<tr><td style="background:#27272B;padding:20px 24px;">' +
            '<table cellpadding="0" cellspacing="0" border="0"><tr>' +
              '<td style="vertical-align:middle;padding-right:12px;">' +
                '<img src="' + htmlEscapeForEmail(logoUrl) + '" width="36" height="36" alt="Employed" style="display:block;border-radius:8px;">' +
              '</td>' +
              '<td style="vertical-align:middle;font-family:Trebuchet MS,Arial,sans-serif;font-weight:800;font-size:22px;color:#FAFAF7;letter-spacing:-0.5px;">' +
                'Employ<span style="color:#F59E0B;">ed</span>' +
              '</td>' +
            '</tr></table>' +
          '</td></tr>' +
          '<tr><td style="padding:28px 32px;font-size:15px;line-height:1.6;color:#374151;">' +
            innerHtml +
          '</td></tr>' +
          '<tr><td style="padding:18px 32px;border-top:1px solid #E5E7EB;background:#FAFAF7;font-size:12px;color:#6B7280;text-align:center;">' +
            'Employed · Local jobs. Honest listings. No noise.' +
          '</td></tr>' +
        '</table>' +
      '</td></tr></table>' +
    '</body></html>'
  );
};
