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

import { useDeleteOrderImage } from './useOrderImageMutations';

/**
 * Bestätigung vor dem Löschen.
 *
 * Die Meldung bleibt im Dialog, wenn die Datenbank ablehnt — sonst schlösse
 * er sich und der Grund wäre weg.
 */
export function OrderPhotoDeleteDialog({
  imageId,
  label,
  open,
  onOpenChange,
}: {
  imageId: string;
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const remove = useDeleteOrderImage();
  const [error, setError] = useState<string | null>(null);

  function close() {
    setError(null);
    onOpenChange(false);
  }

  async function onConfirm() {
    setError(null);
    try {
      await remove.mutateAsync(imageId);
      toast.success(t('domain:photoForm.delete.deleted'));
      close();
    } catch (caught) {
      setError(readableDbError(caught) ?? t('domain:photoForm.delete.error'));
    }
  }

  const description = label
    ? t('domain:photoForm.delete.description', { date: label })
    : t('domain:photoForm.delete.descriptionUndated');

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (remove.isPending) return;
        if (!next) setError(null);
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('domain:photoForm.delete.title')}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={close} disabled={remove.isPending}>
            {t('common:action.cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={remove.isPending}
            aria-busy={remove.isPending}
            onClick={() => void onConfirm()}
          >
            {remove.isPending
              ? t('domain:photoForm.delete.pending')
              : t('domain:photoForm.delete.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
