import { SkeletonBlock } from '@bautakt/ui';
import { Button } from '@fluentui/react-components';
import { AddRegular } from '@fluentui/react-icons';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/EmptyState';
import { useAuth } from '@/features/auth/useAuth';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { useMembership } from '@/features/company/useMembership';

import { canCreateDailyReport, canEditDailyReport } from './dailyReportAccess';
import { emptyDailyReport, formatTemperature } from './dailyReportDraft';
import { DailyReportSheet, type OpenDailyReportResult } from './DailyReportSheet';
import {
  type DailyReport,
  type DailyReportLinkCounts,
  draftFromDailyReport,
  formatDailyReportLinkCounts,
  formatReportDate,
  type ReportStaff,
  useOrderDailyReports,
  useReportStaff,
} from './useOrderDailyReports';

const EMPTY_REPORTS: DailyReport[] = [];
const EMPTY_STAFF: ReportStaff[] = [];

const SKELETON_COUNT = 2;

/**
 * Bautagebuch unter den Stammdaten eines Auftrags.
 *
 * Anlegen, Bearbeiten und Löschen laufen über ein Seitenpanel. Wer die
 * Berichte nicht lesen darf, sieht den Block nicht — eine leere Liste wäre
 * dieselbe Fläche wie „noch kein Bericht“, obwohl die Zeilen nur verborgen
 * sind.
 */
export function OrderDailyReports({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: membership } = useMembership();
  const canCreate = canCreateDailyReport(membership?.permissions);
  const reports = useOrderDailyReports(orderId, canCreate);
  const staff = useReportStaff(canCreate);
  const { data, isError, refetch } = reports;
  const isLoading = useCompanyListLoading(reports);
  const [draft, setDraft] = useState<ReturnType<typeof emptyDailyReport> | null>(null);

  if (!canCreate) return null;

  // Solange die Anstellungen fehlen, keine Vorauswahl aus einer leeren Liste.
  const staffLoading = staff.isPending;

  function openNew() {
    if (staffLoading) return;
    const own = staff.data?.find(
      (person) => person.id === membership?.employmentId && !person.endedAt,
    );
    setDraft(emptyDailyReport(orderId, own?.id));
  }

  async function openExisting(reportId: string): Promise<OpenDailyReportResult> {
    const from = (rows: DailyReport[] | undefined) =>
      rows?.find((report) => report.id === reportId);
    let row = from(data);
    if (!row) {
      const result = await refetch();
      row = from(result.data);
    }
    if (!row) return 'missing';
    if (!canEditDailyReport(membership?.permissions, user?.id, row)) return 'denied';
    setDraft(draftFromDailyReport(row));
    return 'opened';
  }

  let body: ReactNode;
  if (isLoading) {
    body = <ReportListSkeleton label={t('common:state.loading')} />;
  } else if (isError) {
    body = (
      <EmptyState
        title={t('domain:orders.dailyReports.loadErrorTitle')}
        description={t('domain:orders.dailyReports.loadErrorDescription')}
        action={
          <button
            type="button"
            className="text-sm font-medium text-brand hover:underline"
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
        title={t('domain:orders.dailyReports.emptyTitle')}
        description={t('domain:orders.dailyReports.emptyDescriptionWrite')}
        action={
          <Button
            appearance="primary"
            size="small"
            onClick={openNew}
            disabled={staffLoading}
            icon={<AddRegular />}
          >
            {t('domain:dailyReportForm.newTitle')}
          </Button>
        }
      />
    );
  } else {
    body = (
      <ul className="flex max-w-3xl flex-col gap-3">
        {data.map((report) => (
          <ReportCard
            key={report.id}
            report={report}
            names={attendanceNames(report, staff.data ?? [])}
            editable={canEditDailyReport(membership?.permissions, user?.id, report)}
            onEdit={() => setDraft(draftFromDailyReport(report))}
          />
        ))}
      </ul>
    );
  }

  return (
    <section className="flex flex-col gap-4" aria-labelledby="order-daily-reports-title">
      <div className="flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2
          id="order-daily-reports-title"
          className="text-foreground text-lg font-semibold tracking-tight"
        >
          {t('domain:orders.dailyReports.title')}
        </h2>
        <Button
          appearance="primary"
          size="small"
          onClick={openNew}
          disabled={staffLoading}
          icon={<AddRegular />}
        >
          {t('domain:dailyReportForm.newTitle')}
        </Button>
      </div>
      {body}
      <DailyReportSheet
        draft={draft}
        open={draft !== null}
        onOpenChange={(open) => !open && setDraft(null)}
        reports={data ?? EMPTY_REPORTS}
        staff={staff.data ?? EMPTY_STAFF}
        staffError={staff.isError}
        staffPending={staff.isPending}
        onOpenExisting={openExisting}
      />
    </section>
  );
}

function attendanceNames(report: DailyReport, staff: { id: string; name: string }[]): string {
  return report.employmentIds
    .map((id) => staff.find((person) => person.id === id)?.name.trim() ?? '')
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'de'))
    .join(', ');
}

function weatherLine(
  report: DailyReport,
  t: (key: string, options: { morning?: string; afternoon?: string }) => string,
): string {
  const morning = [report.weatherMorning, formatTemperature(report.temperatureMorning)]
    .filter(Boolean)
    .join(' ');
  const afternoon = [report.weatherAfternoon, formatTemperature(report.temperatureAfternoon)]
    .filter(Boolean)
    .join(' ');
  if (morning && afternoon) {
    return t('domain:orders.dailyReports.weather', { morning, afternoon });
  }
  if (morning) return t('domain:orders.dailyReports.weatherMorningOnly', { morning });
  if (afternoon) return t('domain:orders.dailyReports.weatherAfternoonOnly', { afternoon });
  return '';
}

function ReportCard({
  report,
  names,
  editable,
  onEdit,
}: {
  report: DailyReport;
  names: string;
  editable: boolean;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const dateLabel = formatReportDate(report.date);
  const weather = weatherLine(report, t);
  const className =
    'flex w-full flex-col gap-1 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-sm transition-colors';

  const content = (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-foreground text-sm font-medium">
          <time dateTime={report.date}>{dateLabel}</time>
        </span>
        {report.author ? (
          <span className="text-muted-foreground text-xs">{report.author}</span>
        ) : null}
      </div>
      {weather ? <p className="text-muted-foreground text-xs">{weather}</p> : null}
      {names ? (
        <p className="text-muted-foreground text-xs">
          {t('domain:orders.dailyReports.attendance', { names })}
        </p>
      ) : null}
      {report.workDone.trim() ? (
        <p className="text-foreground line-clamp-3 text-sm break-words whitespace-pre-wrap">
          {report.workDone.trim()}
        </p>
      ) : null}
      {report.notes.trim() ? (
        <p className="text-muted-foreground text-sm break-words whitespace-pre-wrap">
          {report.notes.trim()}
        </p>
      ) : null}
      <LinkCounts counts={report.links} />
    </>
  );

  return (
    <li>
      {editable ? (
        <button
          type="button"
          className={`${className} cursor-pointer hover:border-border-strong`}
          aria-label={t('domain:orders.dailyReports.openLabel', { date: dateLabel })}
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

function LinkCounts({ counts }: { counts: DailyReportLinkCounts }) {
  const { t } = useTranslation();
  const summary = formatDailyReportLinkCounts(counts, (key, options) => t(key, options));
  if (!summary) return null;
  return <p className="text-muted-foreground text-xs">{summary}</p>;
}

function ReportListSkeleton({ label }: { label: string }) {
  return (
    <div className="flex max-w-3xl flex-col gap-3" role="status">
      <span className="sr-only">{label}</span>
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <SkeletonBlock key={index} className="h-24 rounded-xl" />
      ))}
    </div>
  );
}
