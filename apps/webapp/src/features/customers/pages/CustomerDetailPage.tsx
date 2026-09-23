import { Button } from '@bautakt/ui';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { DetailCard, DetailRow } from '@/components/common/DetailCard';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSpinner } from '@/components/common/PageSpinner';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';

import { useCustomer } from '../useCustomer';
import { customerDisplayName } from '../useCustomers';

function formatAddress(parts: {
  street_address: string;
  postal_code: string;
  city: string;
  country: string;
}): string {
  const street = parts.street_address.trim();
  const cityLine = [parts.postal_code.trim(), parts.city.trim()].filter(Boolean).join(' ');
  const country = parts.country.trim();
  return [street, cityLine, country].filter(Boolean).join('\n');
}

export function CustomerDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useCustomer(id);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t('domain:customers.detailTitle')} />
        <PageSpinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t('domain:customers.detailTitle')} />
        <EmptyState
          title={t('domain:customers.loadErrorTitle')}
          description={t('domain:customers.loadErrorDescription')}
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
        <PageHeader title={t('domain:customers.detailTitle')} />
        <EmptyState
          title={t('domain:customers.notFoundTitle')}
          description={t('domain:customers.notFoundDescription')}
          action={
            <Button asChild variant="outline" size="sm">
              <Link to={routes.customers}>{t('common:action.back')}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const name = customerDisplayName(data);
  const typeLabel = data.customer_type.trim()
    ? t(`domain:customers.types.${data.customer_type}`, {
        defaultValue: data.customer_type.trim(),
      })
    : '';
  const address = formatAddress(data);
  const notes = data.notes.trim();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={name || t('domain:customers.unnamed')}
        description={t('domain:customers.detailDescription')}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to={routes.customers}>{t('common:action.back')}</Link>
          </Button>
        }
      />

      <DetailCard className="max-w-3xl">
        <DetailRow
          label={t('domain:customers.fields.displayName')}
          value={name || t('domain:customers.unnamed')}
        />
        <DetailRow
          label={t('domain:customers.fields.type')}
          value={typeLabel || t('domain:customers.noType')}
        />
        <DetailRow
          label={t('domain:customers.fields.number')}
          value={data.customer_number || t('domain:customers.noNumber')}
        />
        <DetailRow
          label={t('domain:customers.fields.address')}
          value={address || t('domain:customers.noAddress')}
        />
        <DetailRow
          label={t('domain:customers.fields.email')}
          value={data.email || t('domain:customers.noContact')}
        />
        <DetailRow
          label={t('domain:customers.fields.phone')}
          value={data.phone || t('domain:customers.noContact')}
        />
        <DetailRow
          label={t('domain:customers.fields.notes')}
          value={notes || t('domain:customers.noNotes')}
        />
        <DetailRow
          label={t('domain:customers.fields.created')}
          value={formatDate(data.created_at)}
        />
      </DetailCard>
    </div>
  );
}
