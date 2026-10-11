import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/useAuth';
import { useMembership } from '@/features/company/useMembership';
import { supabase } from '@/lib/supabase';

import { buildRecurrenceRule, shiftSeries, toTimestamps } from './calendarModel';
import type { CalendarEventDraft } from './eventDraft';

export type SeriesScope = 'this' | 'all';

/** Die Abfrage lief durch, hat aber keine Zeile getroffen — RLS oder schon weg. */
export class CalendarEventNotChangedError extends Error {
  constructor() {
    super('calendar_event_not_changed');
  }
}

/**
 * Termine speichern und löschen — dieselben Zeilen wie die Handy-App.
 *
 * Neu per `insert`, bestehend per `update`, nie `upsert`: ein Manager darf
 * fremde Firmentermine ändern, aber nicht einfügen, und `upsert` braucht
 * beides (dieselbe Falle wie im Sync-Handler der App).
 *
 * Serien: „Nur dieser Termin“ schreibt eine Ausnahmezeile
 * (`parent_event_id` + `recurrence_id` = ursprünglicher Beginn des
 * Vorkommens), „Alle Termine“ ändert den Serienkopf. Löschen von „Nur
 * diesem“ ist eine Ausnahme mit `is_cancelled`; „Alle“ löscht den Kopf, die
 * Ausnahmen gehen per CASCADE mit.
 */
export function useCalendarMutations() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const { user } = useAuth();
  const companyId = membership?.companyId;
  const userId = user?.id;

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: ['calendar-events', companyId] });
  }

  async function updateRow(id: string, values: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('calendar_events')
      .update({ ...values, modified_at: new Date().toISOString() })
      .eq('id', id)
      .eq('company_id', companyId!)
      .select('id');
    if (error) throw error;
    if (!data || data.length === 0) throw new CalendarEventNotChangedError();
  }

  /** Ausnahme für ein Vorkommen anlegen oder, falls es schon eine gibt, ändern. */
  async function upsertException(
    masterId: string,
    recurrenceId: string,
    values: Record<string, unknown>,
  ) {
    const existing = await supabase
      .from('calendar_events')
      .select('id')
      .eq('company_id', companyId!)
      .eq('parent_event_id', masterId)
      .eq('recurrence_id', recurrenceId)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) {
      await updateRow(existing.data.id, values);
      return;
    }
    const { error } = await supabase.from('calendar_events').insert({
      id: crypto.randomUUID(),
      company_id: companyId!,
      user_id: userId!,
      parent_event_id: masterId,
      recurrence_id: recurrenceId,
      recurrence_rule: null,
      starts_at: values.starts_at as string,
      ends_at: values.ends_at as string,
      event_type: values.event_type as string,
      ...values,
    });
    if (error) throw error;
  }

  const save = useMutation({
    mutationFn: async ({ draft, scope }: { draft: CalendarEventDraft; scope: SeriesScope }) => {
      if (!companyId || !userId) throw new Error('no_company');
      const { startsAt, endsAt } = toTimestamps(draft, draft.allDay);
      const common = {
        title: draft.title.trim(),
        description: draft.description.trim(),
        all_day: draft.allDay,
        reminder_minutes: draft.reminderMinutes,
      };
      const rule = buildRecurrenceRule(draft.recurrence, draft.recurrenceUntil || null);
      const occurrence = draft.occurrence;

      if (!occurrence) {
        const { error } = await supabase.from('calendar_events').insert({
          id: crypto.randomUUID(),
          company_id: companyId,
          user_id: userId,
          event_type: draft.eventType,
          starts_at: startsAt,
          ends_at: endsAt,
          recurrence_rule: rule,
          ...common,
        });
        if (error) throw error;
        return;
      }

      if (occurrence.isException) {
        // Eine Ausnahme bleibt Ausnahme: kein eigener Rhythmus, Typ vom Kopf.
        await updateRow(occurrence.rowId, { ...common, starts_at: startsAt, ends_at: endsAt });
        return;
      }

      if (occurrence.recurrenceId && scope === 'this') {
        await upsertException(occurrence.masterId, occurrence.recurrenceId, {
          ...common,
          event_type: occurrence.eventType,
          starts_at: startsAt,
          ends_at: endsAt,
          is_cancelled: false,
        });
        return;
      }

      const times =
        occurrence.recurrenceId && draft.masterStartsAt
          ? shiftSeries({ startsAt: draft.masterStartsAt }, occurrence.startsAt, {
              startsAt,
              endsAt,
            })
          : { startsAt, endsAt };
      await updateRow(occurrence.rowId, {
        ...common,
        event_type: draft.eventType,
        starts_at: times.startsAt,
        ends_at: times.endsAt,
        recurrence_rule: rule,
      });
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async ({ draft, scope }: { draft: CalendarEventDraft; scope: SeriesScope }) => {
      const occurrence = draft.occurrence;
      if (!companyId || !userId || !occurrence) throw new Error('no_company');

      if (occurrence.recurrenceId && scope === 'this') {
        if (occurrence.isException) {
          await updateRow(occurrence.rowId, { is_cancelled: true });
        } else {
          await upsertException(occurrence.masterId, occurrence.recurrenceId, {
            title: occurrence.title,
            description: occurrence.description,
            all_day: occurrence.allDay,
            event_type: occurrence.eventType,
            starts_at: occurrence.startsAt,
            ends_at: occurrence.endsAt,
            reminder_minutes: occurrence.reminderMinutes,
            is_cancelled: true,
          });
        }
        return;
      }

      const { data, error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', occurrence.masterId)
        .eq('company_id', companyId)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new CalendarEventNotChangedError();
    },
    onSuccess: invalidate,
  });

  return { save, remove };
}
