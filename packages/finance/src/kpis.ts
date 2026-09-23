import { daysBetween, todayIso } from './dates';
import { eurosToMinor } from './money';
import {
  buildReceivables,
  INVOICE_TYPES,
  ISSUED_STATUSES,
  type PaymentRow,
  type SalesDocumentRow,
  totalOpenMinor,
  totalOverdueMinor,
} from './receivables';

/**
 * Die Zahlen der Startseite.
 *
 * Bewusst knapp gehalten: vier Kacheln, die eine Geschaeftsfuehrung beim
 * Oeffnen sehen will, und eine Liste dessen, was zu tun ist. Alles Weitere
 * gehoert in die Auswertungen, nicht auf die Startseite.
 */
export type IncomingInvoiceRow = {
  id: string;
  status: string;
  due_date: string | null;
  gross_total: number | null;
};

export type OverviewKpis = {
  /** Summe aller offenen Forderungen in Cent. */
  openReceivablesMinor: number;
  openReceivablesCount: number;
  /** Davon ueberfaellig. */
  overdueMinor: number;
  overdueCount: number;
  /** Brutto-Umsatz des angefragten Monats (ausgestellte Rechnungen). */
  revenueMonthMinor: number;
  /** Derselbe Monat im Vormonat — fuer den Vergleichspfeil. */
  revenuePreviousMonthMinor: number;
};

/** `YYYY-MM` des Kalendertags; leer, wenn kein Datum gesetzt ist. */
function monthOf(iso: string | null | undefined): string {
  return iso && iso.length >= 7 ? iso.slice(0, 7) : '';
}

/** Vormonat zu `YYYY-MM`. */
export function previousMonth(month: string): string {
  const [year, monthIndex] = month.split('-').map(Number);
  const date = new Date(year, (monthIndex || 1) - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function computeOverviewKpis(
  documents: readonly SalesDocumentRow[],
  payments: readonly PaymentRow[],
  month: string,
  referenceIso?: string,
): OverviewKpis {
  const receivables = buildReceivables(documents, payments, referenceIso);
  const overdue = receivables.filter((item) => item.daysOverdue > 0);

  const revenueIn = (targetMonth: string) =>
    documents
      .filter(
        (document) =>
          INVOICE_TYPES.has(document.type) &&
          ISSUED_STATUSES.has(document.status) &&
          monthOf(document.issue_date) === targetMonth,
      )
      .reduce((sum, document) => sum + eurosToMinor(document.gross_total), 0);

  return {
    openReceivablesMinor: totalOpenMinor(receivables),
    openReceivablesCount: receivables.length,
    overdueMinor: totalOverdueMinor(receivables),
    overdueCount: overdue.length,
    revenueMonthMinor: revenueIn(month),
    revenuePreviousMonthMinor: revenueIn(previousMonth(month)),
  };
}

export type OpenTaskCounts = {
  /** Nicht versendete Entwuerfe — Geld, das noch niemand angefordert hat. */
  draftDocuments: number;
  /** Ueberfaellige Belege ohne Mahnung. */
  dunnable: number;
  /** Eingangsrechnungen, die in den naechsten sieben Tagen faellig werden. */
  incomingDueSoon: number;
};

export function computeOpenTasks(
  documents: readonly SalesDocumentRow[],
  payments: readonly PaymentRow[],
  incoming: readonly IncomingInvoiceRow[],
  dunnedDocumentIds: ReadonlySet<string>,
  referenceIso: string = todayIso(),
  /** Vorlauf der Faelligkeitswarnung in Tagen. */
  dueWithinDays = 7,
): OpenTaskCounts {
  const receivables = buildReceivables(documents, payments, referenceIso);

  return {
    draftDocuments: documents.filter(
      (document) => document.status === 'draft' && INVOICE_TYPES.has(document.type),
    ).length,
    dunnable: receivables.filter(
      (item) => item.daysOverdue > 0 && !dunnedDocumentIds.has(item.document.id),
    ).length,
    // Bereits ueberfaellige zaehlen mit: sie sind das dringendere Ende
    // derselben Aufgabe „bezahlen, bevor der Lieferant mahnt".
    incomingDueSoon: incoming.filter((invoice) => {
      if (invoice.status === 'paid' || !invoice.due_date) return false;
      return daysBetween(referenceIso, invoice.due_date) <= dueWithinDays;
    }).length,
  };
}
