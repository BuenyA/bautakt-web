import { daysBetween } from './dates';
import { previousMonth } from './kpis';
import { eurosToMinor } from './money';
import { monthlyRevenue } from './monthly';
import {
  buildReceivables,
  INVOICE_TYPES,
  type PaymentRow,
  type ReceivableItem,
  type SalesDocumentRow,
} from './receivables';

/**
 * Die Rechnungs-Übersicht der Webapp (`/rechnungen`): je eine Liste der
 * Ausgangs- und der Eingangsrechnungen mit ihrer offenen Summe.
 *
 * Keine Gruppen mehr (Owner 28.10.2026): Jede Zeile trägt ihren Stand selbst
 * (überfällig, bald fällig, offen, Entwurf), sortiert nach Fälligkeit — was
 * zuerst fällig war, steht oben.
 */

/** Stand einer Rechnung in der Liste. */
export type DeskDue =
  | { kind: 'overdue'; days: number }
  /** Fällig heute (`days` 0) bis in `DUE_SOON_DAYS` Tagen. */
  | { kind: 'dueSoon'; days: number }
  | { kind: 'open' }
  | { kind: 'draft' };

export type DeskEntry<T> = {
  item: T;
  /** Offener Betrag in Cent; bei Entwürfen das Brutto. */
  minor: number;
  due: DeskDue;
};

export type DeskList<T> = {
  entries: DeskEntry<T>[];
  /** Offene Summe in Cent, ohne Entwürfe. */
  minor: number;
};

/** Bis so viele Tage vor Fälligkeit gilt eine Rechnung als „bald fällig“. */
export const DUE_SOON_DAYS = 7;

export function dueOf(referenceIso: string, dueDate: string | null): DeskDue {
  if (!dueDate) return { kind: 'open' };
  const left = daysBetween(referenceIso, dueDate);
  if (left < 0) return { kind: 'overdue', days: -left };
  if (left <= DUE_SOON_DAYS) return { kind: 'dueSoon', days: left };
  return { kind: 'open' };
}

const byDueDate = (a: string | null, b: string | null) => (a ?? '9999').localeCompare(b ?? '9999');

/** Offene Ausgangsrechnungen nach Fälligkeit, Entwürfe am Ende. */
export function buildOutgoingDesk(
  documents: readonly SalesDocumentRow[],
  payments: readonly PaymentRow[],
  referenceIso: string,
): DeskList<SalesDocumentRow> {
  const open: DeskEntry<SalesDocumentRow>[] = buildReceivables(documents, payments, referenceIso)
    .map((item: ReceivableItem) => ({
      item: item.document,
      minor: item.openMinor,
      due: dueOf(referenceIso, item.document.due_date),
    }))
    .sort((a, b) => byDueDate(a.item.due_date, b.item.due_date));

  const drafts: DeskEntry<SalesDocumentRow>[] = documents
    .filter((document) => INVOICE_TYPES.has(document.type) && document.status === 'draft')
    .map((document) => ({
      item: document,
      minor: eurosToMinor(document.gross_total),
      due: { kind: 'draft' },
    }));

  return {
    entries: [...open, ...drafts],
    minor: open.reduce((sum, entry) => sum + entry.minor, 0),
  };
}

/** Ausschnitt aus `incoming_invoices`. */
export type DeskIncomingRow = {
  id: string;
  status: string;
  invoice_date: string | null;
  due_date: string | null;
  gross_total: number | null;
  created_at: string;
};

/**
 * Offene Eingangsrechnungen nach Fälligkeit.
 *
 * Offen ist alles außer `paid`, wie in `computeOpenTasks`. Teilbezahlte zählen
 * mit dem vollen Brutto: Zahlungen auf Eingangsrechnungen erfasst Bautakt noch
 * nicht.
 */
export function buildIncomingDesk<T extends DeskIncomingRow>(
  incoming: readonly T[],
  referenceIso: string,
): DeskList<T> {
  const entries = incoming
    .filter((row) => row.status !== 'paid')
    .sort((a, b) => byDueDate(a.due_date, b.due_date))
    .map((row) => ({
      item: row,
      minor: eurosToMinor(row.gross_total),
      due: dueOf(referenceIso, row.due_date),
    }));
  return { entries, minor: entries.reduce((sum, entry) => sum + entry.minor, 0) };
}

export type MonthComparison = {
  month: string;
  minor: number;
  previousMinor: number;
  /** Veränderung in ganzen Prozent; null ohne Vormonatsumsatz. */
  deltaPercent: number | null;
};

/** Netto-Umsatz des Monats und des Vormonats. */
export function netRevenueMonth(
  documents: readonly SalesDocumentRow[],
  month: string,
): MonthComparison {
  const previous = previousMonth(month);
  const [before, current] = monthlyRevenue(documents, [previous, month]);
  return {
    month,
    minor: current.minor,
    previousMinor: before.minor,
    deltaPercent:
      before.minor > 0 ? Math.round(((current.minor - before.minor) / before.minor) * 100) : null,
  };
}
