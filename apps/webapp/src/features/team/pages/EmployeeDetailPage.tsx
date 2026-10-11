import { StatusBadge } from '@bautakt/ui';
import { Button, Link as FluentLink } from '@fluentui/react-components';
import { EditRegular } from '@fluentui/react-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { DetailCard, DetailRow } from '@/components/common/DetailCard';
import { EmptyState } from '@/components/common/EmptyState';
import { LinkButton } from '@/components/common/LinkButton';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSpinner } from '@/components/common/PageSpinner';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { usePermission } from '@/features/company/usePermission';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';

import { draftFromEmployee, type EmployeeDraft } from '../employeeDraft';
import { EmployeeSheet } from '../EmployeeSheet';
import { EmployeeTimes } from '../EmployeeTimes';
import { useEmployees } from '../useEmployees';

/**
 * Seite eines Mitarbeiters: Stammdaten und seine Zeiten.
 *
 * Die Daten kommen aus derselben Abfrage wie das Verzeichnis (`useEmployees`),
 * dann ist die Seite nach einem Klick in der Liste sofort da. Die Zeiten
 * zeigt nur, wer fremde Zeiten lesen darf — sonst liefert RLS ohnehin nur
 * eigene Zeilen, und eine leere Tabelle sähe aus wie „hat nichts gearbeitet“.
 */
export function EmployeeDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const canManage = usePermission('canManageEmployees');
  const canSeeTeamTimes = [
    usePermission('canTrackTimeForTeam'),
    usePermission('canViewCompanyFinance'),
    usePermission('canViewWageCosts'),
  ].some(Boolean);
  const [draft, setDraft] = useState<EmployeeDraft | null>(null);
  const employees = useEmployees();
  const { data, isError, refetch } = employees;
  const isLoading = useCompanyListLoading(employees);
  const employee = data?.find((row) => row.id === id);
  const back = <LinkButton to={routes.employees}>{t('common:action.back')}</LinkButton>;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title={t('domain:employees.detail.title')} />
        <PageSpinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title={t('domain:employees.detail.title')} actions={back} />
        <EmptyState
          title={t('domain:employees.loadErrorTitle')}
          description={t('domain:employees.loadErrorDescription')}
          action={
            <FluentLink as="button" onClick={() => void refetch()}>
              {t('common:action.retry')}
            </FluentLink>
          }
        />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title={t('domain:employees.detail.title')} />
        <EmptyState
          title={t('domain:employees.detail.notFoundTitle')}
          description={t('domain:employees.detail.notFoundDescription')}
          action={back}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={employee.name || t('domain:employees.unnamed')}
        description={t('domain:employees.detail.description')}
        actions={
          <div className="flex items-center gap-2">
            {back}
            {canManage ? (
              <Button
                appearance="primary"
                onClick={() => setDraft(draftFromEmployee(employee))}
                icon={<EditRegular />}
              >
                {t('common:action.edit')}
              </Button>
            ) : null}
          </div>
        }
      />

      {employee.ended_at ? (
        <div>
          <StatusBadge tone="neutral">{t('domain:employees.former')}</StatusBadge>
        </div>
      ) : null}

      <DetailCard className="max-w-3xl">
        <DetailRow label={t('domain:employees.columns.role')} value={employee.role || '—'} />
        <DetailRow
          label={t('domain:employees.columns.jobTitle')}
          value={employee.job_title || '—'}
        />
        <DetailRow
          label={t('domain:employees.columns.email')}
          value={employee.contact_email || '—'}
        />
        <DetailRow
          label={t('domain:employees.columns.phone')}
          value={employee.contact_phone || '—'}
        />
        <DetailRow
          label={t('domain:employees.columns.since')}
          value={formatDate(employee.started_at) || '—'}
        />
        {employee.ended_at ? (
          <DetailRow
            label={t('domain:employees.detail.until')}
            value={formatDate(employee.ended_at)}
          />
        ) : null}
      </DetailCard>

      {canSeeTeamTimes ? <EmployeeTimes employmentId={employee.id} /> : null}

      <EmployeeSheet
        draft={draft}
        open={draft !== null}
        onOpenChange={(open) => !open && setDraft(null)}
      />
    </div>
  );
}
