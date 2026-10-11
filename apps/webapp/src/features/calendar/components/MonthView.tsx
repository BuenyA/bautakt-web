import { cn } from '@bautakt/ui';
import { AddRegular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { formatDate, formatTime } from '@/lib/format';

import { coversDay, type Occurrence, parseIsoDay } from '../calendarModel';
import { type CalendarEntry, EntryElement, ToneDot } from './entries';
import { sortEntries } from './entryOrder';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const VISIBLE_PER_DAY = 3;

/**
 * Monatsraster, sechs Wochen ab Montag. Je Tag bis zu drei Einträge, der Rest
 * als „+N weitere“ (öffnet den Tag). Das Plus im Tag legt dort einen Termin an.
 */
export function MonthView({
  days,
  month,
  todayIso,
  entries,
  onOpenEvent,
  onCreate,
  onOpenDay,
}: {
  days: readonly string[];
  month: number;
  todayIso: string;
  entries: readonly CalendarEntry[];
  onOpenEvent: (occurrence: Occurrence) => void;
  onCreate: (dayIso: string) => void;
  onOpenDay: (dayIso: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <div className="bg-surface text-muted-foreground grid grid-cols-7 text-xs font-medium">
        {WEEKDAYS.map((day) => (
          <span key={day} className="px-2 py-2 text-center">
            {day}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((iso) => {
          const date = parseIsoDay(iso);
          const inMonth = date.getMonth() === month;
          const dayEntries = sortEntries(
            entries.filter((entry) => coversDay(entry.startsAt, entry.endsAt, entry.allDay, iso)),
          );
          const hidden = dayEntries.length - VISIBLE_PER_DAY;
          return (
            <div
              key={iso}
              className={cn(
                'group border-border min-h-16 min-w-0 border-t border-r p-1 sm:min-h-28 sm:p-1.5 [&:nth-child(7n)]:border-r-0',
                inMonth ? 'bg-background' : 'bg-surface/40',
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onOpenDay(iso)}
                  aria-label={t('domain:calendar.openDay', { date: formatDate(iso) })}
                  className={cn(
                    'inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums hover:underline',
                    iso === todayIso
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : inMonth
                        ? 'text-foreground'
                        : 'text-text-subtle',
                  )}
                >
                  {date.getDate()}
                </button>
                <button
                  type="button"
                  onClick={() => onCreate(iso)}
                  aria-label={t('domain:calendar.createOnDay', { date: formatDate(iso) })}
                  className="text-muted-foreground hover:text-foreground focus-visible:opacity-100 inline-flex size-6 items-center justify-center rounded opacity-0 group-hover:opacity-100"
                >
                  <AddRegular fontSize={14} aria-hidden />
                </button>
              </div>

              {/* Am Handy ist eine Zelle zu schmal für Text: Punkte, ein Tipp öffnet den Tag. */}
              {dayEntries.length > 0 ? (
                <button
                  type="button"
                  onClick={() => onOpenDay(iso)}
                  aria-label={t('domain:calendar.openDayBusy', { date: formatDate(iso) })}
                  className="flex flex-wrap gap-1 px-1 sm:hidden"
                >
                  {dayEntries.slice(0, 6).map((entry) => (
                    <ToneDot key={entry.key} tone={entry.tone} />
                  ))}
                </button>
              ) : null}

              <div className="hidden flex-col gap-1 sm:flex">
                {dayEntries.slice(0, VISIBLE_PER_DAY).map((entry) => {
                  const time = entry.allDay ? '' : formatTime(entry.startsAt);
                  return (
                    <EntryElement
                      key={entry.key}
                      entry={entry}
                      onOpenEvent={onOpenEvent}
                      label={time ? `${time} ${entry.title}` : entry.title}
                      className="block truncate rounded px-1.5 py-0.5 text-xs"
                    >
                      {time ? <span className="tabular-nums">{time} </span> : null}
                      {entry.title}
                    </EntryElement>
                  );
                })}
                {hidden > 0 ? (
                  <button
                    type="button"
                    onClick={() => onOpenDay(iso)}
                    className="text-text-subtle hover:text-foreground px-1.5 text-left text-xs"
                  >
                    {t('domain:calendar.more', { count: hidden })}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
