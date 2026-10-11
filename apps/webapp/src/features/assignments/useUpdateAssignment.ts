import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { toTimestamp } from '@/features/times/timeEntryDraft';
import { supabase } from '@/lib/supabase';

import { type AssignmentDraft, diffEmployees } from './assignmentDraft';

/**
 * Ändert einen Einsatz: Zeit, Auftrag und Notiz in `work_assignments`, die
 * Mitarbeiter in `work_assignment_employees`.
 *
 * Die Update-Policy verlangt `canManageWorkAssignments`. Fehlt das Recht,
 * meldet PostgREST keinen Fehler, sondern ändert 0 Zeilen — deshalb `select`
 * und die Prüfung auf eine zurückgegebene Zeile.
 *
 * Mitarbeiter laufen als Differenz (`diffEmployees`): nur neu Eingeteilte
 * bekommen über den Insert-Trigger eine Push-Nachricht, Bestand bleibt still.
 */
export function useUpdateAssignment(assignmentId: string, employmentIdsBefore: readonly string[]) {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (draft: AssignmentDraft): Promise<void> => {
      if (!companyId) throw new Error('NOT_AUTHENTICATED');

      const startsAt = toTimestamp(draft.startDate, draft.startTime);
      const endsAt = toTimestamp(draft.endDate, draft.endTime);
      if (!startsAt || !endsAt) throw new Error('INVALID_PERIOD');

      const { data, error } = await supabase
        .from('work_assignments')
        .update({
          order_id: draft.orderId,
          starts_at: startsAt,
          ends_at: endsAt,
          note: draft.note.trim(),
          modified_at: new Date().toISOString(),
        })
        .eq('company_id', companyId)
        .eq('id', assignmentId)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('NOT_UPDATED');

      const { added, removed } = diffEmployees(employmentIdsBefore, draft.employmentIds);
      if (removed.length > 0) {
        const { error: removeError } = await supabase
          .from('work_assignment_employees')
          .delete()
          .eq('assignment_id', assignmentId)
          .in('employment_id', removed);
        if (removeError) throw removeError;
      }
      if (added.length > 0) {
        const { error: addError } = await supabase.from('work_assignment_employees').insert(
          added.map((employmentId) => ({
            assignment_id: assignmentId,
            employment_id: employmentId,
          })),
        );
        if (addError) throw addError;
      }
    },
    // Auch nach einem Fehler: der Einsatz kann schon geändert sein, nur die
    // Zuordnung nicht. Die Anzeige soll den wirklichen Stand zeigen.
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['assignments', companyId] });
    },
  });
}
