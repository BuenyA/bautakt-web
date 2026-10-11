import { cn } from '@bautakt/ui';
import { useTranslation } from 'react-i18next';

import { formatDate } from '@/lib/format';

import { addDays, localIsoDay, monthGridDays, parseIsoDay } from '../calendarModel';
import type { CalendarEntry } from './entries';

const WEEKDAYS = ['M', 'D', 'M', 'D', 'F', 'S', 'S'];

/** Alle Tage im Jahr, an denen etwas liegt. Mehrtägiges zählt an jedem Tag. */
function busyDays(entries: readonly CalendarEntry[], year: number): Set<string> {
  const days = new Set<string>();
  const first = `${year}-01-01`;
  const last = `${year}-12-31`;
  for (const entry of entries) {
    let day = localIsoDay(new Date(entry.startsAt));
    const end = localIsoDay(new Date(entry.endsAt));
    if (day < first) day = first;
    for (let guard = 0; day <= end && day <= last && guard < 400; guard += 1) {
      days.add(day);
      day = addDays(day, 1);
    }
  }
  return days;
}

/**
 * Jahresüberblick wie in der App: zwölf kleine Monate, ein Punkt an jedem Tag
 * mit Einträgen. Ein Tag öffnet die Tagesansicht, der Monatsname den Monat.
 */
export function YearView({
  year,
  todayIso,
  entries,
  onOpenDay,
  onOpenMonth,
}: {
  year: number;
  todayIso: string;
  entries: readonly CalendarEntry[];
  onOpenDay: (dayIso: string) => void;
  onOpenMonth: (month: number) => void;
}) {
  const { t } = useTranslation();
  const busy = busyDays(entries, year);
  const monthName = new Intl.DateTimeFormat('de-DE', { month: 'long' });

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 12 }, (_, month) => (
        <section key={month} className="border-border rounded-lg border p-3">
          <button
            type="button"
            onClick={() => onOpenMonth(month)}
            className="text-foreground mb-2 text-sm font-semibold capitalize hover:underline"
          >
            {monthName.format(new Date(year, month, 1))}
          </button>
          <div className="text-text-subtle grid grid-cols-7 text-center text-[10px]">
            {WEEKDAYS.map((day, index) => (
              <span key={index}>{day}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 text-center text-xs">
            {monthGridDays(year, month).map((iso) => {
              const inMonth = parseIsoDay(iso).getMonth() === month;
              if (!inMonth) return <span key={iso} />;
              const hasEntries = busy.has(iso);
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => onOpenDay(iso)}
                  aria-label={
                    hasEntries
                      ? t('domain:calendar.openDayBusy', { date: formatDate(iso) })
                      : t('domain:calendar.openDay', { date: formatDate(iso) })
                  }
                  className={cn(
                    'relative mx-auto flex size-7 items-center justify-center rounded-full tabular-nums hover:underline',
                    iso === todayIso && 'bg-primary text-primary-foreground font-semibold',
                    hasEntries && iso !== todayIso && 'text-foreground font-semibold',
                    !hasEntries && iso !== todayIso && 'text-muted-foreground',
                  )}
                >
                  {parseIsoDay(iso).getDate()}
                  {hasEntries ? (
                    <span
                      aria-hidden
                      className={cn(
                        'absolute bottom-0.5 size-1 rounded-full',
                        iso === todayIso ? 'bg-primary-foreground' : 'bg-primary',
                      )}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
