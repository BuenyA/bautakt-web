import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

/**
 * Kostenkategorien des Betriebs — Pflichtfeld einer Ausgabe und
 * Standard-Kostenart eines Lieferanten.
 */
export function useCostCategories() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['cost-categories', companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_categories')
        .select('id, name, kind')
        .eq('company_id', companyId!)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
}
