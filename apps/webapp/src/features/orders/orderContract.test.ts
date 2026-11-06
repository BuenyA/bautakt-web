import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { toOrderContract } from './orderContract.ts';

const row = {
  contract_net: 1620,
  source: 'quotes',
  sum_locked: true,
  billing_mode_locked: true,
  addendum_count: 1,
};

describe('toOrderContract', () => {
  it('übernimmt Summe und Sperren', () => {
    assert.deepEqual(toOrderContract(row), {
      contractNet: 1620,
      source: 'quotes',
      sumLocked: true,
      billingModeLocked: true,
      addendumCount: 1,
    });
  });

  it('liest numeric als Zeichenkette', () => {
    assert.equal(toOrderContract({ ...row, contract_net: '99.99' }).contractNet, 99.99);
  });

  it('lässt eine fehlende Summe leer statt 0', () => {
    assert.equal(toOrderContract({ ...row, contract_net: null, source: 'none' }).contractNet, null);
  });

  it('macht aus unbekannter Herkunft none', () => {
    assert.equal(toOrderContract({ ...row, source: 'irgendwas' }).source, 'none');
  });
});
