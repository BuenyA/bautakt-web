import { dbPermissionsToApp, DEFAULT_PERMISSIONS, type EmployeePermissions } from '@bautakt/core';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/useAuth';
import { supabase } from '@/lib/supabase';

export type Membership = {
  employmentId: string;
  companyId: string;
  companyName: string;
  role: string;
  systemKey: string | null;
  permissions: EmployeePermissions;
};

/**
 * Aktive Mitgliedschaft des angemeldeten Nutzers samt aufgeloester Rechte.
 *
 * Die Rechte entstehen aus zwei Quellen: den Standardrechten der Rolle
 * (company_roles.permissions) und den persoenlichen Abweichungen
 * (employments.permission_overrides). Die Overrides gewinnen.
 *
 * Bewusst eine eigene Query statt Teil des AuthProvider: dort darf im
 * onAuthStateChange-Callback nichts awaited werden (siehe AuthProvider).
 *
 * ⚠️ `employments.company_id` und `employments.role` sind im Schema nullable.
 * Eine Zeile ohne beides ist keine brauchbare Mitgliedschaft — dann liefert der
 * Hook null, statt die Nullwerte wegzucasten. Wer das casted, bekommt spaeter
 * eine Query mit `company_id=is.null` und wundert sich ueber leere Listen.
 */
export function useMembership() {
  const { user } = useAuth();

  return useQuery({
    // Nutzer-Id im Key, damit ein Nutzerwechsel nie den Cache des vorigen trifft.
    queryKey: ['membership', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<Membership | null> => {
      const { data, error } = await supabase
        .from('employments')
        .select('id, company_id, role, permission_overrides, companies(name)')
        .eq('user_id', user!.id)
        .is('ended_at', null)
        .order('is_primary', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data?.company_id || !data.role) return null;

      const { companyId, role } = { companyId: data.company_id, role: data.role };

      const { data: roleRow } = await supabase
        .from('company_roles')
        .select('permissions, system_key')
        .eq('company_id', companyId)
        .eq('name', role)
        .maybeSingle();

      const rolePermissions = dbPermissionsToApp(
        roleRow?.permissions as Record<string, unknown> | null,
      );
      const overrides = dbPermissionsToApp(
        data.permission_overrides as Record<string, unknown> | null,
      );

      return {
        employmentId: data.id,
        companyId,
        companyName: data.companies?.name ?? '',
        role,
        systemKey: roleRow?.system_key ?? null,
        // Reihenfolge zaehlt: Rollenrechte zuerst, persoenliche Abweichungen gewinnen.
        permissions: { ...DEFAULT_PERMISSIONS, ...rolePermissions, ...overrides },
      };
    },
  });
}
