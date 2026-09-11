import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

export type CustomerDetail = {
  id: string;
  company_name: string;
  first_name: string;
  last_name: string;
  customer_number: string | null;
  customer_type: string;
  email: string;
  phone: string;
  street_address: string;
  postal_code: string;
  city: string;
  country: string;
  created_at: string;
};

/**
 * Ein Kunde des aktiven Betriebs. queryKey beginnt mit companyId (Mandant).
 */
export function useCustomer(customerId: string | undefined) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['customers', companyId, 'detail', customerId],
    enabled: Boolean(companyId && customerId),
    queryFn: async (): Promise<CustomerDetail | null> => {
      const { data, error } = await supabase
        .from('customers')
        .select(
          'id, company_name, first_name, last_name, customer_number, customer_type, email, phone, street_address, postal_code, city, country, created_at',
        )
        .eq('company_id', companyId!)
        .eq('id', customerId!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}
