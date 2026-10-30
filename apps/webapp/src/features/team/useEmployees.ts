import { dbPermissionsToApp, type EmployeePermissions } from '@bautakt/core';
import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { employmentDisplayName } from '@/lib/employeeName';
import { supabase } from '@/lib/supabase';

export type EmployeeRow = {
  id: string;
  name: string;
  role: string;
  job_title: string;
  contact_email: string;
  contact_phone: string;
  started_at: string | null;
  ended_at: string | null;
  /** Pfad im Bucket `profile-images`; anzeigen über `useProfileImageUrls`. */
  imagePath: string | null;
  /** Persönliche Abweichungen von den Rechten der Rolle; sie gewinnen. */
  permissionOverrides: Partial<EmployeePermissions>;
  annualLeaveDaysOverride: number | null;
  annualLeaveDaysOverrideIsManual: boolean;
  weekendCountsAsLeaveOverride: boolean | null;
};

type QueryRow = {
  id: string;
  role: string | null;
  job_title: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  started_at: string | null;
  ended_at: string | null;
  display_first_name: string | null;
  display_last_name: string | null;
  permission_overrides: unknown;
  annual_leave_days_override: number | null;
  annual_leave_days_override_is_manual: boolean;
  weekend_counts_as_leave_override: boolean | null;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    profile_image_url: string | null;
  } | null;
};

/**
 * Beschaeftigungen des Betriebs.
 *
 * ⚠️ `company_id` und `role` sind im Schema nullable. Eine Zeile ohne beides ist
 * keine brauchbare Mitgliedschaft; sie faellt hier raus, statt als Mitarbeiter
 * ohne Rolle in der Liste zu stehen (siehe wiki/pages/fallstricke.md).
 *
 * Ausgeschiedene (`ended_at`) bleiben in der Abfrage. Die Liste filtert sie
 * clientseitig (Default: nur Aktive) und kennzeichnet sie weiterhin.
 */
export function useEmployees(options?: { enabled?: boolean }) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: ['employments', companyId],
    enabled: Boolean(companyId) && enabled,
    queryFn: async (): Promise<EmployeeRow[]> => {
      const { data, error } = await supabase
        .from('employments')
        .select(
          'id, role, job_title, contact_email, contact_phone, started_at, ended_at, display_first_name, display_last_name, permission_overrides, annual_leave_days_override, annual_leave_days_override_is_manual, weekend_counts_as_leave_override, profiles(first_name, last_name, profile_image_url)',
        )
        .eq('company_id', companyId!)
        .order('ended_at', { ascending: true, nullsFirst: true });

      if (error) throw error;

      return ((data ?? []) as unknown as QueryRow[])
        .filter((row) => row.role)
        .map((row) => ({
          id: row.id,
          name: employmentDisplayName(row),
          role: row.role!,
          job_title: row.job_title ?? '',
          contact_email: row.contact_email ?? '',
          contact_phone: row.contact_phone ?? '',
          started_at: row.started_at,
          ended_at: row.ended_at,
          imagePath: row.profiles?.profile_image_url || null,
          permissionOverrides: dbPermissionsToApp(
            row.permission_overrides as Record<string, unknown> | null,
          ),
          annualLeaveDaysOverride: row.annual_leave_days_override,
          annualLeaveDaysOverrideIsManual: row.annual_leave_days_override_is_manual,
          weekendCountsAsLeaveOverride: row.weekend_counts_as_leave_override,
        }));
    },
  });
}
