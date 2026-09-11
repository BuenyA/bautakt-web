import { cn } from '@bautakt/ui';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSpinner } from '@/components/common/PageSpinner';
import { formatDateTimeRange } from '@/lib/format';
import { routes } from '@/lib/routes';

import { type AssignmentListFilter, useAssignments } from '../useAssignments';

function filterFromSearch(value: string | null): AssignmentListFilter {
  return value === 'woche' ? 'week' : 'all';
}

export function AssignmentsListPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = filterFromSearch(searchParams.get('zeitraum'));
  const { data, isLoading, isError, refetch } = useAssignments(filter);

  function setFilter(next: AssignmentListFilter) {
    if (next === 'all') {
      setSearchParams({}, { replace: true });
      return;
    }
    setSearchParams({ zeitraum: 'woche' }, { replace: true });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('domain:assignments.listTitle')}
        description={t('domain:assignments.listDescription')}
      />

      <div
        role="tablist"
        aria-label={t('domain:assignments.filtersLabel')}
        className="flex flex-wrap gap-2 border-b border-border pb-3"
      >
        {(
          [
            { id: 'all', labelKey: 'domain:assignments.filterAll' },
            { id: 'week', labelKey: 'domain:assignments.filterThisWeek' },
          ] as const
        ).map((tab) => {
          const active = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(tab.id)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm transition-colors',
                active
                  ? 'bg-accent font-medium text-accent-foreground'
                  : 'text-muted-foreground hover:bg-surface hover:text-foreground',
              )}
            >
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : isError ? (
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
      ) : !data?.length ? (
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
                className="text-sm font-medium text-primary hover:underline"
                onClick={() => setFilter('all')}
              >
                {t('domain:assignments.emptyWeekShowAll')}
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="bg-surface text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">{t('domain:assignments.columns.period')}</th>
                <th className="px-4 py-3 font-medium">{t('domain:assignments.columns.order')}</th>
                <th className="px-4 py-3 font-medium">
                  {t('domain:assignments.columns.employees')}
                </th>
                <th className="px-4 py-3 font-medium">{t('domain:assignments.columns.note')}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((assignment) => (
                <tr key={assignment.id} className="border-t border-border hover:bg-surface/60">
                  <td className="px-4 py-3">
                    <Link
                      to={routes.assignment(assignment.id)}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {formatDateTimeRange(assignment.starts_at, assignment.ends_at)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {assignment.order_name || t('domain:assignments.noOrder')}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {assignment.employee_names.length
                      ? assignment.employee_names.join(', ')
                      : t('domain:assignments.noEmployees')}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">
                    {assignment.note.trim() || t('domain:assignments.noNote')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
