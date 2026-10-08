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
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMembership } from '@/features/company/useMembership';
import { readableDbError } from '@/lib/dbErrors';

import { useDeleteDailyReport } from './useDailyReportMutations';
import { type DailyReportLinkCounts, fetchDailyReportLinkCounts } from './useOrderDailyReports';

/**
 * Bestätigung vor dem Löschen eines Bautagebuchs.
 *
 * Die Zeile bleibt in der Liste, bis die Löschung bestätigt ist. Der Knopf
 * zeigt solange den Lade-Zustand und lässt sich nicht ein zweites Mal
 * auslösen. Schließen währenddessen ist zu, damit die Anfrage nicht wie ein
 * Abbruch aussieht.
 */
export function DailyReportDeleteDialog({
  reportId,
  dateLabel,
  open,
  onOpenChange,
  onDeleted,
}: {
  reportId: string;
  dateLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const remove = useDeleteDailyReport();
  const [error, setError] = useState<string | null>(null);
  const counts = useQuery({
    queryKey: ['daily-report-links', companyId, reportId],
    enabled: open && Boolean(companyId && reportId),
    queryFn: (): Promise<DailyReportLinkCounts> => fetchDailyReportLinkCounts(companyId!, reportId),
  });

  function close() {
    if (remove.isPending) return;
    setError(null);
    onOpenChange(false);
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
      setError(readableDbError(caught) ?? t('domain:dailyReportForm.delete.error'));
    }
  }

  const summary = linkSummary(t, counts.data);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
        else onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('domain:dailyReportForm.delete.title')}</DialogTitle>
          <DialogDescription>
            {t('domain:dailyReportForm.delete.description', { date: dateLabel })}
          </DialogDescription>
        </DialogHeader>

        {counts.isPending ? (
          <p role="status" className="text-muted-foreground text-sm">
            {t('domain:dailyReportForm.delete.countsLoading')}
          </p>
        ) : summary ? (
          <p className="text-muted-foreground text-sm">
            {t('domain:dailyReportForm.delete.visible', { summary })}
          </p>
        ) : null}

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
            disabled={remove.isPending || counts.isPending}
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

function linkSummary(
  t: (key: string, options?: { count: number }) => string,
  counts: DailyReportLinkCounts | undefined,
): string {
  if (!counts) return '';
  const parts = [
    counts.times != null
      ? t('domain:orders.dailyReports.linkedTimes', { count: counts.times })
      : '',
    counts.materials != null
      ? t('domain:orders.dailyReports.linkedMaterials', { count: counts.materials })
      : '',
    counts.photos != null
      ? t('domain:orders.dailyReports.linkedPhotos', { count: counts.photos })
      : '',
    counts.issues != null
      ? t('domain:orders.dailyReports.linkedIssues', { count: counts.issues })
      : '',
  ].filter(Boolean);
  return parts.join(', ');
}
