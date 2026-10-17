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
import { useTranslation } from 'react-i18next';

/**
 * Rückfrage vor dem Freigeben (#75). Freigeben vergibt die Belegnummer und
 * schreibt den Beleg unumkehrbar fest, darum nie ohne Bestätigung. Genutzt
 * im Editor und auf der Belegseite, damit beide gleich fragen.
 */
export function ReleaseDialog({
  open,
  kind,
  pending = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  kind: 'invoice' | 'quote';
  /** Während der Freigabe läuft: Knöpfe gesperrt, kein Doppel-Klick. */
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && !pending && onClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{t(`domain:editor.release.title.${kind}`)}</DialogTitle>
          <DialogContent>{t('domain:editor.release.description')}</DialogContent>
          <DialogActions>
            <Button disabled={pending} onClick={onClose}>
              {t('common:action.cancel')}
            </Button>
            <Button
              appearance="primary"
              disabled={pending}
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
