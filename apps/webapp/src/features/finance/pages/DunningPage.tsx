import { buildReceivables, formatMoney, type ReceivableItem, todayIso } from '@bautakt/finance';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  DataTable,
  type DataTableColumn,
  toast,
} from '@bautakt/ui';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { useDataTableLabels } from '@/components/common/useDataTableLabels';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';

import { useCreateDunningNotice, useDunningLevels } from '../useDunning';
import { useFinanceAccess } from '../useFinanceAccess';
import { INVOICE_TYPE_LIST, usePayments, useSalesDocuments } from '../useSalesDocuments';

type DunnableRow = ReceivableItem & { level: number };

/**
 * Mahnwesen: ueberfaellige Belege mit ihrer bisherigen Mahnstufe.
 *
 * Eine Mahnung ist eine Nachricht an einen Kunden und laesst sich nicht
 * zuruecknehmen — deshalb fragt die Seite vor dem Anlegen nach, statt es auf
 * einen Klick hin zu tun.
 */
export function DunningPage() {
  const { t } = useTranslation();
  const labels = useDataTableLabels();
  const access = useFinanceAccess();

  const documents = useSalesDocuments(INVOICE_TYPE_LIST);
  const payments = usePayments();
  const levels = useDunningLevels();
  const createNotice = useCreateDunningNotice();

  const [pending, setPending] = useState<DunnableRow | null>(null);

  const rows = useMemo<DunnableRow[]>(() => {
    const items = buildReceivables(documents.data ?? [], payments.data ?? []);
    return items
      .filter((item) => item.daysOverdue > 0)
      .map((item) => ({ ...item, level: levels.data?.get(item.document.id) ?? 0 }));
  }, [documents.data, payments.data, levels.data]);

  async function onConfirm() {
    if (!pending) return;
    const nextLevel = pending.level + 1;
    try {
      await createNotice.mutateAsync({
        documentId: pending.document.id,
        level: nextLevel,
        noticeDateIso: todayIso(),
      });
      toast.success(t('domain:dunning.created', { level: nextLevel }));
    } catch (error) {
      toast.error(t('domain:dunning.createError'), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setPending(null);
    }
  }

  const columns = useMemo<DataTableColumn<DunnableRow>[]>(
    () => [
      {
        id: 'number',
        accessorFn: (row) => row.document.document_number ?? '',
        header: t('domain:receivables.columns.number'),
        cell: ({ row }) => (
          <Link
            to={routes.invoice(row.original.document.id)}
            className="text-foreground hover:text-primary font-medium whitespace-nowrap hover:underline"
          >
            {row.original.document.document_number || t('domain:invoices.noNumber')}
          </Link>
        ),
      },
      {
        id: 'due',
        accessorFn: (row) => row.document.due_date ?? '',
        header: t('domain:receivables.columns.due'),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {formatDate(row.original.document.due_date)}
          </span>
        ),
      },
      {
        accessorKey: 'daysOverdue',
        header: t('domain:receivables.columns.daysOverdue'),
        cell: ({ row }) => (
          <span className="text-destructive tabular-nums">
            {t('domain:receivables.days', { count: row.original.daysOverdue })}
          </span>
        ),
      },
      {
        accessorKey: 'level',
        header: t('domain:dunning.columns.level'),
        cell: ({ row }) =>
          row.original.level === 0 ? (
            <Badge variant="muted">{t('domain:dunning.noNotice')}</Badge>
          ) : (
            <Badge variant="warning">
              {t('domain:dunning.levelLabel', { level: row.original.level })}
            </Badge>
          ),
      },
      {
        accessorKey: 'openMinor',
        header: t('domain:receivables.columns.open'),
        cell: ({ row }) => (
          <span className="text-foreground block text-right font-medium tabular-nums">
            {formatMoney(row.original.openMinor)}
          </span>
        ),
      },
      {
        id: 'action',
        header: '',
        cell: ({ row }) =>
          access.canWriteSalesDocuments ? (
            <span className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setPending(row.original)}>
                {t('domain:dunning.createAction', { level: row.original.level + 1 })}
              </Button>
            </span>
          ) : null,
      },
    ],
    [t, access.canWriteSalesDocuments],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('domain:dunning.title')} description={t('domain:dunning.description')} />

      <DataTable
        columns={columns}
        data={rows}
        isLoading={documents.isLoading || payments.isLoading}
        labels={labels}
        exportFileName="mahnwesen"
        empty={
          <EmptyState
            title={t('domain:dunning.emptyTitle')}
            description={t('domain:dunning.emptyDescription')}
          />
        }
      />

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('domain:dunning.confirmTitle', { level: (pending?.level ?? 0) + 1 })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('domain:dunning.confirmDescription', {
                number: pending?.document.document_number ?? '',
                amount: formatMoney(pending?.openMinor ?? 0),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:action.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void onConfirm()}>
              {t('domain:dunning.confirmAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
