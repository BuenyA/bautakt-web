import { contactDisplayName } from '../contacts/contactModel.ts';

/**
 * Was PostgREST für den Käufer eines Belegs liefert: die Kopie im Beleg
 * (`buyer_name`, beim Festschreiben gesetzt) und den Kunden über die
 * Kundenrolle.
 */
export type SalesDocumentBuyerFields = {
  status: string;
  buyer_name: string;
  customer: {
    contact: {
      kind: string;
      company_name: string;
      first_name: string;
      last_name: string;
    } | null;
  } | null;
};

/** Spalten für `.select()` — gleiche Einbettung in Liste und Detail. */
export const SALES_DOCUMENT_BUYER_SELECT =
  'buyer_name, customer:customer_profiles(contact:contacts(kind, company_name, first_name, last_name))';

/**
 * Anzeigename des Käufers. Ein festgeschriebener Beleg zeigt, was auf ihm
 * steht — auch wenn der Kontakt inzwischen anders heißt. Ein Entwurf zeigt
 * den Kontakt, wie er jetzt ist.
 */
export function salesDocumentBuyerLabel(row: SalesDocumentBuyerFields): string {
  if (row.status !== 'draft' && row.buyer_name.trim()) return row.buyer_name.trim();
  const contact = row.customer?.contact;
  return contact ? contactDisplayName(contact) : '';
}
