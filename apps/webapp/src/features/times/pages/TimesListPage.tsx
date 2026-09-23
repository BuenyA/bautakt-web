import { DataTable, type DataTableColumn } from '@bautakt/ui';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { useDataTableLabels } from '@/components/common/useDataTableLabels';
import { formatDateTime, formatNetDuration } from '@/lib/format';

import { type TimeEntryListRow, useTimeEntries } from '../useTimeEntries';

export function TimesListPage() {
  const { t } = useTranslation();
  const labels = useDataTableLabels();
  const { data, isLoading, isError, refetch } = useTimeEntries();

  const columns = useMemo<DataTableColumn<TimeEntryListRow>[]>(
    () => [
      {
        accessorKey: 'employee_name',
        header: t('domain:times.columns.employee'),
        cell: ({ row }) => (
          <span className="text-foreground font-medium">
            {row.original.employee_name || t('domain:times.noEmployee')}
          </span>
        ),
      },
      {
        accessorKey: 'order_name',
        header: t('domain:times.columns.order'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.order_name || t('domain:times.noOrder')}
          </span>
        ),
      },
      {
        accessorKey: 'started_at',
        header: t('domain:times.columns.start'),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {formatDateTime(row.original.started_at)}
          </span>
        ),
      },
      {
        accessorKey: 'ended_at',
        header: t('domain:times.columns.end'),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {row.original.ended_at
              ? formatDateTime(row.original.ended_at)
              : t('domain:times.noEnd')}
          </span>
        ),
      },
      {
        accessorKey: 'break_minutes',
        header: t('domain:times.columns.break'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {t('domain:times.breakMinutes', { count: row.original.break_minutes })}
          </span>
        ),
      },
      {
        id: 'duration',
        // Sortiert nach der Nettodauer in Minuten, nicht nach dem Text: sonst
        // stuende „10:00 Std." vor „9:00 Std.".
        accessorFn: (row) => netMinutes(row),
        header: t('domain:times.columns.duration'),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {formatNetDuration(
              row.original.started_at,
              row.original.ended_at,
              row.original.break_minutes,
            ) || t('domain:times.noEnd')}
          </span>
        ),
      },
      {
        accessorKey: 'note',
        header: t('domain:times.columns.note'),
        cell: ({ row }) => (
          <span className="text-muted-foreground block max-w-xs truncate">
            {row.original.note.trim() || t('domain:times.noNote')}
          </span>
        ),
      },
    ],
    [t],
  );

  if (isError) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title={t('domain:times.listTitle')}
          description={t('domain:times.listDescription')}
        />
        <EmptyState
          title={t('domain:times.loadErrorTitle')}
          description={t('domain:times.loadErrorDescription')}
          action={
            <button
              type="button"
              className="text-primary cursor-pointer text-sm font-medium hover:underline"
              onClick={() => void refetch()}
            >
              {t('common:action.retry')}
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('domain:times.listTitle')}
        description={t('domain:times.listDescription')}
      />

      <DataTable
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        labels={labels}
        exportFileName="zeiten"
        empty={
          <EmptyState
            title={t('domain:times.emptyTitle')}
            description={t('domain:times.emptyDescription')}
          />
        }
      />
    </div>
  );
}

function netMinutes(row: TimeEntryListRow): number {
  if (!row.ended_at) return 0;
  const start = new Date(row.started_at).getTime();
  const end = new Date(row.ended_at).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.round((end - start) / 60_000) - (row.break_minutes ?? 0));
}
