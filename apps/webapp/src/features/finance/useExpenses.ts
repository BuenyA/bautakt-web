import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

export type ExpenseRow = {
  id: string;
  title: string;
  vendor: string;
  invoice_date: string;
  amount_net: number;
  vat_amount: number;
  vat_rate: number;
  is_calculatory: boolean;
  category_name: string;
  notes: string;
};

export type IncomingInvoiceListRow = {
  id: string;
  invoice_number: string;
  vendor_name: string;
  invoice_date: string;
  due_date: string | null;
  status: string;
  net_total: number;
  vat_total: number;
  gross_total: number;
};

/**
 * Ausgaben (Gemeinkosten, Material, sonstige Belege).
 *
 * `is_calculatory` markiert kalkulatorische Kosten — Werte, die der Kalkulation
 * dienen, aber nie gebucht wurden (etwa Unternehmerlohn). Sie stehen in der
 * Liste, zaehlen aber nicht in die Summe der tatsaechlichen Ausgaben.
 */
export function useExpenses() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['expenses', companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<ExpenseRow[]> => {
      const { data, error } = await supabase
        .from('expenses')
        .select(
          'id, title, vendor, invoice_date, amount_net, vat_amount, vat_rate, is_calculatory, notes, cost_categories(name)',
        )
        .eq('company_id', companyId!)
        .order('invoice_date', { ascending: false });

      if (error) throw error;

      return (
        (data ?? []) as unknown as (Omit<ExpenseRow, 'category_name'> & {
          cost_categories: { name: string } | null;
        })[]
      ).map(({ cost_categories, ...row }) => ({
        ...row,
        category_name: cost_categories?.name ?? '',
      }));
    },
  });
}

/** Eingangsrechnungen — was der Betrieb selbst zu zahlen hat. */
export function useIncomingInvoiceList() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['incoming-invoices-list', companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<IncomingInvoiceListRow[]> => {
      const { data, error } = await supabase
        .from('incoming_invoices')
        .select(
          'id, invoice_number, vendor_name, invoice_date, due_date, status, net_total, vat_total, gross_total',
        )
        .eq('company_id', companyId!)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}
