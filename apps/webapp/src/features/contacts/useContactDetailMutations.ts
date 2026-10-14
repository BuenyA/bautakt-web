import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/useAuth';
import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

import { type ContactRole, normalizeIban } from './contactModel';
import type { ContactBankAccount, ContactPerson, ExemptionCertificate } from './useContact';
import { profileTable } from './useContactMutations';

function useInvalidate() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  return () => queryClient.invalidateQueries({ queryKey: ['contacts', membership?.companyId] });
}

const now = () => new Date().toISOString();

/**
 * Rolle endgültig entfernen — nur möglich, solange kein Beleg an ihr hängt
 * (sonst 23503, dann bleibt nur Archivieren). Gedacht für eine versehentlich
 * vergebene Rolle.
 */
export function useRemoveRole() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ contactId, role }: { contactId: string; role: ContactRole }) => {
      const { data, error } = await supabase
        .from(profileTable(role))
        .delete()
        .eq('contact_id', contactId)
        .select('contact_id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('FORBIDDEN');
    },
    onSuccess: () => invalidate(),
  });
}

export type ContactPersonDraft = Omit<ContactPerson, 'id' | 'sort_order'> & { id?: string };

export function useSaveContactPerson(contactId: string) {
  const invalidate = useInvalidate();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (draft: ContactPersonDraft) => {
      const row = {
        salutation: draft.salutation.trim(),
        first_name: draft.first_name.trim(),
        last_name: draft.last_name.trim(),
        position: draft.position.trim(),
        email: draft.email.trim(),
        phone: draft.phone.trim(),
        mobile: draft.mobile.trim(),
        notes: draft.notes.trim(),
        is_primary: draft.is_primary,
      };

      // Nur ein Hauptansprechpartner je Kontakt (Unique-Index): den bisherigen
      // vorher abgeben, sonst scheitert das Speichern am Index.
      if (draft.is_primary) {
        const demote = supabase
          .from('contact_persons')
          .update({ is_primary: false, modified_at: now() })
          .eq('contact_id', contactId)
          .eq('is_primary', true);
        const { error } = await (draft.id ? demote.neq('id', draft.id) : demote);
        if (error) throw error;
      }

      const { error } = draft.id
        ? await supabase
            .from('contact_persons')
            .update({ ...row, modified_at: now() })
            .eq('id', draft.id)
            .eq('contact_id', contactId)
        : await supabase.from('contact_persons').insert({
            ...row,
            id: crypto.randomUUID(),
            company_id: companyId!,
            contact_id: contactId,
          });
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });
}

export function useDeleteContactPerson() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (personId: string) => {
      const { error } = await supabase.from('contact_persons').delete().eq('id', personId);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });
}

export type BankAccountDraft = Omit<ContactBankAccount, 'id' | 'modified_at'> & { id?: string };

export function useSaveBankAccount(contactId: string) {
  const invalidate = useInvalidate();
  const { data: membership } = useMembership();
  const { user } = useAuth();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (draft: BankAccountDraft) => {
      const row = {
        account_holder: draft.account_holder.trim(),
        iban: normalizeIban(draft.iban),
        bic: draft.bic.replace(/\s/g, '').toUpperCase(),
        bank_name: draft.bank_name.trim(),
        is_default: draft.is_default,
        modified_by: user?.id ?? null,
        modified_at: now(),
      };

      if (draft.is_default) {
        const demote = supabase
          .from('contact_bank_accounts')
          .update({ is_default: false })
          .eq('contact_id', contactId)
          .eq('is_default', true);
        const { error } = await (draft.id ? demote.neq('id', draft.id) : demote);
        if (error) throw error;
      }

      const { data, error } = draft.id
        ? await supabase
            .from('contact_bank_accounts')
            .update(row)
            .eq('id', draft.id)
            .eq('contact_id', contactId)
            .select('id')
        : await supabase
            .from('contact_bank_accounts')
            .insert({
              ...row,
              id: crypto.randomUUID(),
              company_id: companyId!,
              contact_id: contactId,
            })
            .select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('FORBIDDEN');
    },
    onSuccess: () => invalidate(),
  });
}

export function useDeleteBankAccount() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (accountId: string) => {
      const { data, error } = await supabase
        .from('contact_bank_accounts')
        .delete()
        .eq('id', accountId)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('FORBIDDEN');
    },
    onSuccess: () => invalidate(),
  });
}

export type ExemptionDraft = Omit<ExemptionCertificate, 'id' | 'storage_path'> & {
  id?: string;
  storage_path: string | null;
  file: File | null;
};

/**
 * §48b-Bescheinigung speichern. Die Datei liegt im Bucket `finance-documents`
 * unter `{company}/exemptions/{contact}/{id}.{ext}` — dort dürfen Personen mit
 * `canManageSuppliers` hochladen und lesen (Storage-Policy der Migration).
 */
export function useSaveExemption(contactId: string) {
  const invalidate = useInvalidate();
  const { data: membership } = useMembership();
  const { user } = useAuth();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (draft: ExemptionDraft) => {
      const id = draft.id ?? crypto.randomUUID();
      let storagePath = draft.storage_path;

      if (draft.file) {
        const ext = draft.file.name.split('.').pop()?.toLowerCase() || 'pdf';
        storagePath = `${companyId}/exemptions/${contactId}/${id}.${ext}`;
        const { error } = await supabase.storage
          .from('finance-documents')
          .upload(storagePath, draft.file, { upsert: false, contentType: draft.file.type });
        if (error) throw error;
      }

      const row = {
        certificate_number: draft.certificate_number.trim(),
        tax_office: draft.tax_office.trim(),
        valid_from: draft.valid_from,
        valid_until: draft.valid_until,
        storage_path: storagePath,
      };

      const { error } = draft.id
        ? await supabase
            .from('exemption_certificates')
            .update({ ...row, modified_at: now() })
            .eq('id', id)
        : await supabase.from('exemption_certificates').insert({
            ...row,
            id,
            company_id: companyId!,
            contact_id: contactId,
            created_by: user?.id ?? null,
          });
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });
}

export function useDeleteExemption() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (certificateId: string) => {
      const { error } = await supabase
        .from('exemption_certificates')
        .delete()
        .eq('id', certificateId);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });
}

/** Signierte Adresse zum Öffnen der Bescheinigung (privater Bucket). */
export async function exemptionFileUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('finance-documents')
    .createSignedUrl(storagePath, 60);
  if (error) throw error;
  return data.signedUrl;
}
