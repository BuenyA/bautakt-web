import { entryMinutes, type LaborRateRow, type LaborTimeEntry, resolveCostRate } from './laborCost';
import { eurosToMinor } from './money';
import { INVOICE_TYPES, ISSUED_STATUSES, type SalesDocumentRow } from './receivables';

/**
 * Finanzen eines Auftrags: Kosten und Abgerechnetes gegen die Auftragssumme.
 *
 * Kostenquellen wie der Finanz-Teaser der Handy-App
 * (`lib/finance/analytics/orderTeaserKpis.ts`): Material (Menge × EK),
 * Ausgaben am Auftrag ohne kalkulatorische, Lohn (Stunden × Kostensatz).
 * Zusätzlich zählen Eingangsrechnungen mit `order_id` — sie sind Kosten des
 * Auftrags, die App rechnet sie dort (Stand 2026-10-30) noch nicht mit.
 *
 * Alles netto: Kosten sind netto erfasst, und die Umsatzsteuer ist
 * durchlaufendes Geld. Die App zeigt im Teaser die Einnahmen brutto.
 */

/** Ausschnitt aus `order_materials`. */
export type OrderMaterialCostRow = {
  quantity: number | null;
  unit_cost: number | null;
};

/** Ausschnitt aus `expenses`, bereits auf den Auftrag gefiltert. */
export type OrderExpenseRow = {
  amount_net: number | null;
  is_calculatory: boolean;
};

/** Ausschnitt aus `incoming_invoices`, bereits auf den Auftrag gefiltert. */
export type OrderIncomingRow = {
  net_total: number | null;
};

export type OrderFinanceInput = {
  /** `orders.contract_sum`; `null`, wenn keine hinterlegt ist. */
  contractSum: number | null;
  /** Belege mit mindestens einer Position am Auftrag. */
  documents: readonly SalesDocumentRow[];
  materials: readonly OrderMaterialCostRow[];
  expenses: readonly OrderExpenseRow[];
  incoming: readonly OrderIncomingRow[];
  /** Zeiten des Auftrags und Sätze. `null` ohne Recht auf Lohnkosten. */
  labor: { entries: readonly LaborTimeEntry[]; rates: readonly LaborRateRow[] } | null;
};

/** Ab diesem Anteil der Auftragssumme warnt die Kostenleiste. */
export const ORDER_COST_WARNING_PERCENT = 90;

export type OrderCostLevel = 'ok' | 'warning' | 'danger';

export type OrderFinance = {
  contractMinor: number | null;
  materialMinor: number;
  /** `null`, wenn Lohn nicht gerechnet wurde. */
  laborMinor: number | null;
  /** Ausgaben und Eingangsrechnungen am Auftrag. */
  otherMinor: number;
  costMinor: number;
  /** Netto ausgestellter Rechnungen. */
  billedMinor: number;
  /** Auftragssumme − abgerechnet, nie unter 0; `null` ohne Auftragssumme. */
  openMinor: number | null;
  /** Abgerechnet − Kosten. */
  resultMinor: number;
  /** Kosten in Prozent der Auftragssumme, ganzzahlig; `null` ohne Summe. */
  costPercent: number | null;
  billedPercent: number | null;
  costLevel: OrderCostLevel;
};

function percent(part: number, whole: number | null): number | null {
  if (whole === null || whole <= 0) return null;
  return Math.round((part / whole) * 100);
}

export function orderCostLevel(costPercent: number | null): OrderCostLevel {
  if (costPercent === null) return 'ok';
  if (costPercent > 100) return 'danger';
  if (costPercent >= ORDER_COST_WARNING_PERCENT) return 'warning';
  return 'ok';
}

/** Lohnkosten in Cent über alle Zeiten, ohne Zeitraum. */
export function orderLaborMinor(
  entries: readonly LaborTimeEntry[],
  rates: readonly LaborRateRow[],
): number {
  return entries.reduce(
    (sum, entry) => sum + eurosToMinor((entryMinutes(entry) / 60) * resolveCostRate(entry, rates)),
    0,
  );
}

export function computeOrderFinance(input: OrderFinanceInput): OrderFinance {
  const contractMinor =
    input.contractSum === null || !Number.isFinite(Number(input.contractSum))
      ? null
      : eurosToMinor(Number(input.contractSum));

  const materialMinor = input.materials.reduce(
    (sum, row) =>
      row.unit_cost == null
        ? sum
        : sum + eurosToMinor(Number(row.quantity ?? 0) * Number(row.unit_cost)),
    0,
  );
  const laborMinor = input.labor ? orderLaborMinor(input.labor.entries, input.labor.rates) : null;
  const otherMinor =
    input.expenses
      .filter((row) => !row.is_calculatory)
      .reduce((sum, row) => sum + eurosToMinor(Number(row.amount_net ?? 0)), 0) +
    input.incoming.reduce((sum, row) => sum + eurosToMinor(Number(row.net_total ?? 0)), 0);
  const costMinor = materialMinor + (laborMinor ?? 0) + otherMinor;

  const billedMinor = input.documents
    .filter((doc) => INVOICE_TYPES.has(doc.type) && ISSUED_STATUSES.has(doc.status))
    .reduce((sum, doc) => sum + eurosToMinor(Number(doc.net_total ?? 0)), 0);

  const costPercent = percent(costMinor, contractMinor);

  return {
    contractMinor,
    materialMinor,
    laborMinor,
    otherMinor,
    costMinor,
    billedMinor,
    openMinor: contractMinor === null ? null : Math.max(0, contractMinor - billedMinor),
    resultMinor: billedMinor - costMinor,
    costPercent,
    billedPercent: percent(billedMinor, contractMinor),
    costLevel: orderCostLevel(costPercent),
  };
}
