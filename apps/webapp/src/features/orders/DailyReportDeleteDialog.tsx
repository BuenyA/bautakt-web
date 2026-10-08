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
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useDismissLock } from '@/components/common/useDismissLock';
import { useMembership } from '@/features/company/useMembership';
import { readableDbError } from '@/lib/dbErrors';

import {
  type DailyReportDeleteBlock,
  DailyReportDeleteBlockedError,
  readDailyReportDeleteBlock,
} from './dailyReportDeleteGate';
import { useDeleteDailyReport } from './useDailyReportMutations';

/**
 * Bestätigung vor dem Löschen eines Bautagebuchs.
 *
 * Die Zeile bleibt in der Liste, bis die Löschung bestätigt ist. Der Knopf
 * zeigt solange den Lade-Zustand und lässt sich nicht ein zweites Mal
 * auslösen. Fokus, Escape und ein Klick daneben schließen den Dialog
 * währenddessen nicht.
 *
 * Beim Öffnen und noch einmal unmittelbar vor dem DELETE liest der Dialog
 * abgerechnete Zeiten und Material sowie jede Verknüpfung frisch vom Server.
 * Trifft eine Sperre zu, bleibt der Knopf aus und die Karte stehen.
 */
export function DailyReportDeleteDialog({
  reportId,
  dateLabel,
  open,
  onOpenChange,
  onPendingChange,
  onDeleted,
}: {
  reportId: string;
  dateLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPendingChange?: (pending: boolean) => void;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const remove = useDeleteDailyReport();
  const [error, setError] = useState<string | null>(null);
  const [forcedBlock, setForcedBlock] = useState<DailyReportDeleteBlock | null>(null);
  const { onBusyChange, handleOpenChange } = useDismissLock((next) => {
    if (!next) {
      setError(null);
      setForcedBlock(null);
    }
    onOpenChange(next);
  });
  const probe = useQuery({
    queryKey: ['daily-report-delete-gate', companyId, reportId],
    enabled: open && Boolean(companyId && reportId),
    staleTime: 0,
    gcTime: 0,
    queryFn: (): Promise<DailyReportDeleteBlock | null> =>
      readDailyReportDeleteBlock(companyId!, reportId, membership?.permissions),
  });

  useEffect(() => {
    onBusyChange(remove.isPending);
  }, [onBusyChange, remove.isPending]);

  useEffect(() => {
    onPendingChange?.(remove.isPending);
  }, [onPendingChange, remove.isPending]);

  function close() {
    setError(null);
    setForcedBlock(null);
    onOpenChange(false);
  }

  function blockMessage(block: DailyReportDeleteBlock): string {
    return block === 'billed'
      ? t('domain:dailyReportForm.delete.billedBlocked')
      : t('domain:dailyReportForm.delete.linkedBlocked');
  }

  async function onConfirm() {
    setError(null);
    try {
      await remove.mutateAsync(reportId);
      toast.success(t('domain:dailyReportForm.delete.deleted'));
      setError(null);
      onOpenChange(false);
      onDeleted();
    } catch (caught) {
      if (caught instanceof DailyReportDeleteBlockedError) {
        setForcedBlock(caught.block);
        return;
      }
      setError(readableDbError(caught) ?? t('domain:dailyReportForm.delete.error'));
    }
  }

  const block = forcedBlock ?? probe.data ?? (probe.isError ? 'linked' : null);
  const waiting = probe.isPending || probe.isFetching;
  const allowed = !waiting && block == null && !probe.isError;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('domain:dailyReportForm.delete.title')}</DialogTitle>
          <DialogDescription>
            {block
              ? blockMessage(block)
              : allowed
                ? t('domain:dailyReportForm.delete.description', { date: dateLabel })
                : t('domain:dailyReportForm.delete.countsLoading')}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={close} disabled={remove.isPending}>
            {t('common:action.cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={remove.isPending || !allowed}
            aria-busy={remove.isPending}
            onClick={() => void onConfirm()}
          >
            {remove.isPending
              ? t('domain:dailyReportForm.delete.pending')
              : t('domain:dailyReportForm.delete.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
