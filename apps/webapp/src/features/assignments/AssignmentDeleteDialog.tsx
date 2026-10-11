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
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { readableDbError } from '@/lib/dbErrors';
import { formatDateTimeRange } from '@/lib/format';
import { routes } from '@/lib/routes';

import { AssignmentDeleteBlocked, useDeleteAssignment } from './useDeleteAssignment';

export type AssignmentDeleteTarget = {
  id: string;
  starts_at: string;
  ends_at: string;
  order_name: string;
};

/**
 * Bestaetigung vor dem Loeschen.
 *
 * Der Einsatz bleibt stehen, wenn Zeiteintraege daran haengen oder das Konto
 * sie nicht sehen kann — siehe `useDeleteAssignment`. Die Meldung bleibt im
 * Dialog, damit klar ist, warum nichts passiert ist.
 */
export function AssignmentDeleteDialog({
  assignment,
  open,
  onOpenChange,
}: {
  assignment: AssignmentDeleteTarget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const remove = useDeleteAssignment();
  const [error, setError] = useState<string | null>(null);

  const period = formatDateTimeRange(assignment.starts_at, assignment.ends_at);
  const orderName = assignment.order_name.trim();

  function close() {
    setError(null);
    onOpenChange(false);
  }

  async function onConfirm() {
    setError(null);
    try {
      await remove.mutateAsync(assignment.id);
      toast.success(t('domain:assignments.delete.deleted'));
      close();
      void navigate(routes.assignments);
    } catch (caught) {
      if (caught instanceof AssignmentDeleteBlocked) {
        if (caught.reason === 'time-entries') {
          setError(t('domain:assignments.delete.blockedTimes', { count: caught.count }));
          return;
        }
        if (caught.reason === 'unverified') {
          setError(t('domain:assignments.delete.blockedUnverified'));
          return;
        }
        setError(t('domain:assignments.delete.forbidden'));
        return;
      }
      setError(readableDbError(caught) ?? t('domain:assignments.delete.error'));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(_, { open: next }) => {
        if (!next) setError(null);
        onOpenChange(next);
      }}
    >
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{t('domain:assignments.delete.title')}</DialogTitle>
          <DialogContent className="flex flex-col gap-3">
            <p>
              {t('domain:assignments.delete.description', {
                period: period || t('domain:assignments.detailTitle'),
                orderSuffix: orderName
                  ? t('domain:assignments.delete.orderSuffix', { order: orderName })
                  : '',
              })}
            </p>
            {error ? (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button type="button" onClick={close}>
              {t('common:action.cancel')}
            </Button>
            <DangerButton
              type="button"
              disabled={remove.isPending}
              onClick={() => void onConfirm()}
            >
              {t('domain:assignments.delete.confirm')}
            </DangerButton>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
