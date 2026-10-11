import {
  Button,
  DataTable,
  type DataTableColumn,
  Tabs,
  TabsList,
  TabsTrigger,
  Uicon,
} from '@bautakt/ui';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { useDataTableLabels } from '@/components/common/useDataTableLabels';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { usePermission } from '@/features/company/usePermission';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';

import { compareOrdersForKind, orderKindFromSearch, orderSection } from '../orderList';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const kind = orderKindFromSearch(searchParams.get('status'));
  const orders = useOrders();
  const { data, isError, refetch } = orders;

  function setKind(next: string) {
    const params = new URLSearchParams(searchParams);
    // Default ist Aufträge — ohne Param. `?status=quote` bleibt der
    // bisherige Deep-Link auf Angebote.
    if (next === 'quote') params.set('status', 'quote');
    else params.delete('status');
    setSearchParams(params, { replace: true });
  }

  const rows = useMemo(() => {
    return (data ?? [])
      .filter((row) => orderSection(row.status, kind) !== null)
      .sort((a, b) => compareOrdersForKind(kind, a, b));
  }, [data, kind]);

  const hasAny = (data?.length ?? 0) > 0;

  const isLoading = useCompanyListLoading(orders);

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
        actions={
          canCreate ? (
            <Button size="sm" onClick={() => setSheetOpen(true)}>
              <Uicon name="plus" size={16} />
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
          <Tabs value={kind} onValueChange={setKind}>
            <TabsList aria-label={t('domain:orders.filtersLabel')}>
              <TabsTrigger value="order">{t('domain:orders.kindOrders')}</TabsTrigger>
              <TabsTrigger value="quote">{t('domain:orders.kindQuotes')}</TabsTrigger>
            </TabsList>
          </Tabs>
        }
        sectionOf={(row) => {
          switch (orderSection(row.status, kind)) {
            case 'running':
              return t('domain:orders.sectionRunning');
            case 'finished':
              return t('domain:orders.sectionFinished');
            case 'quotes':
              return t('domain:orders.sectionQuotes');
            case 'declined':
              return t('domain:orders.sectionDeclined');
            default:
              return null;
          }
        }}
        empty={
          <EmptyState
            title={
              hasAny
                ? t('domain:orders.emptyResultsTitle')
                : kind === 'quote'
                  ? t('domain:orders.emptyQuotesTitle')
                  : t('domain:orders.emptyTitle')
            }
            description={
              hasAny
                ? t('domain:orders.emptyResultsDescription')
                : kind === 'quote'
                  ? t('domain:orders.emptyQuotesDescription')
                  : t('domain:orders.emptyDescription')
            }
          />
        }
      />

      <OrderSheet mode="create" open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
