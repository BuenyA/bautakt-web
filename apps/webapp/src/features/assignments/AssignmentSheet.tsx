import {
  Button,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Textarea,
  toast,
} from '@bautakt/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { useAuth } from '@/features/auth/useAuth';
import { useMembership } from '@/features/company/useMembership';
import { useOrders } from '@/features/orders/useOrders';
import { useEmployees } from '@/features/team/useEmployees';
import { toTimestamp } from '@/features/times/timeEntryDraft';
import { readableDbError } from '@/lib/dbErrors';
import { routes } from '@/lib/routes';
import { supabase } from '@/lib/supabase';

import { type AssignmentDraft, emptyAssignment } from './assignmentDraft';

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
 * Einsatz anlegen.
 *
 * Seitenpanel, wie Auftrag und Abwesenheit: die Liste bleibt dahinter
 * sichtbar. Das Formular wird nur gemountet, solange das Panel offen ist,
 * und startet damit jedes Mal frisch.
 */
export function AssignmentSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0">
        {open ? <AssignmentForm onDone={() => onOpenChange(false)} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function AssignmentForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const create = useCreateAssignment();
  const orders = useOrders();
  const employees = useEmployees();
  const [draft, setDraft] = useState<AssignmentDraft>(emptyAssignment);
  const [error, setError] = useState<string | null>(null);
  const ids = {
    startDate: useId(),
    startTime: useId(),
    endDate: useId(),
    endTime: useId(),
    note: useId(),
  };

  // Ausgeschiedene stehen nicht zur Auswahl — fuer sie wird nichts mehr geplant.
  const selectableEmployees = (employees.data ?? []).filter((employee) => !employee.ended_at);
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
      const id = await create.mutateAsync(draft);
      toast.success(t('domain:assignments.create.saved'));
      navigate(routes.assignment(id));
    } catch (caught) {
      if (caught instanceof Error && caught.message === 'INVALID_PERIOD') {
        setError(t('domain:assignments.create.periodRequired'));
        return;
      }
      setError(readableDbError(caught) ?? t('domain:assignments.create.saveError'));
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex h-full flex-col">
      <SheetHeader>
        <SheetTitle>{t('domain:assignments.create.title')}</SheetTitle>
        <SheetDescription>{t('domain:assignments.create.description')}</SheetDescription>
      </SheetHeader>

      <SheetBody className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label>{t('domain:assignments.fields.order')}</Label>
          <Select value={draft.orderId} onValueChange={(value) => set({ orderId: value })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('domain:assignments.create.chooseOrder')} />
            </SelectTrigger>
            <SelectContent>
              {orderOptions.map((order) => (
                <SelectItem key={order.id} value={order.id}>
                  {order.name.trim() || t('domain:assignments.create.unnamedOrder')}
                </SelectItem>
              ))}
            </SelectContent>
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
            <Input
              id={ids.startDate}
              type="date"
              value={draft.startDate}
              onChange={(event) => set({ startDate: event.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={ids.startTime}>{t('domain:assignments.create.startTime')}</Label>
            <Input
              id={ids.startTime}
              type="time"
              value={draft.startTime}
              onChange={(event) => set({ startTime: event.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={ids.endDate}>{t('domain:assignments.create.endDate')}</Label>
            <Input
              id={ids.endDate}
              type="date"
              value={draft.endDate}
              onChange={(event) => set({ endDate: event.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={ids.endTime}>{t('domain:assignments.create.endTime')}</Label>
            <Input
              id={ids.endTime}
              type="time"
              value={draft.endTime}
              onChange={(event) => set({ endTime: event.target.value })}
            />
          </div>
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
                return (
                  <label key={employee.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => toggleEmployee(employee.id, value === true)}
                    />
                    <span>{employee.name || t('domain:employees.unnamed')}</span>
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

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
      </SheetBody>

      <SheetFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t('common:action.cancel')}
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {t('common:action.save')}
        </Button>
      </SheetFooter>
    </form>
  );
}
