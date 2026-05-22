// A9.33 — Ads Phase 0 (mock mode only). See docs/ads-strategy.md.
//
// The `adSlot` template is the **only** way ads should enter any page.
// All gating lives here so a call site cannot accidentally leak ads
// onto a forbidden route by forgetting the `suppress` prop:
//   1. Master kill switch                (settings.public.ads.enabled)
//   2. Template ancestry allowlist       (AD_ALLOWED_TEMPLATES)
//   3. Admin auto-suppress               (Roles 'admin')
//   4. Paying-employer auto-suppress     (any active featuredThrough)
//   5. Explicit call-site `suppress`     (premium opt-out, etc.)
//
// Each gate fails closed — `shouldRender` returns `false` and the
// template renders nothing.
//
// We walk the Blaze view tree rather than reading `Router.current()`
// because iron-router's `dataNotFound` plugin renders the `notFound`
// template under the **original** route name (e.g. `/jobs/<bad-id>`
// still reports route `job`). Template ancestry tracks what is
// actually mounted in the DOM.

// Find the nearest user-template ancestor above this view. Blaze view
// names look like `Template.home` or `Template.jobs`; the `with`,
// `each`, and `if` views in between are intentionally skipped so we
// land on a real template.
function findAncestorTemplate(view) {
  var v = view;
  while (v) {
    if (v.name && v.name.indexOf('Template.') === 0) {
      return v.name.slice('Template.'.length);
    }
    v = v.parentView;
  }
  return null;
}

Template.adSlot.helpers({
  shouldRender: function () {
    // 1. Master kill switch — set via Meteor settings, never inferred.
    var pub = (Meteor.settings && Meteor.settings.public) || {};
    var ads = pub.ads || {};
    if (ads.enabled !== true) return false;

    // 2. Template ancestry allowlist — declared in both/lib/constants.js.
    if (typeof AD_ALLOWED_TEMPLATES === 'undefined') return false;
    var inst = Template.instance();
    var startView = inst && inst.view && inst.view.parentView;
    var host = findAncestorTemplate(startView);
    // Skip past our own wrapper templates if a refactor ever introduces them.
    if (host === 'adSlot' || host === 'mockAd') {
      host = findAncestorTemplate(startView && startView.parentView);
    }
    if (!host || AD_ALLOWED_TEMPLATES.indexOf(host) === -1) return false;

    // 3. Admin auto-suppress. Roles is provided by alanning:roles; guarded
    // because it may not be loaded in every context.
    var uid = Meteor.userId();
    if (uid && typeof Roles !== 'undefined' && Roles.userIsInRole &&
        Roles.userIsInRole(uid, ['admin'])) {
      return false;
    }

    // 4. Paying-employer auto-suppress. A user who has paid for a still-
    // active featured listing should not see ads in this session.
    if (uid && typeof Jobs !== 'undefined') {
      var paid = Jobs.findOne({
        userId: uid,
        featuredThrough: { $gt: new Date() }
      }, { fields: { _id: 1 } });
      if (paid) return false;
    }

    // 5. Explicit call-site override. Defaults to false; pass true to
    // suppress on a specific mount (e.g. premium tier).
    if (this && this.suppress === true) return false;

    return true;
  },

  mockMode: function () {
    var pub = (Meteor.settings && Meteor.settings.public) || {};
    var ads = pub.ads || {};
    return ads.mock === true;
  },

  slotPosition: function () {
    return (this && this.position) || 'unspecified';
  }
});
