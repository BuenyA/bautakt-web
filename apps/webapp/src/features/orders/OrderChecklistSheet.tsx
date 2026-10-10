import {
  DangerButton,
  FormDrawer,
  FormDrawerDescription,
  FormDrawerFooter,
  FormDrawerTitle,
  toast,
} from '@bautakt/ui';
import { Button, DrawerBody, DrawerHeader, Input, Label, Select } from '@fluentui/react-components';
import { type FormEvent, useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useDismissLock } from '@/components/common/useDismissLock';
import { DatePicker } from '@/components/form/dateTime';
import { useEmployees } from '@/features/team/useEmployees';
import { readableDbError } from '@/lib/dbErrors';

import { OrderChecklistDeleteDialog } from './OrderChecklistDeleteDialog';
import {
  CHECKLIST_UNASSIGNED,
  type ChecklistFieldIssue,
  type ChecklistItemDraft,
  readChecklistFields,
} from './orderChecklistDraft';
import { useSaveOrderChecklist } from './useOrderChecklistMutations';

/**
 * Punkt anlegen oder umbenennen, mit Datum und Zuweisung.
 *
 * Das Panel ist nur gemountet, solange es offen ist, und startet deshalb
 * jedes Mal mit dem übergebenen Entwurf. Abhaken sitzt auf der Karte, nicht
 * hier. Löschen fragt vorher nach.
 */
export function OrderChecklistSheet({
  draft,
  open,
  onOpenChange,
}: {
  draft: ChecklistItemDraft | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const dismiss = useDismissLock(onOpenChange);
  return (
    <FormDrawer open={open} onOpenChange={dismiss.handleOpenChange}>
      {open && draft ? (
        <ChecklistItemForm
          initial={draft}
          onBusyChange={dismiss.onBusyChange}
          onDone={() => onOpenChange(false)}
        />
      ) : null}
    </FormDrawer>
  );
}

type AssigneeOption = { id: string; name: string; ended: boolean };

function ChecklistItemForm({
  initial,
  onBusyChange,
  onDone,
}: {
  initial: ChecklistItemDraft;
  onBusyChange: (busy: boolean) => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const save = useSaveOrderChecklist();
  const employees = useEmployees();
  const [draft, setDraft] = useState(initial);
  const [issue, setIssue] = useState<ChecklistFieldIssue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const ids = { title: useId(), due: useId(), assignee: useId() };
  const busy = save.isPending || deletePending;

  useEffect(() => {
    onBusyChange(busy);
  }, [busy, onBusyChange]);

  useEffect(() => {
    return () => onBusyChange(false);
  }, [onBusyChange]);

  function set(patch: Partial<ChecklistItemDraft>) {
    setIssue(null);
    setDraft((current) => ({ ...current, ...patch }));
  }

  const options: AssigneeOption[] = (employees.data ?? [])
    .filter((employee) => !employee.ended_at)
    .map((employee) => ({ id: employee.id, name: employee.name, ended: false }));
  if (
    draft.assignedEmploymentId &&
    !options.some((option) => option.id === draft.assignedEmploymentId)
  ) {
    options.push({
      id: draft.assignedEmploymentId,
      name: draft.assigneeName,
      ended: true,
    });
  }
  options.sort((a, b) => a.name.localeCompare(b.name, 'de'));

  function issueMessage(next: ChecklistFieldIssue): string {
    switch (next) {
      case 'title':
        return t('domain:checklistForm.titleRequired');
      case 'date':
        return t('domain:checklistForm.dateInvalid');
      case 'assignee':
        return t('domain:checklistForm.assigneeInvalid');
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const fields = readChecklistFields(draft);
    if (!fields.ok) {
      setError(null);
      setIssue(fields.issue);
      return;
    }

    const id = draft.id ?? crypto.randomUUID();
    try {
      await save.mutateAsync({
        kind: draft.id ? 'update' : 'create',
        orderId: draft.orderId,
        id,
        ...fields.fields,
      });
      toast.success(t('domain:checklistForm.saved'));
      onDone();
    } catch (caught) {
      if (caught instanceof Error && caught.message === 'INVALID_CHECKLIST_ITEM') {
        setIssue('title');
        setError(null);
        return;
      }
      if (caught instanceof Error && caught.message === 'INVALID_CHECKLIST_DATE') {
        setIssue('date');
        setError(null);
        return;
      }
      setError(readableDbError(caught) ?? t('domain:checklistForm.saveError'));
    }
  }

  const assigneeValue = draft.assignedEmploymentId || CHECKLIST_UNASSIGNED;

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="flex h-full min-h-0 w-full flex-col"
    >
      <DrawerHeader>
        <FormDrawerTitle closeLabel={t('common:action.close')}>
          {draft.id ? t('domain:checklistForm.editTitle') : t('domain:checklistForm.newTitle')}
        </FormDrawerTitle>
        <FormDrawerDescription>{t('domain:checklistForm.description')}</FormDrawerDescription>
      </DrawerHeader>

      <DrawerBody className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor={ids.title}>{t('domain:checklistForm.title')}</Label>
          <Input
            id={ids.title}
            value={draft.title}
            aria-invalid={issue === 'title'}
            autoComplete="off"
            onChange={(event) => set({ title: event.target.value })}
          />
          {issue === 'title' ? (
            <p role="alert" className="text-destructive text-sm">
              {issueMessage('title')}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor={ids.due}>{t('domain:checklistForm.due')}</Label>
          <DatePicker
            id={ids.due}
            aria-label={t('domain:checklistForm.due')}
            aria-invalid={issue === 'date'}
            value={draft.dueDate}
            onChange={(dueDate) => set({ dueDate })}
          />
          {issue === 'date' ? (
            <p role="alert" className="text-destructive text-sm">
              {issueMessage('date')}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor={ids.assignee}>{t('domain:checklistForm.assignee')}</Label>
          <Select
            id={ids.assignee}
            value={assigneeValue}
            onChange={(_, { value }) => {
              if (!value) return;
              set({
                assignedEmploymentId: value === CHECKLIST_UNASSIGNED ? '' : value,
              });
            }}
          >
            <option value="" disabled>
              {t('domain:checklistForm.nobody')}
            </option>
            <option value={CHECKLIST_UNASSIGNED}>{t('domain:checklistForm.nobody')}</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.ended
                  ? t('domain:checklistForm.assigneeEnded', {
                      name: option.name || t('domain:employees.unnamed'),
                    })
                  : option.name || t('domain:employees.unnamed')}
              </option>
            ))}
          </Select>
          {employees.isError ? (
            <p className="text-destructive text-sm">{t('domain:checklistForm.employeesError')}</p>
          ) : !employees.data && !employees.isError ? (
            <p className="text-muted-foreground text-sm">{t('common:state.loading')}</p>
          ) : options.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('domain:checklistForm.noEmployees')}</p>
          ) : (
            <p className="text-muted-foreground text-xs">
              {t('domain:checklistForm.assigneeHint')}
            </p>
          )}
        </div>

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
      </DrawerBody>

      <FormDrawerFooter className="sm:flex-wrap">
        {draft.id ? (
          <DangerButton
            type="button"
            className="sm:mr-auto"
            disabled={busy}
            onClick={() => setConfirmDelete(true)}
          >
            {t('domain:checklistForm.delete.action')}
          </DangerButton>
        ) : null}
        <Button type="button" onClick={onDone} disabled={busy}>
          {t('common:action.cancel')}
        </Button>
        <Button appearance="primary" type="submit" disabled={busy}>
          {t('common:action.save')}
        </Button>
      </FormDrawerFooter>

      {draft.id ? (
        <OrderChecklistDeleteDialog
          orderId={draft.orderId}
          itemId={draft.id}
          label={initial.title.trim()}
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          onPendingChange={setDeletePending}
          onDeleted={onDone}
        />
      ) : null}
    </form>
  );
}
