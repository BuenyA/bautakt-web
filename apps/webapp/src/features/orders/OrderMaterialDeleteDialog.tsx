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

import { OrderMaterialBilledError, useDeleteOrderMaterial } from './useOrderMaterialMutations';

/**
 * Bestätigung vor dem Löschen.
 *
 * Abgerechnetes Material lehnt die Mutation ab. Die Meldung bleibt im Dialog,
 * damit klar ist, warum die Zeile stehen bleibt.
 */
export function OrderMaterialDeleteDialog({
  materialId,
  label,
  open,
  onOpenChange,
  onDeleted,
}: {
  materialId: string;
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const remove = useDeleteOrderMaterial();
  const [error, setError] = useState<string | null>(null);

  function close() {
    setError(null);
    onOpenChange(false);
  }

  async function onConfirm() {
    setError(null);
    try {
      await remove.mutateAsync(materialId);
      toast.success(t('domain:materialForm.delete.deleted'));
      close();
      onDeleted();
    } catch (caught) {
      if (caught instanceof OrderMaterialBilledError) {
        setError(t('domain:materialForm.billedHint'));
        return;
      }
      setError(readableDbError(caught) ?? t('domain:materialForm.delete.error'));
    }
  }

  const description = label
    ? t('domain:materialForm.delete.description', { label })
    : t('domain:materialForm.delete.descriptionUntitled');

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
          <DialogTitle>{t('domain:materialForm.delete.title')}</DialogTitle>
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
            disabled={remove.isPending}
            onClick={() => void onConfirm()}
          >
            {t('domain:materialForm.delete.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
