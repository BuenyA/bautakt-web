import { Button, Link as FluentLink } from '@fluentui/react-components';
import { DeleteRegular } from '@fluentui/react-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { DetailCard, DetailRow } from '@/components/common/DetailCard';
import { EmptyState } from '@/components/common/EmptyState';
import { LinkButton } from '@/components/common/LinkButton';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSpinner } from '@/components/common/PageSpinner';
import { RouterLink } from '@/components/common/RouterLink';
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
            <FluentLink as="button" onClick={() => void refetch()}>
              {t('common:action.retry')}
            </FluentLink>
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
          action={<LinkButton to={routes.assignments}>{t('common:action.back')}</LinkButton>}
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
            <LinkButton to={routes.assignments}>{t('common:action.back')}</LinkButton>
            {canManage ? (
              <Button onClick={() => setDeleteOpen(true)} icon={<DeleteRegular />}>
                {t('domain:assignments.delete.action')}
              </Button>
            ) : null}
          </div>
        }
      />

      {data.order_name ? (
        <div className="flex flex-wrap items-center gap-3">
          <RouterLink to={routes.order(data.order_id)}>
            <span className="font-medium">{data.order_name}</span>
          </RouterLink>
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
