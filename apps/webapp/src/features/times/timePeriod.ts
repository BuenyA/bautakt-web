/**
 * Zeitraum der Zeitenliste. Default ohne Query ist `week`.
 *
 * `today` ist der Chip „Heute“. `day` liest denselben Chip, falls ein
 * Link den Schlüssel der App benutzt — geschrieben wird `today`.
 */
export type TimePeriod = 'today' | 'week' | 'month';

export function timePeriodFromSearch(value: string | null): TimePeriod {
  if (value === 'today' || value === 'day') return 'today';
  if (value === 'week' || value === 'month') return value;
  return 'week';
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Montag 00:00 lokal. Sonntag gehört zur laufenden Woche. */
function startOfIsoWeek(date: Date): Date {
  const start = startOfLocalDay(date);
  const weekday = start.getDay();
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  start.setDate(start.getDate() - daysFromMonday);
  return start;
}

/**
 * Kalendertag, Kalenderwoche (Montag–Sonntag) oder Kalendermonat, lokal.
 * Gemessen an `started_at`, inklusive später am selben Tag bzw. später
 * in derselben Woche oder demselben Monat.
 */
export function matchesTimePeriod(
  startedAt: string,
  period: TimePeriod,
  now: Date = new Date(),
): boolean {
  const started = new Date(startedAt);
  if (Number.isNaN(started.getTime())) return false;

  const from =
    period === 'today'
      ? startOfLocalDay(now)
      : period === 'week'
        ? startOfIsoWeek(now)
        : new Date(now.getFullYear(), now.getMonth(), 1);

  const to =
    period === 'month'
      ? new Date(now.getFullYear(), now.getMonth() + 1, 1)
      : new Date(
          from.getFullYear(),
          from.getMonth(),
          from.getDate() + (period === 'today' ? 1 : 7),
        );

  return started >= from && started < to;
}
