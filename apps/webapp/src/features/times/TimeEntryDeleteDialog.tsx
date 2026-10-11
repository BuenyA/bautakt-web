import { DangerButton, toast } from '@bautakt/ui';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
} from '@fluentui/react-components';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { readableDbError } from '@/lib/dbErrors';

import { TimeEntryBilledError, useDeleteTimeEntry } from './useTimeEntryMutations';

/**
 * Bestätigung vor dem Löschen.
 *
 * Abgerechnete Einträge lehnt die Mutation ab. Die Meldung bleibt im Dialog,
 * damit klar ist, warum die Zeile stehen bleibt.
 */
export function TimeEntryDeleteDialog({
  entryId,
  description,
  open,
  onOpenChange,
  onPendingChange,
  onDeleted,
}: {
  entryId: string;
  description: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPendingChange?: (pending: boolean) => void;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const remove = useDeleteTimeEntry();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onPendingChange?.(remove.isPending);
  }, [onPendingChange, remove.isPending]);

  function close() {
    setError(null);
    onOpenChange(false);
  }

  async function onConfirm() {
    setError(null);
    try {
      await remove.mutateAsync(entryId);
      toast.success(t('domain:timeForm.delete.deleted'));
      close();
      onDeleted();
    } catch (caught) {
      if (caught instanceof TimeEntryBilledError) {
        setError(t('domain:timeForm.billedHint'));
        return;
      }
      setError(readableDbError(caught) ?? t('domain:timeForm.delete.error'));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(_, { open: next }) => {
        if (remove.isPending) return;
        if (!next) setError(null);
        onOpenChange(next);
      }}
    >
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{t('domain:timeForm.delete.title')}</DialogTitle>
          <DialogContent className="flex flex-col gap-3">
            <p>{description}</p>
            {error ? (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button type="button" onClick={close} disabled={remove.isPending}>
              {t('common:action.cancel')}
            </Button>
            <DangerButton
              type="button"
              disabled={remove.isPending}
              aria-busy={remove.isPending}
              onClick={() => void onConfirm()}
            >
              {remove.isPending
                ? t('domain:timeForm.delete.pending')
                : t('domain:timeForm.delete.confirm')}
            </DangerButton>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
