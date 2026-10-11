import { makeStyles, tokens } from '@fluentui/react-components';

import { localIsoDay, parseIsoDay } from '../calendarModel';

/**
 * Maße und Rechnungen des Zeitrasters 0–24 Uhr. Gemeinsam für die Woche im
 * Kalender und den Wochenplan der Einsatzplanung, damit beide gleich aussehen.
 * Eigene Datei, damit `timeGrid.tsx` nur Komponenten exportiert (Fast Refresh).
 */
export const HOUR_PX = 48;
export const LABEL_WIDTH = 52;
export const SCROLL_TO_HOUR = 7;
/** Sichtbar sind zwölf Stunden, der Rest des Tages per Scrollen. */
export const VISIBLE_HOURS = 12;
export const MIN_BLOCK_PX = 22;
const DAY_MINUTES = 24 * 60;

export const useTimeGridStyles = makeStyles({
  hourLine: { borderTop: `1px solid ${tokens.colorNeutralStroke3}` },
  dayLine: { borderLeft: `1px solid ${tokens.colorNeutralStroke3}` },
  slot: {
    ':hover': { backgroundColor: tokens.colorSubtleBackgroundHover },
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '-2px' },
  },
  now: { backgroundColor: tokens.colorPaletteRedBackground3 },
});

/** Spalten: Stundenbeschriftung links, dann je Tag eine gleich breite Spalte. */
export function gridColumns(dayCount: number): { gridTemplateColumns: string } {
  return { gridTemplateColumns: `${LABEL_WIDTH}px repeat(${dayCount}, minmax(0, 1fr))` };
}

/** Minuten eines Eintrags an diesem Tag, auf den Tag geklemmt, mindestens 15. */
export function minutesOnDay(
  item: { startsAt: string; endsAt: string },
  dayIso: string,
): { start: number; end: number } {
  const dayStart = parseIsoDay(dayIso).getTime();
  const toMinutes = (iso: string) =>
    Math.min(DAY_MINUTES, Math.max(0, (new Date(iso).getTime() - dayStart) / 60_000));
  const start = toMinutes(item.startsAt);
  return { start, end: Math.max(toMinutes(item.endsAt), start + 15) };
}

/** Minuten seit Mitternacht für die Jetzt-Linie. */
export function minutesSinceMidnight(now: Date): number {
  return (now.getTime() - parseIsoDay(localIsoDay(now)).getTime()) / 60_000;
}
