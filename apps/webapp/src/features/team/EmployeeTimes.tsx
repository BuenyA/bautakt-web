import { DataTable } from '@bautakt/ui';
import { Button, Link as FluentLink, Text } from '@fluentui/react-components';
import { AddRegular } from '@fluentui/react-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { ListFilterChips } from '@/components/common/ListFilterChips';
import { useDataTableLabels } from '@/components/common/useDataTableLabels';
import { useAuth } from '@/features/auth/useAuth';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { useMembership } from '@/features/company/useMembership';
import { useOrders } from '@/features/orders/useOrders';
import { canCreateTimeEntry, canEditTimeEntry } from '@/features/times/timeEntryAccess';
import {
  draftFromTimeEntry,
  emptyTimeEntry,
  type TimeEntryDraft,
} from '@/features/times/timeEntryDraft';
import { TimeEntrySheet } from '@/features/times/TimeEntrySheet';
import {
  matchesTimePeriod,
  type TimePeriod,
  timePeriodFromSearch,
} from '@/features/times/timePeriod';
import { formatMinutesAsHours, sumNetMinutes } from '@/features/times/timeTotals';
import { useTimeColumns } from '@/features/times/useTimeColumns';
import { useTimeEntries } from '@/features/times/useTimeEntries';

/**
 * Zeiten eines Mitarbeiters auf seiner Seite: Zeitraum Heute/Woche/Monat,
 * Summe und die Einträge. Ersetzt seit 2026-10-11 den Bereich „Zeiten“.
 * „Zeit nachtragen“ belegt den Mitarbeiter vor.
 */
export function EmployeeTimes({ employmentId }: { employmentId: string }) {
  const { t } = useTranslation();
  const labels = useDataTableLabels();
  const columns = useTimeColumns();
  const { user } = useAuth();
  const { data: membership } = useMembership();
  const canCreate = canCreateTimeEntry(membership?.permissions);
  // Siehe OrderTimes: Aufträge vor dem Panel laden, sonst bleibt das Select leer.
  useOrders({ enabled: canCreate });
  const [searchParams, setSearchParams] = useSearchParams();
  const period = timePeriodFromSearch(searchParams.get('period'));
  const [draft, setDraft] = useState<TimeEntryDraft | null>(null);
  const entries = useTimeEntries({ employmentId });
  const { data, isError, refetch } = entries;
  const isLoading = useCompanyListLoading(entries);
  const hasAny = (data?.length ?? 0) > 0;

  function setPeriod(next: TimePeriod) {
    const params = new URLSearchParams(searchParams);
    if (next === 'week') params.delete('period');
    else params.set('period', next);
    setSearchParams(params, { replace: true });
  }

  const rows = useMemo(
    () => (data ?? []).filter((row) => matchesTimePeriod(row.started_at, period)),
    [data, period],
  );

  const periodOptions = useMemo(
    () =>
      [
        { value: 'today', label: t('domain:times.periodToday') },
        { value: 'week', label: t('domain:times.periodWeek') },
        { value: 'month', label: t('domain:times.periodMonth') },
      ] as const,
    [t],
  );

  return (
    <section className="flex flex-col gap-4" aria-labelledby="employee-times-title">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2
          id="employee-times-title"
          className="text-foreground text-lg font-semibold tracking-tight"
        >
          {t('domain:employees.detail.timesTitle')}
        </h2>
        {canCreate ? (
          <Button
            appearance="primary"
            onClick={() => setDraft(emptyTimeEntry({ employmentId }))}
            icon={<AddRegular />}
          >
            {t('domain:timeForm.newTitle')}
          </Button>
        ) : null}
      </div>

      {isError ? (
        <EmptyState
          title={t('domain:times.loadErrorTitle')}
          description={t('domain:times.loadErrorDescription')}
          action={
            <FluentLink as="button" onClick={() => void refetch()}>
              {t('common:action.retry')}
            </FluentLink>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          labels={labels}
          exportFileName="zeiten-mitarbeiter"
          onRowClick={
            canCreate
              ? (row) => {
                  if (!canEditTimeEntry(membership?.permissions, user?.id, row)) return;
                  setDraft(draftFromTimeEntry(row));
                }
              : undefined
          }
          toolbar={
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <ListFilterChips
                label={t('domain:times.filtersLabel')}
                value={period}
                onValueChange={setPeriod}
                options={periodOptions}
              />
              <Text weight="semibold" className="tabular-nums">
                {t('domain:employees.detail.periodTotal', {
                  hours: formatMinutesAsHours(sumNetMinutes(rows)),
                })}
              </Text>
            </div>
          }
          empty={
            <EmptyState
              title={
                hasAny
                  ? t('domain:times.emptyResultsTitle')
                  : t('domain:employees.detail.timesEmptyTitle')
              }
              description={
                hasAny
                  ? t('domain:times.emptyResultsDescription')
                  : t('domain:employees.detail.timesEmptyDescription')
              }
            />
          }
        />
      )}

      <TimeEntrySheet
        draft={draft}
        open={draft !== null}
        onOpenChange={(open) => !open && setDraft(null)}
      />
    </section>
  );
}
