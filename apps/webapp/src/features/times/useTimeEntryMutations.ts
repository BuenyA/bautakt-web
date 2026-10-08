import { hasPermission } from '@bautakt/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/useAuth';
import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

import { type LaborRateCandidate, resolveLaborRate } from './resolveLaborRate';
import {
  entryRange,
  parseBreakMinutes,
  type TimeEntryDraft,
  timeEntryIssue,
} from './timeEntryDraft';

/**
 * Der Eintrag steht auf einem festgeschriebenen Beleg.
 *
 * Die Datenbank sperrt das nicht (gemessen 2026-10-08, Trigger
 * `trg_time_entries_billing_fields` schützt `billed_document_id` nur vor
 * Konten ohne `canUseBillingModule`). Die Oberfläche lehnt es ab, bevor sie
 * schreibt, damit die Rechnung nicht von der Zeit abweicht.
 */
export class TimeEntryBilledError extends Error {
  constructor() {
    super('TIME_ENTRY_BILLED');
    this.name = 'TimeEntryBilledError';
  }
}

type EmploymentRateRow = {
  id: string;
  user_id: string | null;
  role: string | null;
};

/** PostgREST liefert `numeric` manchmal als String. Unlesbares wird 0, nie NULL. */
function finiteRate(value: number | string | null): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function invalidateTimeViews(
  queryClient: ReturnType<typeof useQueryClient>,
  companyId: string | undefined,
) {
  // `timeEntries` ist der Key von Liste und Auftragsdetail. Die Rechnung
  // liest die Zeiten nicht live, aber ein offener Beleg soll nicht auf einem
  // Cache stehen, der vor dem Speichern geladen wurde.
  await queryClient.invalidateQueries({ queryKey: ['timeEntries', companyId] });
  await queryClient.invalidateQueries({ queryKey: ['sales-documents', companyId] });
  await queryClient.invalidateQueries({ queryKey: ['sales-document', companyId] });
}

/**
 * Zeiteintrag anlegen oder die fachlichen Felder ändern.
 *
 * Anlegen schreibt eine Zeile je Person. Ab zwei Personen teilen sie sich
 * `group_id`. Schlägt eine Zeile fehl, werden die schon geschriebenen wieder
 * gelöscht — sonst bliebe eine halbe Gruppe stehen.
 *
 * Bearbeiten lässt `group_id`, `work_assignment_id`, `daily_report_id`,
 * `cost_rate`, `billing_rate`, `is_billable` und `billed_document_id` in Ruhe.
 * Die Handy-App überschreibt sie beim Sync ebenfalls nicht.
 *
 * `id` hat kein Default. `modified_at` setzt der Client, die Spalte hat keinen.
 *
 * Sätze nur beim Anlegen und nur mit `canManageRates`. Ohne das Recht füllt
 * der Trigger sie; mit dem Recht bleibt, was der Client schickt — auch NULL.
 * `resolve_labor_rate` ist für `authenticated` nicht ausführbar, die Kaskade
 * läuft deshalb über die lesbaren `labor_rates`.
 */
export function useSaveTimeEntry() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const { user } = useAuth();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (draft: TimeEntryDraft) => {
      if (!companyId || !user?.id) throw new Error('NOT_AUTHENTICATED');
      if (draft.billed) throw new TimeEntryBilledError();

      const canTeam = hasPermission(membership?.permissions, 'canTrackTimeForTeam');
      const canOwn = hasPermission(membership?.permissions, 'canTrackTime');
      if (!canTeam && !canOwn) throw new Error('FORBIDDEN');

      // Ohne Team-Recht entsteht der Eintrag auf der eigenen Anstellung. Beim
      // Bearbeiten bleibt die Anstellung der Zeile, solange sie gesetzt ist —
      // sonst würde eine frühere Anstellung still auf die heutige umgeschrieben.
      let employmentIds = [...new Set(draft.employmentIds.filter(Boolean))];
      if (!canTeam && (!draft.id || employmentIds.length !== 1)) {
        employmentIds = membership?.employmentId ? [membership.employmentId] : [];
      }

      const normalized = { ...draft, employmentIds };
      if (timeEntryIssue(normalized)) throw new Error('INVALID_TIME_ENTRY');

      const range = entryRange(draft.date, draft.startTime, draft.endTime);
      const pause = parseBreakMinutes(draft.breakMinutes);
      if (!range || pause == null) throw new Error('INVALID_TIME_ENTRY');

      if (draft.id && employmentIds.length !== 1) throw new Error('EMPLOYEE_REQUIRED');

      if (draft.id) {
        const { data: existing, error: existingError } = await supabase
          .from('time_entries')
          .select('billed_document_id')
          .eq('company_id', companyId)
          .eq('id', draft.id)
          .maybeSingle();
        if (existingError) throw existingError;
        if (!existing) throw new Error('FORBIDDEN');
        if (existing.billed_document_id) throw new TimeEntryBilledError();
      }

      const { data: employmentRows, error: employmentError } = await supabase
        .from('employments')
        .select('id, user_id, role')
        .eq('company_id', companyId)
        .in('id', employmentIds);
      if (employmentError) throw employmentError;

      const employments = new Map(
        ((employmentRows ?? []) as EmploymentRateRow[]).map((row) => [row.id, row]),
      );
      for (const employmentId of employmentIds) {
        if (!employments.has(employmentId)) throw new Error('EMPLOYMENT_NOT_FOUND');
      }

      if (!canTeam) {
        const own = employments.get(employmentIds[0]!);
        if (own?.user_id !== user.id) throw new Error('FORBIDDEN');
      }

      const now = new Date().toISOString();
      const note = draft.note.trim();

      if (draft.id) {
        const employment = employments.get(employmentIds[0]!)!;
        const { data, error } = await supabase
          .from('time_entries')
          .update({
            order_id: draft.orderId,
            employment_id: employment.id,
            user_id: employment.user_id,
            started_at: range.startedAt,
            ended_at: range.endedAt,
            break_minutes: pause,
            note,
            modified_at: now,
          })
          .eq('company_id', companyId)
          .eq('id', draft.id)
          .select('id');
        if (error) throw error;
        if (!data?.length) throw new Error('FORBIDDEN');
        return;
      }

      const canManageRates = hasPermission(membership?.permissions, 'canManageRates');
      let rates: LaborRateCandidate[] | null = null;
      if (canManageRates) {
        const { data: rateRows, error: rateError } = await supabase
          .from('labor_rates')
          .select(
            'scope, order_id, employment_id, role_name, valid_from, valid_to, cost_rate, billing_rate',
          )
          .eq('company_id', companyId);
        if (rateError) throw rateError;
        rates = (rateRows ?? []).map((row) => ({
          scope: row.scope,
          orderId: row.order_id,
          employmentId: row.employment_id,
          roleName: row.role_name,
          validFrom: row.valid_from,
          validTo: row.valid_to,
          costRate: finiteRate(row.cost_rate),
          billingRate: finiteRate(row.billing_rate),
        }));
      }

      const groupId = employmentIds.length >= 2 ? crypto.randomUUID() : null;
      const inserted: string[] = [];
      try {
        for (const employmentId of employmentIds) {
          const employment = employments.get(employmentId)!;
          const id = crypto.randomUUID();
          const snapshot = rates
            ? resolveLaborRate(rates, {
                orderId: draft.orderId,
                employmentId,
                roleName: employment.role,
                onDate: draft.date,
              })
            : null;
          const { error } = await supabase.from('time_entries').insert({
            id,
            company_id: companyId,
            order_id: draft.orderId,
            employment_id: employment.id,
            user_id: employment.user_id,
            started_at: range.startedAt,
            ended_at: range.endedAt,
            break_minutes: pause,
            note,
            modified_at: now,
            group_id: groupId,
            is_billable: true,
            ...(snapshot
              ? { cost_rate: snapshot.costRate, billing_rate: snapshot.billingRate }
              : {}),
          });
          if (error) throw error;
          inserted.push(id);
        }
      } catch (caught) {
        if (inserted.length > 0) {
          await supabase
            .from('time_entries')
            .delete()
            .eq('company_id', companyId)
            .in('id', inserted);
        }
        throw caught;
      }
    },
    onSuccess: async () => {
      await invalidateTimeViews(queryClient, companyId);
    },
  });
}

/**
 * Zeiteintrag löschen.
 *
 * Abgerechnete Zeilen bleiben stehen. Eine von RLS verschluckte Löschung
 * liefert sonst Erfolg ohne Zeile — `.select('id')` macht daraus einen Fehler.
 */
export function useDeleteTimeEntry() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (entryId: string) => {
      if (!companyId) throw new Error('NOT_AUTHENTICATED');

      const canTeam = hasPermission(membership?.permissions, 'canTrackTimeForTeam');
      const canOwn = hasPermission(membership?.permissions, 'canTrackTime');
      if (!canTeam && !canOwn) throw new Error('FORBIDDEN');

      const { data: existing, error: existingError } = await supabase
        .from('time_entries')
        .select('billed_document_id')
        .eq('company_id', companyId)
        .eq('id', entryId)
        .maybeSingle();
      if (existingError) throw existingError;
      if (!existing) throw new Error('FORBIDDEN');
      if (existing.billed_document_id) throw new TimeEntryBilledError();

      const { data, error } = await supabase
        .from('time_entries')
        .delete()
        .eq('company_id', companyId)
        .eq('id', entryId)
        .select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('FORBIDDEN');
    },
    onSuccess: async () => {
      await invalidateTimeViews(queryClient, companyId);
    },
  });
}
