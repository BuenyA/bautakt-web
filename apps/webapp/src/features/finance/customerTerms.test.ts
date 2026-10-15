/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { invalidTermFields, prefillCustomerTerms } from './customerTerms.ts';

const empty = { buyerReference: '', paymentTermDays: '', skontoPercent: '', skontoDays: '' };
const stadt = {
  buyer_reference: '05315-12345-67',
  payment_term_days: 30,
  discount_percent: 2.5,
  discount_days: 10,
};
const privat = {
  buyer_reference: '',
  payment_term_days: 14,
  discount_percent: null,
  discount_days: null,
};

describe('prefillCustomerTerms', () => {
  it('fuellt leere Felder aus dem Kundenprofil', () => {
    assert.deepEqual(prefillCustomerTerms(empty, stadt, null), {
      buyerReference: '05315-12345-67',
      paymentTermDays: '30',
      skontoPercent: '2,5',
      skontoDays: '10',
    });
  });

  it('laesst Eingaben des Nutzers stehen', () => {
    const typed = { ...empty, paymentTermDays: '7' };
    assert.equal(prefillCustomerTerms(typed, stadt, null).paymentTermDays, '7');
  });

  it('ersetzt beim Kundenwechsel die Werte des vorherigen Kunden', () => {
    const fromStadt = prefillCustomerTerms(empty, stadt, null);
    assert.deepEqual(prefillCustomerTerms(fromStadt, privat, stadt), {
      buyerReference: '',
      paymentTermDays: '14',
      skontoPercent: '',
      skontoDays: '',
    });
  });

  it('Kunde abgewaehlt: Vorbelegung verschwindet, Eingaben bleiben', () => {
    const fields = { ...prefillCustomerTerms(empty, stadt, null), skontoDays: '5' };
    assert.deepEqual(prefillCustomerTerms(fields, null, stadt), {
      buyerReference: '',
      paymentTermDays: '',
      skontoPercent: '',
      skontoDays: '5',
    });
  });
});

describe('invalidTermFields', () => {
  it('leer und ganze Tage sind gueltig', () => {
    assert.deepEqual(invalidTermFields(empty), []);
    assert.deepEqual(
      invalidTermFields({
        ...empty,
        paymentTermDays: '30',
        skontoDays: '10',
        skontoPercent: '2,5',
      }),
      [],
    );
  });
  it('halbe Tage und Unsinn werden abgelehnt', () => {
    assert.deepEqual(
      invalidTermFields({
        ...empty,
        paymentTermDays: '7,5',
        skontoDays: 'zehn',
        skontoPercent: '100',
      }),
      ['paymentTermDays', 'skontoDays', 'skontoPercent'],
    );
  });
});
