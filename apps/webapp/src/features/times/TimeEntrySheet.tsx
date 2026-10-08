import { hasPermission } from '@bautakt/core';
import {
  Badge,
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
import { type FormEvent, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMembership } from '@/features/company/useMembership';
import { useOrders } from '@/features/orders/useOrders';
import { useEmployees } from '@/features/team/useEmployees';
import { readableDbError } from '@/lib/dbErrors';

import { TimeEntryDeleteDialog } from './TimeEntryDeleteDialog';
import { type TimeEntryDraft, type TimeEntryIssue, timeEntryIssue } from './timeEntryDraft';
import { TimeEntryBilledError, useSaveTimeEntry } from './useTimeEntryMutations';

const ISSUE_KEY = {
  order: 'domain:timeForm.orderRequired',
  date: 'domain:timeForm.dateRequired',
  start: 'domain:timeForm.startRequired',
  end: 'domain:timeForm.endRequired',
  break: 'domain:timeForm.breakInvalid',
  breakTooLong: 'domain:timeForm.breakTooLong',
  employee: 'domain:timeForm.employeeRequired',
} as const satisfies Record<TimeEntryIssue, string>;

/**
 * Zeiteintrag anlegen oder korrigieren.
 *
 * Mit `canTrackTimeForTeam` wählt man beim Anlegen mehrere Mitarbeiter; jede
 * Person bekommt eine Zeile. Ohne das Recht gilt der Eintrag für die eigene
 * Anstellung. Das Panel ist nur gemountet, solange es offen ist, und startet
 * deshalb jedes Mal mit dem übergebenen Entwurf.
 */
export function TimeEntrySheet({
  draft,
  open,
  onOpenChange,
}: {
  draft: TimeEntryDraft | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0">
        {open && draft ? (
          <TimeEntryForm initial={draft} onDone={() => onOpenChange(false)} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function TimeEntryForm({ initial, onDone }: { initial: TimeEntryDraft; onDone: () => void }) {
  const { t } = useTranslation();
  const save = useSaveTimeEntry();
  const { data: membership } = useMembership();
  const orders = useOrders();
  const employees = useEmployees();
  const canTeam = hasPermission(membership?.permissions, 'canTrackTimeForTeam');

  const [draft, setDraft] = useState<TimeEntryDraft>(initial);
  // Feldfehler erst nach dem ersten Speichern. Danach haengt die Meldung am
  // aktuellen Entwurf: eine korrigierte Pause darf nicht rot bleiben, bis
  // man noch einmal speichert.
  const [revealIssues, setRevealIssues] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const ids = { date: useId(), start: useId(), end: useId(), pause: useId(), note: useId() };

  const issue = revealIssues ? timeEntryIssue(draft) : null;
  const error = (issue ? t(ISSUE_KEY[issue]) : null) ?? saveError;

  const locked = draft.billed;
  const orderOptions = [...(orders.data ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const resolvedOrderLabel =
    orderOptions.find((order) => order.id === draft.orderId)?.name.trim() ||
    draft.orderLabel.trim();
  // Remount, sobald die passende Option da ist. Vorher hat das native Select
  // im Formular keine Option und meldet den vorbelegten Wert als leer.
  const orderSelectKey = orderOptions.some((order) => order.id === draft.orderId)
    ? 'ready'
    : 'pending';
  const activeEmployees = (employees.data ?? []).filter((employee) => !employee.ended_at);
  const selectedEnded = (employees.data ?? []).filter(
    (employee) => employee.ended_at && draft.employmentIds.includes(employee.id),
  );
  const selectableEmployees = [...activeEmployees, ...selectedEnded].sort((a, b) =>
    a.name.localeCompare(b.name, 'de'),
  );
  const ownEmployee = selectableEmployees.find(
    (employee) => employee.id === membership?.employmentId,
  );

  function set(patch: Partial<TimeEntryDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setSaveError(null);
  }

  function toggleEmployee(employmentId: string, on: boolean) {
    setDraft((current) => ({
      ...current,
      employmentIds: on
        ? [...current.employmentIds, employmentId]
        : current.employmentIds.filter((id) => id !== employmentId),
    }));
    setSaveError(null);
  }

  function chooseOrder(value: string) {
    if (!value) return;
    set({ orderId: value });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (locked) return;

    const nextIssue = timeEntryIssue(draft);
    if (nextIssue) {
      setRevealIssues(true);
      setSaveError(null);
      return;
    }
    setRevealIssues(false);

    try {
      await save.mutateAsync(draft);
      toast.success(t('domain:timeForm.saved'));
      onDone();
    } catch (caught) {
      if (caught instanceof TimeEntryBilledError) {
        setSaveError(t('domain:timeForm.billedHint'));
        return;
      }
      setSaveError(readableDbError(caught) ?? t('domain:timeForm.saveError'));
    }
  }

  const employeeName =
    (draft.id
      ? selectableEmployees.find((employee) => employee.id === draft.employmentIds[0])?.name
      : ownEmployee?.name) || t('domain:times.noEmployee');

  const deleteDescription = t('domain:timeForm.delete.description', {
    employee: employeeName,
  });

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex h-full flex-col">
      <SheetHeader>
        <SheetTitle>
          <span className="inline-flex flex-wrap items-center gap-2">
            {draft.id ? t('domain:timeForm.editTitle') : t('domain:timeForm.newTitle')}
            {draft.billed ? <Badge variant="muted">{t('domain:times.billed')}</Badge> : null}
          </span>
        </SheetTitle>
        <SheetDescription>{t('domain:timeForm.description')}</SheetDescription>
      </SheetHeader>

      <SheetBody className="flex flex-col gap-4">
        {locked ? (
          <p role="status" className="text-muted-foreground text-sm">
            {t('domain:timeForm.billedHint')}
          </p>
        ) : null}

        <div className="grid gap-2">
          <Label>{t('domain:times.columns.order')}</Label>
          <Select
            key={orderSelectKey}
            value={draft.orderId}
            onValueChange={chooseOrder}
            disabled={locked || draft.lockOrder}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  draft.orderId && orders.isPending
                    ? t('common:state.loading')
                    : t('domain:timeForm.choose')
                }
              >
                {resolvedOrderLabel || undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {orderOptions.map((order) => (
                <SelectItem key={order.id} value={order.id}>
                  {order.name.trim() || t('domain:timeForm.unnamedOrder')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {orders.isError ? (
            <p className="text-destructive text-sm">{t('domain:timeForm.ordersError')}</p>
          ) : !orders.isPending && orderOptions.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('domain:timeForm.noOrders')}</p>
          ) : null}
        </div>

        {canTeam && !draft.id ? (
          <fieldset className="grid gap-2" disabled={locked}>
            <legend className="text-sm leading-none font-medium">
              {t('domain:times.columns.employee')}
            </legend>
            <p className="text-muted-foreground text-sm">{t('domain:timeForm.employeesHint')}</p>
            {!employees.data && !employees.isError ? (
              <p className="text-muted-foreground text-sm">{t('common:state.loading')}</p>
            ) : employees.isError ? (
              <p className="text-destructive text-sm">{t('domain:timeForm.employeesError')}</p>
            ) : selectableEmployees.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t('domain:timeForm.noEmployees')}</p>
            ) : (
              <div className="border-border flex max-h-48 flex-col gap-2 overflow-y-auto rounded-lg border p-3">
                {selectableEmployees.map((employee) => {
                  const checked = draft.employmentIds.includes(employee.id);
                  return (
                    <label key={employee.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        disabled={locked}
                        onCheckedChange={(value) => toggleEmployee(employee.id, value === true)}
                      />
                      <span>{employee.name || t('domain:employees.unnamed')}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>
        ) : canTeam ? (
          <div className="grid gap-2">
            <Label>{t('domain:times.columns.employee')}</Label>
            <Select
              value={draft.employmentIds[0] ?? ''}
              onValueChange={(value) => {
                if (!value) return;
                set({ employmentIds: [value] });
              }}
              disabled={locked}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('domain:timeForm.choose')} />
              </SelectTrigger>
              <SelectContent>
                {selectableEmployees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name || t('domain:employees.unnamed')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-sm">{t('domain:timeForm.editEmployeeHint')}</p>
          </div>
        ) : (
          <div className="grid gap-2">
            <Label>{t('domain:times.columns.employee')}</Label>
            <p className="text-foreground text-sm">{employeeName}</p>
            <p className="text-muted-foreground text-sm">{t('domain:timeForm.ownEmployeeHint')}</p>
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor={ids.date}>{t('domain:timeForm.date')}</Label>
          <Input
            id={ids.date}
            type="date"
            required
            disabled={locked}
            value={draft.date}
            onChange={(event) => set({ date: event.target.value })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor={ids.start}>{t('domain:timeForm.start')}</Label>
            <Input
              id={ids.start}
              type="time"
              required
              disabled={locked}
              value={draft.startTime}
              onChange={(event) => set({ startTime: event.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={ids.end}>{t('domain:timeForm.end')}</Label>
            <Input
              id={ids.end}
              type="time"
              required
              disabled={locked}
              value={draft.endTime}
              onChange={(event) => set({ endTime: event.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={ids.pause}>{t('domain:timeForm.break')}</Label>
            <Input
              id={ids.pause}
              inputMode="numeric"
              disabled={locked}
              className="text-right tabular-nums"
              value={draft.breakMinutes}
              onChange={(event) => set({ breakMinutes: event.target.value })}
            />
          </div>
        </div>
        <p className="text-muted-foreground text-xs">{t('domain:timeForm.overnightHint')}</p>

        <div className="grid gap-2">
          <Label htmlFor={ids.note}>{t('domain:times.columns.note')}</Label>
          <Textarea
            id={ids.note}
            rows={3}
            disabled={locked}
            value={draft.note}
            onChange={(event) => set({ note: event.target.value })}
          />
        </div>

        {draft.id && !locked ? (
          <Button
            type="button"
            variant="destructive"
            className="w-fit"
            onClick={() => setConfirmDelete(true)}
          >
            {t('domain:timeForm.delete.action')}
          </Button>
        ) : null}

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
        {locked ? null : (
          <Button type="submit" disabled={save.isPending}>
            {t('common:action.save')}
          </Button>
        )}
      </SheetFooter>

      {draft.id ? (
        <TimeEntryDeleteDialog
          entryId={draft.id}
          description={deleteDescription}
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          onDeleted={onDone}
        />
      ) : null}
    </form>
  );
}
