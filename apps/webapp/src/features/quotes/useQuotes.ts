import type { Tables } from '@bautakt/supabase';
import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

import { QUOTE_CUSTOMER_SELECT, quoteCustomerLabel } from './quoteList';

export const QUOTE_ATTACHMENT_BUCKET = 'quote-attachments';

export type QuoteOverviewRow = Tables<'quote_overview'> & { customer_label: string };

const OVERVIEW_SELECT =
  'id, company_id, document_number, kind, customer_id, order_id, subject, responsible_user_id, follow_up_on, decision, decided_at, created_at, modified_at, status, version_no, has_open_draft, version_id, draft_version_id, quote_date, valid_until, issued_at, net_total, vat_total, gross_total, currency';

/** Alle Angebote des aktiven Betriebs. `queryKey` beginnt mit der `companyId`. */
export function useQuoteOverview() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: [companyId, 'quotes', 'overview'],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<QuoteOverviewRow[]> => {
      const [overview, customers] = await Promise.all([
        supabase
          .from('quote_overview')
          .select(OVERVIEW_SELECT)
          .eq('company_id', companyId!)
          .order('created_at', { ascending: false }),
        supabase.from('quotes').select(`id, ${QUOTE_CUSTOMER_SELECT}`).eq('company_id', companyId!),
      ]);
      if (overview.error) throw overview.error;
      if (customers.error) throw customers.error;

      const byId = new Map((customers.data ?? []).map((row) => [row.id, row]));
      return (overview.data ?? []).map((row) => ({
        ...row,
        customer_label: quoteCustomerLabel(row.id ? byId.get(row.id) : undefined),
      }));
    },
  });
}

/** Ein Vorgang mit Versionen, Verlauf und Anhängen. Ohne Recht oder fremd: `null`. */
export function useQuoteDetail(quoteId: string | undefined) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: [companyId, 'quotes', 'detail', quoteId],
    enabled: Boolean(companyId && quoteId),
    queryFn: async () => {
      const [overview, quote, versions, events, attachments] = await Promise.all([
        supabase
          .from('quote_overview')
          .select(OVERVIEW_SELECT)
          .eq('company_id', companyId!)
          .eq('id', quoteId!)
          .maybeSingle(),
        supabase
          .from('quotes')
          .select(
            `id, order_id, site_street, site_postal_code, site_city, site_country, ${QUOTE_CUSTOMER_SELECT}, order:orders(id, name)`,
          )
          .eq('company_id', companyId!)
          .eq('id', quoteId!)
          .maybeSingle(),
        supabase
          .from('quote_versions')
          .select(
            'id, version_no, quote_date, valid_until, net_total, gross_total, currency, issued_at',
          )
          .eq('company_id', companyId!)
          .eq('quote_id', quoteId!)
          .order('version_no', { ascending: false }),
        supabase
          .from('quote_events')
          .select('id, event_type, payload, occurred_at')
          .eq('company_id', companyId!)
          .eq('quote_id', quoteId!)
          .order('occurred_at', { ascending: false }),
        supabase
          .from('quote_attachments')
          .select('id, kind, file_name, file_size, storage_path, created_at')
          .eq('company_id', companyId!)
          .eq('quote_id', quoteId!)
          .order('created_at', { ascending: false }),
      ]);
      for (const result of [overview, quote, versions, events, attachments]) {
        if (result.error) throw result.error;
      }
      if (!overview.data || !quote.data) return null;

      return {
        overview: overview.data,
        customerLabel: quoteCustomerLabel(quote.data),
        order: quote.data.order,
        site: quote.data,
        versions: versions.data ?? [],
        events: events.data ?? [],
        attachments: attachments.data ?? [],
      };
    },
  });
}

/** Signierte Adresse zum Öffnen eines Anhangs (privater Bucket). */
export async function quoteAttachmentUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(QUOTE_ATTACHMENT_BUCKET)
    .createSignedUrl(storagePath, 60);
  if (error) throw error;
  return data.signedUrl;
}
