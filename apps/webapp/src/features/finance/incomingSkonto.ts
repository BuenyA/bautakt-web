/**
 * Skonto-Vermerk an einer Eingangsrechnung (bautakt-web#166), ohne React und
 * ohne Supabase, damit er mit `node --test` läuft.
 *
 * Das Original bleibt, wie der Lieferant es gestellt hat; ein mündlich
 * vereinbartes Skonto steht als Eintrag in `incoming_invoice_adjustments`
 * (bautakt-app 20261030120000_b_incoming_invoice_adjustments). Einträge sind
 * unveränderbar, korrigiert wird per Gegen-Eintrag. Die verbindliche Grenze
 * ziehen `note_incoming_invoice_adjustment` und
 * `reverse_incoming_invoice_adjustment`; hier steht, was die Oberfläche
 * anbietet und vorab prüft, mit denselben Grenzen.
 *
 * Beträge in Cent. Prozent mit höchstens vier Nachkommastellen, intern als
 * ganze Zahl in Zehntausendsteln, damit die Rundung exakt wie `round(…, 2)` in
 * Postgres ausfällt (halber Cent weg von null), ohne Gleitkommafehler.
 */

import type { IncomingInvoiceStatus } from './incomingInvoiceForm.ts';
import type { IncomingReviewStatus } from './incomingReview.ts';

/** Ein Eintrag aus `incoming_invoice_adjustments`, Beträge in Cent. */
export type SkontoEntry = {
  id: string;
  reverses_id: string | null;
  amountMinor: number;
  percent: number | null;
  reason: string;
  agreed_with: string | null;
  agreed_on: string | null;
  discount_until: string | null;
  actor_name: string;
  created_at: string;
};

/** Dieselben Grenzen wie die Datenbank. */
export const MAX_SKONTO_REASON = 2000;
export const MAX_AGREED_WITH = 200;

/** Prozent-Eingabe wie „2“, „1,5“ oder „2.25“, höchstens vier Nachkommastellen. */
export function parsePercentInput(value: string): number | null {
  const match = /^(\d{1,3})(?:[.,](\d{1,4}))?$/.exec(value.trim());
  if (!match) return null;
  const tenThousandths = Number(match[1]) * 10000 + Number((match[2] ?? '').padEnd(4, '0'));
  if (tenThousandths <= 0 || tenThousandths > 100 * 10000) return null;
  return tenThousandths / 10000;
}

/**
 * Skonto in Cent aus Brutto und Prozent, kaufmännisch gerundet wie
 * `round(gross * percent / 100, 2)` in der Datenbank.
 */
export function skontoFromPercent(grossMinor: number, percent: number): number {
  const scaled = BigInt(grossMinor) * BigInt(Math.round(percent * 10000));
  const divisor = 1_000_000n;
  const negative = scaled < 0n;
  const abs = negative ? -scaled : scaled;
  let quotient = abs / divisor;
  if ((abs % divisor) * 2n >= divisor) quotient += 1n;
  return Number(negative ? -quotient : quotient);
}

/** Aktiv ist ein Vermerk, zu dem es keinen Gegen-Eintrag gibt. */
export function activeSkonto(entries: readonly SkontoEntry[]): SkontoEntry | null {
  const reversed = new Set(
    entries.flatMap((entry) => (entry.reverses_id ? [entry.reverses_id] : [])),
  );
  return entries.find((entry) => entry.reverses_id === null && !reversed.has(entry.id)) ?? null;
}

/**
 * Zahlbetrag wie `incoming_invoice_payables`: Brutto aus dem Original minus
 * Summe aller Einträge (ein Gegen-Eintrag hebt seinen Vermerk genau auf).
 */
export function payable(
  grossMinor: number,
  entries: readonly SkontoEntry[],
): { skontoMinor: number; payableMinor: number; discountUntil: string | null } {
  const skontoMinor = entries.reduce((sum, entry) => sum + entry.amountMinor, 0);
  return {
    skontoMinor,
    payableMinor: grossMinor - skontoMinor,
    discountUntil: activeSkonto(entries)?.discount_until ?? null,
  };
}

/** Skontofrist: heute noch drin oder schon vorbei. */
export function isDiscountExpired(discountUntil: string, todayIso: string): boolean {
  return todayIso > discountUntil;
}

/** Vorschlag für die Frist aus dem Lieferanten-Stamm: Rechnungsdatum + Tage. */
export function discountUntilFromTerms(invoiceDate: string, days: number | null): string | null {
  if (days === null || !Number.isInteger(days) || days < 0) return null;
  const [year, month, day] = invoiceDate.split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

/** Vermerken nur an einer erfassten, nicht abgelehnten Rechnung ohne aktives Skonto. */
export function canNoteSkonto(
  status: IncomingInvoiceStatus | null,
  review: IncomingReviewStatus | null,
  grossMinor: number,
  entries: readonly SkontoEntry[],
): boolean {
  return (
    status !== null &&
    status !== 'draft' &&
    review !== null &&
    review !== 'rejected' &&
    grossMinor > 0 &&
    activeSkonto(entries) === null
  );
}

export type SkontoDraft = {
  amountMinor: number | null;
  /** `undefined`: Prozentfeld nicht lesbar; `null`: leer. */
  percent: number | null | undefined;
  reason: string;
  agreedWith: string;
  agreedOn: string;
  discountUntil: string;
};

export type SkontoFieldError =
  | 'amountRequired'
  | 'amountTooHigh'
  | 'percentInvalid'
  | 'percentMismatch'
  | 'reasonRequired'
  | 'reasonTooLong'
  | 'agreedWithRequired'
  | 'agreedWithTooLong'
  | 'agreedOnRequired'
  | 'discountUntilRequired';

export type SkontoErrors = Partial<
  Record<
    'amount' | 'percent' | 'reason' | 'agreedWith' | 'agreedOn' | 'discountUntil',
    SkontoFieldError
  >
>;

/** Fehler je Feld, wie `note_incoming_invoice_adjustment` sie melden würde. */
export function skontoErrors(grossMinor: number, draft: SkontoDraft): SkontoErrors {
  const errors: SkontoErrors = {};
  if (draft.amountMinor === null || draft.amountMinor <= 0) errors.amount = 'amountRequired';
  else if (draft.amountMinor > grossMinor) errors.amount = 'amountTooHigh';
  if (draft.percent === undefined) errors.percent = 'percentInvalid';
  else if (
    draft.percent !== null &&
    draft.amountMinor !== null &&
    skontoFromPercent(grossMinor, draft.percent) !== draft.amountMinor
  ) {
    errors.percent = 'percentMismatch';
  }
  const reason = draft.reason.trim();
  if (reason === '') errors.reason = 'reasonRequired';
  else if (reason.length > MAX_SKONTO_REASON) errors.reason = 'reasonTooLong';
  const agreedWith = draft.agreedWith.trim();
  if (agreedWith === '') errors.agreedWith = 'agreedWithRequired';
  else if (agreedWith.length > MAX_AGREED_WITH) errors.agreedWith = 'agreedWithTooLong';
  if (draft.agreedOn === '') errors.agreedOn = 'agreedOnRequired';
  if (draft.discountUntil === '') errors.discountUntil = 'discountUntilRequired';
  return errors;
}
