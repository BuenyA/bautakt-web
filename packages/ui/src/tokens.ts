/**
 * Token-Werte, die JavaScript braucht — Charts, Status-Punkte, Canvas.
 *
 * ⚠️ Die semantischen Farben (Flaechen, Text, Primary, Danger ...) stehen NICHT
 * hier, sondern in styles/theme.css. Fuer das Web ist die CSS-Datei kanonisch;
 * doppelte Pflege in TS und CSS waere genau die Art Duplikat, die auseinander
 * laeuft. In Komponenten also `bg-primary`, nicht `tokens.blue`.
 *
 * Portiert aus bautakt-app/app/constants/theme.ts (Stand 2026-08-26).
 */

/**
 * Fill-only: als Hintergrund von Badges, Icon-Kacheln, Punkten und
 * Chart-Serien gedacht, NICHT als Textfarbe — `yellow` erreicht auf Weiss nur
 * 2.15:1. Fuer Text/Icons stattdessen die semantischen Tokens verwenden.
 */
export const statusFills = {
  blue: '#0a66c2',
  red: '#EF4444',
  green: '#26A85A',
  yellow: '#F59E0B',
  purple: '#8B5CF6',
  orange: '#FF5C00',
  slate: '#475569',
  white: '#FFFFFF',
} as const;

export const chartSeries = {
  loss: '#991B1B',
  material: '#38BDF8',
  labor: '#FB7185',
  other: '#A78BFA',
} as const;

export type StatusFill = keyof typeof statusFills;
export type ChartSeries = keyof typeof chartSeries;
