import { cn, SkeletonBlock, StatusBadge } from '@bautakt/ui';
import { Card, Link as FluentLink } from '@fluentui/react-components';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LinkButton } from '@/components/common/LinkButton';
import { useRouterLink } from '@/components/common/useRouterLink';
import { SectionCard } from '@/features/contacts/SectionCard';
import { formatMinutesAsHours, netMinutes } from '@/features/times/timeTotals';
import type { TimeEntryListRow } from '@/features/times/useTimeEntries';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';

import { absenceStatusTone } from './absenceValues';
import { absenceDays, type EmployeeOrder } from './employeeProfileStats';
import type { AbsenceRow } from './useAbsences';

/** Eine Kennzahl oben auf der Mitarbeiterseite, im Stil der Auswertungen. */
export function Figure({
  label,
  value,
  note,
  tone,
  isLoading,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: 'destructive';
  isLoading?: boolean;
}) {
  return (
    <li className="min-w-0">
      <Card className="h-full">
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground text-xs">{label}</span>
          {isLoading ? (
            <SkeletonBlock className="my-1 h-7 w-28" />
          ) : (
            <span className="text-foreground text-xl font-semibold tabular-nums">{value}</span>
          )}
          {note && !isLoading ? (
            <span
              className={cn(
                'text-xs',
                tone === 'destructive' ? 'text-destructive' : 'text-text-subtle',
              )}
            >
              {note}
            </span>
          ) : null}
        </div>
      </Card>
    </li>
  );
}

/**
 * Fehlzeiten des Jahres: je Art die Tage, darunter die letzten Einträge.
 * Abgelehnte und stornierte zählen nicht.
 */
export function AbsencesCard({
  absences,
  year,
  countWeekends,
  action,
}: {
  absences: AbsenceRow[];
  year: number;
  countWeekends: boolean;
  action?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const counted = absences.filter(
    (absence) =>
      absence.start_date.startsWith(String(year)) &&
      absence.status !== 'abgelehnt' &&
      absence.status !== 'storniert',
  );
  const byType = new Map<string, number>();
  for (const absence of counted) {
    byType.set(absence.type, (byType.get(absence.type) ?? 0) + absenceDays(absence, countWeekends));
  }
  const recent = absences.slice(0, 4);

  return (
    <SectionCard
      title={t('domain:employeeProfile.absences.title', { year })}
      action={
        <>
          {action}
          <LinkButton to={routes.absences} appearance="secondary" size="small">
            {t('domain:employeeProfile.absences.showAll')}
          </LinkButton>
        </>
      }
    >
      {counted.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {t('domain:employeeProfile.absences.empty')}
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {[...byType.entries()].map(([type, days]) => (
            <li key={type} className="bg-muted rounded-md px-3 py-1.5 text-sm">
              <span className="text-foreground">
                {t(`domain:absences.types.${type}`, { defaultValue: type })}
              </span>
              <span className="text-muted-foreground">
                {' · '}
                {t('domain:employeeProfile.absences.days', { count: days })}
              </span>
            </li>
          ))}
        </ul>
      )}

      {recent.length > 0 ? (
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs">
            {t('domain:employeeProfile.absences.recent')}
          </span>
          <ul className="divide-border flex flex-col divide-y">
            {recent.map((absence) => (
              <AbsenceLine key={absence.id} absence={absence} />
            ))}
          </ul>
        </div>
      ) : null}
    </SectionCard>
  );
}

function AbsenceLine({ absence }: { absence: AbsenceRow }) {
  const { t } = useTranslation();
  const link = useRouterLink(routes.absence(absence.id));
  const range =
    absence.start_date === absence.end_date
      ? formatDate(absence.start_date)
      : `${formatDate(absence.start_date)} – ${formatDate(absence.end_date)}`;
  return (
    <li>
      <a
        href={link.href}
        onClick={link.onClick}
        className="hover:bg-muted -mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm"
      >
        <span className="min-w-0">
          <span className="text-foreground">
            {t(`domain:absences.types.${absence.type}`, { defaultValue: absence.type })}
          </span>
          <span className="text-muted-foreground"> · {range}</span>
        </span>
        <StatusBadge tone={absenceStatusTone(absence.status)}>
          {t(`domain:absences.status.${absence.status}`, { defaultValue: absence.status })}
        </StatusBadge>
      </a>
    </li>
  );
}

const VISIBLE_ORDERS = 6;

export function OrdersCard({ orders }: { orders: EmployeeOrder[] }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? orders : orders.slice(0, VISIBLE_ORDERS);
  const hidden = orders.length - shown.length;

  return (
    <SectionCard title={t('domain:employeeProfile.orders.title')}>
      {orders.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('domain:employeeProfile.orders.empty')}</p>
      ) : (
        <ul className="divide-border flex flex-col divide-y">
          {shown.map((order) => (
            <OrderLine key={order.orderId} order={order} />
          ))}
        </ul>
      )}
      {hidden > 0 ? (
        <div>
          <FluentLink as="button" onClick={() => setExpanded(true)}>
            {t('domain:employeeProfile.orders.more', { count: hidden })}
          </FluentLink>
        </div>
      ) : null}
    </SectionCard>
  );
}

function OrderLine({ order }: { order: EmployeeOrder }) {
  const { t } = useTranslation();
  const link = useRouterLink(routes.order(order.orderId));
  return (
    <li>
      <a
        href={link.href}
        onClick={link.onClick}
        className="hover:bg-muted -mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm"
      >
        <span className="min-w-0">
          <span className="text-foreground block truncate font-medium">{order.name || '—'}</span>
          <span className="text-muted-foreground text-xs">
            {t('domain:employeeProfile.orders.lastOn', { date: formatDate(order.lastAt) })}
          </span>
        </span>
        {order.minutes > 0 ? (
          <span className="text-muted-foreground shrink-0 tabular-nums">
            {formatMinutesAsHours(order.minutes)}
          </span>
        ) : null}
      </a>
    </li>
  );
}

/** Zeiten klein: Summen und die letzten Einträge, ohne Bearbeiten. */
export function TimesCard({
  entries,
  weekMinutes,
  monthMinutes,
}: {
  entries: TimeEntryListRow[];
  weekMinutes: number;
  monthMinutes: number;
}) {
  const { t } = useTranslation();
  const recent = entries.slice(0, 4);

  return (
    <SectionCard title={t('domain:employeeProfile.times.title')}>
      <dl className="grid grid-cols-2 gap-3">
        <div className="bg-muted rounded-md px-3 py-2">
          <dt className="text-muted-foreground text-xs">
            {t('domain:employeeProfile.times.week')}
          </dt>
          <dd className="text-foreground font-semibold tabular-nums">
            {formatMinutesAsHours(weekMinutes)}
          </dd>
        </div>
        <div className="bg-muted rounded-md px-3 py-2">
          <dt className="text-muted-foreground text-xs">
            {t('domain:employeeProfile.times.month')}
          </dt>
          <dd className="text-foreground font-semibold tabular-nums">
            {formatMinutesAsHours(monthMinutes)}
          </dd>
        </div>
      </dl>

      {recent.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('domain:employeeProfile.times.empty')}</p>
      ) : (
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs">
            {t('domain:employeeProfile.times.recent')}
          </span>
          <ul className="divide-border flex flex-col divide-y">
            {recent.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate">
                  <span className="text-foreground">{formatDate(entry.started_at)}</span>
                  <span className="text-muted-foreground"> · {entry.order_name || '—'}</span>
                </span>
                <span className="text-muted-foreground shrink-0 tabular-nums">
                  {formatMinutesAsHours(netMinutes(entry))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}
