import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/useAuth';
import { supabase } from '@/lib/supabase';

export type MyCompany = {
  companyId: string;
  name: string;
  role: string;
  isPrimary: boolean;
};

/**
 * Alle Betriebe, in denen der Angemeldete aktiv beschäftigt ist — für den
 * Wechsel im Profilmenü. Aktiv ist, was `useMembership` liest: die Zeile mit
 * `is_primary`.
 */
export function useMyCompanies() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['my-companies', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<MyCompany[]> => {
      const { data, error } = await supabase
        .from('employments')
        .select('company_id, role, is_primary, companies(name)')
        .eq('user_id', userId!)
        .is('ended_at', null)
        .order('created_at', { ascending: true });
      if (error) throw error;
      // Zeilen ohne Betrieb oder Rolle sind keine brauchbare Mitgliedschaft.
      return (data ?? []).flatMap((row) =>
        row.company_id && row.role
          ? [
              {
                companyId: row.company_id,
                name: row.companies?.name ?? '',
                role: row.role,
                isPrimary: Boolean(row.is_primary),
              },
            ]
          : [],
      );
    },
  });
}

/**
 * Nach Wechsel, Beitritt oder Austritt gilt ein anderer Betrieb. Jeder
 * `queryKey` trägt den Mandanten, alte Zeilen bleiben also unter ihrem
 * Schlüssel; `resetQueries` lädt alles, was gerade angezeigt wird, neu —
 * zuerst die Mitgliedschaft, an der alle anderen hängen.
 */
export function useResetAfterCompanyChange() {
  const queryClient = useQueryClient();
  return () => queryClient.resetQueries();
}

/** Aktiven Betrieb wechseln (`switch_primary_company`). */
export function useSwitchCompany() {
  const reset = useResetAfterCompanyChange();
  return useMutation({
    mutationFn: async (companyId: string) => {
      const { error } = await supabase.rpc('switch_primary_company', { p_company_id: companyId });
      if (error) throw error;
    },
    onSuccess: reset,
  });
}

/**
 * Token aus Einladungscode oder -link, wie in der App
 * (`bautakt-app/app/lib/supabase/invitations.ts`): Links mit `invite/<hex>`,
 * sonst 16, 24 oder 48 Hex-Zeichen; Leerzeichen und Bindestriche zählen nicht.
 */
export function extractInviteToken(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const urlMatch = trimmed.match(/invite\/([a-f0-9]+)/i);
  if (urlMatch?.[1]) return urlMatch[1].toLowerCase();
  const normalized = trimmed.replace(/[\s-]/g, '');
  if (/^([a-f0-9]{16}|[a-f0-9]{24}|[a-f0-9]{48})$/i.test(normalized)) {
    return normalized.toLowerCase();
  }
  return null;
}

/**
 * Einladung annehmen (`accept_employment_invitation`) und den neuen Betrieb
 * gleich aktiv machen — wer einen Code eintippt, will dort arbeiten.
 */
export function useJoinCompany() {
  const reset = useResetAfterCompanyChange();
  return useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await supabase.rpc('accept_employment_invitation', {
        p_token: token,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.company_id) throw new Error('INVITATION_ACCEPT_FAILED');
      const { error: switchError } = await supabase.rpc('switch_primary_company', {
        p_company_id: row.company_id,
      });
      if (switchError) throw switchError;
    },
    onSuccess: reset,
  });
}

/** Betrieb verlassen (`leave_company`); die Datenbank wählt den nächsten aktiven. */
export function useLeaveCompany() {
  const reset = useResetAfterCompanyChange();
  return useMutation({
    mutationFn: async (companyId: string) => {
      const { error } = await supabase.rpc('leave_company', { p_company_id: companyId });
      if (error) throw error;
    },
    onSuccess: reset,
  });
}
