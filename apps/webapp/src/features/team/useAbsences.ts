import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type CrewMember,
  crewMember,
  EMPLOYMENT_SELECT,
  type EmploymentJoin,
} from '@/features/assignments/crew';
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
  /** Grund beim Ablehnen; leer, wenn keiner angegeben wurde. */
  decision_note: string | null;
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
          'id, employment_id, type, status, start_date, end_date, note, decided_at, decision_note, employments(display_first_name, display_last_name, profiles(first_name, last_name))',
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

export type AbsenceDetail = AbsenceRow & {
  /** Name und Profilbild für die Kopfzeile, wie in der Einsatzplanung. */
  member: CrewMember;
  created_at: string;
  /** Leer, wenn das Profil nicht lesbar ist oder keinen Namen hat. */
  requested_by_name: string;
  decided_by_name: string;
};

type PersonJoin = { first_name: string | null; last_name: string | null } | null;

function personName(person: PersonJoin): string {
  return [person?.first_name, person?.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
}

/**
 * Eine Abwesenheit für die Detailseite. Liegt unter `['absences', companyId]`,
 * damit jede Änderung sie mit der Liste zusammen neu lädt.
 */
export function useAbsence(absenceId: string | undefined) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['absences', companyId, 'detail', absenceId],
    enabled: Boolean(companyId && absenceId),
    queryFn: async (): Promise<AbsenceDetail | null> => {
      const { data, error } = await supabase
        .from('absences')
        .select(
          `id, employment_id, type, status, start_date, end_date, note, decided_at, decision_note, created_at,
           employments ( ${EMPLOYMENT_SELECT} ),
           requester:profiles!requested_by_user_id ( first_name, last_name ),
           decider:profiles!decided_by_user_id ( first_name, last_name )`,
        )
        .eq('company_id', companyId!)
        .eq('id', absenceId!)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const { employments, requester, decider, ...row } = data as unknown as Omit<
        AbsenceDetail,
        'member' | 'employee_name' | 'requested_by_name' | 'decided_by_name'
      > & { employments: EmploymentJoin; requester: PersonJoin; decider: PersonJoin };
      const member = crewMember(row.employment_id, employments);
      return {
        ...row,
        member,
        employee_name: member.name,
        requested_by_name: personName(requester),
        decided_by_name: personName(decider),
      };
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

/**
 * Gemeinsamer Rahmen der Änderungen: Betrieb im Filter, `select('id')`, und
 * 0 Zeilen als Fehler. PostgREST meldet eine RLS-Ablehnung bei UPDATE und
 * DELETE nicht, sondern ändert einfach nichts.
 *
 * Die Regeln, was sich wann ändern darf, sitzen im Trigger
 * `enforce_absence_update_integrity` (bautakt-app
 * `20261011213845_absence_edit_delete`): ablehnen nur offene, stornieren nur
 * genehmigte, bearbeiten nur offene und genehmigte — alles mit
 * `canManageAbsences`. Sonst kommt `INVALID_STATUS_TRANSITION` oder
 * `FORBIDDEN`.
 */
function useAbsenceMutation<T>(
  run: (companyId: string, input: T) => PromiseLike<{ data: unknown[] | null; error: unknown }>,
  mutationKey?: readonly string[],
) {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useMutation({
    mutationKey,
    mutationFn: async (input: T) => {
      if (!companyId) throw new Error('NOT_AUTHENTICATED');
      const { data, error } = await run(companyId, input);
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('NOT_UPDATED');
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['absences', companyId] });
    },
  });
}

/** Offenen Antrag ablehnen, mit freiwilligem Grund. Der Mitarbeiter wird benachrichtigt. */
export function useRejectAbsence() {
  return useAbsenceMutation((companyId, input: { id: string; reason: string }) =>
    supabase
      .from('absences')
      .update({ status: 'abgelehnt', decision_note: input.reason.trim() || null })
      .eq('company_id', companyId)
      .eq('id', input.id)
      .select('id'),
  );
}

/** Genehmigte Abwesenheit stornieren: bleibt in der Liste, zählt aber nicht mehr. */
export function useCancelAbsence() {
  return useAbsenceMutation((companyId, id: string) =>
    supabase
      .from('absences')
      .update({ status: 'storniert' })
      .eq('company_id', companyId)
      .eq('id', id)
      .select('id'),
  );
}

/** Art, Zeitraum und Notiz ändern. Die Genehmigung bleibt bestehen. */
export function useUpdateAbsence() {
  return useAbsenceMutation(
    (
      companyId,
      input: { id: string; type: string; startDate: string; endDate: string; note: string },
    ) =>
      supabase
        .from('absences')
        .update({
          type: input.type,
          start_date: input.startDate,
          end_date: input.endDate,
          note: input.note.trim(),
        })
        .eq('company_id', companyId)
        .eq('id', input.id)
        .select('id'),
  );
}

/** Schlüssel des Löschens: die Detailseite zeigt währenddessen nicht „nicht gefunden“. */
export const DELETE_ABSENCE_KEY = ['absences', 'delete'] as const;

/** Endgültig löschen — auch aus dem Urlaubskonto. Nicht rückgängig zu machen. */
export function useDeleteAbsence() {
  return useAbsenceMutation(
    (companyId, id: string) =>
      supabase.from('absences').delete().eq('company_id', companyId).eq('id', id).select('id'),
    DELETE_ABSENCE_KEY,
  );
}
