import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { employmentDisplayName } from '@/lib/employeeName';
import { supabase } from '@/lib/supabase';

export type AbsenceRow = {
  id: string;
  employment_id: string;
  employee_name: string;
  type: string;
  status: string;
  start_date: string;
  end_date: string;
  note: string;
  decided_at: string | null;
};

type QueryRow = Omit<AbsenceRow, 'employee_name'> & {
  employments: {
    display_first_name: string | null;
    display_last_name: string | null;
    profiles: { first_name: string | null; last_name: string | null } | null;
  } | null;
};

/** Abwesenheiten des Betriebs, offene zuerst. */
export function useAbsences() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['absences', companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<AbsenceRow[]> => {
      const { data, error } = await supabase
        .from('absences')
        .select(
          'id, employment_id, type, status, start_date, end_date, note, decided_at, employments(display_first_name, display_last_name, profiles(first_name, last_name))',
        )
        .eq('company_id', companyId!)
        .order('start_date', { ascending: false });

      if (error) throw error;

      return ((data ?? []) as unknown as QueryRow[]).map(({ employments, ...row }) => ({
        ...row,
        employee_name: employments ? employmentDisplayName(employments) : '',
      }));
    },
  });
}

/**
 * Abwesenheit genehmigen.
 *
 * Ueber die RPC `approve_absence` und nicht per `update`: dort haengen die
 * Pruefungen (wer darf ueber wen entscheiden) und der Eintrag des
 * Entscheiders. Ein direktes Update wuerde beides umgehen — und die RLS es
 * ohnehin ablehnen.
 */
export function useApproveAbsence() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (absenceId: string) => {
      const { error } = await supabase.rpc('approve_absence', { p_absence_id: absenceId });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['absences', companyId] });
    },
  });
}
