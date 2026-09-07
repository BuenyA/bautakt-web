import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

export type OrderListFilter = 'all' | 'quote';

export type OrderListRow = {
  id: string;
  name: string;
  status: string;
  customer_label: string;
  customer_id: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

/**
 * Auftraege des aktiven Betriebs. queryKey beginnt mit companyId (Mandant).
 */
export function useOrders(filter: OrderListFilter = 'all') {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['orders', companyId, filter],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<OrderListRow[]> => {
      let query = supabase
        .from('orders')
        .select('id, name, status, customer_label, customer_id, start_date, end_date, created_at')
        .eq('company_id', companyId!)
        .order('created_at', { ascending: false });

      if (filter === 'quote') {
        query = query.eq('status', 'quote');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}
