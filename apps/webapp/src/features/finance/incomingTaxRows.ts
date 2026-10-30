/**
 * Zeilen der Steueraufteilung im Formular (bautakt-web#168): Beträge als
 * Eingabetext, Umrechnung von und nach `TaxLineDraft` (Cent).
 */

import { formatMoneyInput, fromMinorUnits, parseMoneyInput } from '@bautakt/finance';

import type { TaxKind, TaxLineDraft } from './incomingTaxLines';

/** Eine Zeile im Formular; Beträge als Eingabetext, nur bei mehreren Sätzen. */
export type TaxRow = { kind: TaxKind | null; net: string; vat: string };

export const toInput = (minor: number | null) =>
  minor === null ? '' : formatMoneyInput(fromMinorUnits(minor));

export function taxRows(lines: TaxLineDraft[]): TaxRow[] {
  return lines.map((line) => ({
    kind: line.kind,
    net: toInput(line.netMinor),
    vat: toInput(line.vatMinor),
  }));
}

export function taxDrafts(rows: TaxRow[]): TaxLineDraft[] {
  return rows.map((row) => ({
    kind: row.kind,
    netMinor: parseMoneyInput(row.net),
    vatMinor: parseMoneyInput(row.vat),
  }));
}
