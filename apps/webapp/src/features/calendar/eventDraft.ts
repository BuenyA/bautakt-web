import {
  addDays,
  type DateTimeRange,
  type EventType,
  localIsoDay,
  localTime,
  type Occurrence,
  parseRecurrence,
  type RecurrenceType,
} from './calendarModel';

/**
 * Formularzustand eines Termins. Eigene Datei, damit die Komponente nur
 * Komponenten exportiert (Fast Refresh).
 *
 * `occurrence` ist beim Anlegen `null`. Beim Bearbeiten trägt es, was gespeichert
 * werden muss: welche Zeile, welcher Serienkopf, welches Vorkommen.
 */
export type CalendarEventDraft = DateTimeRange & {
  title: string;
  description: string;
  allDay: boolean;
  eventType: EventType;
  recurrence: RecurrenceType;
  /** Letzter Tag der Serie (`YYYY-MM-DD`) oder leer. */
  recurrenceUntil: string;
  reminderMinutes: number | null;
  occurrence: Occurrence | null;
  /** Beginn des Serienkopfs — für „Alle Termine“ aus einem Vorkommen heraus. */
  masterStartsAt: string | null;
};

/** Neuer Termin: der Tag, ab `hour` Uhr, eine Stunde lang, privat — wie in der App. */
export function emptyEventDraft(dayIso: string, hour = 8): CalendarEventDraft {
  const startHour = Math.min(Math.max(hour, 0), 23);
  const endsNextDay = startHour === 23;
  return {
    title: '',
    description: '',
    allDay: false,
    eventType: 'me',
    startDate: dayIso,
    startTime: `${String(startHour).padStart(2, '0')}:00`,
    endDate: endsNextDay ? addDays(dayIso, 1) : dayIso,
    endTime: endsNextDay ? '00:00' : `${String(startHour + 1).padStart(2, '0')}:00`,
    recurrence: 'none',
    recurrenceUntil: '',
    reminderMinutes: null,
    occurrence: null,
    masterStartsAt: null,
  };
}

export function draftFromOccurrence(
  occurrence: Occurrence,
  masterStartsAt: string | null,
): CalendarEventDraft {
  const start = new Date(occurrence.startsAt);
  const end = new Date(occurrence.endsAt);
  const { type, untilIso } = parseRecurrence(occurrence.recurrenceRule);
  return {
    title: occurrence.title,
    description: occurrence.description,
    allDay: occurrence.allDay,
    eventType: occurrence.eventType,
    startDate: localIsoDay(start),
    startTime: occurrence.allDay ? '08:00' : localTime(start),
    endDate: localIsoDay(end),
    endTime: occurrence.allDay ? '09:00' : localTime(end),
    recurrence: type,
    recurrenceUntil: untilIso ?? '',
    reminderMinutes: occurrence.reminderMinutes,
    occurrence,
    masterStartsAt,
  };
}

/** Teil einer Serie: Bearbeiten und Löschen fragen „Nur dieser“ oder „Alle“. */
export function isSeriesOccurrence(draft: CalendarEventDraft): boolean {
  return Boolean(draft.occurrence?.recurrenceId);
}
