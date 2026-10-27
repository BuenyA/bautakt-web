import { makeStyles } from '@fluentui/react-components';

/**
 * Maße und Bewegung der Seitenleiste.
 *
 * Ein- und ausgeklappt haben dieselbe Anordnung: Icons, Signet und Avatar
 * stehen in beiden Zuständen auf derselben Mittellinie (`RAIL_WIDTH / 2`). Beim
 * Umschalten bewegt sich nur die Breite, die Texte blenden aus bzw. ein — nichts
 * springt um. So machen es heutige Seitenleisten (Linear, Notion, ChatGPT).
 */
export const RAIL_WIDTH = 68;
/** Einzug links und rechts; eingeklappt bleibt genau ein 44-px-Quadrat übrig. */
export const SIDEBAR_INSET = 12;

/**
 * Ausrollende Kurve ohne Nachfedern, wie sie iOS- und Web-Schubladen nutzen:
 * schneller Start, weiches Ende. `curveEasyEase` wirkte daneben mechanisch.
 */
const EASE_OUT = 'cubic-bezier(0.32, 0.72, 0, 1)';
export const SIDEBAR_DURATION = '280ms';

export const useSidebarStyles = makeStyles({
  // Text eines Eintrags. Beim Ausklappen blendet er leicht verzögert ein,
  // sobald Platz da ist; beim Einklappen sofort und schnell aus.
  label: {
    // Flex-Kind des Eintrags: darf schrumpfen, damit es selbst abschneidet.
    minWidth: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'clip',
    transitionProperty: 'opacity',
    transitionDuration: '180ms',
    transitionDelay: '80ms',
    transitionTimingFunction: 'ease-out',
    '@media (prefers-reduced-motion: reduce)': {
      transitionDuration: '0.01ms',
      transitionDelay: '0ms',
    },
  },
  labelHidden: {
    opacity: 0,
    transitionDuration: '90ms',
    transitionDelay: '0ms',
  },
  // Eintrag (Fluent `NavItem`): Icon 20 px mit 12 px Einzug steht auf der
  // Mittellinie der schmalen Leiste. Abgeschnitten wird im Text (`label`), nicht
  // hier — sonst verschwände der Auswahl-Balken links außerhalb des Eintrags.
  item: {
    paddingInlineStart: '12px',
    whiteSpace: 'nowrap',
    // Fluents Auswahl-Balken sitzt sonst mit festem Versatz zum Inhalt; hier
    // steht er in beiden Zuständen am linken Rand der Leiste (12 − 8 = 4 px).
    '::after': {
      left: '-8px',
      marginInlineStart: 0,
    },
  },
  drawerMotion: {
    transitionProperty: 'width',
    transitionDuration: SIDEBAR_DURATION,
    transitionTimingFunction: EASE_OUT,
    '@media (prefers-reduced-motion: reduce)': {
      transitionDuration: '0.01ms',
    },
  },
});
