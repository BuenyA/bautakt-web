import { DataTable, type DataTableColumn } from '@bautakt/ui';
import { Button } from '@fluentui/react-components';
import { AddRegular } from '@fluentui/react-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { ListFilterChips } from '@/components/common/ListFilterChips';
import { PageHeader } from '@/components/common/PageHeader';
import { useDataTableLabels } from '@/components/common/useDataTableLabels';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { usePermission } from '@/features/company/usePermission';
import { routes } from '@/lib/routes';

import { type CustomerDraft, emptyCustomer } from '../customerDraft';
import {
  customerFilterFromSearch,
  type CustomerListFilter,
  matchesCustomerFilter,
} from '../customerListFilter';
import { CustomerSheet } from '../CustomerSheet';
import { customerDisplayName, type CustomerListRow, useCustomers } from '../useCustomers';

export function CustomersListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const labels = useDataTableLabels();
  const canManage = usePermission('canManageCustomers');
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = customerFilterFromSearch(searchParams.get('filter'));
  const [draft, setDraft] = useState<CustomerDraft | null>(null);
  const customers = useCustomers();
  const { data, isError, refetch } = customers;

  const isLoading = useCompanyListLoading(customers);

  function setFilter(next: CustomerListFilter) {
    const params = new URLSearchParams(searchParams);
    // Default ist Alle — ohne Param, wie die Mitarbeiterliste ihren Default lässt.
    if (next === 'all') params.delete('filter');
    else params.set('filter', next);
    setSearchParams(params, { replace: true });
  }

  const rows = useMemo(
    () => (data ?? []).filter((row) => matchesCustomerFilter(row, filter)),
    [data, filter],
  );

  const filterOptions = useMemo(
    () =>
      [
        { value: 'all', label: t('domain:customers.filterAll') },
        { value: 'company', label: t('domain:customers.filterCompany') },
        { value: 'private', label: t('domain:customers.filterPrivate') },
      ] as const,
    [t],
  );

  const hasAny = (data?.length ?? 0) > 0;

  const columns = useMemo<DataTableColumn<CustomerListRow>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (row) => customerDisplayName(row),
        header: t('domain:customers.columns.name'),
        cell: ({ row }) => (
          <Link
            to={routes.customer(row.original.id)}
            className="text-foreground hover:text-brand font-medium hover:underline"
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
              className="text-brand cursor-pointer text-sm font-medium hover:underline"
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
        actions={
          canManage ? (
            <Button
              appearance="primary"
              size="small"
              onClick={() => setDraft(emptyCustomer())}
              icon={<AddRegular />}
            >
              {t('domain:customerForm.newTitle')}
            </Button>
          ) : null
        }
      />

      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        labels={labels}
        exportFileName="kunden"
        onRowClick={(customer) => void navigate(routes.customer(customer.id))}
        toolbar={
          <ListFilterChips
            label={t('domain:customers.filtersLabel')}
            value={filter}
            onValueChange={setFilter}
            options={filterOptions}
          />
        }
        empty={
          <EmptyState
            title={
              hasAny ? t('domain:customers.emptyResultsTitle') : t('domain:customers.emptyTitle')
            }
            description={
              hasAny
                ? t('domain:customers.emptyResultsDescription')
                : t('domain:customers.emptyDescription')
            }
          />
        }
      />

      <CustomerSheet
        draft={draft}
        open={draft !== null}
        onOpenChange={(open) => !open && setDraft(null)}
      />
    </div>
  );
}
