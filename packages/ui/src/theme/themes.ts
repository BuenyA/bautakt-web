import { type Theme, webDarkTheme, webLightTheme } from '@fluentui/react-components';

/**
 * Themes der Web-App: die Standard-Themes von Fluent UI 2.
 *
 * ⚠️ Keine eigene Brand-Ramp und keine eigenen Farben (Owner-Entscheidung
 * 2026-10-10). Hell ist `webLightTheme` unverändert. Dunkel ist `webDarkTheme`
 * mit genau den drei Abweichungen unten; das sind die einzigen Hex-Werte der
 * App. Alles andere läuft über Fluent-Tokens.
 *
 * Der dritte Punkt der Entscheidung (Rahmen um Dialoge und Drawer im
 * Dunkelmodus) ist kein Token, sondern eine Regel in `styles/theme.css`.
 */
export const lightTheme: Theme = webLightTheme;

export const darkTheme: Theme = {
  ...webDarkTheme,
  // Fehlertext. Fluent nutzt beide Tokens für Feld- und Statusmeldungen.
  colorPaletteRedForeground1: '#eeacb2',
  colorStatusDangerForeground1: '#eeacb2',
  // Link im gedrückten Zustand.
  colorBrandForegroundLinkPressed: '#479ef5',
};
