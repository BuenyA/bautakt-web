/**
 * Optionaler Deep-Link `?status=`. Die Belegliste hat keine Filter-Reiter
 * (weder Status noch Art), der Param bleibt für Links aus der Übersicht.
 */
export type InvoiceStatusFilter = 'all' | 'open' | 'overdue' | 'draft' | 'paid';

const OPEN_STATUSES = new Set(['issued', 'sent', 'partially_paid', 'overdue']);

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
