import { appPermissionsToDb, type EmployeePermissions } from '@bautakt/core';
import type { TablesUpdate } from '@bautakt/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

import { type CompanyAbsenceSettings, DEFAULT_ABSENCE_SETTINGS } from './leaveQuota';

/** Urlaubstage und Wochenend-Regel des Betriebs; ohne Zeile die Vorgaben der App. */
export function useAbsenceSettings() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['absence-settings', companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<CompanyAbsenceSettings> => {
      const { data, error } = await supabase
        .from('company_absence_settings')
        .select('annual_leave_days, counts_weekends_as_leave')
        .eq('company_id', companyId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return DEFAULT_ABSENCE_SETTINGS;
      return {
        annualLeaveDays: data.annual_leave_days,
        countsWeekendsAsLeave: data.counts_weekends_as_leave,
      };
    },
  });
}

export type EmployeeAssignment = {
  orderId: string;
  orderName: string;
  startsAt: string;
};

type AssignmentQueryRow = {
  work_assignments: {
    order_id: string;
    starts_at: string;
    orders: { name: string } | null;
  } | null;
};

/** Einsätze aus der Einsatzplanung, in denen der Mitarbeiter eingeteilt war. */
export function useEmployeeAssignments(employmentId: string) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['employee-assignments', companyId, employmentId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<EmployeeAssignment[]> => {
      const { data, error } = await supabase
        .from('work_assignment_employees')
        .select('work_assignments!inner(order_id, starts_at, company_id, orders(name))')
        .eq('employment_id', employmentId)
        .eq('work_assignments.company_id', companyId!);
      if (error) throw error;
      return ((data ?? []) as unknown as AssignmentQueryRow[]).flatMap(({ work_assignments }) =>
        work_assignments
          ? [
              {
                orderId: work_assignments.order_id,
                orderName: work_assignments.orders?.name ?? '',
                startsAt: work_assignments.starts_at,
              },
            ]
          : [],
      );
    },
  });
}

/**
 * Gemeinsamer Rahmen: Betrieb im Filter und `select('id')`. Ohne Zeile hat RLS
 * oder ein `enforce_*`-Trigger abgelehnt — das ist ein Fehler, kein Erfolg.
 */
function useUpdateEmployment<T>(toRow: (input: T) => TablesUpdate<'employments'>) {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: T }) => {
      const { data, error } = await supabase
        .from('employments')
        .update(toRow(input))
        .eq('id', id)
        .eq('company_id', companyId!)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('FORBIDDEN');
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['employments', companyId] });
      // Eigene Rechte geändert? Dann stimmt auch die Oberfläche nicht mehr.
      await queryClient.invalidateQueries({ queryKey: ['membership'] });
    },
  });
}

/**
 * Persönliche Rechte. Die Datenbank lässt nur Rechte vergeben, die ich selbst
 * habe (Inhaber ausgenommen), und nur bei Mitarbeitern unter meinem Rang.
 */
export function useUpdatePermissionOverrides() {
  return useUpdateEmployment((overrides: Partial<EmployeePermissions>) => ({
    permission_overrides: appPermissionsToDb(overrides),
  }));
}

export type LeaveSettingsInput = {
  annualLeaveDaysOverride: number | null;
  annualLeaveDaysOverrideIsManual: boolean;
};

/** Urlaubsanspruch; braucht zusätzlich `canManageAbsences` (Trigger). */
export function useUpdateLeaveSettings() {
  return useUpdateEmployment((input: LeaveSettingsInput) => ({
    annual_leave_days_override: input.annualLeaveDaysOverride,
    annual_leave_days_override_is_manual: input.annualLeaveDaysOverrideIsManual,
  }));
}
