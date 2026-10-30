import { StatusBadge } from '@bautakt/ui';
import { Avatar, Button, Link as FluentLink } from '@fluentui/react-components';
import { EditRegular } from '@fluentui/react-icons';
import { type ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { DetailCard, DetailRow } from '@/components/common/DetailCard';
import { EmptyState } from '@/components/common/EmptyState';
import { LinkButton } from '@/components/common/LinkButton';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSpinner } from '@/components/common/PageSpinner';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { useMembership } from '@/features/company/useMembership';
import { usePermission } from '@/features/company/usePermission';
import { matchesTimePeriod } from '@/features/times/timePeriod';
import { formatMinutesAsHours, sumNetMinutes } from '@/features/times/timeTotals';
import { useTimeEntries } from '@/features/times/useTimeEntries';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';

import { draftFromEmployee, type EmployeeDraft } from '../employeeDraft';
import { AbsencesCard, Figure, OrdersCard, TimesCard } from '../EmployeeProfileSections';
import { absenceDays, collectOrders, leaveFigureNote } from '../employeeProfileStats';
import { RightsCard } from '../EmployeeRights';
import { EmployeeSheet } from '../EmployeeSheet';
import {
  computeLeaveQuota,
  DEFAULT_ABSENCE_SETTINGS,
  formatDays,
  proRataEntitlement,
} from '../leaveQuota';
import { LeaveQuotaDialog } from '../LeaveQuotaDialog';
import { useAbsences } from '../useAbsences';
import { canManageTarget, useCompanyRoles } from '../useCompanyRoles';
import { useAbsenceSettings, useEmployeeAssignments } from '../useEmployeeProfile';
import { type EmployeeRow, useEmployees } from '../useEmployees';
import { useProfileImageUrls } from '../useProfileImageUrls';

/**
 * Seite eines Mitarbeiters: Kennzahlen, Stammdaten, Rolle und Rechte,
 * Fehlzeiten, Aufträge und die Zeiten im Kleinen.
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
  const imageUrl = useProfileImageUrls([employee?.imagePath]).data?.[employee?.imagePath ?? ''];
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
    <EmployeeProfile
      employee={employee}
      imageUrl={imageUrl}
      canManage={canManage}
      canSeeTeamTimes={canSeeTeamTimes}
      back={back}
      onEdit={() => setDraft(draftFromEmployee(employee))}
    >
      <EmployeeSheet
        draft={draft}
        open={draft !== null}
        onOpenChange={(open) => !open && setDraft(null)}
      />
    </EmployeeProfile>
  );
}

/**
 * Kennzahlen oben, darunter links Stammdaten, Rechte und Zeiten, rechts
 * Fehlzeiten und Aufträge. Was ich nicht darf, fehlt ganz: RLS lieferte
 * ohnehin nur meine eigenen Zeilen, und eine leere Karte sähe aus wie
 * „hat nie gefehlt“.
 */
function EmployeeProfile({
  employee,
  imageUrl,
  canManage,
  canSeeTeamTimes,
  back,
  onEdit,
  children,
}: {
  employee: EmployeeRow;
  imageUrl: string | undefined;
  canManage: boolean;
  canSeeTeamTimes: boolean;
  back: ReactNode;
  onEdit: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const { data: membership } = useMembership();
  const canManageAbsences = usePermission('canManageAbsences');
  const roles = useCompanyRoles();
  const settings = useAbsenceSettings();
  const absences = useAbsences();
  const entries = useTimeEntries({ employmentId: employee.id });
  const assignments = useEmployeeAssignments(employee.id);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const year = new Date().getFullYear();
  const absenceSettings = settings.data ?? DEFAULT_ABSENCE_SETTINGS;
  const own = useMemo(
    () => (absences.data ?? []).filter((absence) => absence.employment_id === employee.id),
    [absences.data, employee.id],
  );
  const quota = computeLeaveQuota(
    {
      startedAt: employee.started_at,
      endedAt: employee.ended_at,
      annualLeaveDaysOverride: employee.annualLeaveDaysOverride,
      annualLeaveDaysOverrideIsManual: employee.annualLeaveDaysOverrideIsManual,
      weekendCountsAsLeaveOverride: employee.weekendCountsAsLeaveOverride,
    },
    absenceSettings,
    own,
    year,
  );
  const sickDays = own
    .filter(
      (absence) =>
        absence.type === 'krankheit' &&
        absence.start_date.startsWith(String(year)) &&
        absence.status !== 'abgelehnt' &&
        absence.status !== 'storniert',
    )
    .reduce((sum, absence) => sum + absenceDays(absence, quota.countWeekends), 0);

  const timeRows = useMemo(
    () => (canSeeTeamTimes ? (entries.data ?? []) : []),
    [canSeeTeamTimes, entries.data],
  );
  const orders = useMemo(
    () => collectOrders(assignments.data ?? [], timeRows),
    [assignments.data, timeRows],
  );
  const weekMinutes = sumNetMinutes(
    timeRows.filter((row) => matchesTimePeriod(row.started_at, 'week')),
  );
  const monthMinutes = sumNetMinutes(
    timeRows.filter((row) => matchesTimePeriod(row.started_at, 'month')),
  );

  const roleDefaults = roles.data?.find((role) => role.name === employee.role)?.permissions ?? {};
  // Die eigenen Rechte nie hier: Der Inhaber dürfte laut Datenbank auch sich
  // selbst „Mitarbeiter verwalten“ nehmen und stünde dann ausgesperrt da.
  const canEditRights =
    canManage &&
    employee.id !== membership?.employmentId &&
    canManageTarget(roles.data ?? [], membership?.role, employee.role);
  const name = employee.name || t('domain:employees.unnamed');

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        // Ohne Bild zeigt Fluent die Initialen, wie in der Einsatzplanung.
        leading={
          <Avatar
            name={employee.name || undefined}
            size={64}
            color="colorful"
            image={imageUrl ? { src: imageUrl } : undefined}
          />
        }
        title={name}
        description={[employee.role, employee.job_title].filter(Boolean).join(' · ')}
        actions={
          <div className="flex items-center gap-2">
            {back}
            {canManage ? (
              <Button appearance="primary" onClick={onEdit} icon={<EditRegular />}>
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

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {canManageAbsences ? (
          <>
            <Figure
              label={t('domain:employeeProfile.stats.leaveTitle', { year })}
              value={t('domain:employeeProfile.stats.leaveValue', {
                remaining: formatDays(Math.max(0, quota.remaining)),
                count: Math.max(0, quota.remaining),
              })}
              note={leaveFigureNote(t, quota)}
              tone={quota.remaining < 0 ? 'destructive' : undefined}
              isLoading={absences.isPending || settings.isPending}
            />
            <Figure
              label={t('domain:employeeProfile.stats.sickTitle', { year })}
              value={formatDays(sickDays)}
              note={t('domain:employeeProfile.stats.sickNote')}
              isLoading={absences.isPending}
            />
          </>
        ) : null}
        <Figure
          label={t('domain:employeeProfile.stats.ordersTitle')}
          value={String(orders.length)}
          note={t('domain:employeeProfile.stats.ordersNote')}
          isLoading={assignments.isPending || (canSeeTeamTimes && entries.isPending)}
        />
        {canSeeTeamTimes ? (
          <Figure
            label={t('domain:employeeProfile.stats.hoursTitle', {
              month: new Date().toLocaleDateString('de-DE', { month: 'long' }),
            })}
            value={formatMinutesAsHours(monthMinutes)}
            note={t('domain:employeeProfile.stats.hoursNote', {
              hours: formatMinutesAsHours(weekMinutes),
            })}
            isLoading={entries.isPending}
          />
        ) : null}
      </ul>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-6">
          <DetailCard title={t('domain:employeeProfile.masterData')}>
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

          {canManage ? (
            <RightsCard employee={employee} roleDefaults={roleDefaults} canEdit={canEditRights} />
          ) : null}

          {canSeeTeamTimes ? (
            <TimesCard
              entries={timeRows}
              weekMinutes={weekMinutes}
              monthMinutes={monthMinutes}
            />
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {canManageAbsences ? (
            <AbsencesCard
              absences={own}
              year={year}
              countWeekends={quota.countWeekends}
              action={
                canManage ? (
                  <Button appearance="secondary" size="small" onClick={() => setLeaveOpen(true)}>
                    {t('domain:employeeProfile.leave.edit')}
                  </Button>
                ) : null
              }
            />
          ) : null}
          <OrdersCard orders={orders} />
        </div>
      </div>

      {canManageAbsences && canManage ? (
        <LeaveQuotaDialog
          employee={employee}
          companyDays={proRataEntitlement(
            { startedAt: employee.started_at, endedAt: employee.ended_at },
            absenceSettings,
            year,
          )}
          year={year}
          open={leaveOpen}
          onOpenChange={setLeaveOpen}
        />
      ) : null}

      {children}
    </div>
  );
}
