import { DataTable, type DataTableColumn } from '@bautakt/ui';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { useDataTableLabels } from '@/components/common/useDataTableLabels';
import { routes } from '@/lib/routes';

import { customerDisplayName, type CustomerListRow, useCustomers } from '../useCustomers';

export function CustomersListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const labels = useDataTableLabels();
  const { data, isLoading, isError, refetch } = useCustomers();

  const columns = useMemo<DataTableColumn<CustomerListRow>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (row) => customerDisplayName(row),
        header: t('domain:customers.columns.name'),
        cell: ({ row }) => (
          <Link
            to={routes.customer(row.original.id)}
            className="text-foreground hover:text-primary font-medium hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {customerDisplayName(row.original) || t('domain:customers.unnamed')}
          </Link>
        ),
      },
      {
        accessorKey: 'customer_number',
        header: t('domain:customers.columns.number'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.customer_number || t('domain:customers.noNumber')}
          </span>
        ),
      },
      {
        accessorKey: 'city',
        header: t('domain:customers.columns.city'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.city || t('domain:customers.noCity')}
          </span>
        ),
      },
      {
        accessorKey: 'email',
        header: t('domain:customers.columns.email'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.email || t('domain:customers.noContact')}
          </span>
        ),
      },
      {
        accessorKey: 'phone',
        header: t('domain:customers.columns.phone'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.phone || t('domain:customers.noContact')}
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
          title={t('domain:customers.listTitle')}
          description={t('domain:customers.listDescription')}
        />
        <EmptyState
          title={t('domain:customers.loadErrorTitle')}
          description={t('domain:customers.loadErrorDescription')}
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
        title={t('domain:customers.listTitle')}
        description={t('domain:customers.listDescription')}
      />

      <DataTable
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        labels={labels}
        exportFileName="kunden"
        onRowClick={(customer) => void navigate(routes.customer(customer.id))}
        empty={
          <EmptyState
            title={t('domain:customers.emptyTitle')}
            description={t('domain:customers.emptyDescription')}
          />
        }
      />
    </div>
  );
}
