import { eurosToMinor } from './money';
import { INVOICE_TYPES, ISSUED_STATUSES, type SalesDocumentRow } from './receivables';

export type MonthlyPoint = {
  /** `YYYY-MM` */
  month: string;
  minor: number;
  count: number;
};

/** Die letzten `count` Monate einschliesslich `endMonth`, aelteste zuerst. */
export function monthRange(endMonth: string, count: number): string[] {
  const [year, month] = endMonth.split('-').map(Number);
  const months: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(year, (month || 1) - 1 - offset, 1);
    months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

/**
 * Brutto-Umsatz je Monat aus ausgestellten Rechnungen.
 *
 * Monate ohne Umsatz bleiben mit 0 in der Reihe. Sie wegzulassen waere die
 * haeufigste Luege einer Zeitreihe: die Kurve sieht dann gleichmaessig aus,
 * obwohl zwei Monate gar nichts passiert ist.
 */
export function monthlyRevenue(
  documents: readonly SalesDocumentRow[],
  months: readonly string[],
): MonthlyPoint[] {
  const byMonth = new Map<string, MonthlyPoint>(
    months.map((month) => [month, { month, minor: 0, count: 0 }]),
  );

  for (const document of documents) {
    if (!INVOICE_TYPES.has(document.type) || !ISSUED_STATUSES.has(document.status)) continue;
    const month = document.issue_date?.slice(0, 7);
    const point = month ? byMonth.get(month) : undefined;
    if (!point) continue;
    point.minor += eurosToMinor(document.gross_total);
    point.count += 1;
  }

  return months.map((month) => byMonth.get(month)!);
}

export type DatedAmount = {
  /** Kalendertag `YYYY-MM-DD`. */
  dateIso: string;
  /** Betrag in Euro, wie ihn Postgres liefert. */
  amount: unknown;
};

/** Summe beliebiger datierter Betraege je Monat — fuer Ausgaben und Kosten. */
export function monthlyTotals(
  entries: readonly DatedAmount[],
  months: readonly string[],
): MonthlyPoint[] {
  const byMonth = new Map<string, MonthlyPoint>(
    months.map((month) => [month, { month, minor: 0, count: 0 }]),
  );

  for (const entry of entries) {
    const point = byMonth.get(entry.dateIso.slice(0, 7));
    if (!point) continue;
    point.minor += eurosToMinor(entry.amount);
    point.count += 1;
  }

  return months.map((month) => byMonth.get(month)!);
}

/** `YYYY-MM` als `MM/JJ` — kurz genug fuer eine Achsenbeschriftung. */
export function formatMonthShort(month: string): string {
  const [year, monthPart] = month.split('-');
  return `${monthPart}/${year.slice(2)}`;
}
