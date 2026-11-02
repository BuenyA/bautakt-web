import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

import { indexDuplicates } from './incomingDuplicates';

/** Mögliche Dubletten des Betriebs (bautakt-web#288). Die Rechte prüft die Datenbank. */
export function useIncomingDuplicates() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return useQuery({
    queryKey: ['incoming-duplicates', companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incoming_duplicate_matches')
        .select('kind, id, match, other_kind, other_id, other_label')
        .eq('company_id', companyId!);
      if (error) throw error;
      return indexDuplicates(data);
    },
  });
}
