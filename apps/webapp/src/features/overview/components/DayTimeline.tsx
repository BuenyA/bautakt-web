import { makeStyles, mergeClasses, Text, tokens, Tooltip } from '@fluentui/react-components';
import { CalendarRegular } from '@fluentui/react-icons';
import { useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useRouterLink } from '@/components/common/useRouterLink';
import { formatTime } from '@/lib/format';
import { routes } from '@/lib/routes';

import { layoutLanes, localDayBounds } from '../today';
import type { TodayAssignment, TodayEvent } from '../useTodayData';

/** Bewusst flach: die Einzelheiten zu jedem Einsatz stehen im Einsatzplan. */
const HOUR_PX = 32;
/** Sichtbar ist ein Arbeitstag (7–19 Uhr); der Rest des Tages ist per Scrollen erreichbar. */
const VISIBLE_FROM = 7;
const VISIBLE_HOURS = 12;
/** Platz über 0:00 und unter 24:00, damit die Randbeschriftungen nicht abgeschnitten werden. */
const EDGE_PX = 8;
/** Kurze Termine bleiben so als Zeile lesbar. */
const MIN_EVENT_MINUTES = 30;
/** Ab dieser Blockhöhe passt die Adresse als zweite Zeile. */
const ADDRESS_MIN_PX = 2 * HOUR_PX;
const MIN_BLOCK_PX = 20;
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
 * Gezeichnet wird der ganze Tag von 0 bis 24 Uhr; sichtbar ist ein Fenster
 * von zwölf Stunden, in dem die Uhrzeit scrollt. Beim Öffnen steht es auf
 * 7 Uhr — oder auf dem ersten Eintrag, wenn der früher liegt. Die Team-Bilder
 * stehen im Einsatzplan, nicht hier.
 */
export function DayTimeline({
  assignments,
  events,
  now,
}: {
  assignments: readonly TodayAssignment[];
  events: readonly TodayEvent[];
  now: Date;
}) {
  const styles = useStyles();
  const { t } = useTranslation();
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

  // 25 Linien für 24 Stunden: die letzte trägt 24:00.
  const hours = Array.from({ length: 25 }, (_, index) => index);
  const top = (minutes: number) => (minutes / 60) * HOUR_PX;
  const nowMinutes = minutesToday(now.toISOString(), dayStart);

  const viewportRef = useRef<HTMLDivElement>(null);
  const firstStartHour = Math.min(
    VISIBLE_FROM,
    ...blocks.map((block) => Math.floor(block.start / 60)),
  );
  // Nur beim ersten Zeichnen ausrichten — danach gehört die Scrollposition der Person.
  useLayoutEffect(() => {
    if (viewportRef.current) viewportRef.current.scrollTop = firstStartHour * HOUR_PX;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={viewportRef}
      // Auf breiten Bildschirmen füllt die Leiste die Karte bis zum
      // Bildschirmrand; darunter zeigt sie das feste Fenster von zwölf Stunden.
      className="overflow-x-hidden overflow-y-auto overscroll-contain xl:h-auto! xl:min-h-0 xl:flex-1"
      style={{ height: VISIBLE_HOURS * HOUR_PX + 2 * EDGE_PX }}
      role="region"
      aria-label={t('domain:overview.today.timelineA11y')}
    >
      <div className="relative" style={{ height: 24 * HOUR_PX, margin: `${EDGE_PX}px 0` }}>
        {hours.map((hour) => (
          <div
            key={hour}
            className={mergeClasses('absolute right-0 left-0', styles.hourLine)}
            style={{ top: top(hour * 60) }}
            aria-hidden
          >
            <span className="text-text-subtle absolute -top-2 left-0 text-[11px] tabular-nums">
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
                height: Math.max(top(block.end) - top(block.start), MIN_BLOCK_PX),
                left: `${(block.lane / block.lanes) * 100}%`,
                width: `${100 / block.lanes}%`,
              }}
            >
              {block.kind === 'assignment' ? (
                <AssignmentBlock
                  item={block.item}
                  showAddress={top(block.end) - top(block.start) >= ADDRESS_MIN_PX}
                  narrow={block.lanes > 1}
                  className={styles.assignment}
                />
              ) : (
                <EventBlock
                  item={block.item}
                  narrow={block.lanes > 1}
                  className={mergeClasses(
                    styles.event,
                    block.item.eventType === 'all' && styles.companyEvent,
                  )}
                />
              )}
            </div>
          ))}

          {nowMinutes > 0 && nowMinutes < 24 * 60 ? (
            <div
              className="pointer-events-none absolute right-0 left-0 flex items-center"
              style={{ top: top(nowMinutes) }}
              aria-hidden
            >
              <span className={mergeClasses('size-2 rounded-full', styles.nowDot)} />
              <span className={mergeClasses('h-0.5 flex-1', styles.nowLine)} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AssignmentBlock({
  item,
  showAddress,
  narrow,
  className,
}: {
  item: TodayAssignment;
  showAddress: boolean;
  /** Mehrere Einträge nebeneinander: nur der Name, die Zeit steht im Tooltip. */
  narrow: boolean;
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
        'flex h-full flex-col overflow-hidden rounded-md px-2 py-0.5 transition-colors',
        className,
      )}
      aria-label={`${t('domain:overview.today.assignment')}: ${item.orderName}, ${time}`}
      title={`${item.orderName} · ${time}`}
    >
      <span className="flex items-baseline gap-2">
        <Text weight="semibold" size={200} truncate wrap={false} className="min-w-0">
          {item.orderName}
        </Text>
        {narrow ? null : (
          <Text size={100} className="text-text-secondary shrink-0 tabular-nums">
            {time}
          </Text>
        )}
      </span>
      {showAddress && !narrow && item.location ? (
        <Text size={100} truncate wrap={false} className="text-text-secondary">
          {item.location}
        </Text>
      ) : null}
    </a>
  );
}

function EventBlock({
  item,
  narrow,
  className,
}: {
  item: TodayEvent;
  narrow: boolean;
  className: string;
}) {
  const { t } = useTranslation();
  const kind =
    item.eventType === 'all'
      ? t('domain:overview.today.companyEvent')
      : t('domain:overview.today.privateEvent');

  return (
    <Tooltip
      content={`${kind} · ${item.title} · ${formatTime(item.startsAt)}`}
      relationship="description"
      positioning="above-start"
    >
      <div
        className={mergeClasses(
          'flex h-full items-start gap-1.5 overflow-hidden rounded-md px-2 py-0.5',
          className,
        )}
      >
        <CalendarRegular fontSize={14} className="mt-0.5 shrink-0" aria-hidden />
        <Text size={200} weight="semibold" truncate wrap={false} className="min-w-0">
          {item.title}
        </Text>
        {narrow ? null : (
          <Text size={200} className="text-text-secondary ml-auto shrink-0 tabular-nums">
            {formatTime(item.startsAt)}
          </Text>
        )}
      </div>
    </Tooltip>
  );
}
