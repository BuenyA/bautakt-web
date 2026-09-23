import { daysBetween, todayIso } from './dates';
import { eurosToMinor } from './money';

/**
 * Offene Posten und ihre Altersklassen.
 *
 * ⚠️ Die Einteilung stammt aus `bautakt-app/app/lib/finance/receivables.ts`
 * (Stand 2026-09-23) und muss dort und hier dieselbe bleiben: ein Beleg, der am
 * Handy in „31–60 Tage" steht, darf am Rechner nicht in „1–30" auftauchen.
 */
export type AgingBucket = 'not_due' | '1_30' | '31_60' | '61_90' | '90_plus';

/** Von „jung" nach „alt" — Reihenfolge fuer Legenden, Stapel und Tabellen. */
export const AGING_BUCKET_ORDER: AgingBucket[] = ['not_due', '1_30', '31_60', '61_90', '90_plus'];

/** Belegarten, die eine Forderung begruenden. Angebote gehoeren nicht dazu. */
export const INVOICE_TYPES = new Set(['invoice', 'partial_invoice', 'final_invoice']);

/** Status, in denen noch Geld aussteht. `draft` und `paid` sind keine offenen Posten. */
export const OPEN_STATUSES = new Set(['issued', 'sent', 'partially_paid', 'overdue']);

/** Status ab „ausgestellt" — Entwuerfe und Stornos sind kein Umsatz. */
export const ISSUED_STATUSES = new Set(['issued', 'sent', 'partially_paid', 'overdue', 'paid']);

/** Ausschnitt aus `sales_documents`, den die Berechnung braucht. */
export type SalesDocumentRow = {
  id: string;
  type: string;
  status: string;
  document_number: string | null;
  issue_date: string | null;
  due_date: string | null;
  gross_total: number | null;
  net_total: number | null;
  vat_total: number | null;
  customer_id: string | null;
};

/** Ausschnitt aus `payments`. */
export type PaymentRow = {
  document_id: string;
  amount: number | null;
  skonto_amount: number | null;
};

export type ReceivableItem = {
  document: SalesDocumentRow;
  /** Noch offener Betrag in Cent — Brutto abzueglich Zahlungen und Skonto. */
  openMinor: number;
  paidMinor: number;
  daysOverdue: number;
  bucket: AgingBucket;
};

export function agingBucket(daysOverdue: number): AgingBucket {
  if (daysOverdue <= 0) return 'not_due';
  if (daysOverdue <= 30) return '1_30';
  if (daysOverdue <= 60) return '31_60';
  if (daysOverdue <= 90) return '61_90';
  return '90_plus';
}

/** Zahlungen je Beleg in Cent, Skonto eingerechnet. */
export function paidByDocument(payments: readonly PaymentRow[]): Map<string, number> {
  const byDocument = new Map<string, number>();
  for (const payment of payments) {
    const amount = eurosToMinor(payment.amount) + eurosToMinor(payment.skonto_amount);
    byDocument.set(payment.document_id, (byDocument.get(payment.document_id) ?? 0) + amount);
  }
  return byDocument;
}

/**
 * Offene Posten aus Belegen und Zahlungen.
 *
 * Belege ohne Restbetrag fallen raus: ein vollstaendig bezahlter Beleg, dessen
 * Status noch nicht auf `paid` steht, ist kein offener Posten — sonst mahnt man
 * jemanden, der bereits ueberwiesen hat.
 */
export function buildReceivables(
  documents: readonly SalesDocumentRow[],
  payments: readonly PaymentRow[],
  referenceIso: string = todayIso(),
): ReceivableItem[] {
  const paid = paidByDocument(payments);

  return documents
    .filter((document) => INVOICE_TYPES.has(document.type) && OPEN_STATUSES.has(document.status))
    .map((document) => {
      const paidMinor = paid.get(document.id) ?? 0;
      const openMinor = Math.max(0, eurosToMinor(document.gross_total) - paidMinor);
      const overdue = document.due_date
        ? Math.max(0, daysBetween(document.due_date, referenceIso))
        : 0;
      return {
        document,
        openMinor,
        paidMinor,
        daysOverdue: overdue,
        bucket: agingBucket(overdue),
      };
    })
    .filter((item) => item.openMinor > 0);
}

export type AgingSummary = Record<AgingBucket, { count: number; openMinor: number }>;

export function receivablesByBucket(items: readonly ReceivableItem[]): AgingSummary {
  const summary = Object.fromEntries(
    AGING_BUCKET_ORDER.map((bucket) => [bucket, { count: 0, openMinor: 0 }]),
  ) as AgingSummary;

  for (const item of items) {
    summary[item.bucket].count += 1;
    summary[item.bucket].openMinor += item.openMinor;
  }
  return summary;
}

export function totalOpenMinor(items: readonly ReceivableItem[]): number {
  return items.reduce((sum, item) => sum + item.openMinor, 0);
}

/** Nur das, was ueber die Faelligkeit hinaus ist. */
export function totalOverdueMinor(items: readonly ReceivableItem[]): number {
  return items.reduce((sum, item) => (item.daysOverdue > 0 ? sum + item.openMinor : sum), 0);
}
