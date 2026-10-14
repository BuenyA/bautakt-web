import { hasPermission } from '@bautakt/core';
import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

import type { ContactDetail } from './contactDraft';

const DETAIL_SELECT = `
  id, kind, company_name, salutation, first_name, last_name, street_address, postal_code,
  city, country, email, phone, mobile, website, vat_id, tax_number, notes, archived_at, created_at,
  customer:customer_profiles(
    customer_number, buyer_reference, payment_term_days, discount_percent, discount_days,
    is_construction_business, tax_exemption_valid_until, billing_street, billing_postal_code,
    billing_city, billing_country, archived_at
  ),
  supplier:supplier_profiles(
    supplier_number, our_customer_number, payment_term_days, discount_percent, discount_days,
    default_cost_category_id, archived_at,
    subcontractor:subcontractor_profiles(trade, reverse_charge_13b, archived_at)
  ),
  other:other_profiles(function, archived_at)
`;

/** Ein Kontakt mit allen Rollendaten. queryKey beginnt mit companyId. */
export function useContact(contactId: string | undefined) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['contacts', companyId, 'detail', contactId],
    enabled: Boolean(companyId && contactId),
    queryFn: async (): Promise<ContactDetail | null> => {
      const { data, error } = await supabase
        .from('contacts')
        .select(DETAIL_SELECT)
        .eq('company_id', companyId!)
        .eq('id', contactId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export type ContactPerson = {
  id: string;
  salutation: string;
  first_name: string;
  last_name: string;
  position: string;
  email: string;
  phone: string;
  mobile: string;
  notes: string;
  is_primary: boolean;
  sort_order: number;
};

export function useContactPersons(contactId: string | undefined) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['contacts', companyId, 'persons', contactId],
    enabled: Boolean(companyId && contactId),
    queryFn: async (): Promise<ContactPerson[]> => {
      const { data, error } = await supabase
        .from('contact_persons')
        .select(
          'id, salutation, first_name, last_name, position, email, phone, mobile, notes, is_primary, sort_order',
        )
        .eq('company_id', companyId!)
        .eq('contact_id', contactId!)
        .order('is_primary', { ascending: false })
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type ContactBankAccount = {
  id: string;
  account_holder: string;
  iban: string;
  bic: string;
  bank_name: string;
  is_default: boolean;
  modified_at: string | null;
};

/**
 * Bankkonten sieht nur, wer ein Finanzrecht hat (RLS). Ohne dieses Recht wird
 * gar nicht erst gefragt — eine leere Liste wäre irreführend („kein Konto“).
 */
export function canViewBankAccounts(permissions: Parameters<typeof hasPermission>[0]): boolean {
  return (
    hasPermission(permissions, 'canViewCompanyFinance') ||
    hasPermission(permissions, 'canManageOverheadCosts') ||
    hasPermission(permissions, 'canUseBillingModule')
  );
}

export function useContactBankAccounts(contactId: string | undefined) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const allowed = canViewBankAccounts(membership?.permissions);

  return useQuery({
    queryKey: ['contacts', companyId, 'bank-accounts', contactId],
    enabled: Boolean(companyId && contactId && allowed),
    queryFn: async (): Promise<ContactBankAccount[]> => {
      const { data, error } = await supabase
        .from('contact_bank_accounts')
        .select('id, account_holder, iban, bic, bank_name, is_default, modified_at')
        .eq('company_id', companyId!)
        .eq('contact_id', contactId!)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type ExemptionCertificate = {
  id: string;
  certificate_number: string;
  tax_office: string;
  valid_from: string;
  valid_until: string;
  storage_path: string | null;
};

export function useExemptionCertificates(contactId: string | undefined, enabled = true) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['contacts', companyId, 'exemptions', contactId],
    enabled: Boolean(companyId && contactId && enabled),
    queryFn: async (): Promise<ExemptionCertificate[]> => {
      const { data, error } = await supabase
        .from('exemption_certificates')
        .select('id, certificate_number, tax_office, valid_from, valid_until, storage_path')
        .eq('company_id', companyId!)
        .eq('contact_id', contactId!)
        .order('valid_until', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type ContactUsage = {
  orders: { id: string; name: string; status: string }[];
  salesDocuments: number;
  incomingInvoices: number;
  expenses: number;
  orderInvolvements: { order_id: string; order_name: string; role: string }[];
};

/**
 * Wo der Kontakt verwendet wird. Entscheidet auch, ob „Löschen“ angeboten
 * wird — die Datenbank lehnt das Löschen eines verwendeten Kontakts ohnehin
 * ab, aber ein Knopf, der nur scheitern kann, gehört nicht auf die Seite.
 */
export function useContactUsage(contactId: string | undefined) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['contacts', companyId, 'usage', contactId],
    enabled: Boolean(companyId && contactId),
    queryFn: async (): Promise<ContactUsage> => {
      const count = (table: 'sales_documents' | 'incoming_invoices' | 'expenses', column: string) =>
        supabase
          .from(table)
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId!)
          .eq(column, contactId!);

      const [orders, sales, incoming, expenses, involvements] = await Promise.all([
        supabase
          .from('orders')
          .select('id, name, status')
          .eq('company_id', companyId!)
          .eq('customer_id', contactId!)
          .order('created_at', { ascending: false }),
        count('sales_documents', 'customer_id'),
        count('incoming_invoices', 'supplier_id'),
        count('expenses', 'supplier_id'),
        supabase
          .from('order_contacts')
          .select('order_id, role, order:orders(name)')
          .eq('company_id', companyId!)
          .eq('contact_id', contactId!),
      ]);
      // Ohne Finanzrecht zählen die Belege 0 (RLS) — das ist dann auch die
      // ehrliche Antwort aus Sicht dieses Nutzers.
      if (orders.error) throw orders.error;
      if (involvements.error) throw involvements.error;

      return {
        orders: orders.data ?? [],
        salesDocuments: sales.count ?? 0,
        incomingInvoices: incoming.count ?? 0,
        expenses: expenses.count ?? 0,
        orderInvolvements: (involvements.data ?? []).map((row) => ({
          order_id: row.order_id,
          role: row.role,
          order_name: row.order?.name ?? '',
        })),
      };
    },
  });
}
