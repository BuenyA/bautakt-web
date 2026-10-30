import { dbPermissionsToApp, type EmployeePermissions } from '@bautakt/core';
import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

export type CompanyRole = {
  id: string;
  name: string;
  sort_order: number;
  system_key: string | null;
  /** Standardrechte der Rolle, ohne die Grundwerte aus `DEFAULT_PERMISSIONS`. */
  permissions: Partial<EmployeePermissions>;
};

/** Rollen dieses Betriebs — die Auswahl kommt aus der Datenbank, nicht aus einer Liste im Code. */
export function useCompanyRoles() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['company-roles', companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<CompanyRole[]> => {
      const { data, error } = await supabase
        .from('company_roles')
        .select('id, name, sort_order, system_key, permissions')
        .eq('company_id', companyId!)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data ?? []).map((role) => ({
        ...role,
        permissions: dbPermissionsToApp(role.permissions as Record<string, unknown> | null),
      }));
    },
  });
}

/**
 * Rollen, die ich beim Einladen oder Anlegen vergeben darf.
 *
 * Wie `assignableRoles` der App und `can_assign_employment_role` der
 * Datenbank: Der Inhaber darf jede Rolle vergeben, alle anderen nur Rollen
 * strikt unter dem eigenen Rang — nie die Inhaberrolle. Die Datenbank prüft
 * das beim Anlegen ohnehin; die Liste erspart nur den Fehler.
 */
export function assignableRoles(roles: CompanyRole[], myRole: string | undefined): CompanyRole[] {
  const mine = roles.find((role) => role.name === myRole);
  if (!mine) return [];
  if (mine.system_key === 'owner') return roles;
  return roles.filter((role) => role.system_key !== 'owner' && role.sort_order < mine.sort_order);
}

/**
 * Darf ich diesen Mitarbeiter verwalten (Rolle, Rechte)? Wie
 * `can_manage_employment_target` der Datenbank: der Inhaber jeden, alle
 * anderen nur Mitarbeiter strikt unter dem eigenen Rang.
 */
export function canManageTarget(
  roles: CompanyRole[],
  myRole: string | undefined,
  targetRole: string,
): boolean {
  const mine = roles.find((role) => role.name === myRole);
  if (!mine) return false;
  if (mine.system_key === 'owner') return true;
  const target = roles.find((role) => role.name === targetRole);
  return Boolean(target) && target!.system_key !== 'owner' && target!.sort_order < mine.sort_order;
}
