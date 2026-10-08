import { hasPermission } from '@bautakt/core';
import { Badge, Button, DataTable, type DataTableColumn, Uicon } from '@bautakt/ui';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { ListFilterChips } from '@/components/common/ListFilterChips';
import { PageHeader } from '@/components/common/PageHeader';
import { useDataTableLabels } from '@/components/common/useDataTableLabels';
import { useAuth } from '@/features/auth/useAuth';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { useMembership } from '@/features/company/useMembership';
import { formatDateTime, formatNetDuration } from '@/lib/format';
import { routes, timesOrderParam } from '@/lib/routes';

import { canCreateTimeEntry, canEditTimeEntry } from '../timeEntryAccess';
import { draftFromTimeEntry, emptyTimeEntry, type TimeEntryDraft } from '../timeEntryDraft';
import { TimeEntrySheet } from '../TimeEntrySheet';
import { matchesTimePeriod, type TimePeriod, timePeriodFromSearch } from '../timePeriod';
import { type TimeEntryListRow, useTimeEntries } from '../useTimeEntries';

export function TimesListPage() {
  const { t } = useTranslation();
  const labels = useDataTableLabels();
  const { user } = useAuth();
  const { data: membership } = useMembership();
  const canCreate = canCreateTimeEntry(membership?.permissions);
  const canTrackForTeam = hasPermission(membership?.permissions, 'canTrackTimeForTeam');
  const [searchParams, setSearchParams] = useSearchParams();
  const orderId = searchParams.get(timesOrderParam)?.trim() || undefined;
  const period = timePeriodFromSearch(searchParams.get('period'));
  const [draft, setDraft] = useState<TimeEntryDraft | null>(null);
  const entries = useTimeEntries(orderId);
  const { data, isError, refetch } = entries;
  const orderName = data?.find((row) => row.order_name)?.order_name ?? '';

  function setPeriod(next: TimePeriod) {
    const params = new URLSearchParams(searchParams);
    // Default ist Woche — ohne Param. `order` bleibt, der Deep-Link
    // auf einen Auftrag hängt nicht am Zeitraum.
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

  const hasAny = (data?.length ?? 0) > 0;

  function clearOrderFilter() {
    const next = new URLSearchParams(searchParams);
    next.delete(timesOrderParam);
    setSearchParams(next, { replace: true });
  }

  const isLoading = useCompanyListLoading(entries);
  const description = orderId
    ? orderName
      ? t('domain:times.filteredOnOrder', { order: orderName })
      : t('domain:times.filteredDescription')
    : t('domain:times.listDescription');

  function openNew() {
    setDraft(
      emptyTimeEntry({
        orderId,
        employmentId: canTrackForTeam ? undefined : membership?.employmentId,
      }),
    );
  }

  const headerActions =
    orderId || canCreate ? (
      <div className="flex flex-wrap items-center gap-2">
        {orderId ? (
          <Button asChild variant="outline" size="sm">
            <Link to={routes.order(orderId)}>{t('domain:times.openOrder')}</Link>
          </Button>
        ) : null}
        {canCreate ? (
          <Button size="sm" onClick={openNew}>
            <Uicon name="plus" size={16} />
            {t('domain:timeForm.newTitle')}
          </Button>
        ) : null}
      </div>
    ) : null;

  const columns = useMemo<DataTableColumn<TimeEntryListRow>[]>(
    () => [
      {
        accessorKey: 'employee_name',
        header: t('domain:times.columns.employee'),
        cell: ({ row }) => (
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-foreground font-medium">
              {row.original.employee_name || t('domain:times.noEmployee')}
            </span>
            {row.original.billed ? <Badge variant="muted">{t('domain:times.billed')}</Badge> : null}
          </span>
        ),
      },
      {
        accessorKey: 'order_name',
        header: t('domain:times.columns.order'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.order_name || t('domain:times.noOrder')}
          </span>
        ),
      },
      {
        accessorKey: 'started_at',
        header: t('domain:times.columns.start'),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {formatDateTime(row.original.started_at)}
          </span>
        ),
      },
      {
        accessorKey: 'ended_at',
        header: t('domain:times.columns.end'),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {row.original.ended_at
              ? formatDateTime(row.original.ended_at)
              : t('domain:times.noEnd')}
          </span>
        ),
      },
      {
        accessorKey: 'break_minutes',
        header: t('domain:times.columns.break'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {t('domain:times.breakMinutes', { count: row.original.break_minutes })}
          </span>
        ),
      },
      {
        id: 'duration',
        // Sortiert nach der Nettodauer in Minuten, nicht nach dem Text: sonst
        // stuende „10:00 Std." vor „9:00 Std.".
        accessorFn: (row) => netMinutes(row),
        header: t('domain:times.columns.duration'),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {formatNetDuration(
              row.original.started_at,
              row.original.ended_at,
              row.original.break_minutes,
            ) || t('domain:times.noEnd')}
          </span>
        ),
      },
      {
        accessorKey: 'note',
        header: t('domain:times.columns.note'),
        cell: ({ row }) => (
          <span className="text-muted-foreground block max-w-xs truncate">
            {row.original.note.trim() || t('domain:times.noNote')}
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
          title={t('domain:times.listTitle')}
          description={description}
          actions={
            orderId ? (
              <Button asChild variant="outline" size="sm">
                <Link to={routes.order(orderId)}>{t('domain:times.openOrder')}</Link>
              </Button>
            ) : null
          }
        />
        <EmptyState
          title={t('domain:times.loadErrorTitle')}
          description={t('domain:times.loadErrorDescription')}
          action={
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                className="text-primary cursor-pointer text-sm font-medium hover:underline"
                onClick={() => void refetch()}
              >
                {t('common:action.retry')}
              </button>
              {orderId ? (
                <button
                  type="button"
                  className="text-primary cursor-pointer text-sm font-medium hover:underline"
                  onClick={clearOrderFilter}
                >
                  {t('domain:times.clearOrderFilter')}
                </button>
              ) : null}
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('domain:times.listTitle')}
        description={description}
        actions={headerActions}
      />

      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        labels={labels}
        exportFileName="zeiten"
        onRowClick={
          canCreate
            ? (row) => {
                if (!canEditTimeEntry(membership?.permissions, user?.id, row)) return;
                setDraft(draftFromTimeEntry(row));
              }
            : undefined
        }
        toolbar={
          <ListFilterChips
            label={t('domain:times.filtersLabel')}
            value={period}
            onValueChange={setPeriod}
            options={periodOptions}
          />
        }
        empty={
          <EmptyState
            title={
              hasAny
                ? t('domain:times.emptyResultsTitle')
                : orderId
                  ? t('domain:times.emptyForOrderTitle')
                  : t('domain:times.emptyTitle')
            }
            description={
              hasAny
                ? t('domain:times.emptyResultsDescription')
                : orderId
                  ? t('domain:times.emptyForOrderDescription')
                  : t('domain:times.emptyDescription')
            }
            action={
              canCreate || orderId ? (
                <div className="flex flex-col items-center gap-3">
                  {canCreate ? (
                    <Button size="sm" onClick={openNew}>
                      <Uicon name="plus" size={16} />
                      {t('domain:timeForm.newTitle')}
                    </Button>
                  ) : null}
                  {orderId ? (
                    <button
                      type="button"
                      className="text-primary cursor-pointer text-sm font-medium hover:underline"
                      onClick={clearOrderFilter}
                    >
                      {t('domain:times.clearOrderFilter')}
                    </button>
                  ) : null}
                </div>
              ) : undefined
            }
          />
        }
      />

      <TimeEntrySheet
        draft={draft}
        open={draft !== null}
        onOpenChange={(open) => !open && setDraft(null)}
      />
    </div>
  );
}

function netMinutes(row: TimeEntryListRow): number {
  if (!row.ended_at) return 0;
  const start = new Date(row.started_at).getTime();
  const end = new Date(row.ended_at).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.round((end - start) / 60_000) - (row.break_minutes ?? 0));
}
