import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

export type CustomerListRow = {
  id: string;
  company_name: string;
  first_name: string;
  last_name: string;
  customer_number: string | null;
  customer_type: string;
  email: string;
  phone: string;
  city: string;
  created_at: string;
};

/** Anzeigename: Firmenname, sonst Vor- und Nachname. */
export function customerDisplayName(row: {
  company_name: string;
  first_name: string;
  last_name: string;
}): string {
  const company = row.company_name.trim();
  if (company) return company;
  return [row.first_name, row.last_name]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');
}

/**
 * Kunden des aktiven Betriebs. queryKey beginnt mit companyId (Mandant).
 */
export function useCustomers() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['customers', companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<CustomerListRow[]> => {
      const { data, error } = await supabase
        .from('customers')
        .select(
          'id, company_name, first_name, last_name, customer_number, customer_type, email, phone, city, created_at',
        )
        .eq('company_id', companyId!)
        .order('company_name', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
}
