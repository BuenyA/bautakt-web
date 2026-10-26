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
  Spinner,
} from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';

/**
 * Rückfrage vor dem Freigeben (#75). Freigeben vergibt die Belegnummer und
 * schreibt den Beleg unumkehrbar fest, darum nie ohne Bestätigung. Genutzt
 * im Editor und auf der Belegseite, damit beide gleich fragen.
 *
 * Bestätigen geht nur, wenn die Vorschau den Stand zeigt, der
 * festgeschrieben wird (#217): sonst bekäme der Kunde ein PDF, das so nie
 * angezeigt wurde.
 */
export function ReleaseDialog({
  open,
  kind,
  pending = false,
  preview = 'ready',
  onConfirm,
  onClose,
}: {
  open: boolean;
  kind: 'invoice' | 'quote';
  /** Während der Freigabe läuft: Knöpfe gesperrt, kein Doppel-Klick. */
  pending?: boolean;
  /** Stand der Vorschau: nur bei `ready` lässt sich bestätigen. */
  preview?: 'ready' | 'pending' | 'failed';
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
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
