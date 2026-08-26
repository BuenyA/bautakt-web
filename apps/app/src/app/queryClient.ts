import { QueryClient } from '@tanstack/react-query';

/**
 * Die Web-App ist online-first und bekommt bewusst KEINE Outbox und keinen
 * persistenten Cache.
 *
 * bautakt-app hat beides, weil ein Handy auf der Baustelle ohne Empfang
 * weiterarbeiten koennen muss. Am Schreibtisch gilt das nicht, und die
 * Outbox-Maschinerie waere hier reine Komplexitaet mit eigenen Invarianten.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        // Berechtigungsfehler sind dauerhaft — nicht wiederholen.
        const status = (error as { status?: number } | null)?.status;
        if (status === 401 || status === 403) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});
