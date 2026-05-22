// A9.19 — accessible, internationalised replacement for window.confirm,
// window.prompt and window.alert. Uses Bootstrap 3 modal templates
// rendered via peppelg:bootstrap-3-modal (the same Modal.show helper
// already used by jobDeactivate and userProfile).
//
// Public API:
//   AppDialog.confirm({title, message, submitClass, submitLabel,
//                      cancelLabel, withReason, reasonLabel}, cb)
//     cb(true, reason)   — submit clicked; reason is undefined unless
//                          withReason was true.
//     cb(false)          — cancel/dismiss.
//
//   AppDialog.prompt({title, message, submitClass, submitLabel,
//                     cancelLabel, promptPlaceholder, promptValue}, cb)
//     cb(value | null)
//
//   AppDialog.alert({title, message, okLabel}, cb?)
//
// Callbacks fire at most once even if the modal hide event re-fires.
AppDialog = (function() {

  // Module-level state. The confirm template is reused across calls;
  // we record the active call's result here so the modal close handler
  // can deliver it to the caller.
  var pending = null; // { opts, result }
  var dialogCounter = 0;

  function runOnce(fn) {
    var called = false;
    return function() {
      if (called) return;
      called = true;
      if (typeof fn === 'function') fn.apply(null, arguments);
    };
  }

  function nextDialogId() {
    dialogCounter += 1;
    return 'app-dialog-' + Date.now() + '-' + dialogCounter;
  }

  function onHidden(dialogId, cb) {
    Meteor.defer(function() {
      $('[data-dialog-id="' + dialogId + '"]').one('hidden.bs.modal', cb);
    });
  }

  // Register event handlers once at module load. Modal.show re-renders
  // the template each call, but Template event maps live on the
  // template definition itself.
  Template.appConfirmModal.events({
    'click .submit-btn': function(event, template) {
      if (!pending) return;
      var reason;
      if (pending.opts.withReason) {
        reason = (template.$('.reason').val() || '').trim();
      }
      if (pending.opts.withPrompt) {
        reason = template.$('.prompt').val();
      }
      pending.result = { ok: true, reason: reason };
      Modal.hide('appConfirmModal');
    }
  });

  function openConfirm(opts, cb) {
    opts = opts || {};
    var dialogId = nextDialogId();
    var data = {
      dialogId: dialogId,
      title: opts.title || t('action.continue'),
      message: opts.message || '',
      submitClass: opts.submitClass || 'btn-primary',
      submitLabel: opts.submitLabel || t('modal.ok'),
      cancelLabel: opts.cancelLabel || t('modal.cancel'),
      withReason: !!opts.withReason,
      reasonLabel: opts.reasonLabel || '',
      withPrompt: !!opts.withPrompt,
      promptPlaceholder: opts.promptPlaceholder || '',
      promptValue: opts.promptValue || ''
    };
    var done = runOnce(cb || function() {});
    pending = { opts: data, result: null };
    Modal.show('appConfirmModal', data);
    onHidden(dialogId, function() {
      var r = pending && pending.result;
      pending = null;
      if (r && r.ok) {
        done(true, r.reason);
      } else {
        done(false);
      }
    });
  }

  return {
    confirm: function(opts, cb) {
      openConfirm(opts, cb);
    },
    prompt: function(opts, cb) {
      openConfirm({
        title: opts.title,
        message: opts.message,
        submitClass: opts.submitClass || 'btn-primary',
        submitLabel: opts.submitLabel || t('modal.ok'),
        cancelLabel: opts.cancelLabel || t('modal.cancel'),
        withPrompt: true,
        promptPlaceholder: opts.promptPlaceholder || '',
        promptValue: opts.promptValue || ''
      }, function(ok, value) {
        if (!ok) { if (cb) cb(null); return; }
        if (cb) cb(value == null ? '' : value);
      });
    },
    alert: function(opts, cb) {
      opts = opts || {};
      var dialogId = nextDialogId();
      var data = {
        dialogId: dialogId,
        title: opts.title || t('action.continue'),
        message: opts.message || '',
        okLabel: opts.okLabel || t('modal.ok')
      };
      var done = runOnce(cb || function() {});
      Modal.show('appAlertModal', data);
      onHidden(dialogId, function() { done(); });
    }
  };
})();
