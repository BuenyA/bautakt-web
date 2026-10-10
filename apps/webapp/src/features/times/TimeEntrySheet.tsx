import { hasPermission } from '@bautakt/core';
import {
  DangerButton,
  FormDrawer,
  FormDrawerDescription,
  FormDrawerFooter,
  FormDrawerTitle,
  StatusBadge,
  toast,
} from '@bautakt/ui';
import {
  Button,
  Checkbox,
  DrawerBody,
  DrawerHeader,
  Input,
  Label,
  Select,
  Textarea,
} from '@fluentui/react-components';
import { type FormEvent, useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useDismissLock } from '@/components/common/useDismissLock';
import { DatePicker, TimeInput } from '@/components/form/dateTime';
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
  const dismiss = useDismissLock(onOpenChange);
  return (
    <FormDrawer open={open} onOpenChange={dismiss.handleOpenChange}>
      {open && draft ? (
        <TimeEntryForm
          initial={draft}
          onBusyChange={dismiss.onBusyChange}
          onDone={() => onOpenChange(false)}
        />
      ) : null}
    </FormDrawer>
  );
}

function TimeEntryForm({
  initial,
  onBusyChange,
  onDone,
}: {
  initial: TimeEntryDraft;
  onBusyChange: (busy: boolean) => void;
  onDone: () => void;
}) {
  const employeeFieldId = useId();
  const orderFieldId = useId();
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
  const [deletePending, setDeletePending] = useState(false);
  const ids = { date: useId(), start: useId(), end: useId(), pause: useId(), note: useId() };

  const issue = revealIssues ? timeEntryIssue(draft) : null;
  const error = (issue ? t(ISSUE_KEY[issue]) : null) ?? saveError;

  const locked = draft.billed;
  const busy = save.isPending || deletePending;

  useEffect(() => {
    onBusyChange(busy);
  }, [busy, onBusyChange]);

  useEffect(() => {
    return () => onBusyChange(false);
  }, [onBusyChange]);
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
    <form onSubmit={(event) => void onSubmit(event)} className="flex h-full min-h-0 flex-col">
      <DrawerHeader>
        <FormDrawerTitle closeLabel={t('common:action.close')}>
          <span className="inline-flex flex-wrap items-center gap-2">
            {draft.id ? t('domain:timeForm.editTitle') : t('domain:timeForm.newTitle')}
            {draft.billed ? (
              <StatusBadge tone="neutral">{t('domain:times.billed')}</StatusBadge>
            ) : null}
          </span>
        </FormDrawerTitle>
        <FormDrawerDescription>{t('domain:timeForm.description')}</FormDrawerDescription>
      </DrawerHeader>

      <DrawerBody className="flex flex-col gap-4">
        {locked ? (
          <p role="status" className="text-muted-foreground text-sm">
            {t('domain:timeForm.billedHint')}
          </p>
        ) : null}

        <div className="grid gap-2">
          <Label htmlFor={orderFieldId}>{t('domain:times.columns.order')}</Label>
          <Select
            id={orderFieldId}
            key={orderSelectKey}
            value={draft.orderId}
            onChange={(_, { value }) => chooseOrder(value)}
            disabled={locked || draft.lockOrder}
          >
            <option value="" disabled>
              {draft.orderId && orders.isPending
                ? t('common:state.loading')
                : t('domain:timeForm.choose')}
            </option>
            {/* Auftrag des Eintrags, der (noch) nicht in der Liste steht: Name aus dem Eintrag. */}
            {draft.orderId && !orderOptions.some((order) => order.id === draft.orderId) ? (
              <option value={draft.orderId}>{resolvedOrderLabel}</option>
            ) : null}
            {orderOptions.map((order) => (
              <option key={order.id} value={order.id}>
                {order.name.trim() || t('domain:timeForm.unnamedOrder')}
              </option>
            ))}
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
                        onChange={(_, { checked: value }) =>
                          toggleEmployee(employee.id, value === true)
                        }
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
            <Label htmlFor={employeeFieldId}>{t('domain:times.columns.employee')}</Label>
            <Select
              id={employeeFieldId}
              value={draft.employmentIds[0] ?? ''}
              onChange={(_, { value }) => {
                if (!value) return;
                set({ employmentIds: [value] });
              }}
              disabled={locked}
            >
              <option value="" disabled>
                {t('domain:timeForm.choose')}
              </option>
              {selectableEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name || t('domain:employees.unnamed')}
                </option>
              ))}
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
          <DatePicker
            id={ids.date}
            required
            requiredMessage={t('domain:timeForm.dateRequired')}
            disabled={locked}
            aria-label={t('domain:timeForm.date')}
            value={draft.date}
            onChange={(date) => set({ date })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor={ids.start}>{t('domain:timeForm.start')}</Label>
            <TimeInput
              id={ids.start}
              required
              requiredMessage={t('domain:timeForm.startRequired')}
              disabled={locked}
              aria-label={t('domain:timeForm.start')}
              value={draft.startTime}
              onChange={(startTime) => set({ startTime })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={ids.end}>{t('domain:timeForm.end')}</Label>
            <TimeInput
              id={ids.end}
              required
              requiredMessage={t('domain:timeForm.endRequired')}
              disabled={locked}
              aria-label={t('domain:timeForm.end')}
              value={draft.endTime}
              onChange={(endTime) => set({ endTime })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={ids.pause}>{t('domain:timeForm.break')}</Label>
            <Input
              id={ids.pause}
              inputMode="numeric"
              disabled={locked}
              input={{ className: 'text-right tabular-nums' }}
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

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
      </DrawerBody>

      <FormDrawerFooter className="sm:flex-wrap">
        {draft.id && !locked ? (
          <DangerButton
            type="button"
            className="sm:mr-auto"
            disabled={busy}
            onClick={() => setConfirmDelete(true)}
          >
            {t('domain:timeForm.delete.action')}
          </DangerButton>
        ) : null}
        <Button type="button" onClick={onDone} disabled={busy}>
          {t('common:action.cancel')}
        </Button>
        {locked ? null : (
          <Button appearance="primary" type="submit" disabled={busy}>
            {t('common:action.save')}
          </Button>
        )}
      </FormDrawerFooter>

      {draft.id ? (
        <TimeEntryDeleteDialog
          entryId={draft.id}
          description={deleteDescription}
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          onPendingChange={setDeletePending}
          onDeleted={onDone}
        />
      ) : null}
    </form>
  );
}
