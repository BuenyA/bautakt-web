/**
 * Termine (`calendar_events`) für den Web-Kalender: Serien auffalten,
 * Wiederholungsregeln lesen und schreiben, Tage und Zeiträume rechnen.
 *
 * Rein und ohne `@/`-Importe, damit `node --test` die Datei direkt lädt.
 *
 * ⚠️ Gleich wie die Handy-App, sonst passen Ausnahmen nicht. Serien rechnen
 * in Ortszeit: ein wöchentlicher Termin um 09:00 bleibt auch nach der
 * Zeitumstellung um 09:00 (wie `build_morning_briefing` auf dem Server).
 * Ausnahmen finden ihr Vorkommen über den lokalen Tag, nicht über den exakten
 * Zeitpunkt: bis 2026-10-11 rechneten App und Web in UTC, und so alte
 * Ausnahmen lägen nach der Umstellung eine Stunde daneben. Jede unterstützte
 * Regel hat höchstens ein Vorkommen pro Tag. Änderungen hier bitte auch in
 * `lib/calendar/recurrence.ts` der App.
 */

export type EventType = 'me' | 'all';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export const RECURRENCE_TYPES: readonly RecurrenceType[] = [
  'none',
  'daily',
  'weekly',
  'monthly',
  'yearly',
];

/** Vorlauf der Erinnerung in Minuten; `null` = keine. Wie `REMINDER_OPTIONS` der App. */
export const REMINDER_OPTIONS: readonly (number | null)[] = [null, 0, 15, 30, 60];

export type CalendarEventRow = {
  id: string;
  user_id: string;
  event_type: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  recurrence_rule: string | null;
  parent_event_id: string | null;
  recurrence_id: string | null;
  is_cancelled: boolean;
  reminder_minutes: number | null;
};

/** Ein konkretes Vorkommen im Kalender: Einzeltermin, Serienvorkommen oder Ausnahme. */
export type Occurrence = {
  /** Eindeutig je Vorkommen, für React-Keys. */
  key: string;
  /** Die Zeile, die man bearbeitet: Einzeltermin, Serienkopf oder Ausnahme. */
  rowId: string;
  /** Der Serienkopf; bei Einzelterminen gleich `rowId`. */
  masterId: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  eventType: EventType;
  userId: string;
  reminderMinutes: number | null;
  /** Regel des Serienkopfs; `null` bei Einzelterminen. */
  recurrenceRule: string | null;
  /** Ursprünglicher Beginn des Vorkommens in der Serie (ISO); `null` bei Einzelterminen. */
  recurrenceId: string | null;
  isException: boolean;
};

const DAY_MS = 86_400_000;
const FREQ_TO_TYPE: Record<string, RecurrenceType> = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
};
/** Schutz gegen kaputte Regeln: mehr Vorkommen rechnet keine Ansicht. */
const MAX_STEPS = 20_000;

export function asEventType(value: string): EventType {
  return value === 'all' ? 'all' : 'me';
}

// --- Tage -----------------------------------------------------------------

export function localIsoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function parseIsoDay(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(iso: string, days: number): string {
  const date = parseIsoDay(iso);
  date.setDate(date.getDate() + days);
  return localIsoDay(date);
}

/** Montag der Woche (ISO-Woche, Sonntag gehört zur laufenden Woche). */
export function startOfWeek(iso: string): string {
  const date = parseIsoDay(iso);
  return addDays(iso, -((date.getDay() + 6) % 7));
}

/** Sechs Wochen ab dem Montag vor dem Monatsersten — ein stabiles Raster. */
export function monthGridDays(year: number, month: number): string[] {
  const first = startOfWeek(localIsoDay(new Date(year, month, 1)));
  return Array.from({ length: 42 }, (_, index) => addDays(first, index));
}

/** Liegt ein Eintrag (auch mehrtägig) an diesem lokalen Tag? */
export function coversDay(startsAt: string, endsAt: string, allDay: boolean, iso: string): boolean {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (allDay) {
    return localIsoDay(start) <= iso && localIsoDay(end) >= iso;
  }
  const dayStart = parseIsoDay(iso).getTime();
  const dayEnd = dayStart + DAY_MS;
  // Ein Termin bis genau 00:00 gehört nicht mehr zum nächsten Tag.
  if (end.getTime() === start.getTime()) {
    return start.getTime() >= dayStart && start.getTime() < dayEnd;
  }
  return start.getTime() < dayEnd && end.getTime() > dayStart;
}

// --- Wiederholung ----------------------------------------------------------

function compactUtc(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/**
 * RRULE wie `buildRecurrenceRule` der App: `RRULE:FREQ=WEEKLY;INTERVAL=1`,
 * mit Ende `;UNTIL=…` = letzter Tag 23:59:59 lokal, als UTC geschrieben.
 */
export function buildRecurrenceRule(type: RecurrenceType, untilIso: string | null): string | null {
  if (type === 'none') return null;
  const freq = type.toUpperCase();
  let rule = `RRULE:FREQ=${freq};INTERVAL=1`;
  if (untilIso) {
    const until = parseIsoDay(untilIso);
    until.setHours(23, 59, 59, 0);
    rule += `;UNTIL=${compactUtc(until)}`;
  }
  return rule;
}

function ruleParts(rule: string | null | undefined): Map<string, string> {
  const parts = new Map<string, string>();
  if (!rule) return parts;
  const line = rule
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith('RRULE:') || entry.startsWith('FREQ='));
  if (!line) return parts;
  for (const pair of line.replace(/^RRULE:/, '').split(';')) {
    const [key, value] = pair.split('=');
    if (key && value) parts.set(key.toUpperCase(), value);
  }
  return parts;
}

function parseUntil(value: string | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi, s, z] = match;
  if (h == null) return new Date(Number(y), Number(mo) - 1, Number(d), 23, 59, 59);
  const parts = [Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)] as const;
  return z ? new Date(Date.UTC(...parts)) : new Date(...parts);
}

/** Art und letzter Tag (lokal, `YYYY-MM-DD`) einer gespeicherten Regel. */
export function parseRecurrence(rule: string | null | undefined): {
  type: RecurrenceType;
  untilIso: string | null;
} {
  const parts = ruleParts(rule);
  const type = FREQ_TO_TYPE[parts.get('FREQ') ?? ''] ?? 'none';
  const until = parseUntil(parts.get('UNTIL'));
  return { type, untilIso: type === 'none' || !until ? null : localIsoDay(until) };
}

/** n-tes Vorkommen ab `start` in Ortszeit; `null`, wenn es den Tag nicht gibt (31. im April). */
function nthOccurrence(start: Date, type: RecurrenceType, n: number): Date | null {
  const day = start.getDate();
  const month = start.getMonth();
  const date = new Date(
    start.getFullYear() + (type === 'yearly' ? n : 0),
    month + (type === 'monthly' ? n : 0),
    day + (type === 'daily' ? n : type === 'weekly' ? 7 * n : 0),
    start.getHours(),
    start.getMinutes(),
    start.getSeconds(),
    start.getMilliseconds(),
  );
  if ((type === 'monthly' || type === 'yearly') && date.getDate() !== day) return null;
  return date;
}

function baseOf(row: CalendarEventRow) {
  return {
    title: row.title,
    description: row.description,
    allDay: row.all_day,
    eventType: asEventType(row.event_type),
    userId: row.user_id,
    reminderMinutes: row.reminder_minutes,
  };
}

/**
 * Serienköpfe, Ausnahmen und Einzeltermine zu Vorkommen im Zeitraum
 * [`from`, `to`] — wie `expandOccurrences` der App. Ein Vorkommen zählt, wenn
 * es den Zeitraum berührt; auch ein mehrtägiges, das vorher beginnt.
 */
export function expandOccurrences(
  rows: readonly CalendarEventRow[],
  from: Date,
  to: Date,
): Occurrence[] {
  const exceptionsByMaster = new Map<string, Map<string, CalendarEventRow>>();
  for (const row of rows) {
    if (!row.parent_event_id || !row.recurrence_id) continue;
    const map = exceptionsByMaster.get(row.parent_event_id) ?? new Map<string, CalendarEventRow>();
    map.set(localIsoDay(new Date(row.recurrence_id)), row);
    exceptionsByMaster.set(row.parent_event_id, map);
  }

  const overlaps = (startsAt: string, endsAt: string) =>
    new Date(startsAt) <= to && new Date(endsAt) >= from;
  const result: Occurrence[] = [];

  for (const master of rows) {
    if (master.parent_event_id) continue;
    const { type } = parseRecurrence(master.recurrence_rule);

    if (type === 'none') {
      if (master.is_cancelled || !overlaps(master.starts_at, master.ends_at)) continue;
      result.push({
        ...baseOf(master),
        key: master.id,
        rowId: master.id,
        masterId: master.id,
        startsAt: master.starts_at,
        endsAt: master.ends_at,
        recurrenceRule: null,
        recurrenceId: null,
        isException: false,
      });
      continue;
    }

    const start = new Date(master.starts_at);
    const duration = Math.max(0, new Date(master.ends_at).getTime() - start.getTime());
    const until = parseUntil(ruleParts(master.recurrence_rule).get('UNTIL'));
    const exceptions = exceptionsByMaster.get(master.id);
    // Tägliche und wöchentliche Serien springen direkt vor den Zeitraum
    // (eine Stunde Zeitumstellung fängt das `- 1` ab).
    const period = type === 'daily' ? DAY_MS : type === 'weekly' ? 7 * DAY_MS : 0;
    const firstStep = period
      ? Math.max(0, Math.floor((from.getTime() - duration - start.getTime()) / period) - 1)
      : 0;

    for (let n = firstStep; n < firstStep + MAX_STEPS; n += 1) {
      const occurrenceStart = nthOccurrence(start, type, n);
      if (!occurrenceStart) continue;
      if (occurrenceStart > to) break;
      if (until && occurrenceStart > until) break;
      const occurrenceEnd = new Date(occurrenceStart.getTime() + duration);
      if (occurrenceEnd < from) continue;

      const recurrenceId = occurrenceStart.toISOString();
      const exception = exceptions?.get(localIsoDay(occurrenceStart));
      if (exception) {
        if (exception.is_cancelled || !overlaps(exception.starts_at, exception.ends_at)) continue;
        result.push({
          ...baseOf(exception),
          eventType: asEventType(master.event_type),
          key: exception.id,
          rowId: exception.id,
          masterId: master.id,
          startsAt: exception.starts_at,
          endsAt: exception.ends_at,
          recurrenceRule: master.recurrence_rule,
          recurrenceId,
          isException: true,
        });
        continue;
      }

      result.push({
        ...baseOf(master),
        key: `${master.id}__${recurrenceId}`,
        rowId: master.id,
        masterId: master.id,
        startsAt: recurrenceId,
        endsAt: occurrenceEnd.toISOString(),
        recurrenceRule: master.recurrence_rule,
        recurrenceId,
        isException: false,
      });
    }
  }

  return result.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

// --- Formular --------------------------------------------------------------

const HOUR_MS = 3_600_000;

export function combineLocal(dateIso: string, time: string): Date {
  const date = parseIsoDay(dateIso);
  const [hours, minutes] = time.split(':').map(Number);
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
}

export function localTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export type DateTimeRange = {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
};

function rangeFrom(start: Date, end: Date): DateTimeRange {
  return {
    startDate: localIsoDay(start),
    startTime: localTime(start),
    endDate: localIsoDay(end),
    endTime: localTime(end),
  };
}

/**
 * Beginn geändert: liegt er danach nicht mehr vor dem Ende, rückt das Ende
 * auf Beginn + 1 Stunde — wie im Formular der App.
 */
export function withStart(
  range: DateTimeRange,
  startDate: string,
  startTime: string,
): DateTimeRange {
  const start = combineLocal(startDate, startTime);
  const end = combineLocal(range.endDate, range.endTime);
  return rangeFrom(start, end > start ? end : new Date(start.getTime() + HOUR_MS));
}

/** Ende geändert: liegt es nicht mehr nach dem Beginn, rückt der Beginn auf Ende − 1 Stunde. */
export function withEnd(range: DateTimeRange, endDate: string, endTime: string): DateTimeRange {
  const start = combineLocal(range.startDate, range.startTime);
  const end = combineLocal(endDate, endTime);
  return rangeFrom(end > start ? start : new Date(end.getTime() - HOUR_MS), end);
}

/**
 * Zeitstempel zum Speichern. Ganztägig: Beginn 00:00 am ersten Tag, Ende
 * 23:59 am letzten — die App liest bei `all_day` nur die Tage.
 */
export function toTimestamps(
  range: DateTimeRange,
  allDay: boolean,
): { startsAt: string; endsAt: string } {
  if (allDay) {
    const start = combineLocal(range.startDate, '00:00');
    const endDate = range.endDate < range.startDate ? range.startDate : range.endDate;
    return { startsAt: start.toISOString(), endsAt: combineLocal(endDate, '23:59').toISOString() };
  }
  return {
    startsAt: combineLocal(range.startDate, range.startTime).toISOString(),
    endsAt: combineLocal(range.endDate, range.endTime).toISOString(),
  };
}

/**
 * „Alle Termine“ aus einem Vorkommen heraus: der Serienbeginn verschiebt sich
 * um genau die Änderung am Vorkommen, statt auf das Vorkommen zu springen.
 * (In der App springt er — dort beginnt die Serie danach erst am geöffneten Tag.)
 */
export function shiftSeries(
  master: { startsAt: string },
  occurrenceStartsAt: string,
  edited: { startsAt: string; endsAt: string },
): { startsAt: string; endsAt: string } {
  const delta = new Date(edited.startsAt).getTime() - new Date(occurrenceStartsAt).getTime();
  const duration = new Date(edited.endsAt).getTime() - new Date(edited.startsAt).getTime();
  const start = new Date(new Date(master.startsAt).getTime() + delta);
  return {
    startsAt: start.toISOString(),
    endsAt: new Date(start.getTime() + duration).toISOString(),
  };
}
