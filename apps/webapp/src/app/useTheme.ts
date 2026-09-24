import * as React from 'react';

import { ThemeContext, type ThemeContextValue } from './ThemeContext';

export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext);
  if (!context) throw new Error('useTheme muss innerhalb von <ThemeProvider> benutzt werden.');
  return context;
}
