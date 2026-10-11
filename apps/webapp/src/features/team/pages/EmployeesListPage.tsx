import { DataTable, type DataTableColumn, StatusBadge } from '@bautakt/ui';
import { Button, Link as FluentLink } from '@fluentui/react-components';
import { AddRegular } from '@fluentui/react-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { ListFilterChips } from '@/components/common/ListFilterChips';
import { PageHeader } from '@/components/common/PageHeader';
import { useCreateFromUrl } from '@/components/common/useCreateFromUrl';
import { useDataTableLabels } from '@/components/common/useDataTableLabels';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { usePermission } from '@/features/company/usePermission';
import { formatDate } from '@/lib/format';

import { draftFromEmployee, type EmployeeDraft, emptyEmployee } from '../employeeDraft';
import { EmployeeSheet } from '../EmployeeSheet';
import {
  employeeFilterFromSearch,
  type EmployeeListFilter,
  employmentListStatus,
} from '../employeeStatus';
import { type EmployeeRow, useEmployees } from '../useEmployees';

export function EmployeesListPage() {
  const { t } = useTranslation();
  const labels = useDataTableLabels();
  const canManage = usePermission('canManageEmployees');
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = employeeFilterFromSearch(searchParams.get('status'));
  const [draft, setDraft] = useState<EmployeeDraft | null>(null);
  // `?neu=1` aus der Schnellsuche öffnet das Anlege-Panel.
  useCreateFromUrl(canManage, () => setDraft(emptyEmployee()));
  const employees = useEmployees();
  const { data, isError, refetch } = employees;

  const isLoading = useCompanyListLoading(employees);

  function setFilter(next: EmployeeListFilter) {
    const params = new URLSearchParams(searchParams);
    // Default ist Aktiv — ohne Param, wie die anderen Listen ihren Default lassen.
    if (next === 'active') params.delete('status');
    else params.set('status', next);
    setSearchParams(params, { replace: true });
  }

  const rows = useMemo(() => {
    const all = data ?? [];
    if (filter === 'all') return all;
    return all.filter((row) => employmentListStatus(row) === filter);
  }, [data, filter]);

  const mixedSections = useMemo(() => {
    if (filter !== 'all') return false;
    let current = false;
    let former = false;
    for (const row of rows) {
      if (employmentListStatus(row) === 'inactive') former = true;
      else current = true;
      if (current && former) return true;
    }
    return false;
  }, [filter, rows]);

  const filterOptions = useMemo(
    () =>
      [
        { value: 'all', label: t('domain:employees.filterAll') },
        { value: 'active', label: t('domain:employees.filterActive') },
        { value: 'pending', label: t('domain:employees.filterPending') },
        { value: 'inactive', label: t('domain:employees.filterInactive') },
      ] as const,
    [t],
  );

  const hasAny = (data?.length ?? 0) > 0;

  const columns = useMemo<DataTableColumn<EmployeeRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('domain:employees.columns.name'),
        cell: ({ row }) => (
          <span className="flex items-center gap-2">
            <span className="text-foreground font-medium">
              {row.original.name || t('domain:employees.unnamed')}
            </span>
            {row.original.ended_at ? (
              <StatusBadge tone="neutral">{t('domain:employees.former')}</StatusBadge>
            ) : null}
          </span>
        ),
      },
      { accessorKey: 'role', header: t('domain:employees.columns.role') },
      {
        accessorKey: 'job_title',
        header: t('domain:employees.columns.jobTitle'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.job_title || '—'}</span>
        ),
      },
      {
        accessorKey: 'contact_email',
        header: t('domain:employees.columns.email'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.contact_email || '—'}</span>
        ),
      },
      {
        accessorKey: 'contact_phone',
        header: t('domain:employees.columns.phone'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.contact_phone || '—'}</span>
        ),
      },
      {
        accessorKey: 'started_at',
        header: t('domain:employees.columns.since'),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {formatDate(row.original.started_at) || '—'}
          </span>
        ),
      },
    ],
    [t],
  );

  if (isError) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t('domain:employees.title')} />
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('domain:employees.title')}
        description={t('domain:employees.description')}
        actions={
          canManage ? (
            <Button
              appearance="primary"
              onClick={() => setDraft(emptyEmployee())}
              icon={<AddRegular />}
            >
              {t('domain:employeeForm.newTitle')}
            </Button>
          ) : null
        }
      />

      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        labels={labels}
        exportFileName="mitarbeiter"
        onRowClick={canManage ? (employee) => setDraft(draftFromEmployee(employee)) : undefined}
        toolbar={
          <ListFilterChips
            nowrap
            label={t('domain:employees.filtersLabel')}
            value={filter}
            onValueChange={setFilter}
            options={filterOptions}
          />
        }
        sectionOf={
          mixedSections
            ? (row) =>
                employmentListStatus(row) === 'inactive'
                  ? t('domain:employees.sectionFormer')
                  : t('domain:employees.sectionActive')
            : undefined
        }
        empty={
          <EmptyState
            title={
              hasAny ? t('domain:employees.emptyResultsTitle') : t('domain:employees.emptyTitle')
            }
            description={
              hasAny
                ? t('domain:employees.emptyResultsDescription')
                : t('domain:employees.emptyDescription')
            }
          />
        }
      />

      <EmployeeSheet
        draft={draft}
        open={draft !== null}
        onOpenChange={(open) => !open && setDraft(null)}
      />
    </div>
  );
}
