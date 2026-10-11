import { toIsoDate } from './dates';
import { eurosToMinor } from './money';

/**
 * Lohnkosten fuer Kennzahlen: Stunden × Kostensatz.
 *
 * Dieselbe Regel wie die Handy-App (`lib/finance/analytics/laborCost.ts`):
 * zuerst der am Zeiteintrag gestempelte `cost_rate`, sonst die Kaskade ueber
 * `labor_rates` (Auftrag → Mitarbeiter → Firma). Die Rollenstufe der App
 * entfaellt hier, weil die Web-App keine Rollenzuordnung laedt; sie faellt
 * dann auf den Firmensatz zurueck.
 */

/** Ausschnitt aus `time_entries`. */
export type LaborTimeEntry = {
  started_at: string;
  ended_at: string | null;
  break_minutes: number | null;
  cost_rate: number | null;
  employment_id: string | null;
  order_id: string | null;
};

/** Ausschnitt aus `labor_rates`. Saetze in Euro je Stunde. */
export type LaborRateRow = {
  scope: string;
  cost_rate: number;
  order_id: string | null;
  employment_id: string | null;
  valid_from: string;
  valid_to: string | null;
};

/**
 * Firmenstandard, wenn gar kein Satz greift — wie `DEFAULT_COMPANY_LABOR_RATE`
 * der App. 0 €/h waere die schlimmere Antwort: die Stunden verschwaenden
 * stillschweigend aus den Kosten.
 */
export const DEFAULT_COST_RATE = 38;

/** Kalendertag eines Zeitstempels in der Ortszeit — nicht der UTC-Tag aus dem String. */
function localDay(timestamp: string): string {
  return toIsoDate(new Date(timestamp));
}

/** Netto-Arbeitsminuten; laufende Eintraege (ohne Ende) zaehlen nicht. */
export function entryMinutes(entry: LaborTimeEntry): number {
  if (!entry.ended_at) return 0;
  const gross = Math.round(
    (new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()) / 60_000,
  );
  return Math.max(0, Math.max(0, gross) - (entry.break_minutes ?? 0));
}

/** Kostensatz eines Eintrags in Euro je Stunde. */
export function resolveCostRate(entry: LaborTimeEntry, rates: readonly LaborRateRow[]): number {
  if (entry.cost_rate != null && Number.isFinite(Number(entry.cost_rate))) {
    return Number(entry.cost_rate);
  }

  const onDate = localDay(entry.started_at);
  const valid = rates
    .filter((rate) => rate.valid_from <= onDate && (!rate.valid_to || rate.valid_to > onDate))
    // Saetze sind historisiert: der juengste gueltige gewinnt.
    .sort((a, b) => b.valid_from.localeCompare(a.valid_from));

  const match =
    (entry.order_id &&
      valid.find((rate) => rate.scope === 'order' && rate.order_id === entry.order_id)) ||
    (entry.employment_id &&
      valid.find(
        (rate) => rate.scope === 'employment' && rate.employment_id === entry.employment_id,
      )) ||
    valid.find((rate) => rate.scope === 'company');

  return match ? Number(match.cost_rate) : DEFAULT_COST_RATE;
}

/** Lohnkosten in Cent fuer Eintraege, deren Start in [fromIso, toIso] liegt. */
export function laborCostMinor(
  entries: readonly LaborTimeEntry[],
  rates: readonly LaborRateRow[],
  fromIso: string,
  toIso: string,
): number {
  let total = 0;
  for (const entry of entries) {
    const day = localDay(entry.started_at);
    if (day < fromIso || day > toIso) continue;
    total += eurosToMinor((entryMinutes(entry) / 60) * resolveCostRate(entry, rates));
  }
  return total;
}
