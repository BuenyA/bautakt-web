import type { CalendarEntry } from './entries';

/** Ganztägiges zuerst, dann nach Beginn. */
export function sortEntries(entries: readonly CalendarEntry[]): CalendarEntry[] {
  return [...entries].sort(
    (a, b) => Number(b.allDay) - Number(a.allDay) || a.startsAt.localeCompare(b.startsAt),
  );
}
