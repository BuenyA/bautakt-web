import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

import { datevReleaseHints, type DatevResolvedRow } from './datevAccounts';

/**
 * DATEV-Hinweise vor dem Freigeben (#187): Sammel-Debitor statt Kundennummer,
 * fehlendes Erlöskonto. Nur Hinweise, das Festschreiben nimmt dann die
 * Standardwerte. Liest den gespeicherten Stand; ohne `documentId` (neuer oder
 * ungespeicherter Entwurf) gibt es keine Hinweise.
 */
export function useDatevReleaseHints(documentId: string | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['datev-release-hints', documentId],
    enabled: Boolean(documentId) && enabled,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('datev_resolve_sales_accounts', {
        p_document_id: documentId!,
      });
      if (error) throw error;
      return datevReleaseHints((data ?? []) as DatevResolvedRow[]);
    },
  });
}
