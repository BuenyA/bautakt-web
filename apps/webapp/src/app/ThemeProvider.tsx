import * as React from 'react';

import { type Theme, ThemeContext } from './ThemeContext';

const STORAGE_KEY = 'bautakt-theme';

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

/**
 * Hell/Dunkel. Die Farbwerte stehen als Tokens in `@bautakt/ui`; hier wird nur
 * die Klasse `dark` am `<html>` gesetzt, an der die Tokens haengen.
 *
 * Standard ist die Systemeinstellung — wer am Rechner dunkel arbeitet, will das
 * meistens ueberall.
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

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document.documentElement.style.colorScheme = resolved;
  }, [resolved]);

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = React.useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
