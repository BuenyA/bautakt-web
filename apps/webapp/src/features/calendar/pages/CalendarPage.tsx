import { cn } from '@bautakt/ui';
import { Button, MessageBar, Tab, TabList } from '@fluentui/react-components';
import { AddRegular, ChevronLeftRegular, ChevronRightRegular } from '@fluentui/react-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { PageHeader } from '@/components/common/PageHeader';
import { PageSpinner } from '@/components/common/PageSpinner';
import { FILL_VIEWPORT_SM } from '@/components/layout/fillViewport';
import { useAssignments } from '@/features/assignments/useAssignments';
import { useAuth } from '@/features/auth/useAuth';
import { useMembership } from '@/features/company/useMembership';
import { usePermission } from '@/features/company/usePermission';
import { useNow } from '@/features/overview/components/useNow';
import { useAbsences } from '@/features/team/useAbsences';

import { CalendarEventSheet } from '../CalendarEventSheet';
import {
  addDays,
  combineLocal,
  localIsoDay,
  monthGridDays,
  type Occurrence,
  parseIsoDay,
  startOfWeek,
} from '../calendarModel';
import { CalendarSettingsPopover } from '../components/CalendarSettingsPopover';
import type { CalendarEntry } from '../components/entries';
import { ToneColorsContext } from '../components/entryStyles';
import { MonthView } from '../components/MonthView';
import { TimeGridView } from '../components/TimeGridView';
import { YearView } from '../components/YearView';
import { type CalendarEventDraft, draftFromOccurrence, emptyEventDraft } from '../eventDraft';
import { useCalendarEvents } from '../useCalendarEvents';
import { useCalendarSettings } from '../useCalendarSettings';

type View = 'jahr' | 'monat' | 'woche' | 'tag';
const VIEWS: readonly View[] = ['jahr', 'monat', 'woche', 'tag'];
const VIEW_STORAGE_PREFIX = 'bautakt-calendar-view:';
/** Abwesenheiten, die im Kalender stehen: genehmigt oder noch offen, nicht abgelehnt. */
const SHOWN_ABSENCE = new Set(['genehmigt', 'ausstehend']);

function isView(value: string | null): value is View {
  return VIEWS.includes(value as View);
}

/** Zuletzt gewählte Ansicht dieses Nutzers in diesem Browser, sonst die Woche. */
function readStoredView(userKey: string): View {
  try {
    const stored = window.localStorage.getItem(VIEW_STORAGE_PREFIX + userKey);
    return isView(stored) ? stored : 'woche';
  } catch {
    return 'woche';
  }
}

function writeStoredView(userKey: string, view: View) {
  try {
    window.localStorage.setItem(VIEW_STORAGE_PREFIX + userKey, view);
  } catch {
    // Ohne Storage (privates Fenster) gilt die Wahl nur, solange die URL sie trägt.
  }
}

function dayFromSearch(value: string | null): string {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : localIsoDay(new Date());
}

/** Sichtbare Tage und Zeitraum für die Abfrage. */
function rangeOf(view: View, dayIso: string): { days: string[]; from: Date; to: Date } {
  const date = parseIsoDay(dayIso);
  let days: string[];
  if (view === 'jahr') {
    const year = date.getFullYear();
    return { days: [], from: new Date(year, 0, 1), to: new Date(year, 11, 31, 23, 59, 59) };
  }
  if (view === 'monat') days = monthGridDays(date.getFullYear(), date.getMonth());
  else if (view === 'woche') {
    const monday = startOfWeek(dayIso);
    days = Array.from({ length: 7 }, (_, index) => addDays(monday, index));
  } else days = [dayIso];
  return {
    days,
    from: parseIsoDay(days[0]),
    to: combineLocal(days[days.length - 1], '23:59'),
  };
}

function shiftDay(view: View, dayIso: string, direction: 1 | -1): string {
  const date = parseIsoDay(dayIso);
  if (view === 'jahr')
    return localIsoDay(new Date(date.getFullYear() + direction, date.getMonth(), 1));
  if (view === 'monat')
    return localIsoDay(new Date(date.getFullYear(), date.getMonth() + direction, 1));
  return addDays(dayIso, view === 'woche' ? 7 * direction : direction);
}

function rangeLabel(view: View, dayIso: string, days: readonly string[]): string {
  const date = parseIsoDay(dayIso);
  if (view === 'jahr') return String(date.getFullYear());
  if (view === 'monat') {
    return new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(date);
  }
  if (view === 'tag') {
    return new Intl.DateTimeFormat('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }
  const short = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' });
  const long = new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return `${short.format(parseIsoDay(days[0]))} bis ${long.format(parseIsoDay(days[6]))}`;
}

/**
 * Kalender wie in der Handy-App: Jahr, Monat, Woche, Tag. Zeigt Termine
 * (`calendar_events`, privat und Firma), Einsätze und die eigenen
 * Abwesenheiten. Farbe und Sichtbarkeit je Art stehen hinter dem Zahnrad
 * (`useCalendarSettings`). Termine lassen sich hier anlegen, ändern und löschen.
 *
 * Ansicht und Datum stehen in der URL (`?ansicht=monat&datum=2026-10-12`),
 * damit ein Neuladen dieselbe Stelle zeigt. Ohne Ansicht in der URL gilt die
 * zuletzt gewählte (localStorage je Nutzer, wie `useCalendarSettings`), sonst
 * die Woche; ohne Datum heute.
 */
export function CalendarPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: membership } = useMembership();
  const canManageAll = usePermission('canManageAllCalendar');
  const now = useNow();
  const todayIso = localIsoDay(now);
  const [searchParams, setSearchParams] = useSearchParams();
  const userKey = user?.id ?? 'anon';
  const [storedView] = useState(() => readStoredView(userKey));
  const viewParam = searchParams.get('ansicht');
  const view = isView(viewParam) ? viewParam : storedView;
  const dayIso = dayFromSearch(searchParams.get('datum'));
  const [draft, setDraft] = useState<CalendarEventDraft | null>(null);

  const { days, from, to } = useMemo(() => rangeOf(view, dayIso), [view, dayIso]);
  const events = useCalendarEvents(from, to);
  const assignments = useAssignments(from, to);
  const absences = useAbsences();
  const { settings, setColor, setShow } = useCalendarSettings();
  const show = settings.show;

  function go(nextView: View, nextDay: string) {
    const params = new URLSearchParams(searchParams);
    // Immer ausdrücklich: Ohne Parameter griffe sonst die gespeicherte Ansicht.
    params.set('ansicht', nextView);
    writeStoredView(userKey, nextView);
    if (nextDay === todayIso) params.delete('datum');
    else params.set('datum', nextDay);
    setSearchParams(params, { replace: true });
  }

  const entries = useMemo<CalendarEntry[]>(() => {
    const fromMs = from.getTime();
    const toMs = to.getTime();
    const inRange = (startsAt: string, endsAt: string) =>
      new Date(startsAt).getTime() <= toMs && new Date(endsAt).getTime() >= fromMs;

    const list: CalendarEntry[] = (events.data?.occurrences ?? [])
      .filter((occurrence) => show[occurrence.eventType])
      .map((occurrence) => ({
        key: `e-${occurrence.key}`,
        kind: 'event',
        tone: occurrence.eventType,
        title: occurrence.title.trim() || t('domain:calendar.untitled'),
        startsAt: occurrence.startsAt,
        endsAt: occurrence.endsAt,
        allDay: occurrence.allDay,
        occurrence,
      }));

    for (const assignment of show.assignment ? (assignments.data ?? []) : []) {
      if (!inRange(assignment.starts_at, assignment.ends_at)) continue;
      list.push({
        key: `a-${assignment.id}`,
        kind: 'assignment',
        tone: 'assignment',
        title: assignment.order_name || t('domain:assignments.noOrder'),
        startsAt: assignment.starts_at,
        endsAt: assignment.ends_at,
        allDay: false,
        assignmentId: assignment.id,
      });
    }

    // Wie in der App nur die eigenen Abwesenheiten: der Kalender ist persönlich,
    // wer sonst fehlt, steht in „Abwesenheiten“ und auf der Übersicht.
    for (const absence of show.absence ? (absences.data ?? []) : []) {
      if (absence.employment_id !== membership?.employmentId) continue;
      if (!SHOWN_ABSENCE.has(absence.status)) continue;
      const startsAt = combineLocal(absence.start_date, '00:00').toISOString();
      const endsAt = combineLocal(absence.end_date, '23:59').toISOString();
      if (!inRange(startsAt, endsAt)) continue;
      list.push({
        key: `x-${absence.id}`,
        kind: 'absence',
        tone: 'absence',
        title: t(`domain:absences.types.${absence.type}`, { defaultValue: absence.type }),
        startsAt,
        endsAt,
        allDay: true,
        pending: absence.status === 'ausstehend',
      });
    }
    return list;
  }, [events.data, assignments.data, show, absences.data, membership?.employmentId, from, to, t]);

  function openEvent(occurrence: Occurrence) {
    const master = events.data?.rows.find((row) => row.id === occurrence.masterId);
    setDraft(draftFromOccurrence(occurrence, master?.starts_at ?? null));
  }

  const readOnly = Boolean(
    draft?.occurrence &&
    (draft.occurrence.eventType === 'all' ? !canManageAll : draft.occurrence.userId !== user?.id),
  );

  const isLoading = events.isPending || (show.assignment && assignments.isPending);

  // Tag, Woche und Monat reichen bis zum unteren Fensterrand; das Jahr ist eine
  // lange Liste von Monaten und läuft mit der Seite.
  const fillViewport = view !== 'jahr';

  return (
    <div className={cn('flex flex-col gap-6', fillViewport && FILL_VIEWPORT_SM)}>
      <PageHeader
        title={t('domain:calendar.title')}
        description={t('domain:calendar.description')}
        actions={
          <Button
            appearance="primary"
            icon={<AddRegular />}
            onClick={() =>
              setDraft(emptyEventDraft(view === 'jahr' || view === 'monat' ? todayIso : dayIso))
            }
          >
            {t('domain:calendar.newEvent')}
          </Button>
        }
      />

      {/* Werkzeugleiste und Raster enger zusammen; das Raster füllt den Rest
          der Seite bis zum Fensterrand und scrollt in sich. */}
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabList
            size="small"
            selectedValue={view}
            onTabSelect={(_, data) => go(data.value as View, dayIso)}
            aria-label={t('domain:calendar.viewLabel')}
          >
            {VIEWS.map((value) => (
              <Tab key={value} value={value}>
                {t(`domain:calendar.views.${value}`)}
              </Tab>
            ))}
          </TabList>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              aria-label={t('domain:calendar.previous')}
              onClick={() => go(view, shiftDay(view, dayIso, -1))}
              icon={<ChevronLeftRegular />}
            />
            <span className="min-w-0 flex-1 truncate text-center text-sm font-medium capitalize sm:min-w-44 sm:flex-none">
              {rangeLabel(view, dayIso, days)}
            </span>
            <Button
              aria-label={t('domain:calendar.next')}
              onClick={() => go(view, shiftDay(view, dayIso, 1))}
              icon={<ChevronRightRegular />}
            />
            <Button onClick={() => go(view, todayIso)}>{t('domain:calendar.today')}</Button>
            <CalendarSettingsPopover
              settings={settings}
              onColorChange={setColor}
              onShowChange={setShow}
            />
          </div>
        </div>

        {events.isError ? (
          <MessageBar intent="error">{t('domain:calendar.loadError')}</MessageBar>
        ) : null}

        <ToneColorsContext value={settings.colors}>
          {isLoading ? (
            <PageSpinner />
          ) : view === 'jahr' ? (
            <YearView
              year={parseIsoDay(dayIso).getFullYear()}
              todayIso={todayIso}
              entries={entries}
              onOpenDay={(iso) => go('tag', iso)}
              onOpenMonth={(month) =>
                go('monat', localIsoDay(new Date(parseIsoDay(dayIso).getFullYear(), month, 1)))
              }
            />
          ) : view === 'monat' ? (
            <MonthView
              days={days}
              month={parseIsoDay(dayIso).getMonth()}
              todayIso={todayIso}
              entries={entries}
              onOpenEvent={openEvent}
              onCreate={(iso) => setDraft(emptyEventDraft(iso))}
              onOpenDay={(iso) => go('tag', iso)}
            />
          ) : (
            <TimeGridView
              key={`${view}-${days[0]}`}
              days={days}
              todayIso={todayIso}
              now={now}
              entries={entries}
              onOpenEvent={openEvent}
              onCreate={(iso, hour) => setDraft(emptyEventDraft(iso, hour))}
              onOpenDay={(iso) => go('tag', iso)}
            />
          )}
        </ToneColorsContext>
      </div>

      <CalendarEventSheet
        draft={draft}
        canManageAll={canManageAll}
        readOnly={readOnly}
        onOpenChange={(open) => !open && setDraft(null)}
      />
    </div>
  );
}
