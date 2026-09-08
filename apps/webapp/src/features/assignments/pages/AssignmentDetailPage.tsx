import { Button } from '@bautakt/ui';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSpinner } from '@/components/common/PageSpinner';
import { formatDate, formatDateTimeRange } from '@/lib/format';
import { routes } from '@/lib/routes';

import { useAssignment } from '../useAssignment';

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="grid gap-1 sm:grid-cols-[12rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

export function AssignmentDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useAssignment(id);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t('domain:assignments.detailTitle')} />
        <PageSpinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t('domain:assignments.detailTitle')} />
        <EmptyState
          title={t('domain:assignments.loadErrorTitle')}
          description={t('domain:assignments.loadErrorDescription')}
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
        <PageHeader title={t('domain:assignments.detailTitle')} />
        <EmptyState
          title={t('domain:assignments.notFoundTitle')}
          description={t('domain:assignments.notFoundDescription')}
          action={
            <Button asChild variant="outline" size="sm">
              <Link to={routes.assignments}>{t('common:action.back')}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const period = formatDateTimeRange(data.starts_at, data.ends_at);
  const employees = data.employee_names.length
    ? data.employee_names.join(', ')
    : t('domain:assignments.noEmployees');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={period || t('domain:assignments.detailTitle')}
        description={t('domain:assignments.detailDescription')}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to={routes.assignments}>{t('common:action.back')}</Link>
          </Button>
        }
      />

      {data.order_name ? (
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={routes.order(data.order_id)}
            className="text-sm font-medium text-primary hover:underline"
          >
            {data.order_name}
          </Link>
        </div>
      ) : null}

      {data.note.trim() ? (
        <p className="max-w-3xl text-sm text-text-secondary whitespace-pre-wrap">{data.note}</p>
      ) : null}

      <dl className="flex max-w-3xl flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:p-6">
        <DetailRow label={t('domain:assignments.fields.period')} value={period} />
        <DetailRow
          label={t('domain:assignments.fields.order')}
          value={data.order_name || t('domain:assignments.noOrder')}
        />
        <DetailRow label={t('domain:assignments.fields.employees')} value={employees} />
        <DetailRow
          label={t('domain:assignments.fields.note')}
          value={data.note.trim() || t('domain:assignments.noNote')}
        />
        <DetailRow
          label={t('domain:assignments.fields.created')}
          value={formatDate(data.created_at)}
        />
      </dl>
    </div>
  );
}
