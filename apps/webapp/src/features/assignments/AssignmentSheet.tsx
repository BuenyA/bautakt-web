import {
  cn,
  FormDrawer,
  FormDrawerDescription,
  FormDrawerFooter,
  FormDrawerTitle,
  toast,
} from '@bautakt/ui';
import {
  Button,
  Checkbox,
  DrawerBody,
  DrawerHeader,
  Label,
  makeStyles,
  Select,
  Textarea,
  tokens,
} from '@fluentui/react-components';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { DatePicker, TimeInput } from '@/components/form/dateTime';
import { useAuth } from '@/features/auth/useAuth';
import { useMembership } from '@/features/company/useMembership';
import { useOrders } from '@/features/orders/useOrders';
import { useAbsences } from '@/features/team/useAbsences';
import { useEmployees } from '@/features/team/useEmployees';
import { toTimestamp } from '@/features/times/timeEntryDraft';
import { readableDbError } from '@/lib/dbErrors';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';
import { supabase } from '@/lib/supabase';

import { absenceConflict } from './absenceConflict';
import { type AssignmentDraft, draftFromAssignment, emptyAssignment } from './assignmentDraft';
import type { AssignmentDetail } from './useAssignment';
import { useUpdateAssignment } from './useUpdateAssignment';

const useStyles = makeStyles({
  pending: { color: tokens.colorPaletteMarigoldForeground2 },
});

/**
 * Legt einen Einsatz in `work_assignments` an und die Zuordnung in
 * `work_assignment_employees`.
 *
 * Pflicht laut Schema, Stand 2026-10-05: `id` (kein Default — die Handy-App
 * vergibt sie vor dem Sync), `company_id`, `order_id`, `starts_at`, `ends_at`,
 * `created_by_user_id`. Die Insert-Policy verlangt zusaetzlich
 * `created_by_user_id = auth.uid()` und `canManageWorkAssignments`.
 * `note` bleibt leer, wenn das Feld leer ist (Spalten-Default `''`).
 *
 * Mitarbeiter sind keine Pflicht: eine Zeile ohne Eintrag in
 * `work_assignment_employees` ist genau der Zustand, den die Liste als
 * „Keine Zuweisung“ schon anzeigt. Schlaegt die Zuordnung fehl, wird der
 * Einsatz wieder geloescht — sonst bliebe eine Zeile stehen, die der Nutzer
 * gerade als Fehler gesehen hat.
 */
function useCreateAssignment() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const { user } = useAuth();
  const companyId = membership?.companyId;
  const userId = user?.id;

  return useMutation({
    mutationFn: async (draft: AssignmentDraft): Promise<string> => {
      if (!companyId || !userId) throw new Error('NOT_AUTHENTICATED');

      const startsAt = toTimestamp(draft.startDate, draft.startTime);
      const endsAt = toTimestamp(draft.endDate, draft.endTime);
      if (!startsAt || !endsAt) throw new Error('INVALID_PERIOD');

      const id = crypto.randomUUID();
      const { error } = await supabase.from('work_assignments').insert({
        id,
        company_id: companyId,
        order_id: draft.orderId,
        starts_at: startsAt,
        ends_at: endsAt,
        note: draft.note.trim(),
        created_by_user_id: userId,
      });
      if (error) throw error;

      const employmentIds = [...new Set(draft.employmentIds.filter(Boolean))];
      if (employmentIds.length === 0) return id;

      const { error: linkError } = await supabase.from('work_assignment_employees').insert(
        employmentIds.map((employmentId) => ({
          assignment_id: id,
          employment_id: employmentId,
        })),
      );
      if (linkError) {
        await supabase.from('work_assignments').delete().eq('company_id', companyId).eq('id', id);
        throw linkError;
      }

      return id;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['assignments', companyId] });
    },
  });
}

/**
 * Einsatz anlegen oder bearbeiten.
 *
 * Seitenpanel, wie Auftrag und Abwesenheit: der Plan bleibt dahinter
 * sichtbar. Das Formular wird nur gemountet, solange das Panel offen ist,
 * und startet damit jedes Mal frisch.
 *
 * - `assignment` gesetzt: bearbeiten, das Panel schließt nach dem Speichern.
 * - `initial`: Tag und Stunde aus einem Klick in den Wochenplan.
 * - `onCreated`: was nach dem Anlegen passiert; ohne Angabe geht es zum Einsatz.
 */
export function AssignmentSheet({
  open,
  onOpenChange,
  assignment,
  initial,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment?: AssignmentDetail;
  initial?: { dayIso: string; hour: number };
  onCreated?: (id: string) => void;
}) {
  return (
    <FormDrawer open={open} onOpenChange={onOpenChange}>
      {open ? (
        <AssignmentForm
          assignment={assignment}
          initial={initial}
          onCreated={onCreated}
          onDone={() => onOpenChange(false)}
        />
      ) : null}
    </FormDrawer>
  );
}

function AssignmentForm({
  assignment,
  initial,
  onCreated,
  onDone,
}: {
  assignment?: AssignmentDetail;
  initial?: { dayIso: string; hour: number };
  onCreated?: (id: string) => void;
  onDone: () => void;
}) {
  const orderFieldId = useId();
  const styles = useStyles();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const create = useCreateAssignment();
  const assignedBefore = assignment?.crew.map((member) => member.employmentId) ?? [];
  const update = useUpdateAssignment(assignment?.id ?? '', assignedBefore);
  const isEdit = Boolean(assignment);
  const orders = useOrders();
  const employees = useEmployees();
  // Ohne `canManageAbsences` liefert RLS nur die eigenen Abwesenheiten. Die
  // Sperre selbst sitzt in der Datenbank und greift trotzdem.
  const absences = useAbsences();
  const [draft, setDraft] = useState<AssignmentDraft>(() =>
    assignment
      ? draftFromAssignment({ ...assignment, employmentIds: assignedBefore })
      : emptyAssignment(initial),
  );
  const [error, setError] = useState<string | null>(null);
  const ids = {
    startDate: useId(),
    startTime: useId(),
    endDate: useId(),
    endTime: useId(),
    note: useId(),
  };

  const startsAt = toTimestamp(draft.startDate, draft.startTime);
  const endsAt = toTimestamp(draft.endDate, draft.endTime);
  const datesInverted = Boolean(
    draft.startDate && draft.endDate && draft.endDate < draft.startDate,
  );
  // Gleicher oder späterer Tag, aber die Uhrzeit macht das Ende nicht später.
  // Ein früherer Tag zeigt die Meldung schon am Datumsfeld.
  const clockInverted = !datesInverted && Boolean(startsAt && endsAt && endsAt <= startsAt);

  // Ausgeschiedene stehen nicht zur Auswahl — fuer sie wird nichts mehr geplant.
  // Ausnahme beim Bearbeiten: wer schon eingeteilt ist, bleibt sichtbar, sonst
  // fiele die Person beim Speichern stillschweigend aus dem Einsatz.
  const selectableEmployees = (employees.data ?? []).filter(
    (employee) => !employee.ended_at || assignedBefore.includes(employee.id),
  );
  const orderOptions = [...(orders.data ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'de'));

  function set(patch: Partial<AssignmentDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function toggleEmployee(employmentId: string, on: boolean) {
    setDraft((current) => ({
      ...current,
      employmentIds: on
        ? [...current.employmentIds, employmentId]
        : current.employmentIds.filter((id) => id !== employmentId),
    }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();

    if (!draft.orderId) {
      setError(t('domain:assignments.create.orderRequired'));
      return;
    }

    const startsAt = toTimestamp(draft.startDate, draft.startTime);
    const endsAt = toTimestamp(draft.endDate, draft.endTime);
    if (!startsAt || !endsAt) {
      setError(t('domain:assignments.create.periodRequired'));
      return;
    }
    // Der Check `ends_at > starts_at` lehnt Gleichstand ab. Gleicher Tag mit
    // Ende vor Beginn ist im Buero fast immer ein Tippfehler; ein Einsatz ueber
    // mehrere Tage bleibt erlaubt, weil Beginn und Ende eigene Daten haben.
    if (endsAt <= startsAt) {
      setError(t('domain:assignments.create.endBeforeStart'));
      return;
    }

    try {
      if (isEdit) {
        await update.mutateAsync(draft);
        toast.success(t('domain:assignments.edit.saved'));
        onDone();
        return;
      }
      const id = await create.mutateAsync(draft);
      toast.success(t('domain:assignments.create.saved'));
      if (onCreated) {
        onCreated(id);
        onDone();
      } else navigate(routes.assignment(id));
    } catch (caught) {
      if (caught instanceof Error && caught.message === 'INVALID_PERIOD') {
        setError(t('domain:assignments.create.periodRequired'));
        return;
      }
      if (caught instanceof Error && caught.message === 'NOT_UPDATED') {
        setError(t('domain:assignments.edit.notAllowed'));
        return;
      }
      setError(readableDbError(caught) ?? t('domain:assignments.create.saveError'));
    }
  }

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="flex h-full min-h-0 w-full flex-col"
    >
      <DrawerHeader>
        <FormDrawerTitle closeLabel={t('common:action.close')}>
          {isEdit ? t('domain:assignments.edit.title') : t('domain:assignments.create.title')}
        </FormDrawerTitle>
        <FormDrawerDescription>
          {isEdit
            ? t('domain:assignments.edit.description')
            : t('domain:assignments.create.description')}
        </FormDrawerDescription>
      </DrawerHeader>

      <DrawerBody className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor={orderFieldId}>{t('domain:assignments.fields.order')}</Label>
          <Select
            id={orderFieldId}
            value={draft.orderId}
            onChange={(_, { value }) => set({ orderId: value })}
          >
            <option value="" disabled>
              {t('domain:assignments.create.chooseOrder')}
            </option>
            {orderOptions.map((order) => (
              <option key={order.id} value={order.id}>
                {order.name.trim() || t('domain:assignments.create.unnamedOrder')}
              </option>
            ))}
          </Select>
          {orders.isError ? (
            <p className="text-destructive text-sm">{t('domain:assignments.create.ordersError')}</p>
          ) : !orders.isPending && orderOptions.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t('domain:assignments.create.noOrders')}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={ids.startDate}>{t('domain:assignments.create.startDate')}</Label>
            <DatePicker
              id={ids.startDate}
              aria-label={t('domain:assignments.create.startDate')}
              value={draft.startDate}
              onChange={(startDate) => set({ startDate })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={ids.startTime}>{t('domain:assignments.create.startTime')}</Label>
            <TimeInput
              id={ids.startTime}
              aria-label={t('domain:assignments.create.startTime')}
              value={draft.startTime}
              onChange={(startTime) => set({ startTime })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={ids.endDate}>{t('domain:assignments.create.endDate')}</Label>
            <DatePicker
              id={ids.endDate}
              aria-label={t('domain:assignments.create.endDate')}
              value={draft.endDate}
              onChange={(endDate) => set({ endDate })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={ids.endTime}>{t('domain:assignments.create.endTime')}</Label>
            <TimeInput
              id={ids.endTime}
              aria-label={t('domain:assignments.create.endTime')}
              value={draft.endTime}
              onChange={(endTime) => set({ endTime })}
            />
          </div>
          {/* Unter beiden Spalten, sonst wächst nur die Datumsspalte und
              „Ende, Uhrzeit“ rutscht aus der Zeile. */}
          {datesInverted || clockInverted ? (
            <p role="alert" className="text-destructive text-sm sm:col-span-2">
              {t('domain:assignments.create.endBeforeStart')}
            </p>
          ) : null}
        </div>

        <fieldset className="grid gap-2">
          <legend className="text-sm leading-none font-medium">
            {t('domain:assignments.fields.employees')}
          </legend>
          <p className="text-muted-foreground text-sm">
            {t('domain:assignments.create.employeesHint')}
          </p>
          {employees.isPending ? (
            <p className="text-muted-foreground text-sm">{t('common:state.loading')}</p>
          ) : employees.isError ? (
            <p className="text-destructive text-sm">
              {t('domain:assignments.create.employeesError')}
            </p>
          ) : selectableEmployees.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t('domain:assignments.create.noEmployees')}
            </p>
          ) : (
            <div className="border-border flex max-h-48 flex-col gap-2 overflow-y-auto rounded-lg border p-3">
              {selectableEmployees.map((employee) => {
                const checked = draft.employmentIds.includes(employee.id);
                const { approved, pending } = absenceConflict(
                  absences.data ?? [],
                  employee.id,
                  draft.startDate,
                  draft.endDate,
                );
                const absence = approved ?? pending;
                const absenceText = absence
                  ? t(
                      approved
                        ? checked
                          ? 'domain:assignments.absence.approvedAssigned'
                          : 'domain:assignments.absence.approved'
                        : 'domain:assignments.absence.pending',
                      {
                        type: t(`domain:absences.types.${absence.type}`, {
                          defaultValue: absence.type,
                        }),
                        period:
                          absence.start_date === absence.end_date
                            ? formatDate(absence.start_date)
                            : `${formatDate(absence.start_date)} – ${formatDate(absence.end_date)}`,
                      },
                    )
                  : null;
                return (
                  <label
                    key={employee.id}
                    className={cn(
                      'flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm',
                      approved && !checked && 'text-text-subtle',
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      // Genehmigt abwesend: nicht neu einteilen (die Datenbank
                      // lehnt es ab). Wer schon drin ist, lässt sich austragen.
                      disabled={Boolean(approved) && !checked}
                      onChange={(_, { checked: value }) =>
                        toggleEmployee(employee.id, value === true)
                      }
                    />
                    <span>{employee.name || t('domain:employees.unnamed')}</span>
                    {employee.ended_at ? (
                      <span className="text-text-subtle text-xs">
                        {t('domain:assignments.edit.formerEmployee')}
                      </span>
                    ) : null}
                    {absenceText ? (
                      <span
                        className={cn(
                          'text-xs',
                          approved
                            ? checked
                              ? 'text-destructive font-medium'
                              : 'text-text-subtle'
                            : styles.pending,
                        )}
                      >
                        {absenceText}
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>

        <div className="grid gap-2">
          <Label htmlFor={ids.note}>{t('domain:assignments.fields.note')}</Label>
          <Textarea
            id={ids.note}
            rows={3}
            value={draft.note}
            onChange={(event) => set({ note: event.target.value })}
          />
        </div>

        {error &&
        !(
          error === t('domain:assignments.create.endBeforeStart') &&
          (datesInverted || clockInverted)
        ) ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
      </DrawerBody>

      <FormDrawerFooter>
        <Button type="button" onClick={onDone}>
          {t('common:action.cancel')}
        </Button>
        <Button
          appearance="primary"
          type="submit"
          disabled={create.isPending || update.isPending || datesInverted || clockInverted}
        >
          {t('common:action.save')}
        </Button>
      </FormDrawerFooter>
    </form>
  );
}
