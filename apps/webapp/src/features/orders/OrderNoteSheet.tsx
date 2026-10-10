import {
  DangerButton,
  FormDrawer,
  FormDrawerDescription,
  FormDrawerFooter,
  FormDrawerTitle,
  toast,
} from '@bautakt/ui';
import {
  Button,
  DrawerBody,
  DrawerHeader,
  Input,
  Label,
  Textarea,
} from '@fluentui/react-components';
import { type FormEvent, useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useDismissLock } from '@/components/common/useDismissLock';
import { readableDbError } from '@/lib/dbErrors';

import { OrderNoteDeleteDialog } from './OrderNoteDeleteDialog';
import { type OrderNoteDraft, type OrderNoteIssue, orderNoteIssue } from './orderNoteDraft';
import { useSaveOrderNote } from './useOrderNoteMutations';

/**
 * Notiz anlegen oder bearbeiten.
 *
 * Das Panel ist nur gemountet, solange es offen ist, und startet deshalb
 * jedes Mal mit dem übergebenen Entwurf. Löschen sitzt im selben Panel, mit
 * eigenem Bestätigungsdialog.
 */
export function OrderNoteSheet({
  draft,
  open,
  onOpenChange,
}: {
  draft: OrderNoteDraft | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const dismiss = useDismissLock(onOpenChange);
  return (
    <FormDrawer open={open} onOpenChange={dismiss.handleOpenChange}>
      {open && draft ? (
        <OrderNoteForm
          initial={draft}
          onBusyChange={dismiss.onBusyChange}
          onDone={() => onOpenChange(false)}
        />
      ) : null}
    </FormDrawer>
  );
}

function deleteLabel(title: string, body: string): string {
  const heading = title.trim();
  if (heading) return heading;
  const line = body.trim().split('\n')[0] ?? '';
  if (line.length <= 80) return line;
  return `${line.slice(0, 79)}…`;
}

function OrderNoteForm({
  initial,
  onBusyChange,
  onDone,
}: {
  initial: OrderNoteDraft;
  onBusyChange: (busy: boolean) => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const save = useSaveOrderNote();
  const [draft, setDraft] = useState<OrderNoteDraft>(initial);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const ids = { title: useId(), body: useId() };
  const busy = save.isPending || deletePending;

  useEffect(() => {
    onBusyChange(busy);
  }, [busy, onBusyChange]);

  useEffect(() => {
    return () => onBusyChange(false);
  }, [onBusyChange]);

  function set(patch: Partial<OrderNoteDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function issueMessage(issue: OrderNoteIssue): string {
    switch (issue) {
      case 'empty':
        return t('domain:noteForm.contentRequired');
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const issue = orderNoteIssue(draft);
    if (issue) {
      setError(issueMessage(issue));
      return;
    }

    try {
      await save.mutateAsync(draft);
      toast.success(t('domain:noteForm.saved'));
      onDone();
    } catch (caught) {
      if (caught instanceof Error && caught.message === 'INVALID_ORDER_NOTE') {
        setError(t('domain:noteForm.contentRequired'));
        return;
      }
      setError(readableDbError(caught) ?? t('domain:noteForm.saveError'));
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex h-full min-h-0 flex-col">
      <DrawerHeader>
        <FormDrawerTitle closeLabel={t('common:action.close')}>
          {draft.id ? t('domain:noteForm.editTitle') : t('domain:noteForm.newTitle')}
        </FormDrawerTitle>
        <FormDrawerDescription>{t('domain:noteForm.description')}</FormDrawerDescription>
      </DrawerHeader>

      <DrawerBody className="flex flex-col gap-4">
        <div className="grid gap-2">
          <Label htmlFor={ids.title}>{t('domain:noteForm.title')}</Label>
          <Input
            id={ids.title}
            value={draft.title}
            onChange={(event) => set({ title: event.target.value })}
            autoComplete="off"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={ids.body}>{t('domain:noteForm.body')}</Label>
          <Textarea
            id={ids.body}
            rows={6}
            value={draft.body}
            onChange={(event) => set({ body: event.target.value })}
          />
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
            {t('domain:noteForm.delete.action')}
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
        <OrderNoteDeleteDialog
          noteId={draft.id}
          label={deleteLabel(initial.title, initial.body)}
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          onPendingChange={setDeletePending}
          onDeleted={onDone}
        />
      ) : null}
    </form>
  );
}
