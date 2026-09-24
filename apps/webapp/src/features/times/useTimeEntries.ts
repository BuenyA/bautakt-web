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
    order_name: row.orders?.name ?? '',
    employee_name: fromEmployment || fromProfile,
  };
}

/**
 * Zeiteintraege des aktiven Betriebs, optional auf einen Auftrag.
 *
 * queryKey beginnt mit companyId (Mandant). Das dritte Segment ist die
 * `order_id` oder `'all'`, damit die Auftragsliste und die Betriebsliste
 * nicht denselben Cache teilen. RLS filtert auf eigene bzw. team-/finanzsichtbare
 * Zeilen. Neueste zuerst — das trifft den Index
 * `time_entries_order_id_started_at_idx` `(order_id, started_at desc)`.
 */
export function useTimeEntries(orderId?: string) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['timeEntries', companyId, orderId ?? 'all'],
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

      if (orderId) {
        query = query.eq('order_id', orderId);
      }

      const { data, error } = await query.order('started_at', { ascending: false });

      if (error) throw error;
      return ((data as TimeEntryQueryRow[] | null) ?? []).map(mapTimeEntryRow);
    },
  });
}
