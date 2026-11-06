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

/** Status eines Auftrags, wie die Oberfläche ihn kennt. */
export type OrderStatus = 'active' | 'finished';

/**
 * Datenbankwert auf den Anzeigestatus abbilden, wie in der App
 * (`toOrderStatus`, bautakt-app#184).
 *
 * Angebote sind kein Auftragsstatus mehr, sie haben eigene Tabellen. Die
 * Altwerte `quote` und `declined` kennt die Datenbank noch bis zur Migration
 * `ang_quote_legacy_drop`. Sie gehen nicht verloren: `quote` läuft,
 * `declined` ist abgeschlossen. Unbekanntes läuft.
 */
export function toOrderStatus(status: string): OrderStatus {
  return status === 'finished' || status === 'declined' ? 'finished' : 'active';
}

/** Ob ein Auftrag unter dem Filter erscheint. */
export function matchesOrderFilter(status: string, filter: OrderFilter): boolean {
  if (filter === 'all') return true;
  return (toOrderStatus(status) === 'finished') === (filter === 'finished');
}
