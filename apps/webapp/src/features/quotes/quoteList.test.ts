import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  berlinToday,
  matchesQuoteFilter,
  quoteCustomerLabel,
  quoteFigures,
  quoteKindFromSearch,
  quoteKindToSearch,
  quoteStatusFromSearch,
  QUOTE_STATUSES,
  quoteStatusToSearch,
} from './quoteList.ts';

const row = (status: string, net: number, extra: Record<string, unknown> = {}) => ({
  status,
  net_total: net,
  currency: 'EUR',
  follow_up_on: null,
  ...extra,
});

test('Filter aus der Adresse: jeder Status kommt unverändert zurück', () => {
  for (const status of QUOTE_STATUSES) {
    assert.equal(quoteStatusFromSearch(quoteStatusToSearch(status)), status);
  }
  assert.equal(quoteStatusToSearch('all'), null);
  assert.equal(quoteKindFromSearch(quoteKindToSearch('addendum')), 'addendum');
});

test('Unbekannter Wert in der Adresse zeigt alle statt einer leeren Liste', () => {
  assert.equal(quoteStatusFromSearch('quatsch'), 'all');
  assert.equal(quoteStatusFromSearch(null), 'all');
  assert.equal(quoteKindFromSearch('quatsch'), 'all');
});

test('Filter prüft Status und Art gemeinsam', () => {
  const nachtrag = { status: 'open', kind: 'addendum' };
  assert.equal(matchesQuoteFilter(nachtrag, 'all', 'all'), true);
  assert.equal(matchesQuoteFilter(nachtrag, 'open', 'addendum'), true);
  assert.equal(matchesQuoteFilter(nachtrag, 'open', 'main'), false);
  assert.equal(matchesQuoteFilter(nachtrag, 'draft', 'addendum'), false);
});

test('Kennzahlen zählen offen und angenommen getrennt, Entwurf zählt nicht', () => {
  const figures = quoteFigures(
    [
      row('open', 100.1),
      row('open', 200.2),
      row('accepted', 50),
      row('draft', 999),
      row('expired', 7),
    ],
    '2026-11-04',
  );
  assert.equal(figures.openCount, 2);
  assert.equal(figures.openNetMinor, 30030);
  assert.equal(figures.acceptedCount, 1);
  assert.equal(figures.acceptedNetMinor, 5000);
  assert.equal(figures.expiredCount, 1);
});

test('Franken bleiben aus der Euro-Summe draußen und werden gemeldet', () => {
  const figures = quoteFigures(
    [row('open', 100), row('open', 500, { currency: 'CHF' })],
    '2026-11-04',
  );
  assert.equal(figures.openCount, 2);
  assert.equal(figures.openNetMinor, 10000);
  assert.equal(figures.hasOtherCurrency, true);
  assert.equal(quoteFigures([row('open', 100)], '2026-11-04').hasOtherCurrency, false);
});

test('Wiedervorlage zählt nur Unentschiedene, heute fällig gilt als fällig', () => {
  const figures = quoteFigures(
    [
      row('open', 1, { follow_up_on: '2026-11-04' }),
      row('expired', 1, { follow_up_on: '2026-11-01' }),
      row('open', 1, { follow_up_on: '2026-11-05' }),
      row('accepted', 1, { follow_up_on: '2026-11-01' }),
    ],
    '2026-11-04',
  );
  assert.equal(figures.followUpDueCount, 2);
});

test('Stichtag folgt Berliner Zeit, nicht UTC', () => {
  assert.equal(berlinToday(new Date('2026-11-04T23:30:00Z')), '2026-11-05');
  assert.equal(berlinToday(new Date('2026-11-04T22:30:00Z')), '2026-11-04');
});

test('Kunde ohne sichtbaren Kontakt ergibt leeren Text', () => {
  assert.equal(quoteCustomerLabel(undefined), '');
  assert.equal(quoteCustomerLabel({ customer: null }), '');
  assert.equal(
    quoteCustomerLabel({
      customer: {
        contact: { kind: 'company', company_name: 'Muster GmbH', first_name: '', last_name: '' },
      },
    }),
    'Muster GmbH',
  );
});
