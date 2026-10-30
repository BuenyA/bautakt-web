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

import { type IncomingInvoiceStatus, isIncomingInvoiceStatus } from './incomingInvoiceForm.ts';

export const INCOMING_REVIEW_STATUSES = ['in_review', 'approved', 'rejected'] as const;

export type IncomingReviewStatus = (typeof INCOMING_REVIEW_STATUSES)[number];

export type IncomingReviewDecision = 'approved' | 'rejected';

/**
 * Aktionen im Protokoll. Erfassen, Statuswechsel und Zuordnungen schreibt seit
 * bautakt-web#170 ein Trigger (bautakt-app 20261030210000_b_incoming_invoice_lock).
 */
export type IncomingInvoiceEventAction =
  'approved' | 'rejected' | 'mail_sent' | 'captured' | 'status_changed' | 'assignment_changed';

/** Ein Eintrag im Prüfprotokoll (`incoming_invoice_events`, append-only). */
export type IncomingInvoiceEvent = {
  id: string;
  action: IncomingInvoiceEventAction;
  reason: string;
  mail_reference: string | null;
  actor_name: string;
  created_at: string;
  /** Erst mit der Migration zu #170 vorhanden, davor fehlen die Felder. */
  field?: string | null;
  old_value?: string | null;
  new_value?: string | null;
};

export const ASSIGNMENT_FIELDS = ['order_id', 'cost_category_id', 'supplier_id'] as const;

export type AssignmentField = (typeof ASSIGNMENT_FIELDS)[number];

export type IncomingInvoiceChange =
  | { kind: 'status'; from: IncomingInvoiceStatus | null; to: IncomingInvoiceStatus }
  | { kind: 'assignment'; field: AssignmentField; from: string | null; to: string | null };

function isAssignmentField(value: string | null | undefined): value is AssignmentField {
  return (ASSIGNMENT_FIELDS as readonly (string | null | undefined)[]).includes(value);
}

/**
 * Was ein Protokolleintrag geändert hat. `null`, wenn der Eintrag keine
 * Änderung trägt oder die Werte nicht passen; dann zeigt das Protokoll nur
 * die Aktion.
 */
export function incomingInvoiceChange(event: IncomingInvoiceEvent): IncomingInvoiceChange | null {
  const from = event.old_value ?? null;
  const to = event.new_value ?? null;
  if (event.action === 'captured' || event.action === 'status_changed') {
    if (event.field !== 'status' || to === null || !isIncomingInvoiceStatus(to)) return null;
    if (from !== null && !isIncomingInvoiceStatus(from)) return null;
    if (event.action === 'status_changed' && from === null) return null;
    return { kind: 'status', from, to };
  }
  if (event.action === 'assignment_changed' && isAssignmentField(event.field)) {
    return { kind: 'assignment', field: event.field, from, to };
  }
  return null;
}

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
