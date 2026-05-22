// A10.0 — Featured-job checkout modal.
//
// Provider list comes from `Meteor.call('payment.providersForMarket')`
// at modal open. Each provider button either:
//   - kicks off a Stripe redirect (kind: 'redirect') and navigates the
//     window to the returned URL, OR
//   - reveals an MSISDN input (provider.ui.collect === 'msisdn') so the
//     user can enter their Vodacom / Movitel number, after which the
//     modal polls payment.status every POLL_INTERVAL_MS until terminal.
//
// State is held in ReactiveVars on the template instance — no global
// state, no Session keys, so two simultaneously-open modals (which
// shouldn't happen but might if a test forgets to dismiss) don't share
// the same stage/intent.

var POLL_INTERVAL_MS = 3000;       // 3s — matches mobile-money UX norms
var POLL_TIMEOUT_MS = 90 * 1000;   // 90s — Vodacom STK push expires here

// We keep the "active checkout" handle at module scope so the modal's
// own `hidden.bs.modal` listener can cancel polling if the user
// dismisses mid-flight.
var activeHandle = null;

function clearActiveHandle() {
  if (activeHandle && activeHandle.timeoutId) {
    Meteor.clearTimeout(activeHandle.timeoutId);
  }
  if (activeHandle && activeHandle.pollHandle) {
    Meteor.clearInterval(activeHandle.pollHandle);
  }
  activeHandle = null;
}

// Open helper called from #buy-featured.
FeaturedCheckout = {
  open: function(job) {
    clearActiveHandle();
    var dialogId = 'featured-checkout-' + Date.now();
    Modal.show('featuredCheckoutModal', {
      dialogId: dialogId,
      job: job,
      priceLabel: (function() {
        try { return UI._globalHelpers.featuredJobPriceLabel(); }
        catch (e) { return ''; }
      })()
    });
  }
};

Template.featuredCheckoutModal.onCreated(function() {
  var instance = this;
  instance.stage = new ReactiveVar('pick');     // pick | msisdn | awaiting | redirecting | success | failure
  instance.providers = new ReactiveVar([]);
  instance.selectedProvider = new ReactiveVar(null); // 'stripe' | 'mpesa' | 'emola'
  instance.intentId = new ReactiveVar(null);
  instance.msisdnValue = new ReactiveVar('');
  instance.msisdnError = new ReactiveVar(null);
  instance.busy = new ReactiveVar(false);
  instance.failureReason = new ReactiveVar(null);

  Meteor.call('payment.providersForMarket', function(err, result) {
    if (err) {
      instance.providers.set([]);
      return;
    }
    instance.providers.set((result && result.providers) || []);
  });
});

Template.featuredCheckoutModal.onDestroyed(function() {
  clearActiveHandle();
});

Template.featuredCheckoutModal.helpers({
  stage: function() { return Template.instance().stage.get(); },
  providers: function() { return Template.instance().providers.get(); },
  selectedProvider: function() { return Template.instance().selectedProvider.get(); },
  msisdnValue: function() { return Template.instance().msisdnValue.get(); },
  msisdnError: function() { return Template.instance().msisdnError.get(); },
  busy: function() { return Template.instance().busy.get(); },
  // Spacebars doesn't allow `{{#if busy}}disabled{{/if}}` as a bare
  // attribute, so we expose a helper that returns the string Blaze
  // can paste in directly.
  busyDisabled: function() { return Template.instance().busy.get() ? 'disabled' : null; },
  failureReason: function() { return Template.instance().failureReason.get() || 'unknown'; },
  providerLabel: function(key, fallbackName) {
    // i18n: checkout.provider.<key> → "Pay with M-Pesa"; fall back to
    // the provider's own .name (e.g. 'Stripe') when the key is missing.
    var k = 'checkout.provider.' + key;
    var label = t(k);
    if (!label || label === k) return fallbackName || key;
    return label;
  }
});

Template.featuredCheckoutModal.events({
  'click .featured-checkout-provider-btn': function(event, template) {
    event.preventDefault();
    var providerKey = $(event.currentTarget).data('provider');
    var providers = template.providers.get();
    var provider = _.find(providers, function(p) { return p.key === providerKey; });
    if (!provider) return;

    template.selectedProvider.set(providerKey);

    if (provider.ui && provider.ui.collect === 'msisdn') {
      template.stage.set('msisdn');
      Meteor.defer(function() {
        template.$('#featured-msisdn-input').trigger('focus');
      });
    } else {
      // Stripe — go straight to initiate.
      runInitiate(template, providerKey, null);
    }
  },

  'click [data-action="back"]': function(event, template) {
    event.preventDefault();
    template.selectedProvider.set(null);
    template.msisdnError.set(null);
    template.stage.set('pick');
  },

  'click [data-action="cancel"]': function(event, template) {
    event.preventDefault();
    var intentId = template.intentId.get();
    clearActiveHandle();
    if (intentId) {
      Meteor.call('payment.cancel', intentId, function() {
        // Best-effort; intent may already be terminal.
      });
    }
    template.failureReason.set('user_cancelled');
    template.stage.set('failure');
  },

  'click [data-action="retry"]': function(event, template) {
    event.preventDefault();
    template.intentId.set(null);
    template.failureReason.set(null);
    template.msisdnError.set(null);
    template.stage.set('pick');
  },

  'submit .featured-checkout-msisdn-form': function(event, template) {
    event.preventDefault();
    var msisdn = (template.$('#featured-msisdn-input').val() || '').trim();
    template.msisdnValue.set(msisdn);

    var digits = msisdn.replace(/\D+/g, '');
    if (digits.length < 9 || digits.length > 12) {
      template.msisdnError.set(t('checkout.msisdn.invalid'));
      return;
    }

    template.msisdnError.set(null);
    runInitiate(template, template.selectedProvider.get(), msisdn);
  }
});

function runInitiate(template, providerKey, msisdn) {
  template.busy.set(true);
  var job = Template.currentData().job;
  if (providerKey === 'stripe') {
    template.stage.set('redirecting');
  }

  Meteor.call('featuredJob.initiate', job._id, providerKey, msisdn || null, function(err, result) {
    template.busy.set(false);

    if (err) {
      // Map known provider error codes to localized strings; everything
      // else surfaces the original `error.reason` string.
      if (err.error === 'mpesa-invalid-msisdn' || err.error === 'emola-invalid-msisdn') {
        template.msisdnError.set(err.reason || t('checkout.msisdn.invalid'));
        template.stage.set('msisdn');
        return;
      }
      template.failureReason.set(err.error || 'initiate_failed');
      template.stage.set('failure');
      return;
    }

    template.intentId.set(result.intentId);

    if (result.kind === 'redirect' && result.url) {
      window.location.assign(result.url);
      return;
    }

    if (result.kind === 'await') {
      template.stage.set('awaiting');
      beginPolling(template, result.intentId);
    }
  });
}

function beginPolling(template, intentId) {
  clearActiveHandle();
  activeHandle = {
    intentId: intentId,
    pollHandle: null,
    timeoutId: null
  };

  function pollOnce() {
    Meteor.call('payment.status', intentId, function(err, info) {
      if (err) return; // Transient; next tick will retry.
      if (!info) return;
      if (info.status === 'completed') {
        clearActiveHandle();
        template.stage.set('success');
      } else if (info.status === 'failed' ||
                 info.status === 'cancelled' ||
                 info.status === 'expired') {
        clearActiveHandle();
        template.failureReason.set(info.failureReason || 'unknown');
        template.stage.set('failure');
      }
      // pending / awaiting_user — keep polling.
    });
  }

  // Kick off an immediate poll so the UI updates within a tick if the
  // simulator's 1-second outcome has already fired by the time we get
  // here. Then settle into the interval.
  pollOnce();
  activeHandle.pollHandle = Meteor.setInterval(pollOnce, POLL_INTERVAL_MS);

  activeHandle.timeoutId = Meteor.setTimeout(function() {
    if (!activeHandle) return;
    clearActiveHandle();
    template.failureReason.set('client_poll_timeout');
    template.stage.set('failure');
  }, POLL_TIMEOUT_MS);
}
