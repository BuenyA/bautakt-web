import { type Theme, webDarkTheme, webLightTheme } from '@fluentui/react-components';

/**
 * Themes der Web-App auf Basis der Fluent-UI-2-Standard-Themes.
 *
 * Hell ist `webLightTheme` unverändert. Dunkel ist `webDarkTheme`, dessen
 * neutrale Grautöne auf ein kühles Schiefergrau umgefärbt sind (Owner-Wunsch
 * 2026-10-28, Vorbild: dunkle Vergleichsseite mit Seite #1b1d22, Karten
 * #24272e). Brand-Blau und Statusfarben bleiben Fluent. Das löst die
 * Entscheidung vom 2026-10-10 („keine eigenen Farben“) für Dunkel ab.
 *
 * Umgefärbt wird jedes reine Grau des Themes (r = g = b) über die Stützstellen
 * unten, damit Hover-, Rahmen- und Schriftstufen ihre Abstände zueinander
 * behalten. Die Seitenfläche ist dunkler als die Karten; das regelt die Klasse
 * `bg-canvas` in `styles/theme.css`.
 *
 * Der Rahmen um Dialoge und Drawer im Dunkelmodus ist kein Token, sondern eine
 * Regel in `styles/theme.css`.
 */
export const lightTheme: Theme = webLightTheme;

/** Fluent-Grau (0–255) → Schiefergrau. Dazwischen linear. */
const SLATE_STOPS: readonly [number, string][] = [
  [0x00, '#0d0e11'],
  [0x0a, '#121317'],
  [0x14, '#16181c'],
  [0x1f, '#1b1d22'], // colorNeutralBackground2: Seite
  [0x29, '#24272e'], // colorNeutralBackground1: Karten, Felder, Popover
  [0x3d, '#2f3442'], // Hover, colorNeutralStroke3
  [0x52, '#414658'], // colorNeutralStroke2
  [0x66, '#4e546b'], // colorNeutralStroke1
  [0x99, '#8a93a3'], // colorNeutralForeground4
  [0xad, '#a6b0bf'], // colorNeutralForeground3
  [0xd6, '#d0d5de'], // colorNeutralForeground2
  [0xff, '#ffffff'],
];

function channels(hex: string): number[] {
  return [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
}

function toSlate(level: number): string {
  const upper = SLATE_STOPS.findIndex(([stop]) => stop >= level);
  const [toLevel, toHex] = SLATE_STOPS[upper];
  if (toLevel === level || upper === 0) return toHex;
  const [fromLevel, fromHex] = SLATE_STOPS[upper - 1];
  const ratio = (level - fromLevel) / (toLevel - fromLevel);
  const from = channels(fromHex);
  const to = channels(toHex);
  return `#${from
    .map((value, index) => Math.round(value + (to[index] - value) * ratio))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;
}

const GREY = /^#([0-9a-f]{2})\1\1$/i;

const slateDark = Object.fromEntries(
  Object.entries(webDarkTheme).map(([token, value]) => {
    const grey = typeof value === 'string' ? GREY.exec(value) : null;
    return [token, grey ? toSlate(parseInt(grey[1], 16)) : value];
  }),
) as Theme;

export const darkTheme: Theme = {
  ...slateDark,
  // Fehlertext. Fluent nutzt beide Tokens für Feld- und Statusmeldungen.
  colorPaletteRedForeground1: '#eeacb2',
  colorStatusDangerForeground1: '#eeacb2',
  // Link im gedrückten Zustand.
  colorBrandForegroundLinkPressed: '#479ef5',
};
