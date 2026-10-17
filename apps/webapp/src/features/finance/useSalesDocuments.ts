import type { PaymentRow, SalesDocumentRow } from '@bautakt/finance';
import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

import {
  SALES_DOCUMENT_BUYER_SELECT,
  type SalesDocumentBuyerFields,
  salesDocumentBuyerLabel,
} from './salesDocumentBuyer';

/** Belegarten, die als Rechnung gelten — Angebote liegen auf einer eigenen Seite. */
export const INVOICE_TYPE_LIST = ['invoice', 'partial_invoice', 'final_invoice'] as const;

/**
 * Belege der Liste `/rechnungen`: Rechnungen, Auftragsbestätigungen,
 * Lieferscheine. Angebote bleiben auf der eigenen Seite. Gutschrift und
 * Storno haben auf der Handy-Liste keinen Chip und kommen hier nicht dazu.
 */
export const FINANCE_LIST_TYPES = [
  ...INVOICE_TYPE_LIST,
  'order_confirmation',
  'delivery_note',
] as const;

/** Belegarten des Angebotsbereichs. */
export const QUOTE_TYPE_LIST = ['quote'] as const;

export type SalesDocumentListRow = SalesDocumentRow & {
  customer_label: string;
  currency: string;
  payment_term_days: number | null;
  created_at: string;
  e_invoice: boolean;
};

type QueryRow = Omit<SalesDocumentListRow, 'customer_label'> & SalesDocumentBuyerFields;

const SELECT = `id, type, status, document_number, issue_date, due_date, gross_total, net_total, vat_total, credited_total, customer_id, currency, payment_term_days, created_at, e_invoice, ${SALES_DOCUMENT_BUYER_SELECT}`;

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

      return ((data ?? []) as unknown as QueryRow[]).map(({ customer, buyer_name, ...row }) => ({
        ...row,
        customer_label: salesDocumentBuyerLabel({ status: row.status, buyer_name, customer }),
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
