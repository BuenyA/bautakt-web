const dateFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** Datum aus ISO-String oder null. Leere Werte bleiben leer, kein Platzhalter-Gedankenstrich. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return dateFormatter.format(date);
}

const currencyFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
});

export function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '';
  return currencyFormatter.format(value);
}
