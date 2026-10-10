import { DataTable, type DataTableColumn } from '@bautakt/ui';
import { Button, Link as FluentLink, Tab, TabList } from '@fluentui/react-components';
import { AddRegular } from '@fluentui/react-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { RouterLink } from '@/components/common/RouterLink';
import { useCreateFromUrl } from '@/components/common/useCreateFromUrl';
import { useDataTableLabels } from '@/components/common/useDataTableLabels';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { usePermission } from '@/features/company/usePermission';
import { formatDateTimeRange } from '@/lib/format';
import { routes } from '@/lib/routes';

import { AssignmentSheet } from '../AssignmentSheet';
import {
  type AssignmentListFilter,
  type AssignmentListRow,
  useAssignments,
} from '../useAssignments';

function filterFromSearch(value: string | null): AssignmentListFilter {
  return value === 'woche' ? 'week' : 'all';
}

export function AssignmentsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const labels = useDataTableLabels();
  const canManage = usePermission('canManageWorkAssignments');
  const [sheetOpen, setSheetOpen] = useState(false);
  // `?neu=1` aus der Schnellsuche öffnet das Anlege-Panel.
  useCreateFromUrl(canManage, () => setSheetOpen(true));
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = filterFromSearch(searchParams.get('zeitraum'));
  const assignments = useAssignments(filter);
  const { data, isError, refetch } = assignments;

  function setFilter(next: string) {
    if (next === 'all') {
      setSearchParams({}, { replace: true });
      return;
    }
    setSearchParams({ zeitraum: 'woche' }, { replace: true });
  }

  const isLoading = useCompanyListLoading(assignments);

  const columns = useMemo<DataTableColumn<AssignmentListRow>[]>(
    () => [
      {
        accessorKey: 'starts_at',
        header: t('domain:assignments.columns.period'),
        cell: ({ row }) => (
          <RouterLink appearance="subtle" to={routes.assignment(row.original.id)} stopPropagation>
            <span className="font-medium whitespace-nowrap">
              {formatDateTimeRange(row.original.starts_at, row.original.ends_at)}
            </span>
          </RouterLink>
        ),
      },
      {
        accessorKey: 'order_name',
        header: t('domain:assignments.columns.order'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.order_name || t('domain:assignments.noOrder')}
          </span>
        ),
      },
      {
        id: 'employees',
        accessorFn: (row) => row.employee_names.join(', '),
        header: t('domain:assignments.columns.employees'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.employee_names.length
              ? row.original.employee_names.join(', ')
              : t('domain:assignments.noEmployees')}
          </span>
        ),
      },
      {
        accessorKey: 'note',
        header: t('domain:assignments.columns.note'),
        cell: ({ row }) => (
          <span className="text-muted-foreground block max-w-xs truncate">
            {row.original.note.trim() || t('domain:assignments.noNote')}
          </span>
        ),
      },
    ],
    [t],
  );

  if (isError) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title={t('domain:assignments.listTitle')}
          description={t('domain:assignments.listDescription')}
        />
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('domain:assignments.listTitle')}
        description={t('domain:assignments.listDescription')}
        actions={
          canManage ? (
            <Button appearance="primary" onClick={() => setSheetOpen(true)} icon={<AddRegular />}>
              {t('domain:assignments.create.action')}
            </Button>
          ) : null
        }
      />

      <DataTable
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        labels={labels}
        exportFileName="einsaetze"
        onRowClick={(assignment) => void navigate(routes.assignment(assignment.id))}
        toolbar={
          <TabList
            selectedValue={filter}
            onTabSelect={(_, data) => setFilter(data.value as typeof filter)}
            aria-label={t('domain:assignments.filtersLabel')}
          >
            <Tab value="all">{t('domain:assignments.filterAll')}</Tab>
            <Tab value="week">{t('domain:assignments.filterThisWeek')}</Tab>
          </TabList>
        }
        empty={
          <EmptyState
            title={
              filter === 'week'
                ? t('domain:assignments.emptyWeekTitle')
                : t('domain:assignments.emptyTitle')
            }
            description={
              filter === 'week'
                ? t('domain:assignments.emptyWeekDescription')
                : canManage
                  ? t('domain:assignments.emptyDescriptionManage')
                  : t('domain:assignments.emptyDescription')
            }
            action={
              canManage || filter === 'week' ? (
                <div className="flex flex-col items-center gap-3">
                  {canManage ? (
                    <Button
                      appearance="primary"
                      onClick={() => setSheetOpen(true)}
                      icon={<AddRegular />}
                    >
                      {t('domain:assignments.create.action')}
                    </Button>
                  ) : null}
                  {filter === 'week' ? (
                    <FluentLink as="button" onClick={() => setFilter('all')}>
                      {t('domain:assignments.emptyWeekShowAll')}
                    </FluentLink>
                  ) : null}
                </div>
              ) : undefined
            }
          />
        }
      />

      <AssignmentSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
