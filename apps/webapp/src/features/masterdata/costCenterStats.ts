import { eurosToMinor, minorToEuros } from '@bautakt/finance';

/**
 * Kennzahl je Kostenstelle aus den verknuepften Auftraegen.
 *
 * Es gibt keine Buchungsspalte auf `cost_centers`. „Gebucht“ meint im übrigen
 * Produkt eine Zahlung oder eine nicht-kalkulatorische Ausgabe — beides haengt
 * nicht an der Kostenstelle, und die Lese-Policies verlangen Finanzrechte.
 * Gezaehlt wird deshalb jeder Auftrag mit `cost_center_id`, summiert wird
 * `orders.contract_sum`. Fehlt die Summe, bleibt das Feld leer statt 0.
 * Siehe wiki/pages/kostenstellen.md.
 */
export type CostCenterOrderSlice = {
  cost_center_id: string | null;
  contract_sum: number | string | null;
};

export type CostCenterStats = {
  orderCount: number;
  /** Euro, kaufmaennisch auf Cent gerundet. `null`, wenn kein Auftrag eine Summe traegt. */
  contractSum: number | null;
};

export function aggregateCostCenterStats(
  orders: readonly CostCenterOrderSlice[],
): Map<string, CostCenterStats> {
  const buckets = new Map<string, { orderCount: number; minor: number; hasSum: boolean }>();

  for (const order of orders) {
    const costCenterId = order.cost_center_id;
    if (!costCenterId) continue;

    const bucket = buckets.get(costCenterId) ?? { orderCount: 0, minor: 0, hasSum: false };
    bucket.orderCount += 1;

    const minor = contractSumMinor(order.contract_sum);
    if (minor !== null) {
      bucket.minor += minor;
      bucket.hasSum = true;
    }

    buckets.set(costCenterId, bucket);
  }

  const stats = new Map<string, CostCenterStats>();
  for (const [id, bucket] of buckets) {
    stats.set(id, {
      orderCount: bucket.orderCount,
      contractSum: bucket.hasSum ? minorToEuros(bucket.minor) : null,
    });
  }
  return stats;
}

/** `null`, wenn keine Auftragssumme hinterlegt ist. `eurosToMinor` macht aus `null` eine 0. */
function contractSumMinor(value: number | string | null): number | null {
  if (value === null || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return eurosToMinor(parsed);
}
