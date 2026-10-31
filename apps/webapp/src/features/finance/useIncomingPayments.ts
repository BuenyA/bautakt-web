import { eurosToMinor, minorToEuros } from '@bautakt/finance';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

import type { PaymentEntry } from './incomingPayments';

/**
 * Zahlungen einer Eingangsrechnung samt Stornos, älteste zuerst (#270). Die
 * Tabelle ist append-only; geschrieben wird nur über die beiden RPCs.
 */
export function useIncomingPayments(invoiceId: string) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return useQuery({
    queryKey: ['incoming-invoice-payments', companyId, invoiceId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<PaymentEntry[]> => {
      const { data, error } = await supabase
        .from('incoming_invoice_payments')
        .select('id, reverses_id, paid_at, amount, method, note, reason, actor_name, created_at')
        .eq('company_id', companyId!)
        .eq('incoming_invoice_id', invoiceId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data.map(({ amount, ...rest }) => ({ ...rest, amountMinor: eurosToMinor(amount) }));
    },
  });
}

/**
 * Zahlbetrag, gezahlt und offen aus `incoming_invoice_balances`, in Cent. Die
 * Sicht rechnet wie die Datenbank beim Setzen des Status; die Oberfläche
 * rechnet nicht selbst nach.
 */
export function useIncomingBalance(invoiceId: string) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return useQuery({
    queryKey: ['incoming-invoice-balance', companyId, invoiceId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incoming_invoice_balances')
        .select('payable_total, paid_total, open_total')
        .eq('company_id', companyId!)
        .eq('invoice_id', invoiceId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('INCOMING_NOT_FOUND');
      return {
        payableMinor: eurosToMinor(data.payable_total),
        paidMinor: eurosToMinor(data.paid_total),
        openMinor: eurosToMinor(data.open_total),
      };
    },
  });
}

/**
 * Nach einer Zahlung oder einem Skonto ändern sich Restbetrag, Status und
 * Protokoll der Rechnung, und die Übersichten zählen anders.
 */
export function useInvalidatePayments(invoiceId: string) {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return () =>
    Promise.all(
      [
        ['incoming-invoice-payments', companyId, invoiceId],
        ['incoming-invoice-balance', companyId, invoiceId],
        ['incoming-invoice', companyId, invoiceId],
        ['incoming-invoice-events', companyId, invoiceId],
        ['incoming-invoices-list', companyId],
      ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
}

export type RecordPaymentInput = {
  paidAt: string;
  amountMinor: number;
  method: string;
  note: string;
};

/**
 * Zahlung erfassen. `record_incoming_invoice_payment` prüft alles noch einmal,
 * setzt den Status und gibt die neue Zeile zurück; fehlt sie, ist das ein Fehler.
 */
export function useRecordPayment(invoiceId: string) {
  const invalidate = useInvalidatePayments(invoiceId);
  return useMutation({
    mutationFn: async (input: RecordPaymentInput) => {
      const { data, error } = await supabase.rpc('record_incoming_invoice_payment', {
        p_invoice_id: invoiceId,
        p_paid_at: input.paidAt,
        p_amount: minorToEuros(input.amountMinor),
        p_method: input.method.trim(),
        p_note: input.note.trim(),
      });
      if (error) throw error;
      if (!data) throw new Error('INCOMING_PAYMENT_NOT_SAVED');
    },
    onSettled: invalidate,
  });
}

/** Zahlung per Storno aufheben, mit Begründung. */
export function useReversePayment(invoiceId: string) {
  const invalidate = useInvalidatePayments(invoiceId);
  return useMutation({
    mutationFn: async ({ paymentId, reason }: { paymentId: string; reason: string }) => {
      const { data, error } = await supabase.rpc('reverse_incoming_invoice_payment', {
        p_payment_id: paymentId,
        p_reason: reason.trim(),
      });
      if (error) throw error;
      if (!data) throw new Error('INCOMING_PAYMENT_NOT_SAVED');
    },
    onSettled: invalidate,
  });
}
