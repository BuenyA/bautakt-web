import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

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
 * Aufträge des aktiven Betriebs, alle Status. Die Liste filtert die Art
 * clientseitig (`orderList`), damit Laufend/Abgeschlossen und
 * Angebote/Abgelehnt aus demselben Cache kommen. queryKey beginnt mit
 * companyId (Mandant).
 */
export function useOrders() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['orders', companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<OrderListRow[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, name, status, customer_label, customer_id, start_date, end_date, created_at')
        .eq('company_id', companyId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}
