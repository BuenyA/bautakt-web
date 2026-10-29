import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  canReview,
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
