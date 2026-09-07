import { cn } from '@bautakt/ui';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSpinner } from '@/components/common/PageSpinner';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';

import { OrderStatusBadge } from '../OrderStatusBadge';
import { type OrderListFilter, useOrders } from '../useOrders';

function filterFromSearch(value: string | null): OrderListFilter {
  return value === 'quote' ? 'quote' : 'all';
}

export function OrdersListPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = filterFromSearch(searchParams.get('status'));
  const { data, isLoading, isError, refetch } = useOrders(filter);

  function setFilter(next: OrderListFilter) {
    if (next === 'all') {
      setSearchParams({}, { replace: true });
      return;
    }
    setSearchParams({ status: next }, { replace: true });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('domain:orders.listTitle')}
        description={t('domain:orders.listDescription')}
      />

      <div
        role="tablist"
        aria-label={t('domain:orders.filtersLabel')}
        className="flex flex-wrap gap-2 border-b border-border pb-3"
      >
        {(
          [
            { id: 'all', labelKey: 'domain:orders.filterAll' },
            { id: 'quote', labelKey: 'domain:orders.filterQuotes' },
          ] as const
        ).map((tab) => {
          const active = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(tab.id)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm transition-colors',
                active
                  ? 'bg-accent font-medium text-accent-foreground'
                  : 'text-muted-foreground hover:bg-surface hover:text-foreground',
              )}
            >
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : isError ? (
        <EmptyState
          title={t('domain:orders.loadErrorTitle')}
          description={t('domain:orders.loadErrorDescription')}
          action={
            <button
              type="button"
              className="text-sm font-medium text-primary hover:underline"
              onClick={() => void refetch()}
            >
              {t('common:action.retry')}
            </button>
          }
        />
      ) : !data?.length ? (
        <EmptyState
          title={
            filter === 'quote' ? t('domain:orders.emptyQuotesTitle') : t('domain:orders.emptyTitle')
          }
          description={
            filter === 'quote'
              ? t('domain:orders.emptyQuotesDescription')
              : t('domain:orders.emptyDescription')
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-surface text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">{t('domain:orders.columns.name')}</th>
                <th className="px-4 py-3 font-medium">{t('domain:orders.columns.customer')}</th>
                <th className="px-4 py-3 font-medium">{t('domain:orders.columns.status')}</th>
                <th className="px-4 py-3 font-medium">{t('domain:orders.columns.start')}</th>
                <th className="px-4 py-3 font-medium">{t('domain:orders.columns.end')}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((order) => (
                <tr key={order.id} className="border-t border-border hover:bg-surface/60">
                  <td className="px-4 py-3">
                    <Link
                      to={routes.order(order.id)}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {order.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {order.customer_label || t('domain:orders.noCustomer')}
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(order.start_date) || t('domain:orders.noDate')}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(order.end_date) || t('domain:orders.noDate')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
