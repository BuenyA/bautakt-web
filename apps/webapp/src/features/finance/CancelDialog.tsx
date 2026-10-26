import { DangerButton, toast } from '@bautakt/ui';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Spinner,
} from '@fluentui/react-components';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { readableDbError } from '@/lib/dbErrors';

import { useCancelDocument } from './useSalesDocument';

/**
 * Rückfrage vor dem Storno (#76). Die Arbeit macht die RPC
 * `cancel_sales_document` (#153): Stornobeleg mit negierten Positionen
 * anlegen, festschreiben, Original auf „storniert“ — alles oder nichts.
 */
export function CancelDialog({
  documentId,
  open,
  onOpenChange,
}: {
  documentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const cancel = useCancelDocument(documentId);
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    setError(null);
    try {
      const { archived, documentNumber, archiveError } = await cancel.mutateAsync();
      if (archived) toast.success(t('domain:invoices.cancel.success', { number: documentNumber }));
      else
        toast.warning(
          t('domain:invoices.cancel.successWithoutArchive', { number: documentNumber }),
          { description: archiveError ?? undefined },
        );
      onOpenChange(false);
    } catch (caught) {
      setError(readableDbError(caught) ?? t('domain:invoices.cancel.error'));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(_, data) => {
        if (cancel.isPending) return;
        setError(null);
        onOpenChange(data.open);
      }}
    >
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{t('domain:invoices.cancel.title')}</DialogTitle>
          <DialogContent className="flex flex-col gap-3">
            <p>{t('domain:invoices.cancel.description')}</p>
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
          </DialogContent>
          <DialogActions>
            <Button disabled={cancel.isPending} onClick={() => onOpenChange(false)}>
              {t('common:action.cancel')}
            </Button>
            <DangerButton
              disabled={cancel.isPending}
              aria-busy={cancel.isPending}
              icon={cancel.isPending ? <Spinner size="tiny" /> : undefined}
              onClick={() => void onConfirm()}
            >
              {t('domain:invoices.cancel.confirm')}
            </DangerButton>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
