import { SkeletonBlock } from '@bautakt/ui';
import { Badge, Card, CardHeader, Divider, MessageBar, Text } from '@fluentui/react-components';
import { AddRegular, CalendarRegular, WeatherSunnyRegular } from '@fluentui/react-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LinkButton } from '@/components/common/LinkButton';
import { RouterLink } from '@/components/common/RouterLink';
import { useRouterLink } from '@/components/common/useRouterLink';
import { useMediaQuery } from '@/components/layout/useMediaQuery';
import { formatDate, formatTime } from '@/lib/format';
import { routes, withCreate } from '@/lib/routes';

import type { OverviewAbsence, TodayAssignment, TodayEvent } from '../useTodayData';
import { CrewAvatars, MemberAvatar } from './CrewAvatars';
import { DayTimeline } from './DayTimeline';

/** Die Uhrzeit für die Jetzt-Linie; jede Minute neu. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/**
 * „Heute“: wer fehlt, was ganztägig ansteht, und der Tag als Zeitleiste
 * (am Handy als Liste). Das Herz der Übersicht — deshalb oben und breit.
 */
export function TodayPlanCard({
  assignments,
  events,
  absences,
  urls,
  canPlan,
  isLoading,
  isError,
}: {
  assignments: readonly TodayAssignment[];
  events: readonly TodayEvent[];
  absences: readonly OverviewAbsence[];
  urls: Record<string, string>;
  canPlan: boolean;
  isLoading: boolean;
  isError: boolean;
}) {
  const { t } = useTranslation();
  const now = useNow();
  const isMobile = useMediaQuery('(max-width: 767px)');

  const allDay = events.filter((event) => event.allDay);
  const timed = events.filter((event) => !event.allDay);
  const isEmpty = assignments.length === 0 && timed.length === 0;

  return (
    <Card size="large" className="h-full" id="heute">
      <CardHeader
        image={<CalendarRegular fontSize={20} aria-hidden />}
        header={
          <Text as="h2" weight="semibold" size={400}>
            {t('domain:overview.today.title')}
          </Text>
        }
        action={
          <RouterLink to={routes.calendar}>{t('domain:overview.today.toCalendar')}</RouterLink>
        }
      />

      {absences.length > 0 || allDay.length > 0 ? (
        <div className="flex flex-col gap-2">
          {absences.length > 0 ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Text size={200} weight="semibold" className="text-text-secondary">
                {t('domain:overview.today.absent')}
              </Text>
              {absences.map((absence) => (
                <span key={absence.id} className="flex items-center gap-2">
                  <MemberAvatar member={absence.member} urls={urls} size={24} />
                  <span className="flex flex-col leading-tight">
                    <Text size={200} weight="semibold">
                      {absence.member.name}
                    </Text>
                    <Text size={100} className="text-text-secondary">
                      {t(`domain:absences.types.${absence.type}`)}
                      {absence.endDate !== absence.startDate
                        ? ` · ${t('domain:overview.today.untilDate', { date: formatDate(absence.endDate) })}`
                        : ''}
                    </Text>
                  </span>
                  {absence.status === 'ausstehend' ? (
                    <Badge appearance="tint" color="warning" size="small">
                      {t('domain:overview.today.pendingSick')}
                    </Badge>
                  ) : null}
                </span>
              ))}
            </div>
          ) : null}
          {allDay.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <Text size={200} weight="semibold" className="text-text-secondary">
                {t('domain:overview.today.allDay')}
              </Text>
              {allDay.map((event) => (
                <Badge
                  key={event.id}
                  appearance="tint"
                  color={event.eventType === 'all' ? 'warning' : 'informative'}
                  shape="rounded"
                >
                  {event.title}
                </Badge>
              ))}
            </div>
          ) : null}
          <Divider />
        </div>
      ) : null}

      {isError ? (
        <MessageBar intent="error">{t('domain:overview.today.loadError')}</MessageBar>
      ) : isLoading ? (
        <SkeletonBlock className="h-72 w-full" />
      ) : isEmpty ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
            <WeatherSunnyRegular fontSize={24} aria-hidden />
          </span>
          <Text weight="semibold">{t('domain:overview.today.emptyTitle')}</Text>
          <Text size={200} className="text-muted-foreground">
            {t('domain:overview.today.emptyDescription')}
          </Text>
          {canPlan ? (
            <LinkButton
              to={withCreate(routes.assignments)}
              appearance="primary"
              icon={<AddRegular />}
              className="mt-2"
            >
              {t('domain:overview.today.plan')}
            </LinkButton>
          ) : null}
        </div>
      ) : isMobile ? (
        <TodayList assignments={assignments} events={timed} urls={urls} />
      ) : (
        <DayTimeline assignments={assignments} events={timed} urls={urls} now={now} />
      )}
    </Card>
  );
}

/** Schmale Bildschirme: dieselben Einträge als Liste, nach Beginn sortiert. */
function TodayList({
  assignments,
  events,
  urls,
}: {
  assignments: readonly TodayAssignment[];
  events: readonly TodayEvent[];
  urls: Record<string, string>;
}) {
  const entries = [
    ...assignments.map((item) => ({ kind: 'assignment' as const, at: item.startsAt, item })),
    ...events.map((item) => ({ kind: 'event' as const, at: item.startsAt, item })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  return (
    <ul className="flex flex-col">
      {entries.map((entry) =>
        entry.kind === 'assignment' ? (
          <AssignmentRow key={`a-${entry.item.id}`} item={entry.item} urls={urls} />
        ) : (
          <li
            key={`e-${entry.item.id}`}
            className="border-border flex items-center gap-3 border-b py-3 last:border-b-0"
          >
            <Text size={200} className="text-text-secondary w-24 shrink-0 tabular-nums">
              {formatTime(entry.item.startsAt)}
            </Text>
            <CalendarRegular fontSize={16} aria-hidden />
            <Text size={300} className="min-w-0 flex-1" truncate wrap={false}>
              {entry.item.title}
            </Text>
          </li>
        ),
      )}
    </ul>
  );
}

function AssignmentRow({ item, urls }: { item: TodayAssignment; urls: Record<string, string> }) {
  const { t } = useTranslation();
  const link = useRouterLink(routes.assignment(item.id));
  return (
    <li className="border-border border-b last:border-b-0">
      <a href={link.href} onClick={link.onClick} className="flex items-center gap-3 py-3">
        <Text size={200} className="text-text-secondary w-24 shrink-0 tabular-nums">
          {formatTime(item.startsAt)}–{formatTime(item.endsAt)}
        </Text>
        <span className="flex min-w-0 flex-1 flex-col">
          <Text weight="semibold" truncate wrap={false}>
            {item.orderName}
          </Text>
          <Text size={200} className="text-text-secondary" truncate wrap={false}>
            {item.location || (item.crew.length === 0 ? t('domain:overview.today.noCrew') : '')}
          </Text>
        </span>
        {item.crew.length > 0 ? <CrewAvatars crew={item.crew} urls={urls} size={24} /> : null}
      </a>
    </li>
  );
}
