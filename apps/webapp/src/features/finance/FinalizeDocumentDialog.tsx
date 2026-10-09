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

import { useFinalizeDocument } from './useSalesDocument';

/**
 * Rückfrage vor dem Festschreiben (#75).
 *
 * Festschreiben vergibt eine fortlaufende Belegnummer und macht den Beleg
 * unveränderbar (GoBD). Ein versehentlicher Klick ist nicht rückgängig zu
 * machen — deshalb fragt der Dialog wie die App nach. Solange die Anfrage
 * läuft, ist er gesperrt: kein Doppel-Submit, kein Schließen mitten im Vorgang.
 */
export function FinalizeDocumentDialog({
  documentId,
  open,
  onOpenChange,
}: {
  documentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const finalize = useFinalizeDocument(documentId);
  const [error, setError] = useState<string | null>(null);
  const pending = finalize.isPending;

  function handleOpenChange(next: boolean) {
    if (pending) return;
    if (!next) setError(null);
    onOpenChange(next);
  }

  async function onConfirm() {
    if (pending) return;
    setError(null);
    try {
      const number = await finalize.mutateAsync();
      toast.success(t('domain:invoices.finalizeSuccess'), {
        description: number ? t('domain:invoices.finalizeSuccessNumber', { number }) : undefined,
      });
      onOpenChange(false);
    } catch (caught) {
      // Die Datenbank prüft Pflichtangaben (u. a. Steuernummer des Betriebs)
      // noch einmal. Ihre Meldung bleibt im Dialog, damit klar ist, warum
      // nichts passiert ist.
      setError(readableDbError(caught) ?? t('domain:invoices.finalizeError'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('domain:invoices.finalizeDialog.title')}</DialogTitle>
          <DialogDescription>{t('domain:invoices.finalizeDialog.description')}</DialogDescription>
        </DialogHeader>

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => handleOpenChange(false)}
          >
            {t('common:action.cancel')}
          </Button>
          <Button
            type="button"
            disabled={pending}
            aria-busy={pending}
            onClick={() => void onConfirm()}
          >
            {pending ? (
              <span
                aria-hidden="true"
                className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              />
            ) : null}
            {t('domain:invoices.finalize')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
