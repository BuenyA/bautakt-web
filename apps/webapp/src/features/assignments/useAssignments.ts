import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

import {
  type CrewMember,
  crewMember,
  EMPLOYMENT_SELECT,
  type EmploymentJoin,
  sortCrew,
} from './crew';

export type AssignmentListRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  note: string;
  order_id: string;
  order_name: string;
  crew: CrewMember[];
  created_at: string;
};

type AssignmentQueryRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  note: string;
  order_id: string;
  created_at: string;
  orders: { name: string } | null;
  work_assignment_employees: { employment_id: string; employments: EmploymentJoin }[] | null;
};

function mapAssignmentRow(row: AssignmentQueryRow): AssignmentListRow {
  return {
    id: row.id,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    note: row.note,
    order_id: row.order_id,
    order_name: row.orders?.name ?? '',
    crew: sortCrew(
      (row.work_assignment_employees ?? []).map((link) =>
        crewMember(link.employment_id, link.employments),
      ),
    ),
    created_at: row.created_at,
  };
}

/**
 * Einsätze des aktiven Betriebs, die den Zeitraum [`from`, `to`] berühren —
 * auch solche, die vorher beginnen oder danach enden (Nacht, mehrere Tage).
 *
 * queryKey beginnt mit companyId (Mandant). Speichern invalidiert
 * `['assignments', companyId]` und trifft damit Woche, Kalender und Übersicht.
 * RLS zeigt nur eigene/zugewiesene oder verwaltbare Zeilen.
 */
export function useAssignments(from: Date, to: Date) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  return useQuery({
    queryKey: ['assignments', companyId, 'range', fromIso, toIso],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<AssignmentListRow[]> => {
      const { data, error } = await supabase
        .from('work_assignments')
        .select(
          `id, starts_at, ends_at, note, order_id, created_at,
           orders ( name ),
           work_assignment_employees ( employment_id, employments ( ${EMPLOYMENT_SELECT} ) )`,
        )
        .eq('company_id', companyId!)
        .lte('starts_at', toIso)
        .gte('ends_at', fromIso)
        .order('starts_at', { ascending: true });

      if (error) throw error;
      return ((data ?? []) as unknown as AssignmentQueryRow[]).map(mapAssignmentRow);
    },
  });
}
