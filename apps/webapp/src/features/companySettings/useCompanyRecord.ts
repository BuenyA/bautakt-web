import type { Tables } from '@bautakt/supabase';
import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

/** Spalten von `companies`, die der Unternehmensbereich liest. */
const COLUMNS = [
  'id',
  'name',
  'type',
  'team_size',
  'street_address',
  'postal_code',
  'city',
  'country',
  'email',
  'phone_number',
  'tax_number',
  'vat_id',
  'trade_register',
  'legal_form',
  'register_court',
  'managing_directors',
  'registered_office',
  'is_small_business',
  'iban',
  'bic',
  'bank_name',
  'logo_image_url',
  'payment_term_days',
  'invoice_accent_color',
  'invoice_intro_text',
  'invoice_footer_text',
  'auto_payment_reminder',
  'auto_first_dunning',
  'auto_second_dunning',
  'auto_collection',
  'reminder_days_after_due',
  'first_dunning_days_after_due',
  'second_dunning_days_after_due',
  'collection_days_after_due',
] as const;

export type CompanyRecord = Pick<Tables<'companies'>, (typeof COLUMNS)[number]>;

/**
 * Die Zeile des aktiven Betriebs. Ein Schlüssel für alle Abschnitte — nach
 * dem Speichern wird er invalidiert (`useUpdateCompany`) und jede Karte
 * startet vom neuen Stand.
 */
export function useCompanyRecord() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['company-settings', companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<CompanyRecord | null> => {
      const { data, error } = await supabase
        .from('companies')
        .select(COLUMNS.join(', '))
        .eq('id', companyId!)
        .maybeSingle();
      if (error) throw error;
      return data as CompanyRecord | null;
    },
  });
}
