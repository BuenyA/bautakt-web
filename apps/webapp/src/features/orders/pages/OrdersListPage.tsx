import { DataTable, type DataTableColumn } from '@bautakt/ui';
import { Button, Link as FluentLink, Tab, TabList } from '@fluentui/react-components';
import { AddRegular } from '@fluentui/react-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { RouterLink } from '@/components/common/RouterLink';
import { useCreateFromUrl } from '@/components/common/useCreateFromUrl';
import { useDataTableLabels } from '@/components/common/useDataTableLabels';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { usePermission } from '@/features/company/usePermission';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';

import {
  matchesOrderFilter,
  type OrderFilter,
  orderFilterFromSearch,
  orderFilterParam,
} from '../orderList';
import { OrderSheet } from '../OrderSheet';
import { OrderStatusBadge } from '../OrderStatusBadge';
import { type OrderListRow, useOrders } from '../useOrders';

/**
 * Fehlt das Datum, steht ein gedämpfter Strich da. „Offen“ stand früher hier
 * und war vom Status nicht zu unterscheiden (#95). Vorgelesen wird
 * „Kein Datum“ statt „Gedankenstrich“.
 */
function OrderDateCell({ value }: { value: string | null }) {
  const { t } = useTranslation();
  const formatted = formatDate(value);
  if (formatted) return <span className="text-muted-foreground tabular-nums">{formatted}</span>;
  return (
    <span className="text-muted-foreground">
      <span aria-hidden="true">{t('common:state.emptyValue')}</span>
      <span className="sr-only">{t('domain:orders.noDate')}</span>
    </span>
  );
}

export function OrdersListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const labels = useDataTableLabels();
  const canCreate = usePermission('canCreateOrders');
  const [sheetOpen, setSheetOpen] = useState(false);
  // `?neu=1` aus der Schnellsuche öffnet das Anlege-Panel.
  useCreateFromUrl(canCreate, () => setSheetOpen(true));
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = orderFilterFromSearch(searchParams.get('status'));
  const orders = useOrders();
  const { data, isError, refetch } = orders;

  function setFilter(next: OrderFilter) {
    const params = new URLSearchParams(searchParams);
    // Default ist Laufend — ohne Param.
    const value = orderFilterParam(next);
    if (value) params.set('status', value);
    else params.delete('status');
    setSearchParams(params, { replace: true });
  }

  // `useOrders` liefert schon `created_at` absteigend.
  const rows = useMemo(
    () => (data ?? []).filter((row) => matchesOrderFilter(row.status, filter)),
    [data, filter],
  );

  const hasAny = (data?.length ?? 0) > 0;

  const isLoading = useCompanyListLoading(orders);

  const columns = useMemo<DataTableColumn<OrderListRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('domain:orders.columns.name'),
        cell: ({ row }) => (
          <RouterLink appearance="subtle" to={routes.order(row.original.id)} stopPropagation>
            <span className="font-medium">{row.original.name}</span>
          </RouterLink>
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
        id: 'start_date',
        // `undefined` statt `null`: Nur so greift `sortUndefined` und Aufträge
        // ohne Datum landen in beiden Richtungen am Ende.
        accessorFn: (row) => row.start_date ?? undefined,
        sortFn: 'text',
        sortUndefined: 'last',
        header: t('domain:orders.columns.start'),
        cell: ({ row }) => <OrderDateCell value={row.original.start_date} />,
      },
      {
        id: 'end_date',
        accessorFn: (row) => row.end_date ?? undefined,
        sortFn: 'text',
        sortUndefined: 'last',
        header: t('domain:orders.columns.end'),
        cell: ({ row }) => <OrderDateCell value={row.original.end_date} />,
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
            <FluentLink as="button" onClick={() => void refetch()}>
              {t('common:action.retry')}
            </FluentLink>
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
        actions={
          canCreate ? (
            <Button appearance="primary" onClick={() => setSheetOpen(true)} icon={<AddRegular />}>
              {t('domain:orders.create.action')}
            </Button>
          ) : null
        }
      />

      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        labels={labels}
        exportFileName="auftraege"
        onRowClick={(order) => void navigate(routes.order(order.id))}
        toolbar={
          <TabList
            selectedValue={filter}
            onTabSelect={(_, data) => setFilter(data.value as OrderFilter)}
            aria-label={t('domain:orders.filtersLabel')}
          >
            <Tab value="all">{t('domain:orders.filterAll')}</Tab>
            <Tab value="running">{t('domain:orders.filterRunning')}</Tab>
            <Tab value="finished">{t('domain:orders.filterFinished')}</Tab>
          </TabList>
        }
        empty={
          <EmptyState
            title={hasAny ? t('domain:orders.emptyResultsTitle') : t('domain:orders.emptyTitle')}
            description={
              hasAny
                ? t('domain:orders.emptyResultsDescription')
                : t('domain:orders.emptyDescription')
            }
          />
        }
      />

      <OrderSheet mode="create" open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
