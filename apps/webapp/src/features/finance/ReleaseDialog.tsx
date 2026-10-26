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
  MessageBarTitle,
  Spinner,
} from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';

import type { DatevReleaseHint } from './datevAccounts';
import { useDatevReleaseHints } from './useDatevReleaseHints';

/**
 * Rückfrage vor dem Freigeben (#75). Freigeben vergibt die Belegnummer und
 * schreibt den Beleg unumkehrbar fest, darum nie ohne Bestätigung. Genutzt
 * im Editor und auf der Belegseite, damit beide gleich fragen.
 *
 * Bestätigen geht nur, wenn die Vorschau den Stand zeigt, der
 * festgeschrieben wird (#217): sonst bekäme der Kunde ein PDF, das so nie
 * angezeigt wurde.
 *
 * Bei Rechnungen zeigt er außerdem, was DATEV vom gespeicherten Stand
 * bekommt, wenn etwas fehlt (#187). Das sperrt nicht: festgeschrieben wird
 * dann mit Sammel-Debitor bzw. ohne Erlöskonto.
 */
export function ReleaseDialog({
  open,
  kind,
  pending = false,
  preview = 'ready',
  datevDocumentId,
  onConfirm,
  onClose,
}: {
  open: boolean;
  kind: 'invoice' | 'quote';
  /** Während der Freigabe läuft: Knöpfe gesperrt, kein Doppel-Klick. */
  pending?: boolean;
  /** Stand der Vorschau: nur bei `ready` lässt sich bestätigen. */
  preview?: 'ready' | 'pending' | 'failed';
  /** Gespeicherter Entwurf, dessen DATEV-Angaben geprüft werden; leer = keine Hinweise. */
  datevDocumentId?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const datev = useDatevReleaseHints(datevDocumentId, open && kind === 'invoice');
  const hints = datev.data ?? [];
  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && !pending && onClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{t(`domain:editor.release.title.${kind}`)}</DialogTitle>
          <DialogContent className="flex flex-col gap-3">
            {t('domain:editor.release.description')}
            {preview !== 'ready' ? (
              <MessageBar intent={preview === 'failed' ? 'error' : 'info'}>
                <MessageBarBody className="flex items-center gap-2">
                  {preview === 'pending' ? <Spinner size="extra-tiny" /> : null}
                  {preview === 'pending'
                    ? t('domain:editor.release.previewPending')
                    : t('domain:editor.release.previewFailed')}
                </MessageBarBody>
              </MessageBar>
            ) : null}
            {hints.length > 0 ? (
              <MessageBar intent="warning" layout="multiline">
                <MessageBarBody>
                  <MessageBarTitle>{t('domain:editor.release.datev.title')}</MessageBarTitle>
                  <ul className="mt-1 flex list-disc flex-col gap-1 pl-4">
                    {hints.map((hint, index) => (
                      <li key={index}>{datevHintText(hint, t)}</li>
                    ))}
                  </ul>
                </MessageBarBody>
              </MessageBar>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button disabled={pending} onClick={onClose}>
              {t('common:action.cancel')}
            </Button>
            <Button
              appearance="primary"
              disabled={pending || preview !== 'ready'}
              aria-busy={pending}
              icon={pending ? <Spinner size="tiny" /> : undefined}
              onClick={onConfirm}
            >
              {t('domain:editor.actions.release')}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

function datevHintText(hint: DatevReleaseHint, t: ReturnType<typeof useTranslation>['t']): string {
  switch (hint.kind) {
    case 'debtorCollective':
      return t(`domain:editor.release.datev.debtorCollective.${hint.reason}`, {
        account: hint.account,
      });
    case 'debtorUnresolved':
      return t('domain:editor.release.datev.debtorUnresolved');
    case 'accountMissing':
      return t('domain:editor.release.datev.accountMissing', {
        tax:
          hint.taxMode === 'standard'
            ? t('domain:datev.rate', { rate: hint.rate })
            : t(`domain:datev.taxModes.${hint.taxMode}`),
      });
  }
}
