import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  toast,
} from '@bautakt/ui';
import { useState } from 'react';
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
  onDeleted,
}: {
  orderId: string;
  itemId: string;
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const save = useSaveOrderChecklist();
  const [error, setError] = useState<string | null>(null);

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
      onOpenChange={(next) => {
        if (!next) setError(null);
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('domain:checklistForm.delete.title')}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>
            {t('common:action.cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={save.isPending}
            onClick={() => void onConfirm()}
          >
            {t('domain:checklistForm.delete.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
