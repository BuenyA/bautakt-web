import { Button, Uicon } from '@bautakt/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { DetailCard, DetailRow } from '@/components/common/DetailCard';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSpinner } from '@/components/common/PageSpinner';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { usePermission } from '@/features/company/usePermission';
import { formatDate, formatDateTimeRange } from '@/lib/format';
import { routes } from '@/lib/routes';

import { AssignmentDeleteDialog } from '../AssignmentDeleteDialog';
import { useAssignment } from '../useAssignment';

export function AssignmentDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const canManage = usePermission('canManageWorkAssignments');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const assignment = useAssignment(id);
  const { data, isError, refetch } = assignment;
  const isLoading = useCompanyListLoading(assignment);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title={t('domain:assignments.detailTitle')} />
        <PageSpinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-8">
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
      <div className="flex flex-col gap-8">
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
    <div className="flex flex-col gap-8">
      <PageHeader
        title={period || t('domain:assignments.detailTitle')}
        description={t('domain:assignments.detailDescription')}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to={routes.assignments}>{t('common:action.back')}</Link>
            </Button>
            {canManage ? (
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Uicon name="trash" size={16} />
                {t('domain:assignments.delete.action')}
              </Button>
            ) : null}
          </div>
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
        <p className="max-w-3xl text-sm text-muted-foreground whitespace-pre-wrap">{data.note}</p>
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

      {canManage ? (
        <AssignmentDeleteDialog assignment={data} open={deleteOpen} onOpenChange={setDeleteOpen} />
      ) : null}
    </div>
  );
}
