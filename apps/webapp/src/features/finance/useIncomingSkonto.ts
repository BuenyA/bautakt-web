import { eurosToMinor, minorToEuros } from '@bautakt/finance';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

import type { SkontoEntry } from './incomingSkonto';
import { useInvalidatePayments } from './useIncomingPayments';

/**
 * Skonto-Einträge einer Eingangsrechnung, älteste zuerst (#166). Die Tabelle
 * ist append-only und zugleich das Protokoll: Wer, wann, was, warum.
 */
export function useSkontoEntries(invoiceId: string) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return useQuery({
    queryKey: ['incoming-invoice-adjustments', companyId, invoiceId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<SkontoEntry[]> => {
      const { data, error } = await supabase
        .from('incoming_invoice_adjustments')
        .select(
          'id, reverses_id, amount, percent, reason, agreed_with, agreed_on, discount_until, actor_name, created_at',
        )
        .eq('company_id', companyId!)
        .eq('invoice_id', invoiceId)
        .eq('kind', 'skonto')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data.map(({ amount, ...rest }) => ({ ...rest, amountMinor: eurosToMinor(amount) }));
    },
  });
}

/**
 * Skonto-Bedingungen aus dem Lieferanten-Stamm, als Vorschlag im Dialog.
 * Ohne Lieferant oder ohne Angaben: `null`.
 */
export function useSupplierSkontoTerms(supplierId: string | null) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return useQuery({
    queryKey: ['supplier-skonto-terms', companyId, supplierId],
    enabled: Boolean(companyId && supplierId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_profiles')
        .select('discount_percent, discount_days')
        .eq('company_id', companyId!)
        .eq('contact_id', supplierId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export type NoteSkontoInput = {
  amountMinor: number;
  percent: number | null;
  reason: string;
  agreedWith: string;
  agreedOn: string;
  discountUntil: string;
};

/** Skonto ändert den Zahlbetrag, also auch Restbetrag und Status (#270). */
function useInvalidateSkonto(invoiceId: string) {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const invalidatePayments = useInvalidatePayments(invoiceId);
  return () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['incoming-invoice-adjustments', companyId, invoiceId],
      }),
      invalidatePayments(),
    ]);
}

/**
 * Skonto vermerken. `note_incoming_invoice_adjustment` prüft alles noch
 * einmal und gibt die neue Zeile zurück; fehlt sie, ist das ein Fehler.
 */
export function useNoteSkonto(invoiceId: string) {
  const invalidate = useInvalidateSkonto(invoiceId);
  return useMutation({
    mutationFn: async (input: NoteSkontoInput) => {
      const { data, error } = await supabase.rpc('note_incoming_invoice_adjustment', {
        p_invoice_id: invoiceId,
        p_kind: 'skonto',
        p_amount: minorToEuros(input.amountMinor),
        // Der generierte Typ kennt kein `null`; die Funktion nimmt es an.
        p_percent: input.percent as number,
        p_reason: input.reason.trim(),
        p_agreed_with: input.agreedWith.trim(),
        p_agreed_on: input.agreedOn,
        p_discount_until: input.discountUntil,
      });
      if (error) throw error;
      if (!data) throw new Error('INCOMING_ADJUSTMENT_NOT_SAVED');
    },
    onSuccess: invalidate,
  });
}

/** Vermerk per Gegen-Eintrag aufheben, mit Begründung. */
export function useReverseSkonto(invoiceId: string) {
  const invalidate = useInvalidateSkonto(invoiceId);
  return useMutation({
    mutationFn: async ({ adjustmentId, reason }: { adjustmentId: string; reason: string }) => {
      const { data, error } = await supabase.rpc('reverse_incoming_invoice_adjustment', {
        p_adjustment_id: adjustmentId,
        p_reason: reason.trim(),
      });
      if (error) throw error;
      if (!data) throw new Error('INCOMING_ADJUSTMENT_NOT_SAVED');
    },
    onSuccess: invalidate,
  });
}
