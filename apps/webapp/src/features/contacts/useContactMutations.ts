import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/useAuth';
import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

import {
  changedFields,
  type ContactDraft,
  parseOptionalDecimal,
  parseOptionalInt,
} from './contactDraft';
import type { ContactRole } from './contactModel';

/** Alles neu laden, was an Kontakten hängt (Liste, Details, Auswahlfelder). */
function useInvalidateContacts() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return () => queryClient.invalidateQueries({ queryKey: ['contacts', companyId] });
}

function contactRow(draft: ContactDraft) {
  const isPerson = draft.kind === 'person';
  return {
    kind: draft.kind,
    // Eine Person hat keinen Firmennamen; ein liegengebliebener Wert aus dem
    // Wechsel Firma → Person würde sonst im Anzeigenamen weiterleben.
    company_name: isPerson ? '' : draft.company_name.trim(),
    salutation: draft.salutation.trim(),
    first_name: draft.first_name.trim(),
    last_name: draft.last_name.trim(),
    street_address: draft.street_address.trim(),
    postal_code: draft.postal_code.trim(),
    city: draft.city.trim(),
    country: draft.country,
    email: draft.email.trim(),
    phone: draft.phone.trim(),
    mobile: draft.mobile.trim(),
    website: draft.website.trim(),
    vat_id: draft.vat_id.replace(/\s/g, '').toUpperCase(),
    tax_number: draft.tax_number.trim(),
    notes: draft.notes.trim(),
  };
}

function customerRow(draft: ContactDraft) {
  const c = draft.customer;
  return {
    // Leer = die Datenbank vergibt die nächste Nummer aus dem Kreis.
    customer_number: c.customer_number.trim(),
    buyer_reference: c.buyer_reference.trim(),
    payment_term_days: parseOptionalInt(c.payment_term_days),
    discount_percent: parseOptionalDecimal(c.discount_percent),
    discount_days: parseOptionalInt(c.discount_days),
    is_construction_business: c.is_construction_business,
    tax_exemption_valid_until: c.tax_exemption_valid_until || null,
    billing_street: c.billing_street.trim(),
    billing_postal_code: c.billing_postal_code.trim(),
    billing_city: c.billing_city.trim(),
    billing_country: c.billing_street.trim() ? c.billing_country : '',
  };
}

function supplierRow(draft: ContactDraft) {
  const s = draft.supplier;
  return {
    supplier_number: s.supplier_number.trim(),
    our_customer_number: s.our_customer_number.trim(),
    payment_term_days: parseOptionalInt(s.payment_term_days),
    discount_percent: parseOptionalDecimal(s.discount_percent),
    discount_days: parseOptionalInt(s.discount_days),
    default_cost_category_id: s.default_cost_category_id || null,
  };
}

function subcontractorRow(draft: ContactDraft) {
  return {
    trade: draft.subcontractor.trade.trim(),
    reverse_charge_13b: draft.subcontractor.reverse_charge_13b,
  };
}

/**
 * Kontakt samt Rollen anlegen oder ändern.
 *
 * Geändert werden nur die Felder, die sich gegenüber `initial` bewegt haben.
 * Neue Rollen werden angelegt; vorhandene Rollen entfernt das Formular nicht
 * — das geschieht auf der Detailseite über „Rolle archivieren“, weil eine
 * Rolle mit Belegen nicht verschwinden darf.
 *
 * Reihenfolge: Kontakt → Lieferant → Subunternehmer (braucht den Lieferanten)
 * → Kunde → Sonstiger. Scheitert beim Anlegen eine Rolle, wird der gerade
 * angelegte Kontakt wieder entfernt: ein Kontakt ohne die Rolle, für die er
 * angelegt wurde, wäre in keinem Reiter zu finden.
 */
export function useSaveContact() {
  const invalidate = useInvalidateContacts();
  const { data: membership } = useMembership();
  const { user } = useAuth();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async ({
      initial,
      draft,
    }: {
      initial: ContactDraft;
      draft: ContactDraft;
    }): Promise<string> => {
      const isNew = !draft.id;
      const id = draft.id ?? crypto.randomUUID();
      const scope = { contact_id: id, company_id: companyId! };
      const has = (role: ContactRole) => draft.roles.includes(role);
      const had = (role: ContactRole) => draft.existingRoles.includes(role);

      if (isNew) {
        // ⚠️ Die Id kommt vom Client (Offline-First der Handy-App, siehe
        // Migration). Das Web hält sich daran.
        const { error } = await supabase.from('contacts').insert({
          ...contactRow(draft),
          id,
          company_id: companyId!,
          created_by: user?.id ?? null,
        });
        if (error) throw error;
      } else {
        const patch = changedFields(contactRow(initial), contactRow(draft));
        if (Object.keys(patch).length > 0) {
          const { error } = await supabase
            .from('contacts')
            .update({ ...patch, modified_at: new Date().toISOString() })
            .eq('id', id)
            .eq('company_id', companyId!);
          if (error) throw error;
        }
      }

      const stamp = () => ({ modified_at: new Date().toISOString() });

      try {
        if (has('supplier')) {
          const row = supplierRow(draft);
          const patch = changedFields(supplierRow(initial), row);
          const { error } = !had('supplier')
            ? await supabase.from('supplier_profiles').insert({ ...scope, ...row })
            : Object.keys(patch).length > 0
              ? await supabase
                  .from('supplier_profiles')
                  .update({ ...patch, ...stamp() })
                  .eq('contact_id', id)
              : { error: null };
          if (error) throw error;
        }
        if (has('subcontractor')) {
          const row = subcontractorRow(draft);
          const patch = changedFields(subcontractorRow(initial), row);
          const { error } = !had('subcontractor')
            ? await supabase.from('subcontractor_profiles').insert({ ...scope, ...row })
            : Object.keys(patch).length > 0
              ? await supabase
                  .from('subcontractor_profiles')
                  .update({ ...patch, ...stamp() })
                  .eq('contact_id', id)
              : { error: null };
          if (error) throw error;
        }
        if (has('customer')) {
          const row = customerRow(draft);
          const patch = changedFields(customerRow(initial), row);
          const { error } = !had('customer')
            ? await supabase.from('customer_profiles').insert({ ...scope, ...row })
            : Object.keys(patch).length > 0
              ? await supabase
                  .from('customer_profiles')
                  .update({ ...patch, ...stamp() })
                  .eq('contact_id', id)
              : { error: null };
          if (error) throw error;
        }
        if (has('other')) {
          if (!had('other')) {
            const { error } = await supabase
              .from('other_profiles')
              .insert({ ...scope, function: draft.other.function });
            if (error) throw error;
          } else if (initial.other.function !== draft.other.function) {
            const { error } = await supabase
              .from('other_profiles')
              .update({ function: draft.other.function, modified_at: new Date().toISOString() })
              .eq('contact_id', id);
            if (error) throw error;
          }
        }
      } catch (caught) {
        if (isNew) await supabase.from('contacts').delete().eq('id', id);
        throw caught;
      }

      return id;
    },
    onSuccess: () => invalidate(),
  });
}

/** Tabelle einer Rolle. */
export function profileTable(
  role: ContactRole,
): 'customer_profiles' | 'supplier_profiles' | 'subcontractor_profiles' | 'other_profiles' {
  switch (role) {
    case 'customer':
      return 'customer_profiles';
    case 'supplier':
      return 'supplier_profiles';
    case 'subcontractor':
      return 'subcontractor_profiles';
    case 'other':
      return 'other_profiles';
  }
}

/** Kontakt oder einzelne Rolle archivieren bzw. zurückholen. */
export function useArchiveContact() {
  const invalidate = useInvalidateContacts();

  return useMutation({
    mutationFn: async ({
      contactId,
      role,
      archived,
    }: {
      contactId: string;
      /** Ohne Rolle: der ganze Kontakt. */
      role?: ContactRole;
      archived: boolean;
    }) => {
      const patch = {
        archived_at: archived ? new Date().toISOString() : null,
        modified_at: new Date().toISOString(),
      };
      const { error } = !role
        ? await supabase.from('contacts').update(patch).eq('id', contactId)
        : await supabase.from(profileTable(role)).update(patch).eq('contact_id', contactId);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });
}

/**
 * Endgültig löschen. Die Datenbank lehnt das ab, solange der Kontakt an
 * einem Auftrag, Beleg oder Artikel hängt (Fremdschlüssel, Fehler 23503).
 */
export function useDeleteContact() {
  const invalidate = useInvalidateContacts();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (contactId: string) => {
      const { data, error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId)
        .eq('company_id', companyId!)
        .select('id');
      if (error) throw error;
      // RLS filtert still: ohne Recht wird nichts gelöscht und nichts gemeldet.
      if (!data || data.length === 0) throw new Error('FORBIDDEN');
    },
    onSuccess: () => invalidate(),
  });
}

/** Dublette `drop` in `keep` aufgehen lassen (RPC merge_contacts). */
export function useMergeContacts() {
  const invalidate = useInvalidateContacts();

  return useMutation({
    mutationFn: async ({ keep, drop }: { keep: string; drop: string }) => {
      const { error } = await supabase.rpc('merge_contacts', { p_keep: keep, p_drop: drop });
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });
}
