import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import type { CustomerTerms } from '@/features/finance/customerTerms';
import { supabase } from '@/lib/supabase';

import { activeRoles, contactDisplayName, type ContactRole } from './contactModel';

export type ContactListRow = {
  id: string;
  kind: string;
  name: string;
  company_name: string;
  first_name: string;
  last_name: string;
  city: string;
  email: string;
  phone: string;
  mobile: string;
  vat_id: string;
  archived_at: string | null;
  roles: ContactRole[];
  customer_number: string | null;
  supplier_number: string | null;
  /** Standard-Kostenart des Lieferanten (Vorbelegung bei Ausgaben). */
  default_cost_category_id: string | null;
  /** Subunternehmer mit §13b-Kennzeichen (Vorbelegung bei Eingangsrechnungen). */
  reverse_charge_13b: boolean;
  payment_term_days: number | null;
  /** Konditionen der Kundenrolle (Vorbelegung im Rechnungseditor). */
  customer_terms: CustomerTerms | null;
};

export const contactsQueryKey = (companyId: string | undefined) => ['contacts', companyId] as const;

const LIST_SELECT = `
  id, kind, company_name, first_name, last_name, city, email, phone, mobile, vat_id, archived_at,
  customer:customer_profiles(
    customer_number, archived_at, buyer_reference, payment_term_days, discount_percent,
    discount_days
  ),
  supplier:supplier_profiles(
    supplier_number, archived_at, default_cost_category_id, payment_term_days,
    subcontractor:subcontractor_profiles(archived_at, reverse_charge_13b)
  ),
  other:other_profiles(archived_at)
`;

/**
 * Alle Kontakte des aktiven Betriebs mit ihren Rollen — für Liste, Auswahl-
 * felder und Schnellsuche. queryKey beginnt mit companyId (Mandant).
 *
 * Archivierte Kontakte kommen mit; Liste und Auswahl blenden sie aus.
 */
export function useContacts() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: contactsQueryKey(companyId),
    enabled: Boolean(companyId),
    queryFn: async (): Promise<ContactListRow[]> => {
      const { data, error } = await supabase
        .from('contacts')
        .select(LIST_SELECT)
        .eq('company_id', companyId!);
      if (error) throw error;

      return (data ?? [])
        .map((row) => {
          const roles = activeRoles({
            customer: row.customer,
            supplier: row.supplier
              ? { archived_at: row.supplier.archived_at, subcontractor: row.supplier.subcontractor }
              : null,
            other: row.other,
          });
          return {
            id: row.id,
            kind: row.kind,
            name: contactDisplayName(row),
            company_name: row.company_name,
            first_name: row.first_name,
            last_name: row.last_name,
            city: row.city,
            email: row.email,
            phone: row.phone,
            mobile: row.mobile,
            vat_id: row.vat_id,
            archived_at: row.archived_at,
            roles,
            customer_number: row.customer?.customer_number ?? null,
            supplier_number: row.supplier?.supplier_number ?? null,
            default_cost_category_id: row.supplier?.default_cost_category_id ?? null,
            reverse_charge_13b: Boolean(row.supplier?.subcontractor?.reverse_charge_13b),
            payment_term_days: row.supplier?.payment_term_days ?? null,
            customer_terms: row.customer
              ? {
                  buyer_reference: row.customer.buyer_reference,
                  payment_term_days: row.customer.payment_term_days,
                  discount_percent: row.customer.discount_percent,
                  discount_days: row.customer.discount_days,
                }
              : null,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'de'));
    },
  });
}

/**
 * Auswahl für Belege: nur aktive Kontakte mit der verlangten Rolle. Ein
 * Subunternehmer ist auch Kreditor und taucht deshalb bei „Lieferant“ auf.
 */
export function contactsWithRole(
  rows: readonly ContactListRow[],
  role: 'customer' | 'supplier' | 'any',
): ContactListRow[] {
  return rows.filter((row) => {
    if (row.archived_at) return false;
    if (role === 'any') return true;
    if (role === 'customer') return row.roles.includes('customer');
    return row.roles.includes('supplier') || row.roles.includes('subcontractor');
  });
}
