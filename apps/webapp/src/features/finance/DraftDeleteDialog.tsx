import { DangerButton, toast } from '@bautakt/ui';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { readableDbError } from '@/lib/dbErrors';

import { useDeleteDraft } from './useSalesDocument';

/**
 * Bestätigung vor dem Löschen eines Entwurfs.
 *
 * Die Meldung bleibt im Dialog, wenn die Datenbank ablehnt — sonst schlösse
 * er sich und der Grund wäre weg.
 */
export function DraftDeleteDialog({
  documentId,
  open,
  onOpenChange,
  onDeleted,
}: {
  documentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const remove = useDeleteDraft(documentId);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setError(null);
    onOpenChange(false);
  }

  async function onConfirm() {
    setError(null);
    try {
      await remove.mutateAsync();
      toast.success(t('domain:invoices.deleteDraft.deleted'));
      close();
      onDeleted();
    } catch (caught) {
      const readable =
        caught instanceof Error && caught.message === 'DRAFT_NOT_DELETED'
          ? null
          : readableDbError(caught);
      setError(readable ?? t('domain:invoices.deleteDraft.error'));
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
          <DialogTitle>{t('domain:invoices.deleteDraft.title')}</DialogTitle>
          <DialogContent className="flex flex-col gap-3">
            <p>{t('domain:invoices.deleteDraft.description')}</p>
            {error ? (
              <MessageBar intent="error" role="alert">
                <MessageBarBody>{error}</MessageBarBody>
              </MessageBar>
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
                ? t('domain:invoices.deleteDraft.pending')
                : t('domain:invoices.deleteDraft.confirm')}
            </DangerButton>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
