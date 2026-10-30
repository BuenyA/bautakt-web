import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  canReview,
  incomingInvoiceChange,
  type IncomingInvoiceEvent,
  isFrozen,
  isIncomingReviewStatus,
  MAX_REVIEW_REASON,
  reviewReasonError,
} from './incomingReview.ts';

describe('canReview', () => {
  it('erfasster Beleg in Prüfung', () => {
    assert.equal(canReview('open', 'in_review'), true);
    assert.equal(canReview('paid', 'in_review'), true);
  });

  it('nicht im Entwurf und nicht ohne gespeicherten Beleg', () => {
    assert.equal(canReview('draft', 'in_review'), false);
    assert.equal(canReview(null, null), false);
  });

  it('nur einmal', () => {
    assert.equal(canReview('open', 'approved'), false);
    assert.equal(canReview('open', 'rejected'), false);
  });
});

describe('isFrozen', () => {
  it('nur abgelehnt', () => {
    assert.equal(isFrozen('rejected'), true);
    assert.equal(isFrozen('approved'), false);
    assert.equal(isFrozen('in_review'), false);
    assert.equal(isFrozen(null), false);
  });
});

describe('reviewReasonError', () => {
  it('Ablehnen braucht eine Begründung', () => {
    assert.equal(reviewReasonError('rejected', ''), 'reasonRequired');
    assert.equal(reviewReasonError('rejected', '   \n '), 'reasonRequired');
    assert.equal(reviewReasonError('rejected', 'Leistung nicht erbracht'), null);
  });

  it('Freigeben geht ohne', () => {
    assert.equal(reviewReasonError('approved', ''), null);
  });

  it('höchstens so lang wie in der Datenbank, ohne Leerraum am Rand', () => {
    const max = 'x'.repeat(MAX_REVIEW_REASON);
    assert.equal(reviewReasonError('rejected', `  ${max}  `), null);
    assert.equal(reviewReasonError('rejected', `${max}x`), 'reasonTooLong');
    assert.equal(reviewReasonError('approved', `${max}x`), 'reasonTooLong');
  });
});

describe('isIncomingReviewStatus', () => {
  it('nur die drei Werte der Datenbank', () => {
    assert.equal(isIncomingReviewStatus('in_review'), true);
    assert.equal(isIncomingReviewStatus('approved'), true);
    assert.equal(isIncomingReviewStatus('rejected'), true);
    assert.equal(isIncomingReviewStatus('open'), false);
  });
});

describe('incomingInvoiceChange', () => {
  const base: IncomingInvoiceEvent = {
    id: 'e',
    action: 'approved',
    reason: '',
    mail_reference: null,
    actor_name: 'Test',
    created_at: '2026-10-30T10:00:00Z',
  };

  it('Erfassen aus dem Entwurf und direkt erfasst', () => {
    assert.deepEqual(
      incomingInvoiceChange({
        ...base,
        action: 'captured',
        field: 'status',
        old_value: 'draft',
        new_value: 'open',
      }),
      { kind: 'status', from: 'draft', to: 'open' },
    );
    assert.deepEqual(
      incomingInvoiceChange({ ...base, action: 'captured', field: 'status', new_value: 'paid' }),
      { kind: 'status', from: null, to: 'paid' },
    );
  });

  it('Statuswechsel braucht alten und neuen bekannten Status', () => {
    const changed = { ...base, action: 'status_changed', field: 'status' } as const;
    assert.deepEqual(incomingInvoiceChange({ ...changed, old_value: 'open', new_value: 'paid' }), {
      kind: 'status',
      from: 'open',
      to: 'paid',
    });
    assert.equal(incomingInvoiceChange({ ...changed, new_value: 'paid' }), null);
    assert.equal(incomingInvoiceChange({ ...changed, old_value: 'open', new_value: 'x' }), null);
  });

  it('Zuordnung mit Feld; leer heißt keine', () => {
    assert.deepEqual(
      incomingInvoiceChange({
        ...base,
        action: 'assignment_changed',
        field: 'cost_category_id',
        old_value: 'k1',
        new_value: null,
      }),
      { kind: 'assignment', field: 'cost_category_id', from: 'k1', to: null },
    );
    assert.equal(
      incomingInvoiceChange({ ...base, action: 'assignment_changed', field: 'vendor_name' }),
      null,
    );
  });

  it('Prüfentscheidungen und Einträge vor der Migration tragen keine Änderung', () => {
    assert.equal(incomingInvoiceChange(base), null);
    assert.equal(incomingInvoiceChange({ ...base, action: 'mail_sent' }), null);
  });
});
