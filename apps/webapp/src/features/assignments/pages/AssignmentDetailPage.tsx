import { Button } from '@bautakt/ui';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { DetailCard, DetailRow } from '@/components/common/DetailCard';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSpinner } from '@/components/common/PageSpinner';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { formatDate, formatDateTimeRange } from '@/lib/format';
import { routes } from '@/lib/routes';

import { useAssignment } from '../useAssignment';

export function AssignmentDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const assignment = useAssignment(id);
  const { data, isError, refetch } = assignment;
  const isLoading = useCompanyListLoading(assignment);

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

      <DetailCard className="max-w-3xl">
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
      </DetailCard>
    </div>
  );
}
