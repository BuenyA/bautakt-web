import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

import type { SalesDocumentDetail } from './useSalesDocument';

/** Belegarten, fuer die `finalize_sales_document` die Pflichtangaben prueft. */
const STRICT_TYPES = new Set([
  'invoice',
  'partial_invoice',
  'final_invoice',
  'credit_note',
  'cancellation',
]);

export type FinalizeBlocker = 'serviceDate' | 'sellerTaxId';

/**
 * Was dem Festschreiben noch im Weg steht.
 *
 * ⚠️ `finalize_sales_document` lehnt ohne diese Angaben ab —
 * `MISSING_SERVICE_DATE` und `MISSING_SELLER_TAX_ID`. Das ist keine Schikane:
 * ohne Verkaeufer-Kennung (USt-IdNr. oder Steuernummer) ist das erzeugte
 * Factur-X-XML nach EN16931 ungueltig.
 *
 * Die Pruefung gehoert deshalb VOR den Knopf. Sonst tippt jemand einen Beleg
 * fertig, klickt „Festschreiben" und bekommt eine Datenbankmeldung in
 * Grossbuchstaben zu sehen — mit einer Ursache, die drei Seiten weiter liegt.
 *
 * Die Datenbank bleibt die Grenze: sie prueft dasselbe noch einmal.
 */
export function useFinalizeBlockers(document: SalesDocumentDetail | null | undefined): {
  blockers: FinalizeBlocker[];
  isLoading: boolean;
} {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  const company = useQuery({
    queryKey: ['company-tax-ids', companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('vat_id, tax_number')
        .eq('id', companyId!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  if (!document || !STRICT_TYPES.has(document.type)) {
    return { blockers: [], isLoading: false };
  }

  const blockers: FinalizeBlocker[] = [];
  if (!document.service_date) blockers.push('serviceDate');

  const hasTaxId = Boolean(company.data?.vat_id?.trim() || company.data?.tax_number?.trim());
  if (company.data && !hasTaxId) blockers.push('sellerTaxId');

  return { blockers, isLoading: company.isPending };
}
