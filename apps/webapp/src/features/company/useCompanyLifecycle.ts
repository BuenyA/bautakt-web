import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/useAuth';
import { supabase } from '@/lib/supabase';

import { type LifecycleRow, lifecycleView } from './lifecycle';
import { useMembership } from './useMembership';

/**
 * Status meiner Betriebe nach Vertragsende (`my_company_lifecycle`, Löschkonzept WP3).
 * Nutzerbezogen, deshalb die Nutzer-Id im Key. Ein Fehler sperrt nichts: Die Datenbank
 * entscheidet ohnehin selbst, die Seite zeigt dann nur keinen Hinweis.
 */
export function useCompanyLifecycle() {
  const { user } = useAuth();
  const { data: membership } = useMembership();
  const query = useQuery({
    queryKey: ['company-lifecycle', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<LifecycleRow[]> => {
      const { data, error } = await supabase.rpc('my_company_lifecycle');
      if (error) throw error;
      return data ?? [];
    },
    // Statuswechsel macht der tägliche Job; beim Fokussieren nachsehen reicht.
    staleTime: 5 * 60 * 1000,
  });
  return {
    isPending: query.isPending && query.fetchStatus !== 'idle',
    view: lifecycleView(query.data, membership?.companyId),
  };
}
