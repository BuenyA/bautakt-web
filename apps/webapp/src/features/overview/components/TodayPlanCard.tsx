import { SkeletonBlock } from '@bautakt/ui';
import { Badge, Card, CardHeader, Divider, MessageBar, Text } from '@fluentui/react-components';
import { CalendarRegular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { RouterLink } from '@/components/common/RouterLink';
import { useRouterLink } from '@/components/common/useRouterLink';
import { useMediaQuery } from '@/components/layout/useMediaQuery';
import { formatDate, formatTime } from '@/lib/format';
import { routes } from '@/lib/routes';

import type { OverviewAbsence, TodayAssignment, TodayEvent } from '../useTodayData';
import { CrewAvatars, MemberAvatar } from './CrewAvatars';
import { DayTimeline } from './DayTimeline';
import { COLUMN_SCROLL } from './layout';
import { useNow } from './useNow';

/**
 * „Heute“: wer fehlt, was ganztägig ansteht, und der Tag als Zeitleiste
 * (am Handy als Liste). Das Herz der Übersicht — deshalb oben und breit.
 */
export function TodayPlanCard({
  assignments,
  events,
  absences,
  urls,
  isLoading,
  isError,
}: {
  assignments: readonly TodayAssignment[];
  events: readonly TodayEvent[];
  absences: readonly OverviewAbsence[];
  urls: Record<string, string>;
  isLoading: boolean;
  isError: boolean;
}) {
  const { t } = useTranslation();
  const now = useNow();
  const isMobile = useMediaQuery('(max-width: 767px)');

  const allDay = events.filter((event) => event.allDay);
  const timed = events.filter((event) => !event.allDay);
  // Ein leerer Tag zeigt die leere Zeitleiste, keinen Hinweis: das hier ist
  // nur der Kalender, das Planen gehört in den Einsatzplan.
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

      <div className={COLUMN_SCROLL}>
        {absences.length > 0 || allDay.length > 0 ? (
          <div className="flex flex-col gap-2">
            {absences.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <Text size={200} weight="semibold" className="text-text-secondary">
                  {t('domain:overview.today.absent')}
                </Text>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
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
              </div>
            ) : null}
            {allDay.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <Text size={200} weight="semibold" className="text-text-secondary">
                  {t('domain:overview.today.allDay')}
                </Text>
                <div className="flex flex-wrap items-center gap-2">
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
              </div>
            ) : null}
            <Divider />
          </div>
        ) : null}

        {isError ? (
          <MessageBar intent="error">{t('domain:overview.today.loadError')}</MessageBar>
        ) : isLoading ? (
          <SkeletonBlock className="h-72 w-full" />
        ) : isMobile && !isEmpty ? (
          <TodayList assignments={assignments} events={timed} urls={urls} />
        ) : (
          <DayTimeline assignments={assignments} events={timed} now={now} />
        )}
      </div>
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
