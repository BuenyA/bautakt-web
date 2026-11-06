/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { matchesOrderFilter, orderFilterFromSearch, toOrderStatus } from './orderList.ts';

describe('toOrderStatus', () => {
  it('bildet Altwerte der Angebote ab, ohne sie zu verlieren', () => {
    assert.equal(toOrderStatus('quote'), 'active');
    assert.equal(toOrderStatus('declined'), 'finished');
  });

  it('lässt laufend und abgeschlossen stehen, Unbekanntes läuft', () => {
    assert.equal(toOrderStatus('active'), 'active');
    assert.equal(toOrderStatus('finished'), 'finished');
    assert.equal(toOrderStatus('irgendwas'), 'active');
  });
});

describe('matchesOrderFilter', () => {
  it('zeigt ein Altangebot unter Laufend und ein abgelehntes unter Abgeschlossen', () => {
    assert.equal(matchesOrderFilter('quote', 'running'), true);
    assert.equal(matchesOrderFilter('quote', 'finished'), false);
    assert.equal(matchesOrderFilter('declined', 'finished'), true);
    assert.equal(matchesOrderFilter('declined', 'running'), false);
  });

  it('zeigt unter Alle jeden Status', () => {
    for (const status of ['active', 'finished', 'quote', 'declined']) {
      assert.equal(matchesOrderFilter(status, 'all'), true);
    }
  });

  it('führt den alten Angebote-Link auf Laufend', () => {
    assert.equal(orderFilterFromSearch('quote'), 'running');
  });
});
