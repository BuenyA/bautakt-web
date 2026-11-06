import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { usePermission } from '@/features/company/usePermission';
import { supabase } from '@/lib/supabase';

import { type OrderContract, toOrderContract } from './orderContract';

/**
 * Auftragssumme aus der Sicht `order_contract_totals`. Die Sicht liefert nur mit
 * `canViewOrderFinance` eine Zeile; ohne das Recht fragt der Hook gar nicht erst
 * und `canView` ist `false`. `orders.contract_sum` nie direkt lesen: Nach einer
 * Annahme steht dort weiter die alte Summe von Hand.
 */
export function useOrderContract(orderId: string) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const canView = usePermission('canViewOrderFinance');

  const query = useQuery({
    queryKey: ['orders', companyId, 'contract', orderId],
    enabled: Boolean(companyId && canView),
    queryFn: async (): Promise<OrderContract | null> => {
      const { data, error } = await supabase
        .from('order_contract_totals')
        .select('contract_net, source, sum_locked, billing_mode_locked, addendum_count')
        .eq('company_id', companyId!)
        .eq('order_id', orderId)
        .maybeSingle();
      if (error) throw error;
      return data ? toOrderContract(data) : null;
    },
  });

  return {
    canView,
    contract: query.data ?? null,
    isPending: canView && query.isPending,
    isError: query.isError,
    refetch: query.refetch,
  };
}
