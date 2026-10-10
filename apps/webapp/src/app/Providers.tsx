import { AppToaster } from '@bautakt/ui';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { AuthProvider } from '@/features/auth/AuthProvider';

import { queryClient } from './queryClient';
import { ThemeProvider } from './ThemeProvider';

/**
 * Reihenfolge zaehlt: AuthProvider liegt INNERHALB des QueryClientProvider,
 * weil er beim Abmelden den Query-Cache leert (siehe AuthProvider, Fallstrick 3).
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>{children}</AuthProvider>
        <LocalizedToaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

/** Die Toast-Region trägt einen deutschen Namen für Screenreader. */
function LocalizedToaster() {
  const { t } = useTranslation();
  return <AppToaster label={t('common:toaster.label')} />;
}
