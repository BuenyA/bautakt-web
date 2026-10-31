import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  activePayments,
  balance,
  canRecordPayment,
  canReversePayment,
  MAX_PAYMENT_METHOD,
  MAX_PAYMENT_TEXT,
  type PaymentDraft,
  type PaymentEntry,
  paymentErrors,
  paymentStatus,
  reverseReasonError,
} from './incomingPayments.ts';

function entry(over: Partial<PaymentEntry> & { id: string }): PaymentEntry {
  return {
    reverses_id: null,
    paid_at: '2026-10-30',
    amountMinor: 5000,
    method: 'Überweisung',
    note: '',
    reason: '',
    actor_name: 'Test',
    created_at: '2026-10-30T10:00:00Z',
    ...over,
  };
}

const HEUTE = '2026-10-31';

describe('Zahlungen und Storno', () => {
  const entries = [
    entry({ id: 'a', amountMinor: 3000 }),
    entry({ id: 'b', amountMinor: 2000 }),
    entry({ id: 'storno-b', reverses_id: 'b', amountMinor: -2000, reason: 'doppelt' }),
  ];

  it('aktiv sind Zahlungen ohne Storno, das Storno selbst zählt nicht', () => {
    assert.deepEqual(
      activePayments(entries).map((e) => e.id),
      ['a'],
    );
  });

  it('rechnet gezahlt und offen gegen den Zahlbetrag', () => {
    assert.deepEqual(balance(11_900, entries), { paidMinor: 3000, openMinor: 8900 });
    assert.deepEqual(balance(11_900, []), { paidMinor: 0, openMinor: 11_900 });
    // Mit Skonto ist der Zahlbetrag kleiner als Brutto.
    assert.deepEqual(balance(3000, entries), { paidMinor: 3000, openMinor: 0 });
  });

  it('Status wie die Datenbank: bezahlt ab Zahlbetrag, teilbezahlt darunter', () => {
    assert.equal(paymentStatus(3000, 3000), 'paid');
    assert.equal(paymentStatus(2999, 3000), 'partially_paid');
    assert.equal(paymentStatus(0, 3000), null);
    // Zahlbetrag 0 (volles Skonto): ohne Zahlung kein „bezahlt“.
    assert.equal(paymentStatus(0, 0), null);
  });

  it('stornieren nur aktive Zahlungen, nie ein Storno, nie an abgelehnten', () => {
    assert.equal(canReversePayment(entries[0]!, entries, 'approved'), true);
    assert.equal(canReversePayment(entries[1]!, entries, 'approved'), false);
    assert.equal(canReversePayment(entries[2]!, entries, 'approved'), false);
    assert.equal(canReversePayment(entries[0]!, entries, 'rejected'), false);
  });
});

describe('Zahlung erfassen', () => {
  it('nur erfasst, freigegeben und mit offenem Betrag', () => {
    assert.equal(canRecordPayment('open', 'approved', 100), true);
    assert.equal(canRecordPayment('partially_paid', 'approved', 100), true);
    assert.equal(canRecordPayment('overdue', 'approved', 1), true);
    assert.equal(canRecordPayment('draft', 'approved', 100), false);
    assert.equal(canRecordPayment(null, null, 100), false);
    assert.equal(canRecordPayment('open', 'in_review', 100), false);
    assert.equal(canRecordPayment('open', 'rejected', 100), false);
    assert.equal(canRecordPayment('paid', 'approved', 0), false);
  });

  const ok: PaymentDraft = { amountMinor: 5000, paidAt: HEUTE, method: '', note: '' };

  it('gültig: positiver Betrag bis zum Offenen, Zahltag heute oder früher', () => {
    assert.deepEqual(paymentErrors(5000, ok, HEUTE), {});
    assert.deepEqual(paymentErrors(5000, { ...ok, paidAt: '2026-01-02' }, HEUTE), {});
  });

  it('meldet Betrag, Zahltag und Textlängen je Feld', () => {
    assert.deepEqual(paymentErrors(5000, { ...ok, amountMinor: null }, HEUTE), {
      amount: 'amountRequired',
    });
    assert.deepEqual(paymentErrors(5000, { ...ok, amountMinor: 0 }, HEUTE), {
      amount: 'amountRequired',
    });
    assert.deepEqual(paymentErrors(4999, ok, HEUTE), { amount: 'amountTooHigh' });
    assert.deepEqual(paymentErrors(5000, { ...ok, paidAt: '' }, HEUTE), {
      paidAt: 'dateRequired',
    });
    assert.deepEqual(paymentErrors(5000, { ...ok, paidAt: '2026-11-01' }, HEUTE), {
      paidAt: 'dateInFuture',
    });
    assert.deepEqual(
      paymentErrors(
        5000,
        {
          ...ok,
          method: 'x'.repeat(MAX_PAYMENT_METHOD + 1),
          note: 'x'.repeat(MAX_PAYMENT_TEXT + 1),
        },
        HEUTE,
      ),
      { method: 'methodTooLong', note: 'noteTooLong' },
    );
    // Leerzeichen am Rand zählen nicht, die Datenbank schneidet sie ab.
    assert.deepEqual(
      paymentErrors(5000, { ...ok, method: ` ${'x'.repeat(MAX_PAYMENT_METHOD)} ` }, HEUTE),
      {},
    );
  });

  it('Storno braucht eine Begründung', () => {
    assert.equal(reverseReasonError('  '), 'reasonRequired');
    assert.equal(reverseReasonError('x'.repeat(MAX_PAYMENT_TEXT + 1)), 'reasonTooLong');
    assert.equal(reverseReasonError('doppelt überwiesen'), null);
  });
});
