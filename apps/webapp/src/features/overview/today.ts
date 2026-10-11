/**
 * Reine Tagesrechnungen der Übersicht — ohne React, ohne Supabase, damit sie
 * mit `node --test` prüfbar bleiben (deshalb auch keine `@/`-Importe).
 */

/** Lokaler Kalendertag `YYYY-MM-DD`. */
export function localIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** `YYYY-MM-DD` als lokales Datum, 00:00 Uhr. */
export function parseLocalIso(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Kalendertag plus `days` Tage. */
export function addDaysIso(iso: string, days: number): string {
  const date = parseLocalIso(iso);
  date.setDate(date.getDate() + days);
  return localIsoDate(date);
}

/** 00:00 und 23:59:59.999 des lokalen Tages. */
export function localDayBounds(reference: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Deckt eine Serienregel diesen Tag ab?
 *
 * Genau die Regeln, die die Handy-App erzeugt: `FREQ=DAILY|WEEKLY|MONTHLY|YEARLY`,
 * `INTERVAL=1`, optional `UNTIL=YYYYMMDD`. Spiegel von `recurrence_covers_date()`
 * (bautakt-app, Migration 20260818195625). Alles andere liefert false — der Termin
 * fehlt dann, statt am falschen Tag zu erscheinen.
 */
export function recurrenceCoversDate(
  rule: string,
  seriesStartIso: string,
  dayIso: string,
): boolean {
  if (!rule || dayIso < seriesStartIso) return false;
  if ((/INTERVAL=(\d+)/.exec(rule)?.[1] ?? '1') !== '1') return false;

  const until = /UNTIL=(\d{8})/.exec(rule)?.[1];
  if (until && dayIso > `${until.slice(0, 4)}-${until.slice(4, 6)}-${until.slice(6, 8)}`) {
    return false;
  }

  const [, startMonth, startDay] = seriesStartIso.split('-').map(Number);
  const [, month, day] = dayIso.split('-').map(Number);
  const weekday = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).getDay();
  };

  switch (/FREQ=([A-Z]+)/.exec(rule)?.[1]) {
    case 'DAILY':
      return true;
    case 'WEEKLY':
      return weekday(dayIso) === weekday(seriesStartIso);
    case 'MONTHLY':
      return day === startDay;
    case 'YEARLY':
      return day === startDay && month === startMonth;
    default:
      return false;
  }
}

/**
 * Verteilt sich überlappende Einträge auf Spalten, wie ein Kalender es tut.
 *
 * `lane` ist die Spalte des Eintrags, `lanes` die Spaltenzahl seiner
 * Überlappungsgruppe — beides zusammen ergibt Breite und Versatz.
 */
export function layoutLanes<T extends { start: number; end: number }>(
  items: readonly T[],
): (T & { lane: number; lanes: number })[] {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const result: (T & { lane: number; lanes: number })[] = [];
  let group: (T & { lane: number; lanes: number })[] = [];
  let laneEnds: number[] = [];
  let groupEnd = -Infinity;

  const closeGroup = () => {
    for (const item of group) item.lanes = laneEnds.length;
    group = [];
    laneEnds = [];
  };

  for (const item of sorted) {
    if (item.start >= groupEnd) closeGroup();
    let lane = laneEnds.findIndex((end) => end <= item.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.end);
    } else {
      laneEnds[lane] = item.end;
    }
    const placed = { ...item, lane, lanes: 1 };
    group.push(placed);
    result.push(placed);
    groupEnd = Math.max(groupEnd, item.end);
  }
  closeGroup();
  return result;
}

/**
 * Seit wann gilt eine Eingangsrechnung als „neu“: seit Beginn des letzten
 * Arbeitstags. Montags also seit Freitag 00:00 — was übers Wochenende kam,
 * ist am Montag neu.
 */
export function newSince(reference: Date = new Date()): Date {
  const since = new Date(reference);
  since.setHours(0, 0, 0, 0);
  const back = { 0: 2, 1: 3, 6: 1 }[since.getDay()] ?? 1;
  since.setDate(since.getDate() - back);
  return since;
}

export type DeadlineKind = 'incoming' | 'invoice' | 'orderEnd';

export type Deadline = {
  kind: DeadlineKind;
  id: string;
  label: string;
  dueIso: string;
  /** Negativ = überfällig, 0 = heute. */
  daysLeft: number;
  /** Betrag in Euro, falls es einen gibt. */
  amount: number | null;
};

function daysFrom(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split('-').map(Number);
  const [ty, tm, td] = toIso.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

/**
 * Fristen der nächsten `horizonDays` Tage samt allem Überfälligen, das
 * Dringendste zuerst. Ausgangsrechnungen stehen hier nur mit künftiger
 * Fälligkeit — überfällige hat die Übersicht schon in eigener Liste.
 */
export function collectDeadlines(
  input: {
    incoming: readonly {
      id: string;
      vendor_name: string;
      invoice_number: string;
      due_date: string | null;
      status: string;
      gross_total: number | null;
    }[];
    invoices: readonly { id: string; label: string; due_date: string | null; amount: number }[];
    orders: readonly { id: string; name: string; end_date: string | null }[];
  },
  todayIso: string,
  horizonDays = 7,
): Deadline[] {
  const deadlines: Deadline[] = [];
  const push = (deadline: Omit<Deadline, 'daysLeft'>, allowOverdue: boolean) => {
    const daysLeft = daysFrom(todayIso, deadline.dueIso);
    if (daysLeft > horizonDays || (!allowOverdue && daysLeft < 0)) return;
    deadlines.push({ ...deadline, daysLeft });
  };

  for (const invoice of input.incoming) {
    if (!invoice.due_date || invoice.status === 'paid') continue;
    push(
      {
        kind: 'incoming',
        id: invoice.id,
        label: [invoice.vendor_name, invoice.invoice_number].filter(Boolean).join(' · '),
        dueIso: invoice.due_date.slice(0, 10),
        amount: invoice.gross_total,
      },
      true,
    );
  }
  for (const invoice of input.invoices) {
    if (!invoice.due_date) continue;
    push(
      {
        kind: 'invoice',
        id: invoice.id,
        label: invoice.label,
        dueIso: invoice.due_date.slice(0, 10),
        amount: invoice.amount,
      },
      false,
    );
  }
  for (const order of input.orders) {
    if (!order.end_date) continue;
    push(
      { kind: 'orderEnd', id: order.id, label: order.name, dueIso: order.end_date, amount: null },
      false,
    );
  }

  return deadlines.sort((a, b) => a.daysLeft - b.daysLeft || a.label.localeCompare(b.label));
}

/** Google-Maps-Suche nach einer Adresse — wie `buildMapsSearchUrl` der Handy-App. */
export function mapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
}
