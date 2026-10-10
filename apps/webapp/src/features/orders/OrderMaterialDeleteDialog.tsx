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
  onPendingChange,
  onDeleted,
}: {
  materialId: string;
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPendingChange?: (pending: boolean) => void;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const remove = useDeleteOrderMaterial();
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
      onOpenChange={(_, { open: next }) => {
        if (remove.isPending) return;
        if (!next) setError(null);
        onOpenChange(next);
      }}
    >
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{t('domain:materialForm.delete.title')}</DialogTitle>
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
                ? t('domain:materialForm.delete.pending')
                : t('domain:materialForm.delete.confirm')}
            </DangerButton>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
