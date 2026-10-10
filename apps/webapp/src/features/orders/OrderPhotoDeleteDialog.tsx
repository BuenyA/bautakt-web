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
      onOpenChange={(_, { open: next }) => {
        if (remove.isPending) return;
        if (!next) setError(null);
        onOpenChange(next);
      }}
    >
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{t('domain:photoForm.delete.title')}</DialogTitle>
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
                ? t('domain:photoForm.delete.pending')
                : t('domain:photoForm.delete.confirm')}
            </DangerButton>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
