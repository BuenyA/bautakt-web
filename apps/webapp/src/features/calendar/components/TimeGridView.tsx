import { mergeClasses } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';

import { layoutLanes } from '@/features/overview/today';
import { formatDate, formatTime } from '@/lib/format';

import { coversDay, type Occurrence } from '../calendarModel';
import { type CalendarEntry, EntryElement } from './entries';
import { sortEntries } from './entryOrder';
import { HourSlots, NowLine, TimeGridBody, TimeGridHeader } from './timeGrid';
import {
  gridColumns,
  HOUR_PX,
  MIN_BLOCK_PX,
  minutesOnDay,
  minutesSinceMidnight,
  useTimeGridStyles,
} from './timeGridLayout';

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
  const styles = useTimeGridStyles();

  const allDayByDay = days.map((iso) =>
    sortEntries(
      entries.filter((entry) => entry.allDay && coversDay(entry.startsAt, entry.endsAt, true, iso)),
    ),
  );
  const hasAllDay = allDayByDay.some((list) => list.length > 0);

  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <TimeGridHeader days={days} todayIso={todayIso} onOpenDay={onOpenDay} />

      {hasAllDay ? (
        <div className="border-border grid border-t" style={gridColumns(days.length)}>
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

      <TimeGridBody dayCount={days.length}>
        {days.map((iso) => {
          const timed = entries
            .filter((entry) => !entry.allDay && coversDay(entry.startsAt, entry.endsAt, false, iso))
            .map((entry) => ({ entry, ...minutesOnDay(entry, iso) }));
          return (
            <div key={iso} className={mergeClasses('relative', styles.dayLine)}>
              <HourSlots
                dayIso={iso}
                onCreate={onCreate}
                slotLabel={(hour) =>
                  t('domain:calendar.createAt', {
                    date: formatDate(iso),
                    hour: String(hour).padStart(2, '0'),
                  })
                }
              />

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
                      // `overflow-clip` statt `hidden`: hidden machte den Block zum
                      // Scrollcontainer, und der Kopf könnte nicht mehr kleben.
                      // `flex` ist für Termine nötig: ein <button> zentriert seinen
                      // Inhalt sonst in einer inneren Box, in der nichts klebt.
                      className="flex h-full w-full flex-col overflow-clip rounded-md text-xs"
                    >
                      {/* Klebt oben im sichtbaren Bereich: Titel und Uhrzeit bleiben
                          lesbar, bis der Block ganz aus dem Bild gescrollt ist. */}
                      <span className="sticky top-0 flex flex-col px-1.5 py-0.5">
                        <span className="truncate font-semibold">{entry.title}</span>
                        {height >= 2 * MIN_BLOCK_PX ? (
                          <span className="text-muted-foreground truncate tabular-nums">
                            {time}
                          </span>
                        ) : null}
                      </span>
                    </EntryElement>
                  </div>
                );
              })}

              {iso === todayIso ? <NowLine minutes={minutesSinceMidnight(now)} /> : null}
            </div>
          );
        })}
      </TimeGridBody>
    </div>
  );
}
