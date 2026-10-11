import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { employmentDisplayName } from '@/lib/employeeName';
import { supabase } from '@/lib/supabase';

export type TimeEntryListRow = {
  id: string;
  started_at: string;
  ended_at: string | null;
  break_minutes: number;
  note: string;
  order_id: string;
  employment_id: string | null;
  user_id: string | null;
  billed: boolean;
  order_name: string;
  employee_name: string;
};

type TimeEntryQueryRow = {
  id: string;
  started_at: string;
  ended_at: string | null;
  break_minutes: number;
  note: string;
  order_id: string;
  employment_id: string | null;
  user_id: string | null;
  billed_document_id: string | null;
  orders: { name: string } | null;
  employments: {
    display_first_name: string | null;
    display_last_name: string | null;
    profiles: { first_name: string | null; last_name: string | null } | null;
  } | null;
  profiles: { first_name: string | null; last_name: string | null } | null;
};

function mapTimeEntryRow(row: TimeEntryQueryRow): TimeEntryListRow {
  const fromEmployment = row.employments ? employmentDisplayName(row.employments) : '';
  const fromProfile = row.profiles
    ? [row.profiles.first_name, row.profiles.last_name]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(' ')
    : '';

  return {
    id: row.id,
    started_at: row.started_at,
    ended_at: row.ended_at,
    break_minutes: row.break_minutes,
    note: row.note,
    order_id: row.order_id,
    employment_id: row.employment_id,
    user_id: row.user_id,
    billed: Boolean(row.billed_document_id),
    order_name: row.orders?.name ?? '',
    employee_name: fromEmployment || fromProfile,
  };
}

/**
 * Zeiteintraege des aktiven Betriebs — eines Auftrags oder eines Mitarbeiters.
 *
 * Eine Liste aller Zeiten des Betriebs gibt es seit 2026-10-11 nicht mehr
 * (kein Bereich „Zeiten“): Zeiten stehen im Auftrag und auf der
 * Mitarbeiterseite. queryKey beginnt mit companyId (Mandant), danach der
 * Filter, damit beide Ansichten nicht denselben Cache teilen; invalidiert wird
 * über den Präfix `['timeEntries', companyId]`. RLS filtert auf eigene bzw.
 * team-/finanzsichtbare Zeilen. Neueste zuerst — beim Auftrag trifft das den
 * Index `time_entries_order_id_started_at_idx` `(order_id, started_at desc)`.
 */
export function useTimeEntries(filter: { orderId: string } | { employmentId: string }) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const scope =
    'orderId' in filter ? `order:${filter.orderId}` : `employment:${filter.employmentId}`;

  return useQuery({
    queryKey: ['timeEntries', companyId, scope],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<TimeEntryListRow[]> => {
      let query = supabase
        .from('time_entries')
        .select(
          `
          id,
          started_at,
          ended_at,
          break_minutes,
          note,
          order_id,
          employment_id,
          user_id,
          billed_document_id,
          orders ( name ),
          employments (
            display_first_name,
            display_last_name,
            profiles ( first_name, last_name )
          ),
          profiles ( first_name, last_name )
        `,
        )
        .eq('company_id', companyId!);

      query =
        'orderId' in filter
          ? query.eq('order_id', filter.orderId)
          : query.eq('employment_id', filter.employmentId);

      const { data, error } = await query.order('started_at', { ascending: false });

      if (error) throw error;
      return ((data as TimeEntryQueryRow[] | null) ?? []).map(mapTimeEntryRow);
    },
  });
}
