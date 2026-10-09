import { hasPermission } from '@bautakt/core';
import { Badge, Button, Skeleton, Uicon } from '@bautakt/ui';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { useAuth } from '@/features/auth/useAuth';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { useMembership } from '@/features/company/useMembership';
import { useOrders } from '@/features/orders/useOrders';
import { useEmployees } from '@/features/team/useEmployees';
import { formatBreakLabel } from '@/features/times/formatBreakLabel';
import { canCreateTimeEntry, canEditTimeEntry } from '@/features/times/timeEntryAccess';
import {
  draftFromTimeEntry,
  emptyTimeEntry,
  type TimeEntryDraft,
} from '@/features/times/timeEntryDraft';
import { TimeEntrySheet } from '@/features/times/TimeEntrySheet';
import { type TimeEntryListRow, useTimeEntries } from '@/features/times/useTimeEntries';
import { formatDateTimeRange, formatNetDuration } from '@/lib/format';
import { routes } from '@/lib/routes';

const SKELETON_COUNT = 2;

/**
 * Zeiten unter den Stammdaten eines Auftrags, unter den Notizen.
 *
 * Anlegen, Bearbeiten und Löschen laufen über dasselbe Panel wie `/zeiten`.
 * Der Auftrag ist vorbelegt und bleibt dieser. Wer weder eigene Zeit noch
 * Team-Zeit erfassen darf, sieht die Liste nur.
 */
export function OrderTimes({ orderId, orderName }: { orderId: string; orderName: string }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: membership } = useMembership();
  const canCreate = canCreateTimeEntry(membership?.permissions);
  const canTrackForTeam = hasPermission(membership?.permissions, 'canTrackTimeForTeam');
  // Dieselben Abfragen wie das Panel, aber schon mit der Seite. Starten sie
  // erst beim Öffnen, ist der Cache kalt: das Select setzt den vorbelegten
  // Auftrag zurück, und die Mitarbeiter bleiben auf „Wird geladen …“.
  useOrders({ enabled: canCreate });
  useEmployees({ enabled: canCreate });
  const [draft, setDraft] = useState<TimeEntryDraft | null>(null);
  const entries = useTimeEntries(orderId);
  const { data, isError, refetch } = entries;
  const isLoading = useCompanyListLoading(entries);

  function openNew() {
    setDraft(
      emptyTimeEntry({
        orderId,
        orderLabel: orderName,
        lockOrder: true,
        employmentId: canTrackForTeam ? undefined : membership?.employmentId,
      }),
    );
  }

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
        action={
          canCreate ? (
            <Button size="sm" onClick={openNew}>
              <Uicon name="plus" size={16} />
              {t('domain:timeForm.newTitle')}
            </Button>
          ) : undefined
        }
      />
    );
  } else {
    body = (
      <ul className="flex max-w-3xl flex-col gap-3">
        {data.map((entry) => (
          <TimeCard
            key={entry.id}
            entry={entry}
            editable={canEditTimeEntry(membership?.permissions, user?.id, entry)}
            onEdit={() => setDraft(draftFromTimeEntry(entry, { lockOrder: true }))}
          />
        ))}
      </ul>
    );
  }

  return (
    <section className="flex flex-col gap-4" aria-labelledby="order-times-title">
      <div className="flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="order-times-title" className="text-foreground text-lg font-semibold tracking-tight">
          {t('domain:orders.times.title')}
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          {canCreate ? (
            <Button size="sm" onClick={openNew}>
              <Uicon name="plus" size={16} />
              {t('domain:timeForm.newTitle')}
            </Button>
          ) : null}
          <Link
            to={routes.timesForOrder(orderId)}
            className="text-primary text-sm font-medium hover:underline"
          >
            {t('domain:orders.times.all')}
          </Link>
        </div>
      </div>
      {body}
      <TimeEntrySheet
        draft={draft}
        open={draft !== null}
        onOpenChange={(open) => !open && setDraft(null)}
      />
    </section>
  );
}

function TimeCard({
  entry,
  editable,
  onEdit,
}: {
  entry: TimeEntryListRow;
  editable: boolean;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const period = formatDateTimeRange(entry.started_at, entry.ended_at);
  const duration =
    formatNetDuration(entry.started_at, entry.ended_at, entry.break_minutes) ||
    t('domain:times.noEnd');
  const pause = formatBreakLabel(entry.break_minutes, t);
  const note = entry.note.trim();
  const className =
    'flex w-full flex-col gap-1 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-sm transition-colors';

  const content = (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-foreground flex flex-wrap items-center gap-2 text-sm font-medium">
          {entry.employee_name || t('domain:times.noEmployee')}
          {entry.billed ? <Badge variant="muted">{t('domain:times.billed')}</Badge> : null}
        </span>
        <span className="text-muted-foreground text-sm whitespace-nowrap">{duration}</span>
      </div>
      {period || pause ? (
        <p className="text-muted-foreground flex flex-wrap gap-x-2 text-xs">
          {period ? <time dateTime={entry.started_at}>{period}</time> : null}
          {pause ? <span>{pause}</span> : null}
        </p>
      ) : null}
      {note ? (
        <p className="text-foreground text-sm break-words whitespace-pre-wrap">{note}</p>
      ) : null}
    </>
  );

  return (
    <li>
      {editable ? (
        <button
          type="button"
          className={`${className} cursor-pointer hover:border-border-strong`}
          onClick={onEdit}
        >
          {content}
        </button>
      ) : (
        <div className={className}>{content}</div>
      )}
    </li>
  );
}

function TimeListSkeleton({ label }: { label: string }) {
  return (
    <div className="flex max-w-3xl flex-col gap-3" role="status">
      <span className="sr-only">{label}</span>
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <Skeleton key={index} className="h-16 rounded-xl" />
      ))}
    </div>
  );
}
