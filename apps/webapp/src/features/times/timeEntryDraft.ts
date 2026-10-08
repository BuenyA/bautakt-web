import { todayIso } from '@bautakt/finance';

/**
 * Formularzustand eines Zeiteintrags.
 *
 * Datum und Uhrzeiten stehen getrennt, weil man sie so eingibt: „Dienstag, 7
 * bis 16 Uhr". Zusammengesetzt wird erst beim Speichern. Liegt das Ende vor
 * dem Beginn oder auf derselben Minute, ist das eine Nachtschicht: das Ende
 * wandert um 24 Stunden nach hinten, wie in der Handy-App.
 *
 * `employmentIds` ist beim Anlegen eine Liste (mit Team-Recht mehrere Personen)
 * und beim Bearbeiten genau eine. Eigene Datei, damit die Komponente nur
 * Komponenten exportiert (Fast Refresh).
 */
export type TimeEntryDraft = {
  id?: string;
  orderId: string;
  /**
   * Bezeichnung des Auftrags, schon bevor `useOrders` liefert.
   *
   * Das Auftragsdetail kennt den Namen. Das Select im Formular zeigt ihn
   * sonst erst, wenn die Optionen gemountet sind — beim ersten Öffnen mit
   * kaltem Cache bleibt das Feld leer.
   */
  orderLabel: string;
  employmentIds: string[];
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes: string;
  note: string;
  /** Der Eintrag steht schon auf einem festgeschriebenen Beleg. */
  billed: boolean;
  /** Vom Auftragsdetail geöffnet: der Auftrag bleibt dieser. */
  lockOrder: boolean;
};

export type TimeEntryIssue =
  'order' | 'date' | 'start' | 'end' | 'break' | 'breakTooLong' | 'employee';

export function emptyTimeEntry(partial?: {
  orderId?: string;
  orderLabel?: string;
  employmentId?: string;
  lockOrder?: boolean;
}): TimeEntryDraft {
  return {
    orderId: partial?.orderId ?? '',
    orderLabel: partial?.orderLabel?.trim() ?? '',
    employmentIds: partial?.employmentId ? [partial.employmentId] : [],
    date: todayIso(),
    startTime: '07:00',
    endTime: '16:00',
    breakMinutes: '30',
    note: '',
    billed: false,
    lockOrder: partial?.lockOrder ?? false,
  };
}

export function draftFromTimeEntry(
  row: {
    id: string;
    order_id: string;
    employment_id: string | null;
    started_at: string;
    ended_at: string | null;
    break_minutes: number;
    note: string;
    billed: boolean;
    order_name?: string;
  },
  options?: { lockOrder?: boolean },
): TimeEntryDraft {
  return {
    id: row.id,
    orderId: row.order_id,
    orderLabel: row.order_name?.trim() ?? '',
    employmentIds: row.employment_id ? [row.employment_id] : [],
    date: toDateInput(row.started_at),
    startTime: toTimeInput(row.started_at),
    endTime: toTimeInput(row.ended_at),
    breakMinutes: String(row.break_minutes),
    note: row.note,
    billed: row.billed,
    lockOrder: options?.lockOrder ?? false,
  };
}

/**
 * Kalendertag plus Ortszeit als Zeitstempel.
 *
 * ⚠️ Bewusst über die lokalen Bestandteile und nicht über einen
 * zusammengebauten ISO-String: `new Date('2026-09-24T07:00')` ist zwar lokal,
 * `…T07:00Z` aber UTC — ein Buchstabe Unterschied und die Stunde stimmt nicht
 * mehr. So kann der Fehler gar nicht erst entstehen.
 */
export function toTimestamp(dateIso: string, time: string): string | null {
  if (!dateIso || !time) return null;
  const [year, month, day] = dateIso.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  if (!year || !month || !day || hour == null || minute == null) return null;
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString();
}

/** Zeitstempel als `YYYY-MM-DD` in Ortszeit — das Datum im Formular. */
export function toDateInput(timestamp: string | null): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Zeitstempel als `HH:MM` in Ortszeit — Gegenstück zu `toTimestamp`. */
export function toTimeInput(timestamp: string | null): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Beginn und Ende als Zeitstempel.
 *
 * Ende vor Beginn oder dieselbe Minute: plus 24 Stunden. Der Check
 * `ended_at > started_at` lässt den Gleichstand nicht durch; die Nachtschicht
 * erfüllt ihn, weil das Ende am nächsten Tag liegt.
 */
export function entryRange(
  dateIso: string,
  startTime: string,
  endTime: string,
): { startedAt: string; endedAt: string } | null {
  const startedAt = toTimestamp(dateIso, startTime);
  const endedSameDay = toTimestamp(dateIso, endTime);
  if (!startedAt || !endedSameDay) return null;
  const startMs = new Date(startedAt).getTime();
  let endMs = new Date(endedSameDay).getTime();
  if (endMs <= startMs) endMs += DAY_MS;
  return { startedAt: new Date(startMs).toISOString(), endedAt: new Date(endMs).toISOString() };
}

/** Bruttominuten zwischen den beiden Zeitstempeln. */
export function grossMinutes(startedAt: string, endedAt: string): number {
  return Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60_000);
}

/**
 * Pause als ganze Minuten.
 *
 * Leer ist 0. Alles andere muss eine ganze Zahl ab 0 sein — „30.5" und „-1"
 * sind Tippfehler, keine Pause.
 */
export function parseBreakMinutes(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}

/**
 * Dieselben Regeln wie das Formular in der Handy-App.
 *
 * Datum, Beginn und Ende sind Pflicht. Die Pause ist mindestens 0 und kürzer
 * als die Bruttodauer. Ein offener Eintrag ohne Ende bleibt der Stoppuhr
 * vorbehalten; dieses Formular legt keinen an.
 */
export function timeEntryIssue(draft: TimeEntryDraft): TimeEntryIssue | null {
  if (!draft.orderId) return 'order';
  if (!draft.date) return 'date';
  if (!draft.startTime) return 'start';
  if (!draft.endTime) return 'end';
  if (draft.employmentIds.filter(Boolean).length === 0) return 'employee';

  const range = entryRange(draft.date, draft.startTime, draft.endTime);
  if (!range) return 'start';

  const pause = parseBreakMinutes(draft.breakMinutes);
  if (pause == null) return 'break';
  if (pause >= grossMinutes(range.startedAt, range.endedAt)) return 'breakTooLong';
  return null;
}
