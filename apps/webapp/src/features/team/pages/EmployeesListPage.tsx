import { Badge, DataTable, type DataTableColumn } from '@bautakt/ui';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { useDataTableLabels } from '@/components/common/useDataTableLabels';
import { formatDate } from '@/lib/format';

import { type EmployeeRow, useEmployees } from '../useEmployees';

export function EmployeesListPage() {
  const { t } = useTranslation();
  const labels = useDataTableLabels();
  const { data, isLoading, isError, refetch } = useEmployees();

  const columns = useMemo<DataTableColumn<EmployeeRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('domain:employees.columns.name'),
        cell: ({ row }) => (
          <span className="flex items-center gap-2">
            <span className="text-foreground font-medium">
              {row.original.name || t('domain:employees.unnamed')}
            </span>
            {row.original.ended_at ? (
              <Badge variant="muted">{t('domain:employees.former')}</Badge>
            ) : null}
          </span>
        ),
      },
      { accessorKey: 'role', header: t('domain:employees.columns.role') },
      {
        accessorKey: 'job_title',
        header: t('domain:employees.columns.jobTitle'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.job_title || '—'}</span>
        ),
      },
      {
        accessorKey: 'contact_email',
        header: t('domain:employees.columns.email'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.contact_email || '—'}</span>
        ),
      },
      {
        accessorKey: 'contact_phone',
        header: t('domain:employees.columns.phone'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.contact_phone || '—'}</span>
        ),
      },
      {
        accessorKey: 'started_at',
        header: t('domain:employees.columns.since'),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {formatDate(row.original.started_at) || '—'}
          </span>
        ),
      },
    ],
    [t],
  );

  if (isError) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t('domain:employees.title')} />
        <EmptyState
          title={t('domain:employees.loadErrorTitle')}
          description={t('domain:employees.loadErrorDescription')}
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
        title={t('domain:employees.title')}
        description={t('domain:employees.description')}
      />

      <DataTable
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        labels={labels}
        exportFileName="mitarbeiter"
        empty={
          <EmptyState
            title={t('domain:employees.emptyTitle')}
            description={t('domain:employees.emptyDescription')}
          />
        }
      />
    </div>
  );
}
