// Tests for pure helpers in both/lib/helpers.js. No Mongo required.
//
// Wire-up: `meteor test --once --driver-package meteortesting:mocha` runs
// any *.tests.js file under /tests on the matching architecture.

import { Meteor } from 'meteor/meteor';
import { assert } from 'chai';

describe('helpers', function () {
  describe('marketFromHostname', function () {
    it('maps mx subdomain to the Mexico market', function () {
      const market = marketFromHostname('mx.lvh.me:3000');
      assert.equal(market.key, 'mx');
      assert.equal(market.country, 'Mexico');
    });

    it('maps mz subdomain to the Mozambique market', function () {
      const market = marketFromHostname('mz.lvh.me:3000');
      assert.equal(market.key, 'mz');
      assert.equal(market.country, 'Mozambique');
    });

    it('falls back to the default market for unknown hostnames', function () {
      const market = marketFromHostname('example.com');
      assert.isOk(market);
      assert.isOk(market.country);
    });
  });

  describe('daysUntilExpiration', function () {
    it('returns a Date roughly 90 days in the past', function () {
      const cutoff = daysUntilExpiration();
      assert.instanceOf(cutoff, Date);
      const diffDays = (Date.now() - cutoff.getTime()) / (24 * 60 * 60 * 1000);
      assert.isAbove(diffDays, 89);
      assert.isBelow(diffDays, 91);
    });
  });
});
