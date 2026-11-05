import type { TaxMode } from '@bautakt/finance';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

import {
  parseDecimal,
  type QuoteItemRow,
  type QuoteNode,
  quoteTotals,
  rowsFromNodes,
} from './quoteTree';

export const CONTRACT_BASES = ['bgb', 'vob_b'] as const;
export type ContractBasis = (typeof CONTRACT_BASES)[number];

export const BILLING_MODES = ['unit_price', 'fixed', 'regie'] as const;
export type BillingMode = (typeof BILLING_MODES)[number];

export type QuoteKind = 'main' | 'addendum';

/** Alles, was der Editor hält. Datumsfelder als ISO-Text, leer ist leer. */
export type QuoteEditorState = {
  kind: QuoteKind;
  customerId: string | null;
  contactPersonId: string | null;
  orderId: string | null;
  subject: string;
  siteStreet: string;
  sitePostalCode: string;
  siteCity: string;
  siteCountry: string;
  /** Nicht im Editor bearbeitet, aber beim Speichern unverändert mitgegeben. */
  responsibleUserId: string | null;
  followUpOn: string | null;
  quoteDate: string;
  validUntil: string;
  execFrom: string;
  execTo: string;
  contractBasis: ContractBasis;
  billingMode: BillingMode;
  taxMode: TaxMode;
  discountPercent: string;
  introText: string;
  prelimText: string;
  closingText: string;
  invoiceTemplateId: string | null;
  calcMode: string;
  currency: string;
  nodes: QuoteNode[];
};

const HEADER_SELECT =
  'id, company_id, document_number, kind, customer_id, contact_person_id, order_id, subject, site_street, site_postal_code, site_city, site_country, responsible_user_id, follow_up_on, decision';
const VERSION_SELECT =
  'id, version_no, calc_mode, quote_date, valid_until, exec_from, exec_to, contract_basis, billing_mode, tax_mode, currency, discount_percent, intro_text, prelim_text, closing_text, invoice_template_id, issued_at';
const ITEM_SELECT =
  'id, parent_id, sort_order, oz, node_type, position_type, contingency_mode, alternative_to_id, short_text, long_text, quantity, unit, unit_price, price_is_manual, tax_rate_percent, tax_category, labor_share, origin, origin_ref_id, copied_from_item_id';

/**
 * Der offene Entwurf eines Vorgangs samt Positionen. `draft` ist `null`, wenn
 * alles festgeschrieben ist; `quote` ist `null` ohne Recht oder bei fremdem
 * Betrieb. `queryKey` beginnt mit der `companyId`.
 */
export function useQuoteDraft(quoteId: string | undefined) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: [companyId, 'quotes', 'draft', quoteId],
    enabled: Boolean(companyId && quoteId),
    // Ein Entwurf wird bearbeitet: Kein Nachladen im Hintergrund, das die
    // Eingaben überschreiben könnte.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const [quote, draft, issued] = await Promise.all([
        supabase
          .from('quotes')
          .select(HEADER_SELECT)
          .eq('company_id', companyId!)
          .eq('id', quoteId!)
          .maybeSingle(),
        supabase
          .from('quote_versions')
          .select(VERSION_SELECT)
          .eq('company_id', companyId!)
          .eq('quote_id', quoteId!)
          .is('issued_at', null)
          .maybeSingle(),
        supabase
          .from('quote_versions')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId!)
          .eq('quote_id', quoteId!)
          .not('issued_at', 'is', null),
      ]);
      if (quote.error) throw quote.error;
      if (draft.error) throw draft.error;
      if (issued.error) throw issued.error;
      if (!quote.data) return { quote: null, draft: null, items: [], issuedCount: 0 };

      let items: QuoteItemRow[] = [];
      if (draft.data) {
        const result = await supabase
          .from('quote_items')
          .select(ITEM_SELECT)
          .eq('company_id', companyId!)
          .eq('version_id', draft.data.id)
          .order('sort_order', { ascending: true });
        if (result.error) throw result.error;
        items = result.data ?? [];
      }
      return { quote: quote.data, draft: draft.data, items, issuedCount: issued.count ?? 0 };
    },
  });
}

export type QuoteDraftData = NonNullable<ReturnType<typeof useQuoteDraft>['data']>;

/** Kopf, Version und Positionen genau so, wie `save_quote_draft` sie erwartet. */
export function buildQuoteRows(state: QuoteEditorState, companyId: string) {
  const discount = parseDecimal(state.discountPercent);
  const totals = quoteTotals(state.nodes, state.taxMode, discount);
  const header = {
    company_id: companyId,
    kind: state.kind,
    customer_id: state.customerId,
    contact_person_id: state.contactPersonId,
    order_id: state.orderId,
    subject: state.subject.trim(),
    site_street: state.siteStreet.trim(),
    site_postal_code: state.sitePostalCode.trim(),
    site_city: state.siteCity.trim(),
    site_country: state.siteCountry.trim(),
    responsible_user_id: state.responsibleUserId,
    follow_up_on: state.followUpOn,
  };
  const version = {
    calc_mode: state.calcMode,
    quote_date: state.quoteDate || null,
    valid_until: state.validUntil || null,
    exec_from: state.execFrom || null,
    exec_to: state.execTo || null,
    contract_basis: state.contractBasis,
    billing_mode: state.billingMode,
    tax_mode: state.taxMode,
    currency: state.currency,
    discount_percent: discount,
    intro_text: state.introText,
    prelim_text: state.prelimText,
    closing_text: state.closingText,
    invoice_template_id: state.invoiceTemplateId,
    // Vorläufige Summen für Liste und Übersicht; festgeschrieben rechnet der Server.
    net_total: totals.netMinor / 100,
    vat_total: totals.vatMinor / 100,
    gross_total: totals.grossMinor / 100,
    labor_share_total: totals.laborShareMinor / 100,
  };
  return { header, version, items: rowsFromNodes(state.nodes, state.taxMode), totals };
}

function useInvalidateQuotes() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return () => queryClient.invalidateQueries({ queryKey: [companyId, 'quotes'] });
}

/**
 * Entwurf speichern: anlegen (`quoteId` leer) oder überschreiben. Kopf und
 * Baum in einer Transaktion; bricht sie ab, bleibt der alte Stand stehen.
 */
export function useSaveQuoteDraft() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const invalidate = useInvalidateQuotes();

  return useMutation({
    mutationFn: async ({
      state,
      quoteId,
    }: {
      state: QuoteEditorState;
      quoteId: string | null;
    }): Promise<{ quoteId: string; versionId: string }> => {
      const { header, version, items } = buildQuoteRows(state, companyId!);
      const { data, error } = await supabase.rpc('save_quote_draft', {
        // Neu angelegt wird mit NULL; der Generator kennt die Vorgabe nicht.
        p_quote_id: quoteId as string,
        p_header: header,
        p_version: version,
        p_items: items,
      });
      if (error) throw error;
      const result = data as { quote_id: string; version_id: string };
      return { quoteId: result.quote_id, versionId: result.version_id };
    },
    onSuccess: () => invalidate(),
  });
}

/** Festschreiben mit den Summen des Editors: weicht der Server ab, scheitert es. */
export function useIssueQuoteVersion() {
  const invalidate = useInvalidateQuotes();
  return useMutation({
    mutationFn: async ({
      versionId,
      netMinor,
      grossMinor,
    }: {
      versionId: string;
      netMinor: number;
      grossMinor: number;
    }) => {
      const { error } = await supabase.rpc('issue_quote_version', {
        p_version_id: versionId,
        p_expected_net: netMinor / 100,
        p_expected_gross: grossMinor / 100,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });
}

/** Neue Version als Kopie der letzten. */
export function useCreateQuoteVersion() {
  const invalidate = useInvalidateQuotes();
  return useMutation({
    mutationFn: async (quoteId: string) => {
      const { data, error } = await supabase.rpc('create_quote_version', { p_quote_id: quoteId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidate(),
  });
}

/** Entwurf verwerfen; ohne festgeschriebene Version verschwindet der Vorgang. */
export function useDeleteQuoteDraft() {
  const invalidate = useInvalidateQuotes();
  return useMutation({
    mutationFn: async (quoteId: string) => {
      const { error } = await supabase.rpc('delete_quote_draft', { p_quote_id: quoteId });
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });
}
