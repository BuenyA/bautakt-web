import type { PaymentRow, SalesDocumentRow } from '@bautakt/finance';
import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

/** Belegarten, die als Rechnung gelten — Angebote liegen auf einer eigenen Seite. */
export const INVOICE_TYPE_LIST = ['invoice', 'partial_invoice', 'final_invoice'] as const;

/** Belegarten des Angebotsbereichs. */
export const QUOTE_TYPE_LIST = ['quote'] as const;

export type SalesDocumentListRow = SalesDocumentRow & {
  customer_label: string;
  currency: string;
  payment_term_days: number | null;
  created_at: string;
};

type QueryRow = Omit<SalesDocumentListRow, 'customer_label'> & {
  customers: {
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
};

const SELECT =
  'id, type, status, document_number, issue_date, due_date, gross_total, net_total, vat_total, customer_id, currency, payment_term_days, created_at, customers(company_name, first_name, last_name)';

function customerLabel(row: QueryRow): string {
  const customer = row.customers;
  if (!customer) return '';
  const company = customer.company_name?.trim();
  if (company) return company;
  return [customer.first_name, customer.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
}

/**
 * Verkaufsbelege des aktiven Betriebs.
 *
 * `queryKey` beginnt mit der `companyId`, sonst zeigt ein Firmenwechsel die
 * Belege des vorigen Betriebs aus dem Cache.
 */
export function useSalesDocuments(types: readonly string[]) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const typeKey = [...types].sort().join(',');

  return useQuery({
    queryKey: ['sales-documents', companyId, typeKey],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<SalesDocumentListRow[]> => {
      const { data, error } = await supabase
        .from('sales_documents')
        .select(SELECT)
        .eq('company_id', companyId!)
        .in('type', [...types])
        // Belege ohne Rechnungsdatum sind Entwuerfe — die gehoeren nach oben,
        // weil sie das sind, woran noch jemand arbeiten muss.
        .order('issue_date', { ascending: false, nullsFirst: true })
        .order('created_at', { ascending: false });

      if (error) throw error;

      return ((data ?? []) as unknown as QueryRow[]).map((row) => ({
        ...row,
        customers: undefined,
        customer_label: customerLabel(row),
      })) as SalesDocumentListRow[];
    },
  });
}

/**
 * Zahlungen des Betriebs. Bewusst alle auf einmal statt je Beleg: die offenen
 * Posten brauchen sie ohnehin gebuendelt, und eine Abfrage je Zeile waere bei
 * einigen hundert Belegen ein Wasserfall.
 */
export function usePayments() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['payments', companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<PaymentRow[]> => {
      const { data, error } = await supabase
        .from('payments')
        .select('document_id, amount, skonto_amount')
        .eq('company_id', companyId!);

      if (error) throw error;
      return data ?? [];
    },
  });
}
