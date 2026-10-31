/** Straße, PLZ und Ort in einer Zeile; leere Teile fallen weg. */
export function orderAddress(order: {
  street_address: string | null;
  postal_code: string | null;
  city: string | null;
}): string {
  return [order.street_address, [order.postal_code, order.city].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
}

/** „01.10.2026 – 30.11.2026“, mit nur einem Datum dieses allein, ohne beide leer. */
export function orderPeriod(start: string, end: string): string {
  if (start && end) return `${start} – ${end}`;
  return start || end;
}
