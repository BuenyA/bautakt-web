import { hasPermission } from '@bautakt/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

/**
 * Warum das Loeschen abgelehnt wurde, bevor die Datenbank angefasst wird.
 *
 * `time_entries.work_assignment_id` zeigt mit ON DELETE CASCADE auf den Einsatz
 * (gemessen 2026-10-05). RLS auf `time_entries` ist nicht FORCE, die Kaskade
 * laeuft also nicht als der angemeldete Nutzer und nimmt die Zeiten mit. Die
 * Oberflaeche loescht deshalb nur, wenn sie alle Zeiten des Betriebs sehen
 * kann und fuer diesen Einsatz keine zaehlt.
 */
export class AssignmentDeleteBlocked extends Error {
  readonly reason: 'time-entries' | 'unverified' | 'forbidden';
  readonly count: number;

  constructor(reason: 'time-entries' | 'unverified' | 'forbidden', count = 0) {
    super(reason);
    this.name = 'AssignmentDeleteBlocked';
    this.reason = reason;
    this.count = count;
  }
}

export function useDeleteAssignment() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      if (!companyId) throw new Error('NOT_AUTHENTICATED');

      // Ohne eines dieser Rechte zeigt die Select-Policy nur die eigenen
      // Zeiten. Eine Null waere dann kein Beweis, und die Kaskade wuerde die
      // unsichtbaren Zeilen trotzdem loeschen.
      const canSeeCompanyTimes =
        hasPermission(membership?.permissions, 'canTrackTimeForTeam') ||
        hasPermission(membership?.permissions, 'canViewWageCosts') ||
        hasPermission(membership?.permissions, 'canViewCompanyFinance');
      if (!canSeeCompanyTimes) throw new AssignmentDeleteBlocked('unverified');

      const { count, error: countError } = await supabase
        .from('time_entries')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('work_assignment_id', assignmentId);
      if (countError) throw countError;
      if (count == null) throw new AssignmentDeleteBlocked('unverified');
      if (count > 0) throw new AssignmentDeleteBlocked('time-entries', count);

      // `.select('id')`: eine von RLS verschluckte Loeschung liefert sonst
      // Erfolg mit leerem Ergebnis, und die Oberflaeche wuerde „geloescht“ sagen.
      const { data, error } = await supabase
        .from('work_assignments')
        .delete()
        .eq('company_id', companyId)
        .eq('id', assignmentId)
        .select('id');
      if (error) throw error;
      if (!data?.length) throw new AssignmentDeleteBlocked('forbidden');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['assignments', companyId] });
    },
  });
}
