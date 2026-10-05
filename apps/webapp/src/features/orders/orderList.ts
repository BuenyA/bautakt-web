/** Art der Auftragsliste. Default ohne Query ist `order`. */
export type OrderKind = 'order' | 'quote';

export type OrderSection = 'running' | 'finished' | 'quotes' | 'declined';

/**
 * `?status=quote` ist der bisherige Angebote-Tab. Alles andere, auch
 * fehlend, ist Aufträge — der Default der Handy-App.
 */
export function orderKindFromSearch(value: string | null): OrderKind {
  return value === 'quote' ? 'quote' : 'order';
}

/**
 * Sektion innerhalb der Art. Die andere Art liefert `null` und fällt
 * aus der Liste.
 *
 * Aufträge: `finished` ist abgeschlossen, jeder andere Status, der kein
 * Angebot und nicht abgelehnt ist, läuft (`active` und Unbekanntes).
 * Angebote: `quote` ist offen, `declined` ist abgelehnt.
 */
export function orderSection(status: string, kind: OrderKind): OrderSection | null {
  if (kind === 'quote') {
    if (status === 'quote') return 'quotes';
    if (status === 'declined') return 'declined';
    return null;
  }
  if (status === 'quote' || status === 'declined') return null;
  if (status === 'finished') return 'finished';
  return 'running';
}

const SECTION_RANK: Record<OrderSection, number> = {
  running: 0,
  finished: 1,
  quotes: 0,
  declined: 1,
};

/**
 * Laufend vor abgeschlossen, offene Angebote vor abgelehnt. Innerhalb
 * der Sektion die neuesten zuerst (`created_at`), wie die Liste bisher
 * und wie „Recent“ in der App.
 */
export function compareOrdersForKind<T extends { status: string; created_at: string }>(
  kind: OrderKind,
  a: T,
  b: T,
): number {
  const sectionA = orderSection(a.status, kind);
  const sectionB = orderSection(b.status, kind);
  const rankA = sectionA === null ? 0 : SECTION_RANK[sectionA];
  const rankB = sectionB === null ? 0 : SECTION_RANK[sectionB];
  if (rankA !== rankB) return rankA - rankB;
  return b.created_at.localeCompare(a.created_at);
}
