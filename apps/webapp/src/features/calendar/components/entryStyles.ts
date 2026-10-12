import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { createContext, useContext } from 'react';

/** Art eines Eintrags: privater Termin, Firmentermin, Einsatz, Abwesenheit. */
export type EntryTone = 'me' | 'all' | 'assignment' | 'absence';

export const ENTRY_TONES: readonly EntryTone[] = ['me', 'all', 'assignment', 'absence'];

/** Farben, die man in den Kalender-Einstellungen wählen kann. */
export const CALENDAR_COLORS = [
  'blue',
  'purple',
  'red',
  'green',
  'yellow',
  'teal',
  'pink',
  'gray',
] as const;
export type CalendarColor = (typeof CALENDAR_COLORS)[number];

/**
 * Standard: Einsätze blau wie in der Einsatzplanung, privat deshalb lila,
 * Firma rot, Abwesenheiten gelb (Owner-Vorgabe 2026-10-12).
 */
export const DEFAULT_TONE_COLORS: Record<EntryTone, CalendarColor> = {
  me: 'purple',
  all: 'red',
  assignment: 'blue',
  absence: 'yellow',
};

/** Welche Farbe jede Art gerade hat. `CalendarPage` setzt das aus den Einstellungen. */
export const ToneColorsContext =
  createContext<Record<EntryTone, CalendarColor>>(DEFAULT_TONE_COLORS);

export function useToneColor(tone: EntryTone): CalendarColor {
  return useContext(ToneColorsContext)[tone];
}

/**
 * Randfarbe je Farbe. Der Hintergrund ist dieselbe Farbe, stark aufgehellt
 * (hell) bzw. abgedunkelt (dunkel), damit alle Farben gleich kräftig wirken.
 * Blau nimmt die Marken-Tokens und sieht so exakt aus wie die Einsatzplanung.
 */
const tint = (border: string) =>
  `color-mix(in srgb, ${border} 22%, ${tokens.colorNeutralBackground1})`;
const COLOR_TOKENS: Record<CalendarColor, { background: string; border: string }> = {
  blue: { background: tokens.colorBrandBackground2, border: tokens.colorBrandStroke1 },
  purple: {
    background: tint(tokens.colorPalettePurpleBorderActive),
    border: tokens.colorPalettePurpleBorderActive,
  },
  red: {
    background: tint(tokens.colorPaletteRedBorderActive),
    border: tokens.colorPaletteRedBorderActive,
  },
  green: {
    background: tint(tokens.colorPaletteGreenBorderActive),
    border: tokens.colorPaletteGreenBorderActive,
  },
  yellow: {
    background: tint(tokens.colorPaletteMarigoldBorderActive),
    border: tokens.colorPaletteMarigoldBorderActive,
  },
  teal: {
    background: tint(tokens.colorPaletteTealBorderActive),
    border: tokens.colorPaletteTealBorderActive,
  },
  pink: {
    background: tint(tokens.colorPaletteBerryBorderActive),
    border: tokens.colorPaletteBerryBorderActive,
  },
  gray: {
    background: tint(tokens.colorNeutralStrokeAccessible),
    border: tokens.colorNeutralStrokeAccessible,
  },
};

export const useEntryStyles = makeStyles({
  base: {
    borderLeftWidth: '3px',
    borderLeftStyle: 'solid',
    color: tokens.colorNeutralForeground1,
  },
  pending: {
    borderLeftStyle: 'dashed',
  },
  interactive: {
    cursor: 'pointer',
    ':hover': { filter: 'brightness(0.96)' },
  },
  dot: { width: '8px', height: '8px', borderRadius: '9999px' },
});

/** Block: heller Hintergrund, farbiger Rand links. */
export const useBlockColorStyles = makeStyles(
  Object.fromEntries(
    CALENDAR_COLORS.map((color) => [
      color,
      {
        backgroundColor: COLOR_TOKENS[color].background,
        borderLeftColor: COLOR_TOKENS[color].border,
      },
    ]),
  ) as Record<CalendarColor, { backgroundColor: string; borderLeftColor: string }>,
);

/** Punkt (Monat, Jahr, Einstellungen): volle Randfarbe. */
export const useDotColorStyles = makeStyles(
  Object.fromEntries(
    CALENDAR_COLORS.map((color) => [color, { backgroundColor: COLOR_TOKENS[color].border }]),
  ) as Record<CalendarColor, { backgroundColor: string }>,
);

export function useToneClass(tone: EntryTone, pending?: boolean): string {
  const styles = useEntryStyles();
  const colors = useBlockColorStyles();
  const color = useToneColor(tone);
  return mergeClasses(styles.base, colors[color], pending && styles.pending);
}
