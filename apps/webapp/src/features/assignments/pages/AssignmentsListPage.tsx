import { DataTable, type DataTableColumn, Tabs, TabsList, TabsTrigger } from '@bautakt/ui';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { useDataTableLabels } from '@/components/common/useDataTableLabels';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { formatDateTimeRange } from '@/lib/format';
import { routes } from '@/lib/routes';

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
          <Link
            to={routes.assignment(row.original.id)}
            className="text-foreground hover:text-primary font-medium whitespace-nowrap hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {formatDateTimeRange(row.original.starts_at, row.original.ends_at)}
          </Link>
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
            <button
              type="button"
              className="text-primary cursor-pointer text-sm font-medium hover:underline"
              onClick={() => void refetch()}
            >
              {t('common:action.retry')}
            </button>
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
      />

      <DataTable
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        labels={labels}
        exportFileName="einsaetze"
        onRowClick={(assignment) => void navigate(routes.assignment(assignment.id))}
        toolbar={
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList aria-label={t('domain:assignments.filtersLabel')}>
              <TabsTrigger value="all">{t('domain:assignments.filterAll')}</TabsTrigger>
              <TabsTrigger value="week">{t('domain:assignments.filterThisWeek')}</TabsTrigger>
            </TabsList>
          </Tabs>
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
                : t('domain:assignments.emptyDescription')
            }
            action={
              filter === 'week' ? (
                <button
                  type="button"
                  className="text-primary cursor-pointer text-sm font-medium hover:underline"
                  onClick={() => setFilter('all')}
                >
                  {t('domain:assignments.emptyWeekShowAll')}
                </button>
              ) : undefined
            }
          />
        }
      />
    </div>
  );
}
