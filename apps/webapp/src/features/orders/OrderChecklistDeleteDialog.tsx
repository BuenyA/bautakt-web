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

import { useSaveOrderChecklist } from './useOrderChecklistMutations';

/**
 * Bestätigung vor dem Löschen eines Punkts.
 *
 * Die Meldung bleibt im Dialog, wenn die Datenbank ablehnt — sonst schlösse
 * er sich und der Grund wäre weg. Das Löschen schreibt die Liste ohne diesen
 * Punkt; die Handy-App sieht ihn nach dem Sync nicht mehr.
 */
export function OrderChecklistDeleteDialog({
  orderId,
  itemId,
  label,
  open,
  onOpenChange,
  onPendingChange,
  onDeleted,
}: {
  orderId: string;
  itemId: string;
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPendingChange?: (pending: boolean) => void;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const save = useSaveOrderChecklist();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onPendingChange?.(save.isPending);
  }, [onPendingChange, save.isPending]);

  function close() {
    setError(null);
    onOpenChange(false);
  }

  async function onConfirm() {
    setError(null);
    try {
      await save.mutateAsync({ kind: 'delete', orderId, id: itemId });
      toast.success(t('domain:checklistForm.delete.deleted'));
      close();
      onDeleted();
    } catch (caught) {
      setError(readableDbError(caught) ?? t('domain:checklistForm.delete.error'));
    }
  }

  const description = label
    ? t('domain:checklistForm.delete.description', { label })
    : t('domain:checklistForm.delete.descriptionUntitled');

  return (
    <Dialog
      open={open}
      onOpenChange={(_, { open: next }) => {
        if (save.isPending) return;
        if (!next) setError(null);
        onOpenChange(next);
      }}
    >
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{t('domain:checklistForm.delete.title')}</DialogTitle>
          <DialogContent className="flex flex-col gap-3">
            <p>{description}</p>
            {error ? (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button type="button" onClick={close} disabled={save.isPending}>
              {t('common:action.cancel')}
            </Button>
            <DangerButton
              type="button"
              disabled={save.isPending}
              aria-busy={save.isPending}
              onClick={() => void onConfirm()}
            >
              {save.isPending
                ? t('domain:checklistForm.delete.pending')
                : t('domain:checklistForm.delete.confirm')}
            </DangerButton>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
