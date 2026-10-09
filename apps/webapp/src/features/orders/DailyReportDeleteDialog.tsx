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
  type DailyReportDeleteReading,
  readDailyReportDeleteBlock,
} from './dailyReportDeleteGate';
import { useDeleteDailyReport } from './useDailyReportMutations';
import { formatDailyReportLinkCounts } from './useOrderDailyReports';

/**
 * Bestätigung vor dem Löschen eines Bautagebuchs.
 *
 * Die Zeile bleibt in der Liste, bis die Löschung bestätigt ist. Der Knopf
 * zeigt solange den Lade-Zustand und lässt sich nicht ein zweites Mal
 * auslösen. Fokus, Escape und ein Klick daneben schließen den Dialog
 * währenddessen nicht.
 *
 * Beim Öffnen und noch einmal unmittelbar vor dem DELETE liest der Dialog
 * abgerechnete Zeiten und Material sowie jede Verknüpfung frisch vom Server,
 * als normale Abfrage unter der RLS des Kontos. Sind alle Zählungen 0 und
 * das Konto sieht jedes Material, steht nur der Löschsatz und — wenn welche
 * da sind — der Satz zur Anwesenheit. Sieht es Material nicht vollständig,
 * warnt der Text genau davor, ohne von abgerechneten Zeiten oder anderen
 * unsichtbaren Einträgen zu sprechen. Trifft eine Sperre zu, bleibt der
 * Knopf aus, der Text nennt den Grund, und darunter stehen die Anzahlen, die
 * größer als 0 sind. Die Karte bleibt.
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
  const [forced, setForced] = useState<DailyReportDeleteReading | null>(null);
  const { onBusyChange, handleOpenChange } = useDismissLock((next) => {
    if (!next) {
      setError(null);
      setForced(null);
    }
    onOpenChange(next);
  });
  const probe = useQuery({
    queryKey: ['daily-report-delete-gate', companyId, reportId],
    enabled: open && Boolean(companyId && reportId),
    staleTime: 0,
    gcTime: 0,
    queryFn: (): Promise<DailyReportDeleteReading> =>
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
    setForced(null);
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
        setForced({
          block: caught.block,
          counts: caught.counts,
          attendance: caught.attendance,
          materialsComplete: caught.materialsComplete,
        });
        return;
      }
      setError(readableDbError(caught) ?? t('domain:dailyReportForm.delete.error'));
    }
  }

  const reading = forced ?? probe.data ?? null;
  const block = reading?.block ?? (probe.isError ? 'linked' : null);
  const counts = reading?.counts ?? null;
  const summary =
    block && counts ? formatDailyReportLinkCounts(counts, (key, options) => t(key, options)) : '';
  const waiting = probe.isPending || probe.isFetching;
  const allowed = !waiting && block == null && !probe.isError;

  function confirmDescription(): string {
    const base = reading?.materialsComplete
      ? t('domain:dailyReportForm.delete.description', { date: dateLabel })
      : t('domain:dailyReportForm.delete.descriptionHiddenMaterial', { date: dateLabel });
    const attendance = reading?.attendance ?? null;
    if (attendance == null || attendance < 1) return base;
    return `${base} ${t('domain:dailyReportForm.delete.attendanceRemoved', { count: attendance })}`;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('domain:dailyReportForm.delete.title')}</DialogTitle>
          <DialogDescription>
            {block
              ? blockMessage(block)
              : allowed
                ? confirmDescription()
                : t('domain:dailyReportForm.delete.countsLoading')}
          </DialogDescription>
        </DialogHeader>

        {summary ? <p className="text-foreground text-sm">{summary}</p> : null}

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
