/**
 * Prüfung einer Eingangsrechnung (bautakt-web#164), ohne React und ohne
 * Supabase, damit sie mit `node --test` laufen.
 *
 * Der Prüfstand (`review_status`) steht neben dem Zahlstand (`status`): eine
 * freigegebene Rechnung ist danach offen oder bezahlt. Die verbindliche Grenze
 * ziehen `review_incoming_invoice` und die Trigger der Datenbank
 * (bautakt-app 20261029120000_b_incoming_invoice_review); hier steht nur, was
 * die Oberfläche anbietet.
 */

import type { IncomingInvoiceStatus } from './incomingInvoiceForm.ts';

export const INCOMING_REVIEW_STATUSES = ['in_review', 'approved', 'rejected'] as const;

export type IncomingReviewStatus = (typeof INCOMING_REVIEW_STATUSES)[number];

export type IncomingReviewDecision = 'approved' | 'rejected';

/** Ein Eintrag im Prüfprotokoll (`incoming_invoice_events`, append-only). */
export type IncomingInvoiceEvent = {
  id: string;
  action: 'approved' | 'rejected' | 'mail_sent';
  reason: string;
  mail_reference: string | null;
  actor_name: string;
  created_at: string;
};

/** Dieselbe Grenze wie in `review_incoming_invoice`. */
export const MAX_REVIEW_REASON = 2000;

export function isIncomingReviewStatus(value: string): value is IncomingReviewStatus {
  return (INCOMING_REVIEW_STATUSES as readonly string[]).includes(value);
}

/** Geprüft wird nur ein erfasster Beleg, und nur einmal. */
export function canReview(
  status: IncomingInvoiceStatus | null,
  review: IncomingReviewStatus | null,
): boolean {
  return status !== null && status !== 'draft' && review === 'in_review';
}

/**
 * Abgelehnt heißt eingefroren (Leitplanke L3): auch der Zahlstand ändert sich
 * nicht mehr, der Beleg bleibt nur aufbewahrt.
 */
export function isFrozen(review: IncomingReviewStatus | null): boolean {
  return review === 'rejected';
}

export type ReviewReasonError = 'reasonRequired' | 'reasonTooLong';

/** Ablehnen nur mit Begründung; Leerzeichen zählen nicht. */
export function reviewReasonError(
  decision: IncomingReviewDecision,
  reason: string,
): ReviewReasonError | null {
  const trimmed = reason.trim();
  if (decision === 'rejected' && trimmed === '') return 'reasonRequired';
  if (trimmed.length > MAX_REVIEW_REASON) return 'reasonTooLong';
  return null;
}
