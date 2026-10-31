import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  activeSkonto,
  canNoteSkonto,
  discountUntilFromTerms,
  isDiscountExpired,
  parsePercentInput,
  payable,
  type SkontoDraft,
  type SkontoEntry,
  skontoErrors,
  skontoFromPercent,
} from './incomingSkonto.ts';

function entry(over: Partial<SkontoEntry> & { id: string }): SkontoEntry {
  return {
    reverses_id: null,
    amountMinor: 238,
    percent: 2,
    reason: 'mündlich',
    agreed_with: 'Herr Muster',
    agreed_on: '2026-10-30',
    discount_until: '2026-11-06',
    actor_name: 'Test',
    created_at: '2026-10-30T10:00:00Z',
    ...over,
  };
}

describe('parsePercentInput', () => {
  it('liest Komma und Punkt, höchstens vier Nachkommastellen', () => {
    assert.equal(parsePercentInput('2'), 2);
    assert.equal(parsePercentInput(' 1,5 '), 1.5);
    assert.equal(parsePercentInput('2.25'), 2.25);
    assert.equal(parsePercentInput('0,0001'), 0.0001);
    assert.equal(parsePercentInput('100'), 100);
  });

  it('lehnt 0, über 100, zu viele Stellen und Unlesbares ab', () => {
    for (const value of ['0', '0,0', '100,01', '1,23456', '-2', 'zwei', '', '2 %']) {
      assert.equal(parsePercentInput(value), null, value);
    }
  });
});

describe('skontoFromPercent', () => {
  it('rundet wie round(…, 2) in Postgres', () => {
    assert.equal(skontoFromPercent(11900, 2), 238);
    assert.equal(skontoFromPercent(11900, 3), 357);
    // 1,5 % von 33,33 € = 0,49995 € → 0,50 € (halber Cent weg von null),
    // als Gleitkomma wären es 49,99499… Cent.
    assert.equal(skontoFromPercent(3333, 1.5), 50);
    assert.equal(skontoFromPercent(100, 0.0001), 0);
    assert.equal(skontoFromPercent(123456789, 2.25), 2777778);
    assert.equal(skontoFromPercent(11900, 100), 11900);
  });
});

describe('activeSkonto und payable', () => {
  it('ohne Einträge zahlt man Brutto', () => {
    assert.deepEqual(payable(11900, []), {
      skontoMinor: 0,
      payableMinor: 11900,
      discountUntil: null,
    });
  });

  it('Zahlbetrag = Brutto − Skonto, mit Frist', () => {
    assert.deepEqual(payable(11900, [entry({ id: 'a' })]), {
      skontoMinor: 238,
      payableMinor: 11662,
      discountUntil: '2026-11-06',
    });
  });

  it('Gegen-Eintrag hebt auf, neuer Vermerk gilt', () => {
    const entries = [
      entry({ id: 'a' }),
      entry({
        id: 'b',
        reverses_id: 'a',
        amountMinor: -238,
        percent: null,
        agreed_with: null,
        agreed_on: null,
        discount_until: null,
      }),
    ];
    assert.equal(activeSkonto(entries), null);
    assert.deepEqual(payable(11900, entries), {
      skontoMinor: 0,
      payableMinor: 11900,
      discountUntil: null,
    });
    const renewed = [
      ...entries,
      entry({ id: 'c', amountMinor: 357, discount_until: '2026-11-13' }),
    ];
    assert.equal(activeSkonto(renewed)?.id, 'c');
    assert.deepEqual(payable(11900, renewed), {
      skontoMinor: 357,
      payableMinor: 11543,
      discountUntil: '2026-11-13',
    });
  });
});

describe('Skontofrist', () => {
  it('am letzten Tag noch drin, danach abgelaufen', () => {
    assert.equal(isDiscountExpired('2026-11-06', '2026-11-06'), false);
    assert.equal(isDiscountExpired('2026-11-06', '2026-11-07'), true);
  });

  it('Vorschlag aus Rechnungsdatum + Skontotage, auch über den Monat', () => {
    assert.equal(discountUntilFromTerms('2026-10-28', 7), '2026-11-04');
    assert.equal(discountUntilFromTerms('2026-03-25', 10), '2026-04-04');
    assert.equal(discountUntilFromTerms('2026-10-28', 0), '2026-10-28');
    assert.equal(discountUntilFromTerms('2026-10-28', null), null);
    assert.equal(discountUntilFromTerms('2026-10-28', -1), null);
  });
});

describe('canNoteSkonto', () => {
  it('nur erfasst, nicht abgelehnt, nicht bezahlt, Brutto > 0, kein aktives Skonto', () => {
    assert.equal(canNoteSkonto('open', 'in_review', 11900, []), true);
    assert.equal(canNoteSkonto('partially_paid', 'approved', 11900, []), true);
    assert.equal(canNoteSkonto('paid', 'approved', 11900, []), false);
    assert.equal(canNoteSkonto('draft', 'in_review', 11900, []), false);
    assert.equal(canNoteSkonto('open', 'rejected', 11900, []), false);
    assert.equal(canNoteSkonto('open', 'approved', 0, []), false);
    assert.equal(canNoteSkonto('open', 'approved', 11900, [entry({ id: 'a' })]), false);
    assert.equal(canNoteSkonto(null, null, 11900, []), false);
  });
});

describe('skontoErrors', () => {
  const ok: SkontoDraft = {
    amountMinor: 238,
    percent: 2,
    reason: 'Zahlung binnen 7 Tagen',
    agreedWith: 'Herr Muster',
    agreedOn: '2026-10-30',
    discountUntil: '2026-11-06',
  };

  it('vollständiger Vermerk, auch ohne Prozent', () => {
    assert.deepEqual(skontoErrors(11900, ok), {});
    assert.deepEqual(skontoErrors(11900, { ...ok, percent: null }), {});
  });

  it('wie die Prüfungen der Datenbank', () => {
    assert.deepEqual(
      skontoErrors(11900, {
        amountMinor: null,
        percent: undefined,
        reason: '  ',
        agreedWith: ' ',
        agreedOn: '',
        discountUntil: '',
      }),
      {
        amount: 'amountRequired',
        percent: 'percentInvalid',
        reason: 'reasonRequired',
        agreedWith: 'agreedWithRequired',
        agreedOn: 'agreedOnRequired',
        discountUntil: 'discountUntilRequired',
      },
    );
    assert.equal(skontoErrors(11900, { ...ok, amountMinor: 0 }).amount, 'amountRequired');
    assert.equal(skontoErrors(11900, { ...ok, amountMinor: 11901 }).amount, 'amountTooHigh');
    assert.equal(skontoErrors(11900, { ...ok, amountMinor: 237 }).percent, 'percentMismatch');
    assert.equal(skontoErrors(11900, { ...ok, reason: 'x'.repeat(2001) }).reason, 'reasonTooLong');
    assert.equal(
      skontoErrors(11900, { ...ok, agreedWith: 'x'.repeat(201) }).agreedWith,
      'agreedWithTooLong',
    );
  });
});
