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

import { useDeleteOrderNote } from './useOrderNoteMutations';

/**
 * Bestätigung vor dem Löschen.
 *
 * Die Meldung bleibt im Dialog, wenn die Datenbank ablehnt — sonst schlösse
 * er sich und der Grund wäre weg.
 */
export function OrderNoteDeleteDialog({
  noteId,
  label,
  open,
  onOpenChange,
  onPendingChange,
  onDeleted,
}: {
  noteId: string;
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPendingChange?: (pending: boolean) => void;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const remove = useDeleteOrderNote();
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
      await remove.mutateAsync(noteId);
      toast.success(t('domain:noteForm.delete.deleted'));
      close();
      onDeleted();
    } catch (caught) {
      setError(readableDbError(caught) ?? t('domain:noteForm.delete.error'));
    }
  }

  const description = label
    ? t('domain:noteForm.delete.description', { label })
    : t('domain:noteForm.delete.descriptionUntitled');

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
          <DialogTitle>{t('domain:noteForm.delete.title')}</DialogTitle>
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
                ? t('domain:noteForm.delete.pending')
                : t('domain:noteForm.delete.confirm')}
            </DangerButton>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
