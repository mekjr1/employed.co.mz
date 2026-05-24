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

  // L8: additional pure-function helper tests
  describe('cleanHtml', function () {
    it('strips script tags from raw HTML', function () {
      const result = cleanHtml('<p>Hello</p><script>alert(1)</script>');
      assert.notInclude(result, '<script');
      assert.include(result, 'Hello');
    });

    it('returns empty string for null/undefined input', function () {
      assert.equal(cleanHtml(null), '');
      assert.equal(cleanHtml(undefined), '');
    });
  });

  if (Meteor.isServer) {
    describe('hashIdentifier', function () {
      it('returns a hex string', function () {
        const hash = hashIdentifier('127.0.0.1');
        assert.isString(hash);
        assert.match(hash, /^[0-9a-f]+$/);
      });

      it('is deterministic for the same input', function () {
        assert.equal(hashIdentifier('test'), hashIdentifier('test'));
      });

      it('produces different hashes for different inputs', function () {
        assert.notEqual(hashIdentifier('a'), hashIdentifier('b'));
      });
    });
  }
});
