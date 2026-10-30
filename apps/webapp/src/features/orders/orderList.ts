/** Filter der Auftragsliste. Default ohne Query ist `running`. */
export type OrderFilter = 'all' | 'running' | 'finished';

/** Wert von `?status=` je Filter. `running` ist der Default und steht nicht in der URL. */
const FILTER_PARAM: Record<Exclude<OrderFilter, 'running'>, string> = {
  all: 'alle',
  finished: 'abgeschlossen',
};

/**
 * `?status=alle` und `?status=abgeschlossen` wählen den Filter. Alles
 * andere, auch fehlend oder der alte Angebote-Link `?status=quote`, ist
 * Laufend.
 */
export function orderFilterFromSearch(value: string | null): OrderFilter {
  if (value === FILTER_PARAM.all) return 'all';
  if (value === FILTER_PARAM.finished) return 'finished';
  return 'running';
}

export function orderFilterParam(filter: OrderFilter): string | null {
  return filter === 'running' ? null : FILTER_PARAM[filter];
}

/**
 * Ob ein Auftrag unter dem Filter erscheint.
 *
 * `finished` ist abgeschlossen. `quote` und `declined` stammen aus der
 * früheren Angebote-Ansicht und stehen nur unter Alle. Jeder andere
 * Status läuft (`active` und Unbekanntes).
 */
export function matchesOrderFilter(status: string, filter: OrderFilter): boolean {
  if (filter === 'all') return true;
  if (status === 'quote' || status === 'declined') return false;
  return (status === 'finished') === (filter === 'finished');
}
