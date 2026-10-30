/**
 * Steueraufteilung einer Eingangsrechnung (bautakt-web#168, Eingang), ohne
 * React und ohne Supabase, damit sie mit `node --test` läuft.
 *
 * Je Steuerart und Satz eine Zeile mit Netto und ausgewiesener Steuer
 * (`incoming_invoice_tax_lines`, bautakt-app
 * 20261030230000_b_incoming_invoice_tax_lines). Die verbindliche Grenze ziehen
 * `set_incoming_invoice_tax_lines` und der Trigger beim Erfassen: Summe =
 * Kopf auf den Cent, nach dem Erfassen gesperrt. Hier steht, was das Formular
 * anbietet und vorab prüft.
 *
 * Die meisten Rechnungen haben einen Satz. Dann wählt man nur die Steuerart;
 * Netto und Steuer sind die aus dem Kopf. Erst bei mehreren Sätzen stehen
 * Beträge je Zeile im Formular.
 *
 * Beträge in Cent.
 */

import type { IncomingInvoiceStatus } from './incomingInvoiceForm.ts';

export const INCOMING_TAX_MODES = [
  'standard',
  'reverse_charge',
  'tax_free',
  'small_business',
] as const;

export type IncomingTaxMode = (typeof INCOMING_TAX_MODES)[number];

/** Steuerart und Satz, z. B. `standard|19`. */
export type TaxKind = `${IncomingTaxMode}|${number}`;

/**
 * Was das Formular anbietet. §13b mit 19 %: Bauleistungen tragen den
 * Regelsatz, den der Empfänger schuldet.
 */
export const TAX_KIND_OPTIONS: readonly TaxKind[] = [
  'standard|19',
  'standard|7',
  'reverse_charge|19',
  'tax_free|0',
  'small_business|0',
];

export function taxKind(mode: IncomingTaxMode, rate: number): TaxKind {
  return `${mode}|${rate}`;
}

export function parseTaxKind(kind: string): { mode: IncomingTaxMode; rate: number } | null {
  const [mode, rateText, ...rest] = kind.split('|');
  const rate = Number(rateText);
  if (rest.length > 0 || rateText === '' || !Number.isFinite(rate)) return null;
  if (!(INCOMING_TAX_MODES as readonly string[]).includes(mode)) return null;
  return { mode: mode as IncomingTaxMode, rate };
}

/** Eine Zeile aus der Datenbank, Beträge in Cent. */
export type TaxLine = { kind: TaxKind; netMinor: number; vatMinor: number };

/** Eine Zeile im Formular; Beträge nur bei mehreren Sätzen, sonst `null`. */
export type TaxLineDraft = {
  kind: TaxKind | null;
  netMinor: number | null;
  vatMinor: number | null;
};

/** Steuer zu Netto und Satz, kaufmännisch gerundet wie `round(…, 2)` in Postgres. */
export function vatFor(netMinor: number, rate: number): number {
  const exact = (netMinor * rate) / 100;
  return exact >= 0 ? Math.round(exact) : -Math.round(-exact);
}

/**
 * Steuerart aus dem Kopf erraten, wie die Datenbank beim Erfassen ohne
 * Zeilen: nur 19 % oder 7 % auf den Cent. 0 € Steuer bleibt offen (§13b,
 * steuerfrei oder Kleinunternehmer), da wird nichts geraten.
 */
export function guessTaxKind(netMinor: number | null, vatMinor: number | null): TaxKind | null {
  if (netMinor === null || vatMinor === null || netMinor <= 0 || vatMinor <= 0) return null;
  for (const rate of [19, 7]) {
    if (vatFor(netMinor, rate) === vatMinor) return taxKind('standard', rate);
  }
  return null;
}

/** Schlüssel unter `domain:incomingTaxLines.errors`. */
export type TaxLinesError =
  'kindRequired' | 'amountRequired' | 'duplicate' | 'vatNotAllowed' | 'vatMissing' | 'sumMismatch';

/**
 * Fehler der Aufteilung. Im Entwurf darf sie fehlen oder unvollständig sein;
 * was gespeichert wird, muss aber gültig sein. Beim Erfassen muss jede Zeile
 * eine Steuerart haben und die Summe zum Kopf passen.
 *
 * `vatMissing`: Steuer 0 bei Regelsteuer ist fast immer eine falsch gewählte
 * Steuerart (§13b, steuerfrei, Kleinunternehmer).
 */
export function validateTaxLines(
  lines: TaxLineDraft[],
  header: { netMinor: number | null; vatMinor: number | null },
  status: IncomingInvoiceStatus,
): TaxLinesError[] {
  const errors = new Set<TaxLinesError>();
  const complete = status !== 'draft';
  const single = lines.length === 1;

  const resolved = lines.map((line) =>
    single ? { ...line, netMinor: header.netMinor, vatMinor: header.vatMinor } : line,
  );

  const seen = new Set<string>();
  for (const line of resolved) {
    if (line.kind === null) {
      if (complete) errors.add('kindRequired');
      continue;
    }
    if (seen.has(line.kind)) errors.add('duplicate');
    seen.add(line.kind);

    if (line.netMinor === null || line.vatMinor === null) {
      if (complete || !single) errors.add('amountRequired');
      continue;
    }
    const parsed = parseTaxKind(line.kind);
    if (parsed && parsed.mode !== 'standard' && line.vatMinor !== 0) errors.add('vatNotAllowed');
    if (parsed && parsed.mode === 'standard' && line.netMinor > 0 && line.vatMinor === 0) {
      errors.add('vatMissing');
    }
  }

  if (complete && lines.length > 1 && header.netMinor !== null && header.vatMinor !== null) {
    const net = resolved.reduce((sum, line) => sum + (line.netMinor ?? 0), 0);
    const vat = resolved.reduce((sum, line) => sum + (line.vatMinor ?? 0), 0);
    if (net !== header.netMinor || vat !== header.vatMinor) errors.add('sumMismatch');
  }

  return [...errors];
}

/**
 * Weicht die ausgewiesene Steuer vom Satz ab? Nur ein Hinweis: Rundet der
 * Lieferant je Position, kann die Steuer einige Cent anders sein. Gebucht
 * wird, was auf der Rechnung steht.
 */
export function vatDeviation(line: TaxLine): number {
  const parsed = parseTaxKind(line.kind);
  if (!parsed || parsed.mode !== 'standard') return 0;
  return line.vatMinor - vatFor(line.netMinor, parsed.rate);
}

/** Was `set_incoming_invoice_tax_lines` bekommt; Beträge in Euro. */
export type TaxLinePayload = {
  tax_mode: IncomingTaxMode;
  tax_rate_percent: number;
  net_amount: number;
  vat_amount: number;
};

/**
 * Zeilen für die Datenbank. Bei einem Satz kommen Netto und Steuer aus dem
 * Kopf. Zeilen ohne Steuerart oder ohne Beträge (Entwurf) fallen weg.
 */
export function taxLinesPayload(
  lines: TaxLineDraft[],
  header: { netMinor: number | null; vatMinor: number | null },
): TaxLinePayload[] {
  const single = lines.length === 1;
  const payload: TaxLinePayload[] = [];
  for (const line of lines) {
    const netMinor = single ? header.netMinor : line.netMinor;
    const vatMinor = single ? header.vatMinor : line.vatMinor;
    const parsed = line.kind === null ? null : parseTaxKind(line.kind);
    if (!parsed || netMinor === null || vatMinor === null) continue;
    payload.push({
      tax_mode: parsed.mode,
      tax_rate_percent: parsed.rate,
      net_amount: netMinor / 100,
      vat_amount: vatMinor / 100,
    });
  }
  return payload;
}

/**
 * Formularzeilen aus dem Gespeicherten. Ohne gespeicherte Zeilen eine Zeile,
 * die Steuerart aus dem Kopf erraten (oder offen).
 */
export function initialTaxLines(
  stored: TaxLine[],
  header: { netMinor: number | null; vatMinor: number | null },
): TaxLineDraft[] {
  if (stored.length === 0) {
    return [
      { kind: guessTaxKind(header.netMinor, header.vatMinor), netMinor: null, vatMinor: null },
    ];
  }
  if (stored.length === 1) return [{ kind: stored[0].kind, netMinor: null, vatMinor: null }];
  return stored.map((line) => ({ ...line }));
}
