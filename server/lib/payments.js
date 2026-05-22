// A10.0 — Payment provider registry.
//
// A thin abstraction that lets the rest of the codebase ask
//   "which providers are available for market X?"
// and
//   "charge job Y via provider Z"
// without knowing whether the implementation is Stripe Checkout, an
// M-Pesa STK push, an e-Mola simulator, or a future Visa Direct flow.
//
// Providers register themselves at Meteor.startup once their own
// settings/keys have been read. Missing keys → provider does not
// register → it simply doesn't appear in listForMarket(). The UI then
// hides the corresponding button, so a misconfigured deploy degrades
// gracefully rather than 500ing.
//
// Each provider is a plain object with this shape:
//
//   {
//     key: 'mpesa',                        // stable identifier
//     name: 'M-Pesa',                      // human label (not localized)
//     markets: ['mz'],                     // markets where it's available
//     simulator: true,                     // truthy when not real money
//     ui: { collect: 'msisdn' | 'redirect' | 'none' },
//
//     // Kick off a new payment. Returns one of:
//     //   { kind: 'redirect', url: '...' }     — Stripe Checkout
//     //   { kind: 'await', providerRef: '...' } — STK push / USSD
//     async initiate({ intentId, jobId, userId, amount, currency,
//                      payerMsisdn?, returnUrl, cancelUrl }): Promise
//
//     // Poll for the current status. Optional — Stripe relies entirely
//     // on its webhook so this can throw 'not-supported'.
//     async status(providerRef): Promise<{
//       status: 'pending' | 'awaiting_user' | 'completed' | 'failed' |
//               'cancelled' | 'expired',
//       failureReason?: string,
//       settledAt?: Date
//     }>
//   }
//
// Server-only module — never shipped to the client.

if (Meteor.isServer) {
  var registry = {};

  Payments = {
    /**
     * Register a provider implementation. Call from Meteor.startup
     * after your settings are read. Throws on duplicate key.
     */
    register: function(provider) {
      if (!provider || !provider.key) {
        throw new Error('Payments.register: provider.key is required');
      }
      if (registry[provider.key]) {
        throw new Error('Payments.register: duplicate provider key "' +
          provider.key + '"');
      }
      if (typeof provider.initiate !== 'function') {
        throw new Error('Payments.register: provider.initiate must be a function');
      }
      registry[provider.key] = provider;
      log.info('payments.provider.registered', {
        key: provider.key,
        markets: provider.markets,
        simulator: !!provider.simulator
      });
    },

    /**
     * Look up a provider by key. Throws if unknown — callers should
     * always validate against listForMarket() first.
     */
    get: function(key) {
      var p = registry[key];
      if (!p) throw new Meteor.Error('payment-provider-unknown', 'Unknown payment provider: ' + key);
      return p;
    },

    /**
     * @param {String} marketKey 'mx' or 'mz'
     * @returns {Array} subset of registered providers available in that market.
     */
    listForMarket: function(marketKey) {
      var out = [];
      for (var key in registry) {
        if (!Object.prototype.hasOwnProperty.call(registry, key)) continue;
        var p = registry[key];
        if (!p.markets || p.markets.indexOf(marketKey) >= 0) {
          out.push(p);
        }
      }
      return out;
    },

    /**
     * Convenience: serializable snapshot for publishing to clients.
     * Hides server-only fields (e.g. function references, secret keys).
     */
    snapshotForMarket: function(marketKey) {
      return this.listForMarket(marketKey).map(function(p) {
        return {
          key: p.key,
          name: p.name,
          simulator: !!p.simulator,
          ui: p.ui || { collect: 'none' }
        };
      });
    },

    /**
     * Whether a provider key is registered AND covers the given market.
     */
    isAvailable: function(providerKey, marketKey) {
      var p = registry[providerKey];
      if (!p) return false;
      if (!p.markets) return true;
      return p.markets.indexOf(marketKey) >= 0;
    },

    /**
     * @internal — used by tests to wipe state between cases.
     */
    _reset: function() { registry = {}; }
  };
}
