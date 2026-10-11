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

export type AssignmentDetail = {
  id: string;
  starts_at: string;
  ends_at: string;
  note: string;
  order_id: string;
  order_name: string;
  /** Straße, PLZ und Ort des Auftrags in einer Zeile; leer, wenn nichts gepflegt ist. */
  order_location: string;
  crew: CrewMember[];
  created_at: string;
  /** Name des Anlegers; leer, wenn das Profil nicht lesbar oder ohne Namen ist. */
  created_by_name: string;
};

type AssignmentDetailQueryRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  note: string;
  order_id: string;
  created_at: string;
  orders: { name: string; street_address: string; postal_code: string; city: string } | null;
  creator: { first_name: string | null; last_name: string | null } | null;
  work_assignment_employees: { employment_id: string; employments: EmploymentJoin }[] | null;
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
          `id, starts_at, ends_at, note, order_id, created_at,
           orders ( name, street_address, postal_code, city ),
           creator:profiles!created_by_user_id ( first_name, last_name ),
           work_assignment_employees ( employment_id, employments ( ${EMPLOYMENT_SELECT} ) )`,
        )
        .eq('company_id', companyId!)
        .eq('id', assignmentId!)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const row = data as unknown as AssignmentDetailQueryRow;
      return {
        id: row.id,
        starts_at: row.starts_at,
        ends_at: row.ends_at,
        note: row.note,
        order_id: row.order_id,
        order_name: row.orders?.name ?? '',
        order_location: [
          row.orders?.street_address,
          [row.orders?.postal_code, row.orders?.city].filter(Boolean).join(' '),
        ]
          .filter(Boolean)
          .join(', '),
        crew: sortCrew(
          (row.work_assignment_employees ?? []).map((link) =>
            crewMember(link.employment_id, link.employments),
          ),
        ),
        created_at: row.created_at,
        created_by_name: [row.creator?.first_name, row.creator?.last_name]
          .map((part) => part?.trim())
          .filter(Boolean)
          .join(' '),
      };
    },
  });
}
