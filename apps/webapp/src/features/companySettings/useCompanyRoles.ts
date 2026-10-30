import {
  appPermissionsToDb,
  dbPermissionsToApp,
  DEFAULT_PERMISSIONS,
  type EmployeePermissions,
} from '@bautakt/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

export type CompanyRole = {
  id: string;
  name: string;
  icon: string | null;
  isSystem: boolean;
  systemKey: string | null;
  sortOrder: number;
  permissions: EmployeePermissions;
  /** Aktive Beschäftigungen mit dieser Rolle. */
  memberCount: number;
};

/**
 * Rollen des Betriebs mit ihren Standardrechten und der Zahl der Mitglieder.
 * Lesen dürfen alle Mitglieder (RLS); Ändern siehe `companyAccess`.
 */
export function useCompanyRoles() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['company-roles', companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<CompanyRole[]> => {
      const [roles, employments] = await Promise.all([
        supabase
          .from('company_roles')
          .select('id, name, icon, is_system, system_key, sort_order, permissions')
          .eq('company_id', companyId!)
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true }),
        supabase
          .from('employments')
          .select('role')
          .eq('company_id', companyId!)
          .is('ended_at', null),
      ]);
      if (roles.error) throw roles.error;
      if (employments.error) throw employments.error;

      const counts = new Map<string, number>();
      for (const row of employments.data ?? []) {
        if (row.role) counts.set(row.role, (counts.get(row.role) ?? 0) + 1);
      }

      return (roles.data ?? []).map((role) => ({
        id: role.id,
        name: role.name,
        icon: role.icon,
        isSystem: role.is_system,
        systemKey: role.system_key,
        sortOrder: role.sort_order,
        permissions: {
          ...DEFAULT_PERMISSIONS,
          ...dbPermissionsToApp(role.permissions as Record<string, unknown> | null),
        },
        memberCount: counts.get(role.name) ?? 0,
      }));
    },
  });
}

function useInvalidateRoles() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return async () => {
    await queryClient.invalidateQueries({ queryKey: ['company-roles', companyId] });
    // Die eigenen Rechte hängen an der Rolle.
    await queryClient.invalidateQueries({ queryKey: ['membership'] });
  };
}

/** Standardrechte einer Rolle ersetzen. */
export function useUpdateRolePermissions() {
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: async ({ id, permissions }: { id: string; permissions: EmployeePermissions }) => {
      const { error } = await supabase
        .from('company_roles')
        .update({ permissions: appPermissionsToDb(permissions) })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/**
 * Eigene Rolle anlegen, Rechte aus einer Vorlage-Rolle übernommen — wie die
 * App (`sort_order` 100, `is_system` false). Den Standard-Stundensatz legt
 * der Trigger `trg_seed_labor_rate_for_role` an.
 */
export function useCreateRole() {
  const invalidate = useInvalidateRoles();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  return useMutation({
    mutationFn: async (input: { name: string; icon: string; permissions: EmployeePermissions }) => {
      const { data, error } = await supabase
        .from('company_roles')
        .insert([
          {
            company_id: companyId!,
            name: input.name.trim(),
            icon: input.icon,
            is_system: false,
            sort_order: 100,
            permissions: appPermissionsToDb(input.permissions),
          },
        ])
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: invalidate,
  });
}

/**
 * Eigene Rolle löschen. Der Trigger `trg_company_roles_block_delete` lehnt
 * Systemrollen und Rollen mit Mitgliedern ab; die Oberfläche bietet beides
 * gar nicht erst an.
 */
export function useDeleteRole() {
  const invalidate = useInvalidateRoles();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('company_roles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
