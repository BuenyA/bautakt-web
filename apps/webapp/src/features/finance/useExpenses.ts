import type { DatedAmount } from '@bautakt/finance';
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
  /**
   * Restbetrag aus `incoming_invoice_balances`: Brutto minus Skonto minus
   * aktive Zahlungen (#270). `null`, wenn die Sicht keine Zeile liefert.
   */
  open_total: number | null;
  /** Wann sie im System ankam — die Übersicht zeigt, was neu ist. */
  created_at: string;
  /** `manual`, `zugferd` oder `xrechnung`; die letzten beiden sind E-Rechnungen. */
  source_format: string;
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
      const [invoices, balances] = await Promise.all([
        supabase
          .from('incoming_invoices')
          .select(
            'id, invoice_number, vendor_name, invoice_date, due_date, status, net_total, vat_total, gross_total, created_at, source_format',
          )
          .eq('company_id', companyId!)
          .order('due_date', { ascending: true, nullsFirst: false }),
        supabase
          .from('incoming_invoice_balances')
          .select('invoice_id, open_total')
          .eq('company_id', companyId!),
      ]);

      if (invoices.error) throw invoices.error;
      if (balances.error) throw balances.error;
      const open = new Map(balances.data.map((row) => [row.invoice_id, row.open_total]));
      return invoices.data.map((row) => ({ ...row, open_total: open.get(row.id) ?? null }));
    },
  });
}

/**
 * Tatsächliche Aufwände als datierte Netto-Beträge: Ausgaben ohne
 * kalkulatorische und alle Eingangsrechnungen. Grundlage der Monatsreihe
 * „Ausgaben“ auf Übersicht und Rechnungs-Übersicht.
 */
export function expenseEntries(
  expenses: readonly ExpenseRow[],
  incoming: readonly IncomingInvoiceListRow[],
): DatedAmount[] {
  return [
    ...expenses
      .filter((expense) => !expense.is_calculatory)
      .map((expense) => ({ dateIso: expense.invoice_date, amount: expense.amount_net })),
    ...incoming.map((invoice) => ({ dateIso: invoice.invoice_date, amount: invoice.net_total })),
  ];
}
