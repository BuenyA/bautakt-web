import { daysBetween } from './dates';
import { previousMonth } from './kpis';
import { eurosToMinor } from './money';
import { type MonthlyPoint, monthlyTotals } from './monthly';
import {
  buildReceivables,
  INVOICE_TYPES,
  ISSUED_STATUSES,
  type PaymentRow,
  type ReceivableItem,
  type SalesDocumentRow,
} from './receivables';

/**
 * Die Rechnungs-Übersicht der Webapp (`/finanzen`): Ausgangs- und
 * Eingangsrechnungen in Gruppen, die man in der Karte umschaltet, dazu ein
 * paar Zahlen.
 *
 * Eine Gruppe ist eine Teilmenge, kein Status: „Überfällig“ steckt auch in
 * „Offen“. So zeigt „Offen“ immer die ganze Summe, die noch hereinkommen muss.
 */

export type DeskGroup<T> = {
  items: T[];
  /** Summe der Gruppe in Cent. */
  minor: number;
};

export type OutgoingGroupKey = 'overdue' | 'open' | 'draft';

export type OutgoingDesk = Record<OutgoingGroupKey, DeskGroup<OutgoingDeskItem>>;

export type OutgoingDeskItem = {
  document: SalesDocumentRow;
  /** Offener Betrag; bei Entwürfen das Brutto. */
  minor: number;
  daysOverdue: number;
};

/** Reihenfolge der Chips und der Vorauswahl: das Dringendste zuerst. */
export const OUTGOING_GROUP_ORDER: readonly OutgoingGroupKey[] = ['overdue', 'open', 'draft'];

function group<T>(items: T[], amount: (item: T) => number): DeskGroup<T> {
  return { items, minor: items.reduce((sum, item) => sum + amount(item), 0) };
}

export function buildOutgoingDesk(
  documents: readonly SalesDocumentRow[],
  payments: readonly PaymentRow[],
  referenceIso: string,
): OutgoingDesk {
  const receivables: OutgoingDeskItem[] = buildReceivables(documents, payments, referenceIso).map(
    (item: ReceivableItem) => ({
      document: item.document,
      minor: item.openMinor,
      daysOverdue: item.daysOverdue,
    }),
  );

  const drafts: OutgoingDeskItem[] = documents
    .filter((document) => INVOICE_TYPES.has(document.type) && document.status === 'draft')
    .map((document) => ({ document, minor: eurosToMinor(document.gross_total), daysOverdue: 0 }));

  const overdue = receivables
    .filter((item) => item.daysOverdue > 0)
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
  // Offene nach Fälligkeit: was zuerst fällig wird, steht oben.
  const open = [...receivables].sort((a, b) =>
    (a.document.due_date ?? '9999').localeCompare(b.document.due_date ?? '9999'),
  );

  return {
    overdue: group(overdue, (item) => item.minor),
    open: group(open, (item) => item.minor),
    draft: group(drafts, (item) => item.minor),
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

export type IncomingGroupKey = 'new' | 'dueSoon' | 'overdue' | 'open';

export const INCOMING_GROUP_ORDER: readonly IncomingGroupKey[] = [
  'new',
  'overdue',
  'dueSoon',
  'open',
];

export type IncomingDesk<T extends DeskIncomingRow> = Record<IncomingGroupKey, DeskGroup<T>>;

/**
 * Eingangsrechnungen nach dem, was das Büro tun muss.
 *
 * Offen ist alles außer `paid`, wie in `computeOpenTasks`. Teilbezahlte zählen
 * mit dem vollen Brutto: Zahlungen auf Eingangsrechnungen erfasst Bautakt noch
 * nicht.
 */
export function buildIncomingDesk<T extends DeskIncomingRow>(
  incoming: readonly T[],
  referenceIso: string,
  /** Seit wann eine Eingangsrechnung „neu“ ist (ISO-Zeitstempel). */
  newSinceIso: string,
  dueWithinDays = 7,
): IncomingDesk<T> {
  const amount = (row: T) => eurosToMinor(row.gross_total);
  const open = incoming
    .filter((row) => row.status !== 'paid')
    .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'));
  const daysLeft = (row: T) => (row.due_date ? daysBetween(referenceIso, row.due_date) : null);

  return {
    new: group(
      open
        .filter((row) => row.created_at >= newSinceIso)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
      amount,
    ),
    overdue: group(
      open.filter((row) => {
        const left = daysLeft(row);
        return left !== null && left < 0;
      }),
      amount,
    ),
    dueSoon: group(
      open.filter((row) => {
        const left = daysLeft(row);
        return left !== null && left >= 0 && left <= dueWithinDays;
      }),
      amount,
    ),
    open: group(open, amount),
  };
}

/** Erste Gruppe mit Inhalt, sonst die erste überhaupt. */
export function firstFilledGroup<K extends string>(
  order: readonly K[],
  groups: Record<K, DeskGroup<unknown>>,
): K {
  return order.find((key) => groups[key].items.length > 0) ?? order[0];
}

/**
 * Netto-Umsatz je Monat aus ausgestellten Rechnungen.
 *
 * Netto wie `computeYearResult` — `monthlyRevenue` rechnet brutto und passte
 * neben der Ergebniszahl nicht zusammen.
 */
export function monthlyNetRevenue(
  documents: readonly SalesDocumentRow[],
  months: readonly string[],
): MonthlyPoint[] {
  return monthlyTotals(
    documents
      .filter(
        (document) =>
          INVOICE_TYPES.has(document.type) &&
          ISSUED_STATUSES.has(document.status) &&
          Boolean(document.issue_date),
      )
      .map((document) => ({ dateIso: document.issue_date!, amount: document.net_total })),
    months,
  );
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
  const [before, current] = monthlyNetRevenue(documents, [previous, month]);
  return {
    month,
    minor: current.minor,
    previousMinor: before.minor,
    deltaPercent:
      before.minor > 0 ? Math.round(((current.minor - before.minor) / before.minor) * 100) : null,
  };
}
