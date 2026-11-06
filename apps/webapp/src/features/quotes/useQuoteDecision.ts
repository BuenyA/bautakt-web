/**
 * Daten und Aktionen der Angebotsentscheidung (bautakt-app#186).
 *
 * Geschrieben wird nur über die RPCs `accept_quote`, `decline_quote`,
 * `withdraw_quote` und `revert_quote_decision`. Ein Nachweis (Unterschrift oder
 * Scan) wird vorher hochgeladen; die RPC prüft Pfad, Datei und Prüfsumme.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { sha256Hex } from '@/features/finance/originalIntegrity';
import { supabase } from '@/lib/supabase';

import { currentEvidence, type DecisionKind, evidencePath, selectableItems } from './quoteDecision';
import { QUOTE_ATTACHMENT_BUCKET } from './useQuotes';

/** Entscheidung, Kunde (für die Verbraucher-Sperre), Auswahl und Nachweise. */
export function useQuoteDecisionDetail(quoteId: string | undefined) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: [companyId, 'quotes', 'decision', quoteId],
    enabled: Boolean(companyId && quoteId),
    queryFn: async () => {
      const [quote, platform, selection, evidence] = await Promise.all([
        supabase
          .from('quotes')
          .select(
            'id, decision, accepted_version_id, decided_at, decision_recorded_at, decision_kind, decision_note, decline_reason, customer:customer_profiles(contact:contacts(kind, vat_id))',
          )
          .eq('company_id', companyId!)
          .eq('id', quoteId!)
          .maybeSingle(),
        supabase
          .from('quote_platform_settings')
          .select('consumer_acceptance_enabled')
          .maybeSingle(),
        supabase
          .from('quote_acceptance_items')
          .select('item:quote_items(id, oz, short_text, position_type)')
          .eq('company_id', companyId!)
          .eq('quote_id', quoteId!),
        supabase
          .from('quote_outputs')
          .select('id, storage_path, created_at')
          .eq('company_id', companyId!)
          .eq('quote_id', quoteId!)
          .eq('kind', 'signed_acceptance')
          .order('created_at', { ascending: false }),
      ]);
      for (const result of [quote, platform, selection, evidence]) {
        if (result.error) throw result.error;
      }
      if (!quote.data) return null;
      return {
        quote: quote.data,
        contact: quote.data.customer?.contact ?? null,
        consumerAcceptanceEnabled: platform.data?.consumer_acceptance_enabled ?? false,
        selected: (selection.data ?? []).flatMap((row) => (row.item ? [row.item] : [])),
        evidence: currentEvidence(evidence.data ?? [], quote.data.decision_recorded_at),
      };
    },
  });
}

/** Wählbare Alternativ- und Bedarfspositionen einer festgeschriebenen Version. */
export function useSelectableItems(versionId: string | null) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: [companyId, 'quotes', 'selectable', versionId],
    enabled: Boolean(companyId && versionId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quote_items')
        .select(
          'id, oz, short_text, node_type, position_type, contingency_mode, alternative_to_id, quantity, unit, unit_price, sort_order',
        )
        .eq('company_id', companyId!)
        .eq('version_id', versionId!)
        .order('sort_order');
      if (error) throw error;
      return selectableItems(data ?? []);
    },
  });
}

export type AcceptInput = {
  quoteId: string;
  versionId: string;
  kind: DecisionKind;
  decidedAt: string;
  note: string;
  selectedItemIds: string[];
  evidence: Blob | null;
};

async function uploadEvidence(companyId: string, quoteId: string, file: Blob) {
  const path = evidencePath(companyId, quoteId, crypto.randomUUID(), file.type);
  if (!path) throw new Error('QUOTE_EVIDENCE_TYPE');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const hash = await sha256Hex(bytes);
  const { error } = await supabase.storage
    .from(QUOTE_ATTACHMENT_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return { path, hash };
}

function useInvalidateQuotes() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return () => queryClient.invalidateQueries({ queryKey: [companyId, 'quotes'] });
}

export function useAcceptQuote() {
  const { data: membership } = useMembership();
  const invalidate = useInvalidateQuotes();
  return useMutation({
    mutationFn: async (input: AcceptInput) => {
      const companyId = membership?.companyId;
      if (!companyId) throw new Error('NO_COMPANY');
      const evidence = input.evidence
        ? await uploadEvidence(companyId, input.quoteId, input.evidence)
        : null;
      const { error } = await supabase.rpc('accept_quote', {
        p_version_id: input.versionId,
        p_kind: input.kind,
        p_decided_at: input.decidedAt,
        p_note: input.note,
        p_selected_item_ids: input.selectedItemIds,
        ...(evidence ? { p_evidence_path: evidence.path, p_evidence_hash: evidence.hash } : {}),
      });
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

export function useDeclineQuote() {
  const invalidate = useInvalidateQuotes();
  return useMutation({
    mutationFn: async (input: {
      quoteId: string;
      kind: DecisionKind | null;
      decidedAt: string;
      reason: string;
      note: string;
    }) => {
      const { error } = await supabase.rpc('decline_quote', {
        p_quote_id: input.quoteId,
        // Ohne Angabe bleibt die Art leer; die RPC erlaubt das.
        p_kind: input.kind as string,
        p_decided_at: input.decidedAt,
        p_reason: input.reason,
        p_note: input.note,
      });
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

export function useWithdrawQuote() {
  const invalidate = useInvalidateQuotes();
  return useMutation({
    mutationFn: async (input: { quoteId: string; note: string }) => {
      const { error } = await supabase.rpc('withdraw_quote', {
        p_quote_id: input.quoteId,
        p_note: input.note,
      });
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

export function useRevertQuoteDecision() {
  const invalidate = useInvalidateQuotes();
  return useMutation({
    mutationFn: async (input: { quoteId: string; reason: string }) => {
      const { error } = await supabase.rpc('revert_quote_decision', {
        p_quote_id: input.quoteId,
        p_reason: input.reason,
      });
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

/** Signierte Adresse eines Nachweises. */
export async function evidenceUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(QUOTE_ATTACHMENT_BUCKET)
    .createSignedUrl(storagePath, 60);
  if (error) throw error;
  return data.signedUrl;
}
