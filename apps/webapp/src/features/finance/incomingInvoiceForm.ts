/**
 * Regeln des Formulars „Eingangsrechnung“ (bautakt-web#88), ohne React und
 * ohne Supabase, damit sie mit `node --test` laufen.
 *
 * Beträge kommen in Cent herein; das Parsen der Eingabe macht das Formular
 * mit `parseMoneyInput`. `null` heißt: Feld leer oder nicht lesbar.
 *
 * Die verbindliche Grenze sind die Trigger der Datenbank
 * (`enforce_incoming_invoice_retention`): Ein erfasster Beleg wird nicht
 * gelöscht und nicht wieder zum Entwurf. Das Formular bietet nur an, was dort
 * durchgeht.
 */

export const INCOMING_INVOICE_STATUSES = [
  'draft',
  'open',
  'partially_paid',
  'paid',
  'overdue',
] as const;

export type IncomingInvoiceStatus = (typeof INCOMING_INVOICE_STATUSES)[number];

export type IncomingInvoiceFields = {
  vendorName: string;
  invoiceDate: string;
  dueDate: string;
  netMinor: number | null;
  vatMinor: number | null;
  grossMinor: number | null;
};

/** Schlüssel unter `domain:incomingInvoiceForm.errors`. */
export type IncomingInvoiceError =
  | 'vendorRequired'
  | 'dateRequired'
  | 'dueRequired'
  | 'netRequired'
  | 'vatRequired'
  | 'grossRequired'
  | 'negativeAmount'
  | 'sumMismatch'
  | 'dueBeforeDate';

/**
 * Fehler in der Reihenfolge der Felder.
 *
 * Ein Entwurf darf unvollständig sein (er entsteht oft aus einem Upload, bevor
 * jemand die Felder liest). Was eingetragen ist, muss aber stimmen: Netto + USt
 * = Brutto auf den Cent, keine negativen Beträge. Ab „offen“ sind Lieferant,
 * Datum, Fälligkeit und alle drei Beträge Pflicht.
 */
export function validateIncomingInvoice(
  fields: IncomingInvoiceFields,
  status: IncomingInvoiceStatus,
): IncomingInvoiceError[] {
  const errors: IncomingInvoiceError[] = [];
  const complete = status !== 'draft';

  if (complete) {
    if (!fields.vendorName.trim()) errors.push('vendorRequired');
    if (!fields.invoiceDate) errors.push('dateRequired');
    if (!fields.dueDate) errors.push('dueRequired');
    if (fields.netMinor === null) errors.push('netRequired');
    if (fields.vatMinor === null) errors.push('vatRequired');
    if (fields.grossMinor === null) errors.push('grossRequired');
  }

  const amounts = [fields.netMinor, fields.vatMinor, fields.grossMinor];
  if (amounts.some((amount) => amount !== null && amount < 0)) errors.push('negativeAmount');

  const [net, vat, gross] = amounts;
  if (net !== null && vat !== null && gross !== null && net + vat !== gross) {
    errors.push('sumMismatch');
  }

  // ISO-Daten (YYYY-MM-DD) vergleichen sich als Text richtig.
  if (fields.invoiceDate && fields.dueDate && fields.dueDate < fields.invoiceDate) {
    errors.push('dueBeforeDate');
  }

  return errors;
}

/**
 * Brutto aus Netto und USt, wenn genau Brutto fehlt. So muss niemand rechnen,
 * und die Summe stimmt per Konstruktion. Sonst bleibt Brutto, wie es ist.
 */
export function suggestGross(fields: IncomingInvoiceFields): number | null {
  if (fields.grossMinor !== null) return fields.grossMinor;
  if (fields.netMinor === null || fields.vatMinor === null) return null;
  return fields.netMinor + fields.vatMinor;
}

/** Status, die das Formular anbietet. Ein erfasster Beleg wird nie wieder Entwurf. */
export function statusOptions(savedStatus: IncomingInvoiceStatus | null): IncomingInvoiceStatus[] {
  if (savedStatus === null || savedStatus === 'draft') return [...INCOMING_INVOICE_STATUSES];
  return INCOMING_INVOICE_STATUSES.filter((status) => status !== 'draft');
}

/**
 * Felder bearbeiten nur im Entwurf (Owner, bautakt-web#88). Ein erfasster Beleg
 * ist aufbewahrungspflichtig; an ihm ändert sich nur noch der Status.
 */
export function canEditFields(savedStatus: IncomingInvoiceStatus | null): boolean {
  return savedStatus === null || savedStatus === 'draft';
}

/** Löschen nur im Entwurf; sonst lehnt der Trigger mit `RETAINED_RECEIPT` ab. */
export function canDelete(savedStatus: IncomingInvoiceStatus | null): boolean {
  return savedStatus === 'draft';
}

export function isIncomingInvoiceStatus(value: string): value is IncomingInvoiceStatus {
  return (INCOMING_INVOICE_STATUSES as readonly string[]).includes(value);
}
