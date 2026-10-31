/**
 * Zahlungen auf eine Eingangsrechnung (bautakt-web#270), ohne React und ohne
 * Supabase, damit sie mit `node --test` laufen.
 *
 * Zahlungen sind unveränderbar; korrigiert wird per Storno, einem Eintrag mit
 * negativem Betrag und Begründung, der auf die Zahlung zeigt (bautakt-app
 * 20261031150000_b_incoming_invoice_payments). Teilbezahlt und bezahlt setzt
 * die Datenbank aus den aktiven Zahlungen. Die verbindliche Grenze ziehen
 * `record_incoming_invoice_payment` und `reverse_incoming_invoice_payment`;
 * hier steht, was die Oberfläche anbietet und vorab prüft, mit denselben
 * Grenzen.
 *
 * Beträge in Cent.
 */

import type { IncomingInvoiceStatus } from './incomingInvoiceForm.ts';
import type { IncomingReviewStatus } from './incomingReview.ts';

/** Ein Eintrag aus `incoming_invoice_payments`, Beträge in Cent. */
export type PaymentEntry = {
  id: string;
  reverses_id: string | null;
  paid_at: string;
  amountMinor: number;
  method: string;
  note: string;
  reason: string;
  actor_name: string;
  created_at: string;
};

/** Dieselben Grenzen wie die Datenbank. */
export const MAX_PAYMENT_METHOD = 100;
export const MAX_PAYMENT_TEXT = 2000;

/** Ids der Zahlungen, zu denen es ein Storno gibt. */
export function reversedIds(entries: readonly PaymentEntry[]): Set<string> {
  return new Set(entries.flatMap((entry) => (entry.reverses_id ? [entry.reverses_id] : [])));
}

/** Aktiv ist eine Zahlung, die selbst kein Storno ist und kein Storno hat. */
export function activePayments(entries: readonly PaymentEntry[]): PaymentEntry[] {
  const reversed = reversedIds(entries);
  return entries.filter((entry) => entry.reverses_id === null && !reversed.has(entry.id));
}

/**
 * Gezahlt und offen wie `incoming_invoice_balances`: Summe der aktiven
 * Zahlungen gegen den Zahlbetrag (Brutto minus Skonto).
 */
export function balance(
  payableMinor: number,
  entries: readonly PaymentEntry[],
): { paidMinor: number; openMinor: number } {
  const paidMinor = activePayments(entries).reduce((sum, entry) => sum + entry.amountMinor, 0);
  return { paidMinor, openMinor: payableMinor - paidMinor };
}

/** Status, den die Datenbank aus den Zahlungen setzt; `null`: bleibt, wie er ist. */
export function paymentStatus(
  paidMinor: number,
  payableMinor: number,
): 'paid' | 'partially_paid' | null {
  if (paidMinor > 0 && paidMinor >= payableMinor) return 'paid';
  if (paidMinor > 0) return 'partially_paid';
  return null;
}

/** Zahlen nur an einer erfassten, freigegebenen Rechnung mit offenem Betrag. */
export function canRecordPayment(
  status: IncomingInvoiceStatus | null,
  review: IncomingReviewStatus | null,
  openMinor: number,
): boolean {
  return status !== null && status !== 'draft' && review === 'approved' && openMinor > 0;
}

/** Stornieren: eine aktive Zahlung, an einer nicht abgelehnten Rechnung. */
export function canReversePayment(
  entry: PaymentEntry,
  entries: readonly PaymentEntry[],
  review: IncomingReviewStatus | null,
): boolean {
  return review !== 'rejected' && entry.reverses_id === null && !reversedIds(entries).has(entry.id);
}

export type PaymentDraft = {
  amountMinor: number | null;
  paidAt: string;
  method: string;
  note: string;
};

export type PaymentFieldError =
  | 'amountRequired'
  | 'amountTooHigh'
  | 'dateRequired'
  | 'dateInFuture'
  | 'methodTooLong'
  | 'noteTooLong';

export type PaymentErrors = Partial<
  Record<'amount' | 'paidAt' | 'method' | 'note', PaymentFieldError>
>;

/** Fehler je Feld, wie `record_incoming_invoice_payment` sie melden würde. */
export function paymentErrors(
  openMinor: number,
  draft: PaymentDraft,
  todayIso: string,
): PaymentErrors {
  const errors: PaymentErrors = {};
  if (draft.amountMinor === null || draft.amountMinor <= 0) errors.amount = 'amountRequired';
  else if (draft.amountMinor > openMinor) errors.amount = 'amountTooHigh';
  // ISO-Daten (YYYY-MM-DD) vergleichen sich als Text richtig.
  if (draft.paidAt === '') errors.paidAt = 'dateRequired';
  else if (draft.paidAt > todayIso) errors.paidAt = 'dateInFuture';
  if (draft.method.trim().length > MAX_PAYMENT_METHOD) errors.method = 'methodTooLong';
  if (draft.note.trim().length > MAX_PAYMENT_TEXT) errors.note = 'noteTooLong';
  return errors;
}

/** Begründung eines Stornos: Pflicht, höchstens 2000 Zeichen. */
export function reverseReasonError(reason: string): 'reasonRequired' | 'reasonTooLong' | null {
  const trimmed = reason.trim();
  if (trimmed === '') return 'reasonRequired';
  if (trimmed.length > MAX_PAYMENT_TEXT) return 'reasonTooLong';
  return null;
}
