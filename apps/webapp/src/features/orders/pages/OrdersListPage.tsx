import { DataTable, type DataTableColumn, Tabs, TabsList, TabsTrigger } from '@bautakt/ui';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { useDataTableLabels } from '@/components/common/useDataTableLabels';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';

import { OrderStatusBadge } from '../OrderStatusBadge';
import { type OrderListFilter, type OrderListRow, useOrders } from '../useOrders';

function filterFromSearch(value: string | null): OrderListFilter {
  return value === 'quote' ? 'quote' : 'all';
}

export function OrdersListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const labels = useDataTableLabels();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = filterFromSearch(searchParams.get('status'));
  const { data, isLoading, isError, refetch } = useOrders(filter);

  function setFilter(next: string) {
    if (next === 'all') {
      setSearchParams({}, { replace: true });
      return;
    }
    setSearchParams({ status: next }, { replace: true });
  }

  const columns = useMemo<DataTableColumn<OrderListRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('domain:orders.columns.name'),
        cell: ({ row }) => (
          <Link
            to={routes.order(row.original.id)}
            className="text-foreground hover:text-primary font-medium hover:underline"
            // Der Zeilenklick navigiert bereits; ohne das hier wuerde er den
            // Link-Klick zusaetzlich ausloesen.
            onClick={(event) => event.stopPropagation()}
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: 'customer_label',
        header: t('domain:orders.columns.customer'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.customer_label || t('domain:orders.noCustomer')}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: t('domain:orders.columns.status'),
        cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'start_date',
        header: t('domain:orders.columns.start'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDate(row.original.start_date) || t('domain:orders.noDate')}
          </span>
        ),
      },
      {
        accessorKey: 'end_date',
        header: t('domain:orders.columns.end'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDate(row.original.end_date) || t('domain:orders.noDate')}
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
          title={t('domain:orders.listTitle')}
          description={t('domain:orders.listDescription')}
        />
        <EmptyState
          title={t('domain:orders.loadErrorTitle')}
          description={t('domain:orders.loadErrorDescription')}
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
        title={t('domain:orders.listTitle')}
        description={t('domain:orders.listDescription')}
      />

      <DataTable
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        labels={labels}
        exportFileName="auftraege"
        onRowClick={(order) => void navigate(routes.order(order.id))}
        toolbar={
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList aria-label={t('domain:orders.filtersLabel')}>
              <TabsTrigger value="all">{t('domain:orders.filterAll')}</TabsTrigger>
              <TabsTrigger value="quote">{t('domain:orders.filterQuotes')}</TabsTrigger>
            </TabsList>
          </Tabs>
        }
        empty={
          <EmptyState
            title={
              filter === 'quote'
                ? t('domain:orders.emptyQuotesTitle')
                : t('domain:orders.emptyTitle')
            }
            description={
              filter === 'quote'
                ? t('domain:orders.emptyQuotesDescription')
                : t('domain:orders.emptyDescription')
            }
          />
        }
      />
    </div>
  );
}
