/**
 * Geldarithmetik.
 *
 * ⚠️ Portiert aus `bautakt-app/app/lib/finance/money.ts` (Stand 2026-09-23).
 * Die Mobile-App ist kanonisch: weicht hier etwas ab, wird es ZUERST dort
 * geprueft und dann uebernommen. Beide Apps rechnen auf demselben Datenbestand
 * — zwei Rundungsregeln hiesse, dass dieselbe Rechnung am Handy und am Rechner
 * unterschiedliche Betraege zeigt, und das merkt die Buchhaltung zuerst.
 *
 * Grundregel: Betraege sind IMMER ganzzahlige Minor Units (Cent). Niemals
 * Fliesskomma fuer Geld.
 */

export type CurrencyCode = 'EUR' | 'CHF';

export type Money = {
  /** Betrag in Minor Units (Cent). */
  amount: number;
  currency: CurrencyCode;
};

export function toMinorUnits(major: number): number {
  if (!Number.isFinite(major)) return 0;
  return Math.round(major * 100);
}

export function fromMinorUnits(minor: number): number {
  return minor / 100;
}

/**
 * DB-Grenze: numerischer Euro-Wert aus Postgres → Minor Units.
 *
 * Toleranter als `toMinorUnits`, weil PostgREST je nach Spalte `number`,
 * `string`, `null` oder `''` liefert. Alles Unlesbare wird zu 0.
 */
export function eurosToMinor(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? toMinorUnits(parsed) : 0;
}

/** DB-Grenze: Minor Units → numerischer Euro-Wert fuer Postgres. */
export function minorToEuros(minor: number): number {
  return fromMinorUnits(Number.isFinite(minor) ? minor : 0);
}

/** Kaufmaennische Rundung: halbe Werte vom Nullpunkt weg. */
export function roundHalfAwayFromZero(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value >= 0 ? Math.round(value) : -Math.round(-value);
}

export function addMoney(...amounts: number[]): number {
  return amounts.reduce((sum, amount) => sum + (Number.isFinite(amount) ? amount : 0), 0);
}

export function subtractMoney(a: number, b: number): number {
  return (Number.isFinite(a) ? a : 0) - (Number.isFinite(b) ? b : 0);
}

/** Minor Units mal Menge (darf gebrochen sein); Ergebnis gerundet. */
export function multiplyMoney(minorUnits: number, quantity: number): number {
  if (!Number.isFinite(minorUnits) || !Number.isFinite(quantity)) return 0;
  return roundHalfAwayFromZero(minorUnits * quantity);
}

/** Prozent als Zahl, also 19 fuer 19 %. Ergebnis kaufmaennisch gerundet. */
export function percentOf(minorUnits: number, percent: number): number {
  if (!Number.isFinite(minorUnits) || !Number.isFinite(percent)) return 0;
  return roundHalfAwayFromZero((minorUnits * percent) / 100);
}

/**
 * Nettobetraege je Steuersatz summieren, dann die USt je Gruppe berechnen.
 *
 * ⚠️ Die USt wird einmal pro Steuersatzgruppe gerundet, nie pro Zeile. Pro
 * Zeile gerundet weicht die Summe bei vielen Positionen um Cent-Betraege ab —
 * und eine Rechnung, deren Summe nicht aufgeht, ist nicht nur haesslich,
 * sondern formal angreifbar.
 */
export function vatByRateGroups(
  lines: { netMinor: number; taxRatePercent: number }[],
): { rate: number; netMinor: number; vatMinor: number }[] {
  const byRate = new Map<number, number>();
  for (const line of lines) {
    const rate = Number.isFinite(line.taxRatePercent) ? line.taxRatePercent : 0;
    const net = Number.isFinite(line.netMinor) ? line.netMinor : 0;
    byRate.set(rate, (byRate.get(rate) ?? 0) + net);
  }
  return [...byRate.entries()]
    .sort(([a], [b]) => a - b)
    .map(([rate, netMinor]) => ({ rate, netMinor, vatMinor: percentOf(netMinor, rate) }));
}

export function documentTotals(lines: { netMinor: number; taxRatePercent: number }[]): {
  netMinor: number;
  vatMinor: number;
  grossMinor: number;
  byRate: ReturnType<typeof vatByRateGroups>;
} {
  const byRate = vatByRateGroups(lines);
  const netMinor = byRate.reduce((sum, group) => sum + group.netMinor, 0);
  const vatMinor = byRate.reduce((sum, group) => sum + group.vatMinor, 0);
  return { netMinor, vatMinor, grossMinor: netMinor + vatMinor, byRate };
}

export function formatMoney(
  minorUnits: number,
  currency: CurrencyCode = 'EUR',
  locale = 'de-DE',
): string {
  return fromMinorUnits(minorUnits).toLocaleString(locale, { style: 'currency', currency });
}

/** Deutsche Eingabe wie „1.234,56", „1234,56" oder „1234.56" als Minor Units. */
export function parseMoneyInput(value: string): number | null {
  const trimmed = value.trim().replace(/\s/g, '');
  if (!trimmed) return null;
  // Komma gewinnt: wer „1.234,56" tippt, meint den Punkt als Tausendertrenner.
  const normalized = trimmed.includes(',') ? trimmed.replace(/\./g, '').replace(',', '.') : trimmed;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return toMinorUnits(parsed);
}

export function currencyForCountry(countryIso: string | null | undefined): CurrencyCode {
  return countryIso === 'CH' ? 'CHF' : 'EUR';
}

/** Kurzes Waehrungszeichen fuer Feldbeschriftungen, nicht fuer Betraege. */
export function currencySymbol(currency: CurrencyCode = 'EUR'): string {
  return currency === 'CHF' ? 'CHF' : '€';
}
