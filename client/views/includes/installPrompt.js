// A10.0 — Install-prompt banner.
//
// Hidden by default. Becomes visible only when:
//   - browser has dispatched `beforeinstallprompt` (canPrompt = true),
//   - user hasn't already installed the app,
//   - user hasn't dismissed within the past 30 days,
//   - viewport is mobile-sized.
//
// All gating logic lives in window.EmpPWA.shouldShowBanner so the
// template just calls a single helper.

Template.installPromptBanner.onCreated(function() {
  var instance = this;
  instance.tick = new ReactiveVar(0);

  // Re-evaluate visibility every time the global "canPrompt" flag
  // changes. We can't depend on it directly from a Blaze helper
  // because the helper doesn't know about ReactiveVar instances on
  // the global object, so we mirror the value via a local autorun.
  if (typeof window !== 'undefined' && window.EmpPWA && window.EmpPWA.canPrompt) {
    instance.autorun(function() {
      window.EmpPWA.canPrompt.get();
      instance.tick.set(Date.now());
    });
  }
});

Template.installPromptBanner.helpers({
  visible: function() {
    var instance = Template.instance();
    if (instance && instance.tick) instance.tick.get(); // dep
    if (typeof window === 'undefined' || !window.EmpPWA) return false;
    return window.EmpPWA.shouldShowBanner();
  }
});

Template.installPromptBanner.events({
  'click [data-action="install"]': function(event, template) {
    event.preventDefault();
    if (!window.EmpPWA || !window.EmpPWA.promptInstall) return;
    window.EmpPWA.promptInstall().then(function(choice) {
      if (choice && choice.outcome === 'dismissed') {
        // User said "Not now" inside the system prompt — give it a
        // longer cool-off than a manual dismiss.
        window.EmpPWA.dismissForDays(7);
      }
      template.tick.set(Date.now());
    });
  },

  'click [data-action="dismiss"]': function(event, template) {
    event.preventDefault();
    if (window.EmpPWA && window.EmpPWA.dismissForDays) {
      window.EmpPWA.dismissForDays(30);
    }
    template.tick.set(Date.now());
  }
});
