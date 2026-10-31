import { hasPermission } from '@bautakt/core';
import {
  computeOrderFinance,
  type LaborRateRow,
  type LaborTimeEntry,
  type SalesDocumentRow,
} from '@bautakt/finance';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

/**
 * Wer welchen Teil der Auftragsfinanzen sieht. Die Grenzen folgen den
 * Select-Policies (gemessen 2026-10-30), damit keine halbe Summe als ganze
 * erscheint:
 *
 * - Belege: `sales_documents`/`_lines` mit `canUseBillingModule`,
 *   `canViewOrderFinance` oder `canViewManagementInvoices`.
 * - Kosten: `order_materials` zeigt ohne `canViewOrderFinance` bzw.
 *   `canViewCompanyFinance` nur eigene Zeilen — dann bleiben die Kosten aus.
 * - Lohn: `time_entries` aller Mitarbeiter und `labor_rates` mit
 *   `canViewWageCosts`. Ohne das Recht heißt es „Kosten ohne Lohn“.
 */
export type OrderFinanceAccess = {
  billing: boolean;
  costs: boolean;
  labor: boolean;
};

export function orderFinanceAccess(
  permissions: Parameters<typeof hasPermission>[0],
): OrderFinanceAccess {
  const orderFinance = hasPermission(permissions, 'canViewOrderFinance');
  const costs = orderFinance || hasPermission(permissions, 'canViewCompanyFinance');
  return {
    billing:
      orderFinance ||
      hasPermission(permissions, 'canUseBillingModule') ||
      hasPermission(permissions, 'canViewManagementInvoices'),
    costs,
    labor: costs && hasPermission(permissions, 'canViewWageCosts'),
  };
}

/** Sichtbar ist der Bereich, sobald Belege oder Kosten gelesen werden dürfen. */
export function canSeeOrderFinance(access: OrderFinanceAccess): boolean {
  return access.billing || access.costs;
}

export function useOrderFinanceAccess(): OrderFinanceAccess | null {
  const { data: membership, isPending } = useMembership();
  if (isPending) return null;
  return orderFinanceAccess(membership?.permissions);
}

export type OrderDocumentRow = SalesDocumentRow & { created_at: string };

export type OrderExpenseListRow = {
  id: string;
  title: string;
  vendor: string;
  invoice_date: string;
  amount_net: number;
  is_calculatory: boolean;
};

export type OrderIncomingListRow = {
  id: string;
  vendor_name: string;
  invoice_number: string;
  invoice_date: string | null;
  net_total: number;
  status: string;
  review_status: string | null;
};

const PAGE_SIZE = 1000;

/** Alle Zeiten des Auftrags; ein großer Auftrag hat schnell mehr als 1000. */
async function fetchOrderTimeEntries(
  companyId: string,
  orderId: string,
): Promise<LaborTimeEntry[]> {
  const rows: LaborTimeEntry[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('time_entries')
      .select('started_at, ended_at, break_minutes, cost_rate, employment_id, order_id')
      .eq('company_id', companyId)
      .eq('order_id', orderId)
      .order('started_at', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

/**
 * Kosten, Abgerechnetes und Belege eines Auftrags. Ein Beleg gehört zum
 * Auftrag, sobald eine seiner Positionen `order_id` trägt — so verknüpft
 * auch die Handy-App (`collectOrderDocumentIds`).
 */
export function useOrderFinance(orderId: string, contractSum: number | null) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const access = useOrderFinanceAccess();

  const documents = useQuery({
    queryKey: ['sales-documents', companyId, 'order', orderId],
    enabled: Boolean(companyId && access?.billing),
    queryFn: async (): Promise<OrderDocumentRow[]> => {
      const { data, error } = await supabase
        .from('sales_documents')
        .select(
          'id, type, status, document_number, issue_date, due_date, gross_total, net_total, vat_total, credited_total, customer_id, created_at, sales_document_lines!inner(order_id)',
        )
        .eq('company_id', companyId!)
        .eq('sales_document_lines.order_id', orderId)
        .order('issue_date', { ascending: false, nullsFirst: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(({ sales_document_lines: _lines, ...row }) => row);
    },
  });

  const costs = useQuery({
    queryKey: ['order-costs', companyId, orderId],
    enabled: Boolean(companyId && access?.costs),
    queryFn: async () => {
      const [materials, expenses, incoming] = await Promise.all([
        supabase
          .from('order_materials')
          .select('quantity, unit_cost')
          .eq('company_id', companyId!)
          .eq('order_id', orderId),
        supabase
          .from('expenses')
          .select('id, title, vendor, invoice_date, amount_net, is_calculatory')
          .eq('company_id', companyId!)
          .eq('order_id', orderId)
          .order('invoice_date', { ascending: false }),
        supabase
          .from('incoming_invoices')
          .select('id, vendor_name, invoice_number, invoice_date, net_total, status, review_status')
          .eq('company_id', companyId!)
          .eq('order_id', orderId)
          .order('invoice_date', { ascending: false }),
      ]);
      if (materials.error) throw materials.error;
      if (expenses.error) throw expenses.error;
      if (incoming.error) throw incoming.error;
      return {
        materials: materials.data ?? [],
        expenses: (expenses.data ?? []) as OrderExpenseListRow[],
        // Abgelehnte Eingangsrechnungen schuldet der Betrieb nicht.
        incoming: ((incoming.data ?? []) as OrderIncomingListRow[]).filter(
          (row) => row.review_status !== 'rejected',
        ),
      };
    },
  });

  const labor = useQuery({
    queryKey: ['order-labor', companyId, orderId],
    enabled: Boolean(companyId && access?.labor),
    queryFn: async (): Promise<{ entries: LaborTimeEntry[]; rates: LaborRateRow[] }> => {
      const [entries, rates] = await Promise.all([
        fetchOrderTimeEntries(companyId!, orderId),
        supabase
          .from('labor_rates')
          .select('scope, cost_rate, order_id, employment_id, valid_from, valid_to')
          .eq('company_id', companyId!),
      ]);
      if (rates.error) throw rates.error;
      return { entries, rates: rates.data ?? [] };
    },
  });

  const finance = useMemo(
    () =>
      computeOrderFinance({
        contractSum,
        documents: documents.data ?? [],
        materials: costs.data?.materials ?? [],
        expenses: costs.data?.expenses ?? [],
        incoming: costs.data?.incoming ?? [],
        labor: access?.labor && labor.data ? labor.data : null,
      }),
    [contractSum, documents.data, costs.data, labor.data, access?.labor],
  );

  const queries = [
    access?.billing ? documents : null,
    access?.costs ? costs : null,
    access?.labor ? labor : null,
  ].filter((query) => query !== null);

  return {
    access,
    finance,
    documents: documents.data ?? [],
    expenses: costs.data?.expenses ?? [],
    incoming: costs.data?.incoming ?? [],
    isPending: access === null || queries.some((query) => query.isPending),
    isError: queries.some((query) => query.isError),
    refetch: () => queries.forEach((query) => void query.refetch()),
  };
}
