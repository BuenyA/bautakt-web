import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/useAuth';
import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

import type { IncomingInvoiceStatus } from './incomingInvoiceForm';

export type IncomingInvoiceRow = {
  id: string;
  status: IncomingInvoiceStatus;
  supplier_id: string | null;
  vendor_name: string;
  vendor_vat_id: string;
  vendor_iban: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  net_total: number;
  vat_total: number;
  gross_total: number;
  currency: string;
  order_id: string | null;
  cost_category_id: string | null;
  notes: string;
  source_format: string;
  storage_path: string | null;
};

/** Felder, die das Formular schreibt. `storage_path`/`content_hash` setzt nur der Server (#161). */
export type IncomingInvoiceWrite = {
  status: IncomingInvoiceStatus;
  supplier_id: string | null;
  vendor_name: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  net_total: number;
  vat_total: number;
  gross_total: number;
  order_id: string | null;
  cost_category_id: string | null;
  notes: string;
};

export function useIncomingInvoice(id: string | null) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['incoming-invoice', companyId, id],
    enabled: Boolean(companyId && id),
    queryFn: async (): Promise<IncomingInvoiceRow> => {
      const { data, error } = await supabase
        .from('incoming_invoices')
        .select(
          'id, status, supplier_id, vendor_name, vendor_vat_id, vendor_iban, invoice_number, invoice_date, due_date, net_total, vat_total, gross_total, currency, order_id, cost_category_id, notes, source_format, storage_path',
        )
        .eq('company_id', companyId!)
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as IncomingInvoiceRow;
    },
  });
}

/**
 * Liste und offene Belege neu laden. Ein gelöschter Beleg fliegt aus dem Cache,
 * statt neu geladen zu werden: Sonst liefe seine Abfrage in den Fehler und die
 * Wiederholungen hielten das Löschen mehrere Sekunden auf.
 */
function useInvalidateIncoming() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return async (deletedId?: string) => {
    if (deletedId) {
      queryClient.removeQueries({ queryKey: ['incoming-invoice', companyId, deletedId] });
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['incoming-invoices-list', companyId] }),
      queryClient.invalidateQueries({ queryKey: ['incoming-invoice', companyId] }),
    ]);
  };
}

/**
 * Anlegen oder ändern. Ein erfasster Beleg ändert nur noch den Status
 * (`onlyStatus`); was sonst im Formular steht, wird dann nicht gesendet.
 * 0 geänderte Zeilen ist ein Fehler, kein stiller Erfolg.
 */
export function useSaveIncomingInvoice() {
  const { data: membership } = useMembership();
  const { user } = useAuth();
  const companyId = membership?.companyId;
  const invalidate = useInvalidateIncoming();

  return useMutation({
    mutationFn: async ({
      id,
      values,
      onlyStatus,
    }: {
      id: string | null;
      values: IncomingInvoiceWrite;
      onlyStatus: boolean;
    }): Promise<string> => {
      if (id === null) {
        const { data, error } = await supabase
          .from('incoming_invoices')
          .insert({ ...values, company_id: companyId!, created_by: user?.id ?? null })
          .select('id')
          .single();
        if (error) throw error;
        return data.id;
      }

      const patch = onlyStatus ? { status: values.status } : values;
      const { data, error } = await supabase
        .from('incoming_invoices')
        .update({ ...patch, modified_at: new Date().toISOString() })
        .eq('company_id', companyId!)
        .eq('id', id)
        .select('id');
      if (error) throw error;
      if (!data || data.length !== 1) throw new Error('INCOMING_INVOICE_NOT_SAVED');
      return id;
    },
    onSuccess: () => invalidate(),
  });
}

/** Nur Entwürfe; der Filter auf `draft` steht zusätzlich zur Datenbank-Sperre. */
export function useDeleteIncomingDraft() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const invalidate = useInvalidateIncoming();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('incoming_invoices')
        .delete()
        .eq('company_id', companyId!)
        .eq('id', id)
        .eq('status', 'draft')
        .select('id');
      if (error) throw error;
      if (!data || data.length !== 1) throw new Error('INCOMING_INVOICE_NOT_DELETED');
    },
    onSuccess: (_, id) => invalidate(id),
  });
}
