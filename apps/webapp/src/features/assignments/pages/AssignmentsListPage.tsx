import { Button, Link as FluentLink } from '@fluentui/react-components';
import { AddRegular, ChevronLeftRegular, ChevronRightRegular } from '@fluentui/react-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSpinner } from '@/components/common/PageSpinner';
import { useCreateFromUrl } from '@/components/common/useCreateFromUrl';
import {
  addDays,
  combineLocal,
  localIsoDay,
  parseIsoDay,
  startOfWeek,
} from '@/features/calendar/calendarModel';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { usePermission } from '@/features/company/usePermission';
import { useNow } from '@/features/overview/components/useNow';
import { useProfileImageUrls } from '@/features/team/useProfileImageUrls';

import { AssignmentSheet } from '../AssignmentSheet';
import { AssignmentWeekView } from '../components/AssignmentWeekView';
import { useAssignments } from '../useAssignments';

/** Montag der Woche aus `?woche=YYYY-MM-DD`; ohne oder ungültig: diese Woche. */
function mondayFromSearch(value: string | null, todayIso: string): string {
  return startOfWeek(value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : todayIso);
}

/** „6.–12. Oktober 2026“, über Monats- oder Jahresgrenzen mit beiden Angaben. */
function weekLabel(monday: string): string {
  const start = parseIsoDay(monday);
  const end = parseIsoDay(addDays(monday, 6));
  const full = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
  if (start.getFullYear() !== end.getFullYear()) {
    return `${full.format(start)} – ${full.format(end)}`;
  }
  if (start.getMonth() !== end.getMonth()) {
    const dayMonth = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long' });
    return `${dayMonth.format(start)} – ${full.format(end)}`;
  }
  return `${start.getDate()}.–${full.format(end)}`;
}

/** Die sieben Tage ab Montag und der Zeitraum für die Abfrage. */
function weekRange(monday: string): { days: string[]; from: Date; to: Date } {
  const days = Array.from({ length: 7 }, (_, index) => addDays(monday, index));
  return { days, from: parseIsoDay(days[0]), to: combineLocal(days[6], '23:59') };
}

/**
 * Einsatzplanung als Wochenplan: wer wann auf welcher Baustelle ist. Die
 * Woche steht in der URL (`?woche=2026-10-05`), damit Neuladen und Zurück
 * dieselbe Woche zeigen; die aktuelle Woche braucht keinen Parameter.
 */
export function AssignmentsListPage() {
  const { t } = useTranslation();
  const canManage = usePermission('canManageWorkAssignments');
  const now = useNow();
  const todayIso = localIsoDay(now);
  const [searchParams, setSearchParams] = useSearchParams();
  const monday = mondayFromSearch(searchParams.get('woche'), todayIso);
  const [sheet, setSheet] = useState<{ dayIso: string; hour: number } | 'plain' | null>(null);
  // `?neu=1` aus der Schnellsuche öffnet das Anlege-Panel.
  useCreateFromUrl(canManage, () => setSheet('plain'));

  const { days, from, to } = weekRange(monday);
  const assignments = useAssignments(from, to);
  const { data, isError, refetch } = assignments;
  const isLoading = useCompanyListLoading(assignments);
  const urls =
    useProfileImageUrls(
      (data ?? []).flatMap((assignment) => assignment.crew.map((member) => member.imagePath)),
    ).data ?? {};

  function goToWeek(nextMonday: string) {
    const params = new URLSearchParams(searchParams);
    if (nextMonday === startOfWeek(todayIso)) params.delete('woche');
    else params.set('woche', nextMonday);
    setSearchParams(params, { replace: true });
  }

  const header = (
    <PageHeader
      title={t('domain:assignments.listTitle')}
      description={t('domain:assignments.listDescription')}
      actions={
        canManage ? (
          <Button appearance="primary" onClick={() => setSheet('plain')} icon={<AddRegular />}>
            {t('domain:assignments.create.action')}
          </Button>
        ) : null
      }
    />
  );

  if (isError) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <EmptyState
          title={t('domain:assignments.loadErrorTitle')}
          description={t('domain:assignments.loadErrorDescription')}
          action={
            <FluentLink as="button" onClick={() => void refetch()}>
              {t('common:action.retry')}
            </FluentLink>
          }
        />
      </div>
    );
  }

  const isThisWeek = monday === startOfWeek(todayIso);

  return (
    <div className="flex flex-col gap-6">
      {header}

      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label={t('domain:assignments.week.label')}
      >
        <Button
          aria-label={t('domain:assignments.week.previous')}
          onClick={() => goToWeek(addDays(monday, -7))}
          icon={<ChevronLeftRegular />}
        />
        <Button
          aria-label={t('domain:assignments.week.next')}
          onClick={() => goToWeek(addDays(monday, 7))}
          icon={<ChevronRightRegular />}
        />
        <Button onClick={() => goToWeek(startOfWeek(todayIso))} disabled={isThisWeek}>
          {t('domain:assignments.week.thisWeek')}
        </Button>
        <h2 className="text-foreground ml-1 text-base font-semibold sm:text-lg">
          {weekLabel(monday)}
        </h2>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : (
        <AssignmentWeekView
          key={monday}
          days={days}
          todayIso={todayIso}
          now={now}
          assignments={data ?? []}
          urls={urls}
          onCreate={canManage ? (dayIso, hour) => setSheet({ dayIso, hour }) : undefined}
        />
      )}

      <AssignmentSheet
        open={sheet !== null}
        onOpenChange={(open) => !open && setSheet(null)}
        initial={sheet && sheet !== 'plain' ? sheet : undefined}
        // Im Wochenplan bleiben: der neue Block erscheint direkt im Raster.
        onCreated={sheet && sheet !== 'plain' ? () => undefined : undefined}
      />
    </div>
  );
}
