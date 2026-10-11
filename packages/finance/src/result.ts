import { laborCostMinor, type LaborRateRow, type LaborTimeEntry } from './laborCost';
import { eurosToMinor } from './money';
import { INVOICE_TYPES, ISSUED_STATUSES, type SalesDocumentRow } from './receivables';

/**
 * Das betriebswirtschaftliche Ergebnis seit Jahresbeginn, netto.
 *
 * Netto, weil die Umsatzsteuer durchlaufendes Geld ist: brutto gerechnet
 * saehe ein Betrieb mit hohem Materialeinkauf besser aus, als er ist.
 * Kalkulatorische Kosten zaehlen nicht — sie sind nie geflossen.
 */

/** Ausschnitt aus `expenses`. */
export type ResultExpenseRow = {
  invoice_date: string;
  amount_net: number | null;
  is_calculatory: boolean;
};

/** Ausschnitt aus `incoming_invoices`. */
export type ResultIncomingRow = {
  invoice_date: string | null;
  net_total: number | null;
};

export type YearResult = {
  /** Netto-Umsatz ausgestellter Rechnungen vom 01.01. bis Stichtag. */
  revenueMinor: number;
  /** Derselbe Zeitraum im Vorjahr — fuer den Vergleich. */
  revenuePreviousYearMinor: number;
  /** Ausgaben und Eingangsrechnungen, netto. */
  materialAndOverheadMinor: number;
  /** Lohnkosten (Stunden × Kostensatz); null, wenn sie nicht gerechnet wurden. */
  laborMinor: number | null;
  /** Summe aller Aufwaende. */
  expensesMinor: number;
  /** Umsatz − Aufwaende. */
  resultMinor: number;
  /** Ergebnis in Prozent vom Umsatz, ganzzahlig; null ohne Umsatz. */
  marginPercent: number | null;
};

export type YearResultInput = {
  documents: readonly SalesDocumentRow[];
  expenses: readonly ResultExpenseRow[];
  incoming: readonly ResultIncomingRow[];
  /** Ohne Recht auf Lohnkosten: `null` — dann rechnet das Ergebnis ohne Lohn. */
  labor: { entries: readonly LaborTimeEntry[]; rates: readonly LaborRateRow[] } | null;
  /** Stichtag `YYYY-MM-DD`; der Zeitraum ist 01.01. desselben Jahres bis hier. */
  referenceIso: string;
};

function inRange(iso: string | null | undefined, fromIso: string, toIso: string): boolean {
  if (!iso) return false;
  const day = iso.slice(0, 10);
  return day >= fromIso && day <= toIso;
}

/** Gleicher Kalendertag ein Jahr frueher; der 29.02. wird zum 28.02. */
function previousYearIso(iso: string): string {
  const year = Number(iso.slice(0, 4)) - 1;
  const monthDay = iso.slice(5, 10) === '02-29' ? '02-28' : iso.slice(5, 10);
  return `${year}-${monthDay}`;
}

function revenueBetween(
  documents: readonly SalesDocumentRow[],
  fromIso: string,
  toIso: string,
): number {
  return documents
    .filter(
      (document) =>
        INVOICE_TYPES.has(document.type) &&
        ISSUED_STATUSES.has(document.status) &&
        inRange(document.issue_date, fromIso, toIso),
    )
    .reduce((sum, document) => sum + eurosToMinor(document.net_total), 0);
}

export function computeYearResult(input: YearResultInput): YearResult {
  const toIso = input.referenceIso.slice(0, 10);
  const fromIso = `${toIso.slice(0, 4)}-01-01`;
  const previousTo = previousYearIso(toIso);
  const previousFrom = `${previousTo.slice(0, 4)}-01-01`;

  const revenueMinor = revenueBetween(input.documents, fromIso, toIso);
  const revenuePreviousYearMinor = revenueBetween(input.documents, previousFrom, previousTo);

  const materialAndOverheadMinor =
    input.expenses
      .filter((expense) => !expense.is_calculatory && inRange(expense.invoice_date, fromIso, toIso))
      .reduce((sum, expense) => sum + eurosToMinor(expense.amount_net), 0) +
    input.incoming
      .filter((invoice) => inRange(invoice.invoice_date, fromIso, toIso))
      .reduce((sum, invoice) => sum + eurosToMinor(invoice.net_total), 0);

  const laborMinor = input.labor
    ? laborCostMinor(input.labor.entries, input.labor.rates, fromIso, toIso)
    : null;

  const expensesMinor = materialAndOverheadMinor + (laborMinor ?? 0);
  const resultMinor = revenueMinor - expensesMinor;

  return {
    revenueMinor,
    revenuePreviousYearMinor,
    materialAndOverheadMinor,
    laborMinor,
    expensesMinor,
    resultMinor,
    marginPercent: revenueMinor > 0 ? Math.round((resultMinor / revenueMinor) * 100) : null,
  };
}
