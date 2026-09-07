import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

export type OrderDetail = {
  id: string;
  name: string;
  status: string;
  description: string;
  customer_label: string;
  customer_id: string | null;
  start_date: string | null;
  end_date: string | null;
  street_address: string;
  postal_code: string;
  city: string;
  country: string;
  contract_sum: number | null;
  billing_mode: string;
  cost_center_label: string;
  created_at: string;
};

export function useOrder(orderId: string | undefined) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['orders', companyId, 'detail', orderId],
    enabled: Boolean(companyId && orderId),
    queryFn: async (): Promise<OrderDetail | null> => {
      const { data, error } = await supabase
        .from('orders')
        .select(
          'id, name, status, description, customer_label, customer_id, start_date, end_date, street_address, postal_code, city, country, contract_sum, billing_mode, cost_center_label, created_at',
        )
        .eq('company_id', companyId!)
        .eq('id', orderId!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}
