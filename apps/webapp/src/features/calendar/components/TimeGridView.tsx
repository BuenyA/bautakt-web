import { cn } from '@bautakt/ui';
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { layoutLanes } from '@/features/overview/today';
import { formatDate, formatTime } from '@/lib/format';

import { coversDay, localIsoDay, type Occurrence, parseIsoDay } from '../calendarModel';
import { type CalendarEntry, EntryElement } from './entries';
import { sortEntries } from './entryOrder';

const HOUR_PX = 48;
const LABEL_WIDTH = 52;
const SCROLL_TO_HOUR = 7;
/** Sichtbar sind zwölf Stunden, der Rest des Tages per Scrollen. */
const VISIBLE_HOURS = 12;
const MIN_BLOCK_PX = 22;
const DAY_MINUTES = 24 * 60;

const useStyles = makeStyles({
  hourLine: { borderTop: `1px solid ${tokens.colorNeutralStroke3}` },
  dayLine: { borderLeft: `1px solid ${tokens.colorNeutralStroke3}` },
  slot: {
    ':hover': { backgroundColor: tokens.colorSubtleBackgroundHover },
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '-2px' },
  },
  now: { backgroundColor: tokens.colorPaletteRedBackground3 },
});

/** Minuten des Eintrags an diesem Tag, auf den Tag geklemmt. */
function minutesOnDay(entry: CalendarEntry, dayIso: string): { start: number; end: number } {
  const dayStart = parseIsoDay(dayIso).getTime();
  const toMinutes = (iso: string) =>
    Math.min(DAY_MINUTES, Math.max(0, (new Date(iso).getTime() - dayStart) / 60_000));
  const start = toMinutes(entry.startsAt);
  return { start, end: Math.max(toMinutes(entry.endsAt), start + 15) };
}

/**
 * Woche (sieben Spalten) oder Tag (eine Spalte) als Zeitraster 0–24 Uhr.
 * Ganztägiges steht oben. Überlappendes nebeneinander (`layoutLanes`, wie in
 * der Übersicht). Ein Klick in eine leere Stunde legt dort einen Termin an.
 */
export function TimeGridView({
  days,
  todayIso,
  now,
  entries,
  onOpenEvent,
  onCreate,
  onOpenDay,
}: {
  days: readonly string[];
  todayIso: string;
  now: Date;
  entries: readonly CalendarEntry[];
  onOpenEvent: (occurrence: Occurrence) => void;
  onCreate: (dayIso: string, hour: number) => void;
  onOpenDay: (dayIso: string) => void;
}) {
  const { t } = useTranslation();
  const styles = useStyles();
  const viewportRef = useRef<HTMLDivElement>(null);
  const columns = {
    gridTemplateColumns: `${LABEL_WIDTH}px repeat(${days.length}, minmax(0, 1fr))`,
  };
  const shortWeekday = new Intl.DateTimeFormat('de-DE', { weekday: 'short' });
  const weekdayFormat = new Intl.DateTimeFormat('de-DE', {
    weekday: days.length === 1 ? 'long' : 'short',
    day: 'numeric',
    month: days.length === 1 ? 'long' : 'numeric',
  });

  // Nur beim ersten Zeichnen auf 7 Uhr stellen — danach gehört die Position der Person.
  useLayoutEffect(() => {
    if (viewportRef.current) viewportRef.current.scrollTop = SCROLL_TO_HOUR * HOUR_PX;
  }, []);

  const allDayByDay = days.map((iso) =>
    sortEntries(
      entries.filter((entry) => entry.allDay && coversDay(entry.startsAt, entry.endsAt, true, iso)),
    ),
  );
  const hasAllDay = allDayByDay.some((list) => list.length > 0);
  const nowMinutes = (now.getTime() - parseIsoDay(localIsoDay(now)).getTime()) / 60_000;

  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <div className="bg-surface grid text-xs font-medium" style={columns}>
        <span />
        {days.map((iso) => (
          <button
            key={iso}
            type="button"
            onClick={() => onOpenDay(iso)}
            disabled={days.length === 1}
            className={cn(
              'truncate px-1 py-2 text-center',
              iso === todayIso ? 'text-primary font-semibold' : 'text-muted-foreground',
              days.length > 1 && 'hover:underline',
            )}
          >
            {days.length === 1 ? (
              weekdayFormat.format(parseIsoDay(iso))
            ) : (
              // Schmal: Wochentag und Tag untereinander, sonst schneidet das Handy ab.
              <span className="flex w-full flex-col items-center justify-center leading-tight sm:flex-row sm:gap-1">
                <span>{shortWeekday.format(parseIsoDay(iso)).replace('.', '')}</span>
                <span className="tabular-nums">{parseIsoDay(iso).getDate()}.</span>
              </span>
            )}
          </button>
        ))}
      </div>

      {hasAllDay ? (
        <div className="border-border grid border-t" style={columns}>
          <span className="text-text-subtle px-1 py-1 text-[11px]">
            {t('domain:calendar.allDay')}
          </span>
          {allDayByDay.map((list, index) => (
            <div
              key={days[index]}
              className={mergeClasses('flex min-w-0 flex-col gap-1 p-1', styles.dayLine)}
            >
              {list.map((entry) => (
                <EntryElement
                  key={entry.key}
                  entry={entry}
                  onOpenEvent={onOpenEvent}
                  label={entry.title}
                  className="block truncate rounded px-1.5 py-0.5 text-xs"
                >
                  {entry.title}
                </EntryElement>
              ))}
            </div>
          ))}
        </div>
      ) : null}

      <div
        ref={viewportRef}
        className="border-border overflow-x-hidden overflow-y-auto overscroll-contain border-t"
        style={{ height: VISIBLE_HOURS * HOUR_PX + 16 }}
      >
        <div
          className="relative grid"
          style={{ ...columns, height: 24 * HOUR_PX, margin: '8px 0' }}
        >
          <div className="relative">
            {Array.from({ length: 25 }, (_, hour) => (
              <span
                key={hour}
                className="text-text-subtle absolute right-2 -translate-y-1/2 text-[11px] tabular-nums"
                style={{ top: hour * HOUR_PX }}
              >
                {String(hour).padStart(2, '0')}:00
              </span>
            ))}
          </div>

          {days.map((iso) => {
            const timed = entries
              .filter(
                (entry) => !entry.allDay && coversDay(entry.startsAt, entry.endsAt, false, iso),
              )
              .map((entry) => ({ entry, ...minutesOnDay(entry, iso) }));
            return (
              <div key={iso} className={mergeClasses('relative', styles.dayLine)}>
                {Array.from({ length: 24 }, (_, hour) => (
                  <button
                    key={hour}
                    type="button"
                    className={mergeClasses(
                      'absolute right-0 left-0 block',
                      styles.hourLine,
                      styles.slot,
                    )}
                    style={{ top: hour * HOUR_PX, height: HOUR_PX }}
                    aria-label={t('domain:calendar.createAt', {
                      date: formatDate(iso),
                      hour: String(hour).padStart(2, '0'),
                    })}
                    onClick={() => onCreate(iso, hour)}
                  />
                ))}

                {layoutLanes(timed).map(({ entry, start, end, lane, lanes }) => {
                  const height = Math.max(((end - start) / 60) * HOUR_PX, MIN_BLOCK_PX);
                  const time = `${formatTime(entry.startsAt)}–${formatTime(entry.endsAt)}`;
                  return (
                    <div
                      key={entry.key}
                      className="absolute z-10 px-0.5"
                      style={{
                        top: (start / 60) * HOUR_PX,
                        height,
                        left: `${(lane / lanes) * 100}%`,
                        width: `${100 / lanes}%`,
                      }}
                    >
                      <EntryElement
                        entry={entry}
                        onOpenEvent={onOpenEvent}
                        label={`${entry.title}, ${time}`}
                        className="flex h-full w-full flex-col overflow-hidden rounded-md px-1.5 py-0.5 text-xs"
                      >
                        <span className="truncate font-semibold">{entry.title}</span>
                        {height >= 2 * MIN_BLOCK_PX ? (
                          <span className="text-muted-foreground truncate tabular-nums">
                            {time}
                          </span>
                        ) : null}
                      </EntryElement>
                    </div>
                  );
                })}

                {iso === todayIso ? (
                  <div
                    className={mergeClasses(
                      'pointer-events-none absolute right-0 left-0 z-20 h-0.5',
                      styles.now,
                    )}
                    style={{ top: (nowMinutes / 60) * HOUR_PX }}
                    aria-hidden
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
