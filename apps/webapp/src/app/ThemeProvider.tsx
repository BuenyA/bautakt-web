import { darkTheme, lightTheme } from '@bautakt/ui';
import { FluentProvider } from '@fluentui/react-components';
import * as React from 'react';

import { type Theme, ThemeContext } from './ThemeContext';

const STORAGE_KEY = 'bautakt-theme';

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

/**
 * Hell/Dunkel über Fluents `FluentProvider` mit den Standard-Themes
 * (`theme/themes.ts` in `@bautakt/ui`).
 *
 * Standard ist die Systemeinstellung — wer am Rechner dunkel arbeitet, will das
 * meistens ueberall. Das Menü „Darstellung“ in der Shell setzt `theme`.
 *
 * Am `<html>` stehen zusätzlich `data-theme` (für den Rahmen um Dialoge und
 * Drawer im Dunkeln, siehe `styles/theme.css`), `color-scheme` (Scrollbars,
 * native Controls) und die Canvas-Farbe aus dem Theme, damit beim
 * Über-Scrollen keine weisse Fläche hinter der dunklen App auftaucht.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(readStoredTheme);
  const [systemDark, setSystemDark] = React.useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  );

  React.useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
  const fluentTheme = resolved === 'dark' ? darkTheme : lightTheme;

  React.useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolved;
    root.style.colorScheme = resolved;
    root.style.backgroundColor = fluentTheme.colorNeutralBackground1;
  }, [resolved, fluentTheme]);

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = React.useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {/* ⚠️ Keine Klassen an den Provider: Fluent kopiert sie auf die Portal-Knoten
          (Popover, Menü), und ein `min-h-svh` dort deckt die ganze Seite zu. */}
      <FluentProvider theme={fluentTheme}>
        <div className="min-h-svh">{children}</div>
      </FluentProvider>
    </ThemeContext.Provider>
  );
}
