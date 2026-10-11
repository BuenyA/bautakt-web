import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/useAuth';
import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

import { type CalendarEventRow, expandOccurrences, type Occurrence } from './calendarModel';

const COLUMNS =
  'id, user_id, event_type, title, description, starts_at, ends_at, all_day, recurrence_rule, parent_event_id, recurrence_id, is_cancelled, reminder_minutes';

/**
 * Termine im Zeitraum [`from`, `to`], Serien aufgefaltet.
 *
 * Drei Abfragen: Einzeltermine im Zeitraum, alle Serienköpfe, die vor dem
 * Zeitraumende beginnen, und deren Ausnahmen. RLS liefert nur Firmentermine
 * und eigene private Termine — fremde private Termine sieht niemand, auch
 * die Leitung nicht.
 *
 * queryKey beginnt mit companyId und userId (private Termine hängen am
 * Nutzer). Speichern invalidiert `['calendar-events', companyId]` und trifft
 * damit auch „Heute“ auf der Übersicht.
 */
export function useCalendarEvents(from: Date, to: Date) {
  const { data: membership } = useMembership();
  const { user } = useAuth();
  const companyId = membership?.companyId;
  const userId = user?.id;
  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  return useQuery({
    queryKey: ['calendar-events', companyId, userId, 'range', fromIso, toIso],
    enabled: Boolean(companyId && userId),
    queryFn: async (): Promise<{ rows: CalendarEventRow[]; occurrences: Occurrence[] }> => {
      const [singles, masters] = await Promise.all([
        supabase
          .from('calendar_events')
          .select(COLUMNS)
          .eq('company_id', companyId!)
          .is('parent_event_id', null)
          .is('recurrence_rule', null)
          .lte('starts_at', toIso)
          .gte('ends_at', fromIso),
        supabase
          .from('calendar_events')
          .select(COLUMNS)
          .eq('company_id', companyId!)
          .is('parent_event_id', null)
          .not('recurrence_rule', 'is', null)
          .lte('starts_at', toIso),
      ]);
      if (singles.error) throw singles.error;
      if (masters.error) throw masters.error;

      const masterRows = (masters.data ?? []) as CalendarEventRow[];
      let exceptionRows: CalendarEventRow[] = [];
      if (masterRows.length > 0) {
        const exceptions = await supabase
          .from('calendar_events')
          .select(COLUMNS)
          .eq('company_id', companyId!)
          .in(
            'parent_event_id',
            masterRows.map((row) => row.id),
          );
        if (exceptions.error) throw exceptions.error;
        exceptionRows = (exceptions.data ?? []) as CalendarEventRow[];
      }

      const rows = [
        ...((singles.data ?? []) as CalendarEventRow[]),
        ...masterRows,
        ...exceptionRows,
      ];
      return { rows, occurrences: expandOccurrences(rows, from, to) };
    },
  });
}
