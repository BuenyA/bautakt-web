import { makeStyles, mergeClasses, Text, tokens, Tooltip } from '@fluentui/react-components';
import { CalendarRegular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { useRouterLink } from '@/components/common/useRouterLink';
import { formatTime } from '@/lib/format';
import { routes } from '@/lib/routes';

import { layoutLanes, localDayBounds } from '../today';
import type { TodayAssignment, TodayEvent } from '../useTodayData';
import { CrewAvatars } from './CrewAvatars';

const HOUR_PX = 56;
const DEFAULT_FROM = 6;
const DEFAULT_TO = 20;
/** Termine haben im Briefing oft kein sinnvolles Ende; so bleiben sie lesbar. */
const MIN_EVENT_MINUTES = 30;
const LABEL_WIDTH = 48;

const useStyles = makeStyles({
  assignment: {
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorNeutralForeground1,
    borderLeft: `3px solid ${tokens.colorBrandStroke1}`,
    ':hover': { backgroundColor: tokens.colorBrandBackground2Hover },
  },
  event: {
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground1,
    borderLeft: `3px solid ${tokens.colorNeutralStroke1}`,
  },
  companyEvent: {
    borderLeftColor: tokens.colorPaletteMarigoldBorderActive,
  },
  nowLine: {
    backgroundColor: tokens.colorPaletteRedBackground3,
  },
  nowDot: {
    backgroundColor: tokens.colorPaletteRedBackground3,
  },
  hourLine: {
    borderTop: `1px solid ${tokens.colorNeutralStroke3}`,
  },
});

type Block =
  | { kind: 'assignment'; id: string; start: number; end: number; item: TodayAssignment }
  | { kind: 'event'; id: string; start: number; end: number; item: TodayEvent };

/** Minuten seit Mitternacht, auf den heutigen Tag geklemmt. */
function minutesToday(iso: string, dayStart: Date): number {
  const minutes = (new Date(iso).getTime() - dayStart.getTime()) / 60_000;
  return Math.min(24 * 60, Math.max(0, minutes));
}

/**
 * Der heutige Tag als Zeitleiste: Einsätze als Brand-Blöcke mit Team,
 * Termine neutral, rote Linie für jetzt. Überlappendes steht nebeneinander.
 * Der sichtbare Bereich ist 6–20 Uhr und wächst, wenn etwas früher oder
 * später liegt.
 */
export function DayTimeline({
  assignments,
  events,
  urls,
  now,
}: {
  assignments: readonly TodayAssignment[];
  events: readonly TodayEvent[];
  urls: Record<string, string>;
  now: Date;
}) {
  const styles = useStyles();
  const { start: dayStart } = localDayBounds(now);

  const blocks: Block[] = [
    ...assignments.map((item) => ({
      kind: 'assignment' as const,
      id: item.id,
      start: minutesToday(item.startsAt, dayStart),
      end: minutesToday(item.endsAt, dayStart),
      item,
    })),
    ...events.map((item) => {
      const start = minutesToday(item.startsAt, dayStart);
      return {
        kind: 'event' as const,
        id: item.id,
        start,
        end: Math.max(minutesToday(item.endsAt, dayStart), start + MIN_EVENT_MINUTES),
        item,
      };
    }),
  ];

  const fromHour = Math.min(DEFAULT_FROM, ...blocks.map((block) => Math.floor(block.start / 60)));
  const toHour = Math.max(DEFAULT_TO, ...blocks.map((block) => Math.ceil(block.end / 60)));
  const hours = Array.from({ length: toHour - fromHour }, (_, index) => fromHour + index);
  const top = (minutes: number) => ((minutes - fromHour * 60) / 60) * HOUR_PX;
  const nowMinutes = minutesToday(now.toISOString(), dayStart);
  const showNow = nowMinutes >= fromHour * 60 && nowMinutes <= toHour * 60;

  return (
    <div className="relative" style={{ height: hours.length * HOUR_PX }}>
      {hours.map((hour) => (
        <div
          key={hour}
          className={mergeClasses('absolute right-0 left-0', styles.hourLine)}
          style={{ top: top(hour * 60) }}
          aria-hidden
        >
          <span className="text-text-subtle absolute -top-2.5 left-0 text-xs tabular-nums">
            {String(hour).padStart(2, '0')}:00
          </span>
        </div>
      ))}

      <div className="absolute top-0 right-0 bottom-0" style={{ left: LABEL_WIDTH }}>
        {layoutLanes(blocks).map((block) => (
          <div
            key={`${block.kind}-${block.id}`}
            className="absolute px-0.5"
            style={{
              top: top(block.start),
              height: Math.max(top(block.end) - top(block.start), 24),
              left: `${(block.lane / block.lanes) * 100}%`,
              width: `${100 / block.lanes}%`,
            }}
          >
            {block.kind === 'assignment' ? (
              <AssignmentBlock item={block.item} urls={urls} className={styles.assignment} />
            ) : (
              <EventBlock
                item={block.item}
                className={mergeClasses(
                  styles.event,
                  block.item.eventType === 'all' && styles.companyEvent,
                )}
              />
            )}
          </div>
        ))}

        {showNow ? (
          <div
            className="pointer-events-none absolute right-0 -left-1 flex items-center"
            style={{ top: top(nowMinutes) }}
            aria-hidden
          >
            <span className={mergeClasses('size-2 rounded-full', styles.nowDot)} />
            <span className={mergeClasses('h-0.5 flex-1', styles.nowLine)} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AssignmentBlock({
  item,
  urls,
  className,
}: {
  item: TodayAssignment;
  urls: Record<string, string>;
  className: string;
}) {
  const { t } = useTranslation();
  const link = useRouterLink(routes.assignment(item.id));
  const time = `${formatTime(item.startsAt)}–${formatTime(item.endsAt)}`;

  return (
    <a
      href={link.href}
      onClick={link.onClick}
      className={mergeClasses(
        'flex h-full flex-col gap-1 overflow-hidden rounded-md px-2 py-1.5 transition-colors',
        className,
      )}
      aria-label={`${t('domain:overview.today.assignment')}: ${item.orderName}, ${time}`}
    >
      <span className="flex items-start justify-between gap-2">
        <Text weight="semibold" size={300} truncate wrap={false} className="min-w-0">
          {item.orderName}
        </Text>
        <Text size={200} className="text-text-secondary shrink-0 tabular-nums">
          {time}
        </Text>
      </span>
      {item.location ? (
        <Text size={200} truncate wrap={false} className="text-text-secondary">
          {item.location}
        </Text>
      ) : null}
      {item.crew.length > 0 ? (
        <span className="mt-auto">
          <CrewAvatars crew={item.crew} urls={urls} size={24} />
        </span>
      ) : null}
    </a>
  );
}

function EventBlock({ item, className }: { item: TodayEvent; className: string }) {
  const { t } = useTranslation();
  const kind =
    item.eventType === 'all'
      ? t('domain:overview.today.companyEvent')
      : t('domain:overview.today.privateEvent');

  return (
    <Tooltip content={kind} relationship="description" positioning="above-start">
      <div
        className={mergeClasses(
          'flex h-full items-start gap-1.5 overflow-hidden rounded-md px-2 py-1',
          className,
        )}
      >
        <CalendarRegular fontSize={14} className="mt-0.5 shrink-0" aria-hidden />
        <Text size={200} weight="semibold" truncate wrap={false} className="min-w-0">
          {item.title}
        </Text>
        <Text size={200} className="text-text-secondary ml-auto shrink-0 tabular-nums">
          {formatTime(item.startsAt)}
        </Text>
      </div>
    </Tooltip>
  );
}
