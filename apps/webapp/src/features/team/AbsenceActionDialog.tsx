import { DangerButton, toast } from '@bautakt/ui';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Label,
  Textarea,
} from '@fluentui/react-components';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { readableDbError } from '@/lib/dbErrors';
import { formatDate } from '@/lib/format';

import { useCancelAbsence, useDeleteAbsence, useRejectAbsence } from './useAbsences';

/** Was der Dialog zeigt — aus der Tabelle wie aus der Übersicht. */
export type AbsenceTarget = {
  id: string;
  name: string;
  type: string;
  startDate: string;
  endDate: string;
};

export type AbsenceAction = 'reject' | 'cancel' | 'delete';

/**
 * Rückfrage vor Ablehnen, Stornieren und endgültigem Löschen.
 *
 * Ablehnen trägt ein freiwilliges Feld für den Grund (`decision_note`, wie in
 * der Handy-App). Fehler bleiben im Dialog, damit klar ist, dass nichts
 * passiert ist.
 */
export function AbsenceActionDialog({
  action,
  absence,
  onClose,
  onDone,
}: {
  action: AbsenceAction | null;
  absence: AbsenceTarget | null;
  onClose: () => void;
  /** Nach Erfolg, vor dem Schließen — etwa um nach dem Löschen zurückzugehen. */
  onDone?: (action: AbsenceAction) => void;
}) {
  const open = action !== null && absence !== null;
  return (
    <Dialog open={open} onOpenChange={(_, { open: next }) => !next && onClose()}>
      {/* Geschlossen leer, damit Grund und Fehler beim nächsten Öffnen neu starten. */}
      {open ? (
        <ActionSurface action={action} absence={absence} onClose={onClose} onDone={onDone} />
      ) : (
        <DialogSurface />
      )}
    </Dialog>
  );
}

function ActionSurface({
  action,
  absence,
  onClose,
  onDone,
}: {
  action: AbsenceAction;
  absence: AbsenceTarget;
  onClose: () => void;
  onDone?: (action: AbsenceAction) => void;
}) {
  const { t } = useTranslation();
  const reasonId = useId();
  const reject = useRejectAbsence();
  const cancel = useCancelAbsence();
  const remove = useDeleteAbsence();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const busy = reject.isPending || cancel.isPending || remove.isPending;

  const period =
    absence.startDate === absence.endDate
      ? formatDate(absence.startDate)
      : `${formatDate(absence.startDate)} bis ${formatDate(absence.endDate)}`;
  const summary = t('domain:absences.actions.summary', {
    name: absence.name || t('domain:employees.unnamed'),
    type: t(`domain:absences.types.${absence.type}`, { defaultValue: absence.type }),
    period,
  });

  async function onConfirm() {
    setError(null);
    try {
      if (action === 'reject') await reject.mutateAsync({ id: absence.id, reason });
      else if (action === 'cancel') await cancel.mutateAsync(absence.id);
      else await remove.mutateAsync(absence.id);
      toast.success(t(`domain:absences.actions.${action}.done`));
      onDone?.(action);
      onClose();
    } catch (caught) {
      if (caught instanceof Error && caught.message === 'NOT_UPDATED') {
        setError(t('domain:absences.actions.notUpdated'));
        return;
      }
      setError(readableDbError(caught) ?? t(`domain:absences.actions.${action}.error`));
    }
  }

  return (
    <DialogSurface>
      <DialogBody>
        <DialogTitle>{t(`domain:absences.actions.${action}.title`)}</DialogTitle>
        <DialogContent className="flex flex-col gap-3">
          <p>{summary}</p>
          <p className="text-muted-foreground text-sm">
            {t(`domain:absences.actions.${action}.hint`)}
          </p>
          {action === 'reject' ? (
            <div className="grid gap-2">
              <Label htmlFor={reasonId}>{t('domain:absences.actions.reject.reason')}</Label>
              <Textarea
                id={reasonId}
                rows={3}
                value={reason}
                placeholder={t('domain:absences.actions.reject.reasonPlaceholder')}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
          ) : null}
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button type="button" onClick={onClose}>
            {t('common:action.cancel')}
          </Button>
          <DangerButton type="button" disabled={busy} onClick={() => void onConfirm()}>
            {t(`domain:absences.actions.${action}.confirm`)}
          </DangerButton>
        </DialogActions>
      </DialogBody>
    </DialogSurface>
  );
}
