import { cn } from '@bautakt/ui';
import { Button, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { AddRegular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { coversDay, parseIsoDay } from '@/features/calendar/calendarModel';
import {
  HourSlots,
  NowLine,
  TimeGridBody,
  TimeGridHeader,
} from '@/features/calendar/components/timeGrid';
import {
  HOUR_PX,
  MIN_BLOCK_PX,
  minutesOnDay,
  minutesSinceMidnight,
  useTimeGridStyles,
} from '@/features/calendar/components/timeGridLayout';
import { CrewFaces } from '@/features/overview/components/CrewAvatars';
import { layoutLanes } from '@/features/overview/today';
import { formatDate, formatTime } from '@/lib/format';
import { routes } from '@/lib/routes';

import type { AssignmentListRow } from '../useAssignments';

const useStyles = makeStyles({
  block: {
    backgroundColor: tokens.colorBrandBackground2,
    borderLeft: `3px solid ${tokens.colorBrandStroke1}`,
    color: tokens.colorNeutralForeground1,
    ':hover': { backgroundColor: tokens.colorBrandBackground2Hover },
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '1px' },
  },
  noCrew: { color: tokens.colorPaletteMarigoldForeground2 },
  card: {
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderLeft: `3px solid ${tokens.colorBrandStroke1}`,
    ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover },
  },
});

type Props = {
  days: readonly string[];
  todayIso: string;
  now: Date;
  assignments: readonly AssignmentListRow[];
  /** Signierte Profilbild-URLs, Schlüssel ist der gespeicherte Pfad. */
  urls: Record<string, string>;
  /** Nur mit Planungsrecht: Klick in eine Stunde legt dort einen Einsatz an. */
  onCreate?: (dayIso: string, hour: number) => void;
};

const weekdayShort = new Intl.DateTimeFormat('de-DE', { weekday: 'short' });

/**
 * „07:00–16:00“; über Mitternacht oder mehrere Tage mit Wochentag, sonst sähe
 * „20:00–04:00“ an zwei Tagen wie zwei Einsätze aus.
 */
function timeLabel(assignment: AssignmentListRow): string {
  const start = new Date(assignment.starts_at);
  const end = new Date(assignment.ends_at);
  if (start.toDateString() === end.toDateString()) {
    return `${formatTime(assignment.starts_at)}–${formatTime(assignment.ends_at)}`;
  }
  const day = (date: Date) => weekdayShort.format(date).replace('.', '');
  return `${day(start)} ${formatTime(assignment.starts_at)} – ${day(end)} ${formatTime(assignment.ends_at)}`;
}

function useAssignmentLabel() {
  const { t } = useTranslation();
  return (assignment: AssignmentListRow) =>
    t('domain:assignments.week.openAssignment', {
      order: assignment.order_name || t('domain:assignments.noOrder'),
      time: timeLabel(assignment),
      crew: assignment.crew.length
        ? assignment.crew.map((member) => member.name).join(', ')
        : t('domain:assignments.week.noCrew'),
    });
}

function forDay(assignments: readonly AssignmentListRow[], dayIso: string) {
  return assignments.filter((assignment) =>
    coversDay(assignment.starts_at, assignment.ends_at, false, dayIso),
  );
}

/**
 * Wochenplan der Einsatzplanung. Ab `sm` ein Zeitraster wie die Woche im
 * Kalender, je Einsatz ein blauer Block mit Auftrag, Uhrzeit und den
 * Gesichtern der Eingeteilten. Am Handy wären sieben Spalten zu schmal: dort
 * eine Liste je Tag.
 */
export function AssignmentWeekView(props: Props) {
  return (
    <>
      <div className="hidden sm:block">
        <WeekGrid {...props} />
      </div>
      <div className="sm:hidden">
        <WeekList {...props} />
      </div>
    </>
  );
}

function WeekGrid({ days, todayIso, now, assignments, urls, onCreate }: Props) {
  const { t } = useTranslation();
  const styles = useStyles();
  const gridStyles = useTimeGridStyles();
  const label = useAssignmentLabel();

  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <TimeGridHeader days={days} todayIso={todayIso} />
      <TimeGridBody dayCount={days.length}>
        {days.map((iso) => {
          const timed = forDay(assignments, iso).map((assignment) => ({
            assignment,
            ...minutesOnDay({ startsAt: assignment.starts_at, endsAt: assignment.ends_at }, iso),
          }));
          return (
            <div key={iso} className={mergeClasses('relative', gridStyles.dayLine)}>
              <HourSlots
                dayIso={iso}
                onCreate={onCreate}
                slotLabel={(hour) =>
                  t('domain:assignments.week.createAt', {
                    date: formatDate(iso),
                    hour: String(hour).padStart(2, '0'),
                  })
                }
              />

              {layoutLanes(timed).map(({ assignment, start, end, lane, lanes }) => {
                const height = Math.max(((end - start) / 60) * HOUR_PX, MIN_BLOCK_PX);
                // Erst fällt die Uhrzeit weg, dann die Gesichter — der Auftrag bleibt.
                const showTime = height >= 3 * MIN_BLOCK_PX;
                const showCrew = height >= 2 * MIN_BLOCK_PX;
                // Lange Blöcke dürfen den Auftrag auf zwei Zeilen umbrechen.
                const twoLines = height >= 4 * MIN_BLOCK_PX;
                const text = label(assignment);
                return (
                  <div
                    key={assignment.id}
                    className="absolute z-10 px-0.5"
                    style={{
                      top: (start / 60) * HOUR_PX,
                      height,
                      left: `${(lane / lanes) * 100}%`,
                      width: `${100 / lanes}%`,
                    }}
                  >
                    <Link
                      to={routes.assignment(assignment.id)}
                      title={text}
                      aria-label={text}
                      className={mergeClasses(
                        // `overflow-clip` statt `hidden`: hidden machte den Block zum
                        // Scrollcontainer, und der Kopf könnte nicht mehr kleben.
                        'block h-full w-full overflow-clip rounded-md text-xs',
                        styles.block,
                      )}
                    >
                      {/* Klebt oben im sichtbaren Bereich: Auftrag und Leute bleiben
                          lesbar, auch wenn der Block vor 7 Uhr oder am Vortag beginnt. */}
                      <span className="sticky top-0 flex flex-col gap-0.5 px-1.5 py-1">
                        <span
                          className={cn(
                            'font-semibold break-words hyphens-auto',
                            twoLines ? 'line-clamp-2' : 'truncate',
                          )}
                        >
                          {assignment.order_name || t('domain:assignments.noOrder')}
                        </span>
                        {showTime ? (
                          <span className="text-muted-foreground truncate tabular-nums">
                            {timeLabel(assignment)}
                          </span>
                        ) : null}
                        {showCrew ? (
                          <span className="mt-0.5 flex min-w-0">
                            {assignment.crew.length > 0 ? (
                              <CrewFaces
                                crew={assignment.crew}
                                urls={urls}
                                size={20}
                                maxInline={lanes >= 3 ? 2 : lanes === 2 ? 3 : 4}
                              />
                            ) : (
                              <span className={cn('truncate', styles.noCrew)}>
                                {t('domain:assignments.week.noCrew')}
                              </span>
                            )}
                          </span>
                        ) : null}
                      </span>
                    </Link>
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

function WeekList({ days, todayIso, assignments, urls, onCreate }: Props) {
  const { t } = useTranslation();
  const styles = useStyles();
  const label = useAssignmentLabel();
  const dayFormat = new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="flex flex-col gap-5">
      {days.map((iso) => {
        const list = forDay(assignments, iso);
        return (
          <section key={iso} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h2
                className={cn(
                  'text-sm font-semibold',
                  iso === todayIso ? 'text-primary' : 'text-foreground',
                )}
              >
                {dayFormat.format(parseIsoDay(iso))}
                {iso === todayIso ? (
                  <span className="text-muted-foreground font-normal">
                    {' · '}
                    {t('domain:assignments.week.today')}
                  </span>
                ) : null}
              </h2>
              {onCreate ? (
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<AddRegular />}
                  aria-label={t('domain:assignments.week.createAt', {
                    date: formatDate(iso),
                    hour: '07',
                  })}
                  onClick={() => onCreate(iso, 7)}
                />
              ) : null}
            </div>

            {list.length === 0 ? (
              <p className="text-text-subtle text-sm">–</p>
            ) : (
              list.map((assignment) => (
                <Link
                  key={assignment.id}
                  to={routes.assignment(assignment.id)}
                  aria-label={label(assignment)}
                  className={mergeClasses(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5',
                    styles.card,
                  )}
                >
                  <span className="text-muted-foreground w-24 shrink-0 text-xs leading-tight tabular-nums">
                    {timeLabel(assignment)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {assignment.order_name || t('domain:assignments.noOrder')}
                  </span>
                  {assignment.crew.length > 0 ? (
                    <CrewFaces crew={assignment.crew} urls={urls} size={24} maxInline={4} />
                  ) : (
                    <span className={cn('shrink-0 text-xs', styles.noCrew)}>
                      {t('domain:assignments.week.noCrew')}
                    </span>
                  )}
                </Link>
              ))
            )}
          </section>
        );
      })}
    </div>
  );
}
