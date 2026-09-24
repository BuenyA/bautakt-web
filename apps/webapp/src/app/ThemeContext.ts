import * as React from 'react';

export type Theme = 'light' | 'dark' | 'system';

export type ThemeContextValue = {
  theme: Theme;
  /** Was tatsaechlich angezeigt wird — `system` ist hier schon aufgeloest. */
  resolved: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
};

/**
 * Bewusst getrennt von der Komponente: eine Datei, die neben der Komponente
 * auch einen Hook exportiert, bricht Fast Refresh (siehe eslint-Regel
 * `react-refresh/only-export-components`) — dasselbe Muster wie bei
 * `AuthContext` / `useAuth`.
 */
export const ThemeContext = React.createContext<ThemeContextValue | null>(null);
