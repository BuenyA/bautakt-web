import { Button } from '@bautakt/ui';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSpinner } from '@/components/common/PageSpinner';
import { formatCurrency, formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';

import { OrderStatusBadge } from '../OrderStatusBadge';
import { useOrder } from '../useOrder';

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="grid gap-1 sm:grid-cols-[12rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

export function OrderDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useOrder(id);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t('domain:orders.detailTitle')} />
        <PageSpinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t('domain:orders.detailTitle')} />
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
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t('domain:orders.detailTitle')} />
        <EmptyState
          title={t('domain:orders.notFoundTitle')}
          description={t('domain:orders.notFoundDescription')}
          action={
            <Button asChild variant="outline" size="sm">
              <Link to={routes.orders}>{t('common:action.back')}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const address = [data.street_address, [data.postal_code, data.city].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={data.name}
        description={t('domain:orders.detailDescription')}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to={routes.orders}>{t('common:action.back')}</Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <OrderStatusBadge status={data.status} />
        {data.customer_label ? (
          <span className="text-sm text-muted-foreground">{data.customer_label}</span>
        ) : null}
      </div>

      {data.description ? (
        <p className="max-w-3xl text-sm text-text-secondary whitespace-pre-wrap">
          {data.description}
        </p>
      ) : null}

      <dl className="flex max-w-3xl flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:p-6">
        <DetailRow
          label={t('domain:orders.fields.customer')}
          value={data.customer_label || t('domain:orders.noCustomer')}
        />
        <DetailRow label={t('domain:orders.fields.address')} value={address} />
        <DetailRow label={t('domain:orders.fields.start')} value={formatDate(data.start_date)} />
        <DetailRow label={t('domain:orders.fields.end')} value={formatDate(data.end_date)} />
        <DetailRow
          label={t('domain:orders.fields.contractSum')}
          value={formatCurrency(data.contract_sum)}
        />
        <DetailRow label={t('domain:orders.fields.costCenter')} value={data.cost_center_label} />
        <DetailRow label={t('domain:orders.fields.created')} value={formatDate(data.created_at)} />
      </dl>
    </div>
  );
}
