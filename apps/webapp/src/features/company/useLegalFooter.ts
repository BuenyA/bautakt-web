import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

/** Was eine Mail-Fußzeile aus den Firmendaten braucht (#186). */
export type CompanyLegalDetails = {
  name: string | null;
  street_address: string | null;
  postal_code: string | null;
  city: string | null;
  email: string | null;
  legal_form: string | null;
  register_court: string | null;
  trade_register: string | null;
  managing_directors: string[];
  registered_office: string | null;
};

/**
 * Welche Pflichtangabe für die Fußzeile von Geschäftsmails fehlt
 * (`company_legal_footer_missing`, dieselbe Regel, mit der der Mail-Adapter
 * den Versand sperrt). Leer = vollständig. Codes sind Spaltennamen.
 */
export function useLegalFooterMissing() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return useQuery({
    queryKey: ['company-legal-missing', companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('company_legal_footer_missing', {
        p_company_id: companyId!,
      });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Rechtsangaben des eigenen Betriebs für die Vorschau der Fußzeile. */
export function useCompanyLegalDetails() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return useQuery({
    queryKey: ['company-legal-details', companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<CompanyLegalDetails | null> => {
      const { data, error } = await supabase
        .from('companies')
        .select(
          'name, street_address, postal_code, city, email, legal_form, register_court, trade_register, managing_directors, registered_office',
        )
        .eq('id', companyId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
