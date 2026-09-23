import { Toaster } from '@bautakt/ui';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

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
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
