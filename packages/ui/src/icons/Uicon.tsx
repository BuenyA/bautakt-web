import type * as React from 'react';

import { cn } from '../lib/cn';
import {
  boldRoundedGlyphs,
  regularRoundedGlyphs,
  solidRoundedGlyphs,
  type UiconName,
} from './glyphMap';

export type UiconVariant = 'regular' | 'bold' | 'solid';

const GLYPHS: Record<UiconVariant, Record<string, number>> = {
  regular: regularRoundedGlyphs,
  bold: boldRoundedGlyphs,
  solid: solidRoundedGlyphs,
};

export type UiconProps = Omit<React.ComponentProps<'span'>, 'children'> & {
  name: UiconName;
  variant?: UiconVariant;
  /** Kantenlaenge in px. Zeichensatz-Icons skalieren ueber die Schriftgroesse. */
  size?: number;
};

/**
 * Icon aus der Flaticon-Uicon-Schrift — dieselben Namen wie in der Mobile-App
 * (`Uicon` dort). Die Farbe kommt ueber `currentColor`, die Groesse ueber
 * `font-size`; damit verhaelt sich das Icon wie Text und passt in Buttons,
 * Tabellenzellen und die Sidebar, ohne dass irgendwo eine Pixelbreite klebt.
 *
 * Gerendert wird das Glyph als Textinhalt und nicht ueber `::before`: so
 * greifen `text-*`-Klassen unveraendert, und ein fehlender Name faellt beim
 * Testen sofort auf, statt still ein leeres Kaestchen zu zeigen.
 */
export function Uicon({
  name,
  variant = 'regular',
  size = 20,
  className,
  style,
  ...props
}: UiconProps) {
  const codepoint = GLYPHS[variant][name] ?? GLYPHS.regular[name];

  return (
    <span
      data-slot="uicon"
      data-icon={name}
      aria-hidden="true"
      className={cn('bautakt-uicon inline-block shrink-0 leading-none', className)}
      style={{
        fontFamily: `uicons-${variant}-rounded`,
        fontSize: `${size}px`,
        width: `${size}px`,
        height: `${size}px`,
        ...style,
      }}
      {...props}
    >
      {codepoint ? String.fromCharCode(codepoint) : ''}
    </span>
  );
}

export type { UiconName };
