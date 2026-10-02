/** Chip-Werte der Kundenliste. Default ohne Query ist `all`. */
export type CustomerListFilter = 'all' | 'company' | 'private';

/**
 * Chip-Schlüssel der Handy-Liste (Alle / Firmen / Privat).
 *
 * Gespeichert ist `customer_type` als `b2b` oder `b2c`
 * (`customers_customer_type_check`). `company` ist die Firma, `private`
 * der Privatkunde.
 */
export function customerFilterFromSearch(value: string | null): CustomerListFilter {
  if (value === 'company' || value === 'private' || value === 'all') return value;
  return 'all';
}

export function matchesCustomerFilter(
  row: { customer_type: string },
  filter: CustomerListFilter,
): boolean {
  if (filter === 'company') return row.customer_type === 'b2b';
  if (filter === 'private') return row.customer_type === 'b2c';
  return true;
}
