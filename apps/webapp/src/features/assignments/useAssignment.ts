import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { employmentDisplayName } from '@/lib/employeeName';
import { supabase } from '@/lib/supabase';

export type AssignmentDetail = {
  id: string;
  starts_at: string;
  ends_at: string;
  note: string;
  order_id: string;
  order_name: string;
  employee_names: string[];
  created_at: string;
};

type AssignmentDetailQueryRow = {
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

export function useAssignment(assignmentId: string | undefined) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['assignments', companyId, 'detail', assignmentId],
    enabled: Boolean(companyId && assignmentId),
    queryFn: async (): Promise<AssignmentDetail | null> => {
      const { data, error } = await supabase
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
        .eq('id', assignmentId!)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const row = data as AssignmentDetailQueryRow;
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
    },
  });
}
