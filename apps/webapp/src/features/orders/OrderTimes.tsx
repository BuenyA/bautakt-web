import { Skeleton } from '@bautakt/ui';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { type TimeEntryListRow, useTimeEntries } from '@/features/times/useTimeEntries';
import { formatDateTimeRange, formatNetDuration } from '@/lib/format';
import { routes } from '@/lib/routes';

const SKELETON_COUNT = 2;

/**
 * Zeiten unter den Stammdaten eines Auftrags, unter den Notizen. Nur Anzeige:
 * kein Anlegen, kein Bearbeiten, kein Loeschen. Erfassen bleibt auf der
 * Zeitenliste und in der Handy-App.
 */
export function OrderTimes({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const entries = useTimeEntries(orderId);
  const { data, isError, refetch } = entries;
  const isLoading = useCompanyListLoading(entries);

  let body: ReactNode;
  if (isLoading) {
    body = <TimeListSkeleton label={t('common:state.loading')} />;
  } else if (isError) {
    body = (
      <EmptyState
        title={t('domain:orders.times.loadErrorTitle')}
        description={t('domain:orders.times.loadErrorDescription')}
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
    );
  } else if (!data || data.length === 0) {
    body = (
      <EmptyState
        title={t('domain:orders.times.emptyTitle')}
        description={t('domain:orders.times.emptyDescription')}
      />
    );
  } else {
    body = (
      <ul className="flex max-w-3xl flex-col gap-3">
        {data.map((entry) => (
          <TimeCard key={entry.id} entry={entry} />
        ))}
      </ul>
    );
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="order-times-title">
      <div className="flex max-w-3xl flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="order-times-title" className="text-foreground text-base font-semibold">
          {t('domain:orders.times.title')}
        </h2>
        <Link
          to={routes.timesForOrder(orderId)}
          className="text-primary text-sm font-medium hover:underline"
        >
          {t('domain:orders.times.all')}
        </Link>
      </div>
      {body}
    </section>
  );
}

function TimeCard({ entry }: { entry: TimeEntryListRow }) {
  const { t } = useTranslation();
  const period = formatDateTimeRange(entry.started_at, entry.ended_at);
  const duration =
    formatNetDuration(entry.started_at, entry.ended_at, entry.break_minutes) ||
    t('domain:times.noEnd');
  const note = entry.note.trim();

  return (
    <li className="flex flex-col gap-1 rounded-lg border border-border bg-surface px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-foreground text-sm font-medium">
          {entry.employee_name || t('domain:times.noEmployee')}
        </span>
        <span className="text-muted-foreground text-sm whitespace-nowrap">{duration}</span>
      </div>
      <p className="text-muted-foreground flex flex-wrap gap-x-2 text-xs">
        {period ? <time dateTime={entry.started_at}>{period}</time> : null}
        <span>{t('domain:times.breakMinutes', { count: entry.break_minutes })}</span>
      </p>
      {note ? (
        <p className="text-foreground text-sm break-words whitespace-pre-wrap">{note}</p>
      ) : null}
    </li>
  );
}

function TimeListSkeleton({ label }: { label: string }) {
  return (
    <div className="flex max-w-3xl flex-col gap-3" role="status">
      <span className="sr-only">{label}</span>
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <Skeleton key={index} className="h-16 rounded-lg" />
      ))}
    </div>
  );
}
