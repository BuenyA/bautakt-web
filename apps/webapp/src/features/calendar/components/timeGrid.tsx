import { cn } from '@bautakt/ui';
import { mergeClasses } from '@fluentui/react-components';
import { type ReactNode, type RefObject, useLayoutEffect, useRef, useState } from 'react';

import { parseIsoDay } from '../calendarModel';
import {
  gridColumns,
  HOUR_PX,
  SCROLL_TO_HOUR,
  useTimeGridStyles,
  VISIBLE_HOURS,
} from './timeGridLayout';

/**
 * Kopfzeile mit Wochentag und Datum je Spalte. Mit `onOpenDay` ist jeder Tag
 * ein Knopf (Kalender: springt in die Tagesansicht), sonst nur Text.
 */
export function TimeGridHeader({
  days,
  todayIso,
  onOpenDay,
}: {
  days: readonly string[];
  todayIso: string;
  onOpenDay?: (dayIso: string) => void;
}) {
  const shortWeekday = new Intl.DateTimeFormat('de-DE', { weekday: 'short' });
  const longFormat = new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const single = days.length === 1;

  return (
    <div className="bg-surface grid text-xs font-medium" style={gridColumns(days.length)}>
      <span />
      {days.map((iso) => {
        const date = parseIsoDay(iso);
        const label = single ? (
          longFormat.format(date)
        ) : (
          // Schmal: Wochentag und Tag untereinander, sonst schneidet das Handy ab.
          <span className="flex w-full flex-col items-center justify-center leading-tight sm:flex-row sm:gap-1">
            <span>{shortWeekday.format(date).replace('.', '')}</span>
            <span className="tabular-nums">{date.getDate()}.</span>
          </span>
        );
        const className = cn(
          'truncate px-1 py-2 text-center',
          iso === todayIso ? 'text-primary font-semibold' : 'text-muted-foreground',
        );
        return onOpenDay && !single ? (
          <button
            key={iso}
            type="button"
            onClick={() => onOpenDay(iso)}
            className={cn(className, 'hover:underline')}
          >
            {label}
          </button>
        ) : (
          <span key={iso} className={className}>
            {label}
          </span>
        );
      })}
    </div>
  );
}

/** Abstand unter dem Raster: Padding von `<main>` (sm:p-6) plus Rahmen der Karte. */
const FILL_BOTTOM_PX = 26;
const FILL_MIN_PX = 320;

/**
 * Höhe, mit der der Bereich bis zum Fensterrand reicht: so passt die Woche
 * ohne Seiten-Scroll ins Bild, egal wie hoch das Fenster ist. Nie unter
 * 320 px (sonst sieht man kaum Stunden), nie über den ganzen Tag.
 */
function useFillHeight(ref: RefObject<HTMLElement | null>, enabled: boolean, max: number) {
  const [height, setHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!enabled) return;
    function measure() {
      if (!ref.current) return;
      const top = ref.current.getBoundingClientRect().top + window.scrollY;
      const available = window.innerHeight - top - FILL_BOTTOM_PX;
      setHeight(Math.min(max, Math.max(FILL_MIN_PX, Math.floor(available))));
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [ref, enabled, max]);

  return height;
}

/**
 * Scrollbarer Bereich 0–24 Uhr mit Stundenbeschriftung. Beim ersten Zeichnen
 * steht er auf 7 Uhr — danach gehört die Position der Person. `children`
 * sind die Tagesspalten. Mit `fill` reicht er bis zum Fensterrand
 * (Kalender), sonst zeigt er fest zwölf Stunden (Einsatzplanung).
 */
export function TimeGridBody({
  dayCount,
  fill = false,
  children,
}: {
  dayCount: number;
  fill?: boolean;
  children: ReactNode;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const fullHeight = 24 * HOUR_PX + 16;
  const fillHeight = useFillHeight(viewportRef, fill, fullHeight);

  useLayoutEffect(() => {
    if (viewportRef.current) viewportRef.current.scrollTop = SCROLL_TO_HOUR * HOUR_PX;
  }, []);

  return (
    <div
      ref={viewportRef}
      className="border-border overflow-x-hidden overflow-y-auto overscroll-contain border-t"
      style={{ height: fillHeight ?? VISIBLE_HOURS * HOUR_PX + 16 }}
    >
      <div
        className="relative grid"
        style={{ ...gridColumns(dayCount), height: 24 * HOUR_PX, margin: '8px 0' }}
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
        {children}
      </div>
    </div>
  );
}

/**
 * Die 24 Stundenfelder einer Tagesspalte. Mit `onCreate` ist jedes Feld ein
 * Knopf (anlegen zu dieser Stunde), sonst nur die Linie.
 */
export function HourSlots({
  dayIso,
  slotLabel,
  onCreate,
}: {
  dayIso: string;
  slotLabel: (hour: number) => string;
  onCreate?: (dayIso: string, hour: number) => void;
}) {
  const styles = useTimeGridStyles();
  return (
    <>
      {Array.from({ length: 24 }, (_, hour) =>
        onCreate ? (
          <button
            key={hour}
            type="button"
            className={mergeClasses('absolute right-0 left-0 block', styles.hourLine, styles.slot)}
            style={{ top: hour * HOUR_PX, height: HOUR_PX }}
            aria-label={slotLabel(hour)}
            onClick={() => onCreate(dayIso, hour)}
          />
        ) : (
          <div
            key={hour}
            aria-hidden
            className={mergeClasses('absolute right-0 left-0', styles.hourLine)}
            style={{ top: hour * HOUR_PX, height: HOUR_PX }}
          />
        ),
      )}
    </>
  );
}

/** Rote Linie für die aktuelle Uhrzeit. */
export function NowLine({ minutes }: { minutes: number }) {
  const styles = useTimeGridStyles();
  return (
    <div
      className={mergeClasses('pointer-events-none absolute right-0 left-0 z-20 h-0.5', styles.now)}
      style={{ top: (minutes / 60) * HOUR_PX }}
      aria-hidden
    />
  );
}
