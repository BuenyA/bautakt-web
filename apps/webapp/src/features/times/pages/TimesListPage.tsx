import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSpinner } from '@/components/common/PageSpinner';
import { formatDateTime, formatNetDuration } from '@/lib/format';

import { useTimeEntries } from '../useTimeEntries';

export function TimesListPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useTimeEntries();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('domain:times.listTitle')}
        description={t('domain:times.listDescription')}
      />

      {isLoading ? (
        <PageSpinner />
      ) : isError ? (
        <EmptyState
          title={t('domain:times.loadErrorTitle')}
          description={t('domain:times.loadErrorDescription')}
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
          title={t('domain:times.emptyTitle')}
          description={t('domain:times.emptyDescription')}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="bg-surface text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">{t('domain:times.columns.employee')}</th>
                <th className="px-4 py-3 font-medium">{t('domain:times.columns.order')}</th>
                <th className="px-4 py-3 font-medium">{t('domain:times.columns.start')}</th>
                <th className="px-4 py-3 font-medium">{t('domain:times.columns.end')}</th>
                <th className="px-4 py-3 font-medium">{t('domain:times.columns.break')}</th>
                <th className="px-4 py-3 font-medium">{t('domain:times.columns.duration')}</th>
                <th className="px-4 py-3 font-medium">{t('domain:times.columns.note')}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((entry) => {
                const duration = formatNetDuration(
                  entry.started_at,
                  entry.ended_at,
                  entry.break_minutes,
                );
                return (
                  <tr key={entry.id} className="border-t border-border hover:bg-surface/60">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {entry.employee_name || t('domain:times.noEmployee')}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {entry.order_name || t('domain:times.noOrder')}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTime(entry.started_at)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {entry.ended_at ? formatDateTime(entry.ended_at) : t('domain:times.noEnd')}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {t('domain:times.breakMinutes', { count: entry.break_minutes })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {duration || t('domain:times.noEnd')}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">
                      {entry.note.trim() || t('domain:times.noNote')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
