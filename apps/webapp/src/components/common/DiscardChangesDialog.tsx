import { DangerButton } from '@bautakt/ui';
import {
  Button,
  type ButtonProps,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
} from '@fluentui/react-components';

/**
 * Rückfrage „Änderungen verwerfen?“, bevor ungespeicherte Eingaben verloren
 * gehen.
 *
 * „Verwerfen“ ist rot (`DangerButton` aus `@bautakt/ui`): dieselben
 * Status-Danger-Tokens wie beim Löschen. Fluent hat keine eigene
 * Danger-Variante. Reihenfolge, Texte und was beim Schließen passiert,
 * bleiben bei den Aufrufern.
 */
export function DiscardChangesDialog({
  open,
  onDismiss,
  title,
  description,
  keepLabel,
  discardLabel,
  onKeep,
  onDiscard,
  keepAppearance,
}: {
  open: boolean;
  /** Escape oder Klick daneben: die Eingaben bleiben. */
  onDismiss: () => void;
  title: string;
  description: string;
  keepLabel: string;
  discardLabel: string;
  onKeep: () => void;
  onDiscard: () => void;
  /** Fehlt er, gilt Fluents Standard. Der Bereichs-Guard setzt `secondary`. */
  keepAppearance?: ButtonProps['appearance'];
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(_, data) => {
        if (!data.open) onDismiss();
      }}
    >
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent>{description}</DialogContent>
          <DialogActions>
            <Button
              {...(keepAppearance !== undefined ? { appearance: keepAppearance } : {})}
              onClick={onKeep}
            >
              {keepLabel}
            </Button>
            <DangerButton onClick={onDiscard}>{discardLabel}</DangerButton>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
