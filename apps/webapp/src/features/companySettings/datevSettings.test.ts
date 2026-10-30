/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  accountError,
  compareSlots,
  expectedAccountDigits,
  isValidClientNumber,
  isValidConsultantNumber,
  isValidTaxKey,
  slotKey,
  toOptionalNumber,
} from './datevSettings.ts';

describe('expectedAccountDigits', () => {
  it('Sachkonten haben die eingestellte Länge', () => {
    assert.equal(expectedAccountDigits('revenue', 4), 4);
    assert.equal(expectedAccountDigits('expense_cash_discount', 6), 6);
  });

  it('Personenkonten haben eine Stelle mehr', () => {
    assert.equal(expectedAccountDigits('collective_debtor', 4), 5);
    assert.equal(expectedAccountDigits('collective_creditor', 8), 9);
  });
});

describe('accountError', () => {
  it('akzeptiert Standardkonten bei Länge 4', () => {
    assert.equal(accountError('revenue', '8400', 4), null);
    assert.equal(accountError('collective_debtor', '69999', 4), null);
    assert.equal(accountError('collective_creditor', '99999', 4), null);
  });

  it('meldet die falsche Stellenzahl', () => {
    assert.deepEqual(accountError('revenue', '840', 4), { kind: 'digits', count: 4 });
    assert.deepEqual(accountError('revenue', '8400', 5), { kind: 'digits', count: 5 });
    assert.deepEqual(accountError('collective_debtor', '6999', 4), { kind: 'digits', count: 5 });
    assert.deepEqual(accountError('revenue', '84a0', 4), { kind: 'digits', count: 4 });
    assert.deepEqual(accountError('revenue', '', 4), { kind: 'digits', count: 4 });
  });

  it('prüft die Bereiche für Debitoren und Kreditoren', () => {
    assert.deepEqual(accountError('collective_debtor', '79999', 4), {
      kind: 'debtorRange',
      from: '10000',
      to: '69999',
    });
    assert.deepEqual(accountError('collective_creditor', '69999', 4), {
      kind: 'creditorRange',
      from: '70000',
      to: '99999',
    });
    assert.deepEqual(accountError('collective_debtor', '000000', 5), {
      kind: 'debtorRange',
      from: '100000',
      to: '699999',
    });
  });
});

describe('isValidTaxKey', () => {
  it('leer oder bis zu vier Ziffern', () => {
    assert.equal(isValidTaxKey(''), true);
    assert.equal(isValidTaxKey('9'), true);
    assert.equal(isValidTaxKey('1094'), true);
    assert.equal(isValidTaxKey('10940'), false);
    assert.equal(isValidTaxKey('A9'), false);
  });
});

describe('Berater- und Mandantennummer', () => {
  it('Beraternummer 1001 bis 9999999 oder leer', () => {
    assert.equal(isValidConsultantNumber(''), true);
    assert.equal(isValidConsultantNumber('1001'), true);
    assert.equal(isValidConsultantNumber('9999999'), true);
    assert.equal(isValidConsultantNumber('1000'), false);
    assert.equal(isValidConsultantNumber('10000000'), false);
    assert.equal(isValidConsultantNumber('12a4'), false);
  });

  it('Mandantennummer 1 bis 99999 oder leer', () => {
    assert.equal(isValidClientNumber(''), true);
    assert.equal(isValidClientNumber('1'), true);
    assert.equal(isValidClientNumber('99999'), true);
    assert.equal(isValidClientNumber('0'), false);
    assert.equal(isValidClientNumber('100000'), false);
    assert.equal(isValidClientNumber('-5'), false);
  });

  it('toOptionalNumber', () => {
    assert.equal(toOptionalNumber(''), null);
    assert.equal(toOptionalNumber('  '), null);
    assert.equal(toOptionalNumber('29098'), 29098);
  });
});

describe('Kontozeilen', () => {
  it('sortiert nach Zweck, Steuerart und Satz absteigend', () => {
    const rows = [
      { purpose: 'collective_debtor', tax_mode: '', tax_rate: null },
      { purpose: 'revenue', tax_mode: 'tax_free', tax_rate: null },
      { purpose: 'revenue', tax_mode: 'standard', tax_rate: 7 },
      { purpose: 'expense', tax_mode: 'standard', tax_rate: 19 },
      { purpose: 'revenue', tax_mode: 'standard', tax_rate: 19 },
      { purpose: 'revenue', tax_mode: 'reverse_charge', tax_rate: null },
    ];
    assert.deepEqual([...rows].sort(compareSlots).map(slotKey), [
      'revenue|standard|19',
      'revenue|standard|7',
      'revenue|reverse_charge|',
      'revenue|tax_free|',
      'expense|standard|19',
      'collective_debtor||',
    ]);
  });
});
