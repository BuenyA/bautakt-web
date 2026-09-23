import {
  computeOpenTasks,
  computeOverviewKpis,
  type IncomingInvoiceRow,
  toIsoDate,
} from '@bautakt/finance';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useMembership } from '@/features/company/useMembership';
import {
  INVOICE_TYPE_LIST,
  usePayments,
  useSalesDocuments,
} from '@/features/finance/useSalesDocuments';
import { supabase } from '@/lib/supabase';

/** Eingangsrechnungen — fuer die Aufgabenzeile „faellig diese Woche". */
export function useIncomingInvoices(enabled: boolean) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['incoming-invoices', companyId],
    enabled: enabled && Boolean(companyId),
    queryFn: async (): Promise<IncomingInvoiceRow[]> => {
      const { data, error } = await supabase
        .from('incoming_invoices')
        .select('id, status, due_date, gross_total')
        .eq('company_id', companyId!);

      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Belege, zu denen bereits eine Mahnung existiert — die zaehlen nicht mehr als offen. */
export function useDunnedDocumentIds(enabled: boolean) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['dunning-notices', companyId],
    enabled: enabled && Boolean(companyId),
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('dunning_notices')
        .select('document_id')
        .eq('company_id', companyId!);

      if (error) throw error;
      return (data ?? []).map((row) => row.document_id);
    },
  });
}

/**
 * Alles, was die Startseite zeigt — Kennzahlen und Aufgabenliste.
 *
 * Gerechnet wird in `@bautakt/finance`, nicht hier: dieselben Regeln wie in der
 * Handy-App, und pruefbar ohne React.
 */
export function useOverviewData(enabled: boolean) {
  const documents = useSalesDocuments(INVOICE_TYPE_LIST);
  const payments = usePayments();
  const incoming = useIncomingInvoices(enabled);
  const dunned = useDunnedDocumentIds(enabled);

  const month = toIsoDate(new Date()).slice(0, 7);

  const kpis = useMemo(
    () => computeOverviewKpis(documents.data ?? [], payments.data ?? [], month),
    [documents.data, payments.data, month],
  );

  const tasks = useMemo(
    () =>
      computeOpenTasks(
        documents.data ?? [],
        payments.data ?? [],
        incoming.data ?? [],
        new Set(dunned.data ?? []),
      ),
    [documents.data, payments.data, incoming.data, dunned.data],
  );

  return {
    kpis,
    tasks,
    isLoading: documents.isLoading || payments.isLoading,
    isError: documents.isError || payments.isError,
  };
}
