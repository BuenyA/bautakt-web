import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { employmentDisplayName } from '@/lib/employeeName';
import { getLocalWeekBounds } from '@/lib/format';
import { supabase } from '@/lib/supabase';

export type AssignmentListFilter = 'all' | 'week';

export type AssignmentListRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  note: string;
  order_id: string;
  order_name: string;
  employee_names: string[];
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
  work_assignment_employees:
    | {
        employment_id: string;
        employments: {
          display_first_name: string | null;
          display_last_name: string | null;
          profiles: { first_name: string | null; last_name: string | null } | null;
        } | null;
      }[]
    | null;
};

function mapAssignmentRow(row: AssignmentQueryRow): AssignmentListRow {
  const names =
    row.work_assignment_employees
      ?.map((link) => (link.employments ? employmentDisplayName(link.employments) : ''))
      .filter(Boolean) ?? [];

  return {
    id: row.id,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    note: row.note,
    order_id: row.order_id,
    order_name: row.orders?.name ?? '',
    employee_names: names,
    created_at: row.created_at,
  };
}

/**
 * Einsaetze des aktiven Betriebs. queryKey beginnt mit companyId (Mandant).
 * RLS zeigt nur eigene/zugewiesene oder verwaltbare Zeilen.
 */
export function useAssignments(filter: AssignmentListFilter = 'all') {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['assignments', companyId, filter],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<AssignmentListRow[]> => {
      let query = supabase
        .from('work_assignments')
        .select(
          `
          id,
          starts_at,
          ends_at,
          note,
          order_id,
          created_at,
          orders ( name ),
          work_assignment_employees (
            employment_id,
            employments (
              display_first_name,
              display_last_name,
              profiles ( first_name, last_name )
            )
          )
        `,
        )
        .eq('company_id', companyId!)
        .order('starts_at', { ascending: false });

      if (filter === 'week') {
        const { start, end } = getLocalWeekBounds();
        query = query.gte('starts_at', start.toISOString()).lte('starts_at', end.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return ((data as AssignmentQueryRow[] | null) ?? []).map(mapAssignmentRow);
    },
  });
}
