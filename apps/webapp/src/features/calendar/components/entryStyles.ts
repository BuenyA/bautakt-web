import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';

/**
 * Farben wie in der Handy-App: privat blau, Firma rot. Einsätze grün, damit
 * sie sich von Terminen abheben; Abwesenheiten gelb.
 */
export type EntryTone = 'me' | 'all' | 'assignment' | 'absence';

export const useEntryStyles = makeStyles({
  base: {
    borderLeftWidth: '3px',
    borderLeftStyle: 'solid',
    color: tokens.colorNeutralForeground1,
  },
  me: {
    backgroundColor: tokens.colorBrandBackground2,
    borderLeftColor: tokens.colorBrandStroke1,
  },
  all: {
    backgroundColor: tokens.colorPaletteRedBackground1,
    borderLeftColor: tokens.colorPaletteRedBorder2,
  },
  assignment: {
    backgroundColor: tokens.colorPaletteGreenBackground1,
    borderLeftColor: tokens.colorPaletteGreenBorder2,
  },
  absence: {
    backgroundColor: tokens.colorPaletteMarigoldBackground1,
    borderLeftColor: tokens.colorPaletteMarigoldBorder2,
  },
  pending: {
    borderLeftStyle: 'dashed',
  },
  interactive: {
    cursor: 'pointer',
    ':hover': { filter: 'brightness(0.96)' },
  },
  dot: { width: '8px', height: '8px', borderRadius: '9999px' },
  dotMe: { backgroundColor: tokens.colorBrandStroke1 },
  dotAll: { backgroundColor: tokens.colorPaletteRedBorder2 },
  dotAssignment: { backgroundColor: tokens.colorPaletteGreenBorder2 },
  dotAbsence: { backgroundColor: tokens.colorPaletteMarigoldBorder2 },
});

export function useToneClass(tone: EntryTone, pending?: boolean): string {
  const styles = useEntryStyles();
  return mergeClasses(styles.base, styles[tone], pending && styles.pending);
}
