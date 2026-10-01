import { INVOICE_TYPE_LIST } from './useSalesDocuments';

/** Chip-Werte der Belegliste. Default ohne Query ist `invoice`. */
export type InvoiceTypeFilter = 'invoice' | 'order_confirmation' | 'delivery' | 'all';

/**
 * Optionaler Deep-Link `?status=`. Die Handy-Hauptliste hat dafür keine
 * Chips — die Web-Status-Tabs sind deshalb weg, der Param bleibt.
 */
export type InvoiceStatusFilter = 'all' | 'open' | 'overdue' | 'draft' | 'paid';

const OPEN_STATUSES = new Set(['issued', 'sent', 'partially_paid', 'overdue']);

/** Abschlag und Schluss sind Rechnungen. Eigene Chips hat die App nicht. */
const INVOICE_CHIP_TYPES = new Set<string>(INVOICE_TYPE_LIST);

export function invoiceTypeFromSearch(value: string | null): InvoiceTypeFilter {
  if (
    value === 'invoice' ||
    value === 'order_confirmation' ||
    value === 'delivery' ||
    value === 'all'
  ) {
    return value;
  }
  return 'invoice';
}

/**
 * `delivery` ist der Chip-Schlüssel, gespeichert ist `delivery_note`.
 * `all` lässt die geladenen Belegarten durch — die Abfrage holt nur die
 * Arten dieser Liste, nicht Angebote, Gutschriften oder Stornos.
 */
export function matchesInvoiceType(type: string, filter: InvoiceTypeFilter): boolean {
  switch (filter) {
    case 'invoice':
      return INVOICE_CHIP_TYPES.has(type);
    case 'order_confirmation':
      return type === 'order_confirmation';
    case 'delivery':
      return type === 'delivery_note';
    default:
      return true;
  }
}

export function invoiceStatusFromSearch(value: string | null): InvoiceStatusFilter {
  switch (value) {
    case 'offen':
      return 'open';
    case 'ueberfaellig':
      return 'overdue';
    case 'entwurf':
      return 'draft';
    case 'bezahlt':
      return 'paid';
    default:
      return 'all';
  }
}

export function matchesInvoiceStatus(
  document: { status: string },
  filter: InvoiceStatusFilter,
): boolean {
  switch (filter) {
    case 'open':
      return OPEN_STATUSES.has(document.status);
    case 'overdue':
      return document.status === 'overdue';
    case 'draft':
      return document.status === 'draft';
    case 'paid':
      return document.status === 'paid';
    default:
      return true;
  }
}
