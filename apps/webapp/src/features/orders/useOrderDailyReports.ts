import { formatIsoDateDe } from '@bautakt/finance';
import { useQuery } from '@tanstack/react-query';

import { useMembership } from '@/features/company/useMembership';
import { toTimeInput } from '@/features/times/timeEntryDraft';
import { employmentDisplayName } from '@/lib/employeeName';
import { supabase } from '@/lib/supabase';

import {
  type DailyReportAttendance,
  type DailyReportDraft,
  isDailyReportDate,
  temperatureToInput,
} from './dailyReportDraft';

export type ReportStaff = {
  id: string;
  name: string;
  role: string;
  userId: string | null;
  endedAt: string | null;
};

export type DailyReportTime = {
  id: string;
  employmentId: string | null;
  startedAt: string;
  endedAt: string | null;
  billed: boolean;
};

export type DailyReportLinkCounts = {
  times: number | null;
  materials: number | null;
  photos: number | null;
  issues: number | null;
};

export type DailyReport = {
  id: string;
  orderId: string;
  /** `YYYY-MM-DD`. */
  date: string;
  weatherMorning: string;
  weatherAfternoon: string;
  temperatureMorning: number | null;
  temperatureAfternoon: number | null;
  workDone: string;
  notes: string;
  userId: string;
  author: string;
  createdAt: string;
  employmentIds: string[];
  times: DailyReportTime[];
  links: DailyReportLinkCounts;
};

type ProfileName = { first_name: string | null; last_name: string | null };

type DailyReportQueryRow = {
  id: string;
  report_date: string;
  weather_morning: string;
  weather_afternoon: string;
  temperature_morning: number | string | null;
  temperature_afternoon: number | string | null;
  work_done: string;
  notes: string;
  user_id: string;
  created_at: string;
  profiles: ProfileName | ProfileName[] | null;
  daily_report_employees: { employment_id: string }[] | null;
  time_entries:
    | {
        id: string;
        employment_id: string | null;
        started_at: string;
        ended_at: string | null;
        billed_document_id: string | null;
      }[]
    | null;
};

type StaffQueryRow = {
  id: string;
  role: string | null;
  user_id: string | null;
  ended_at: string | null;
  display_first_name: string | null;
  display_last_name: string | null;
  profiles: ProfileName | ProfileName[] | null;
};

function oneProfile(value: ProfileName | ProfileName[] | null): ProfileName | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function authorName(profile: ProfileName | null): string {
  if (!profile) return '';
  return [profile.first_name, profile.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
}

function finiteOrNull(value: number | string | null): number | null {
  if (value == null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapReport(
  row: DailyReportQueryRow,
  orderId: string,
  links: DailyReportLinkCounts,
): DailyReport {
  const times = (row.time_entries ?? []).map((entry) => ({
    id: entry.id,
    employmentId: entry.employment_id,
    startedAt: entry.started_at,
    endedAt: entry.ended_at,
    billed: Boolean(entry.billed_document_id),
  }));

  return {
    id: row.id,
    orderId,
    date: row.report_date.slice(0, 10),
    weatherMorning: row.weather_morning.trim(),
    weatherAfternoon: row.weather_afternoon.trim(),
    temperatureMorning: finiteOrNull(row.temperature_morning),
    temperatureAfternoon: finiteOrNull(row.temperature_afternoon),
    workDone: row.work_done,
    notes: row.notes,
    userId: row.user_id,
    author: authorName(oneProfile(row.profiles)),
    createdAt: row.created_at,
    employmentIds: (row.daily_report_employees ?? []).map((entry) => entry.employment_id),
    times,
    links,
  };
}

type LinkTable = 'time_entries' | 'order_materials' | 'order_images' | 'order_issues';

/**
 * Sichtbare Verknüpfungen je Bericht.
 *
 * Schlägt die Abfrage fehl, ist die Zahl `null` — dann nennen wir sie nicht.
 * Eine 0 heißt: dieses Konto sieht keine Zeile. Die Kaskade beim Löschen
 * trifft auch Zeilen, die die Select-Policy ausblendet, weil RLS dort nicht
 * FORCE ist (gemessen 2026-10-08).
 */
async function countLinks(
  table: LinkTable,
  companyId: string,
  orderId: string,
): Promise<Map<string, number> | null> {
  const { data, error } = await supabase
    .from(table)
    .select('daily_report_id')
    .eq('company_id', companyId)
    .eq('order_id', orderId)
    .not('daily_report_id', 'is', null);

  if (error) return null;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const reportId = row.daily_report_id;
    if (!reportId) continue;
    counts.set(reportId, (counts.get(reportId) ?? 0) + 1);
  }
  return counts;
}

function countOf(counts: Map<string, number> | null, reportId: string): number | null {
  if (!counts) return null;
  return counts.get(reportId) ?? 0;
}

/** Frische Zählung für den Löschdialog, nur dieser Bericht. */
export async function fetchDailyReportLinkCounts(
  companyId: string,
  reportId: string,
): Promise<DailyReportLinkCounts> {
  async function count(table: LinkTable): Promise<number | null> {
    const { count: total, error } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('daily_report_id', reportId);
    if (error) return null;
    return total ?? 0;
  }

  const [times, materials, photos, issues] = await Promise.all([
    count('time_entries'),
    count('order_materials'),
    count('order_images'),
    count('order_issues'),
  ]);
  return { times, materials, photos, issues };
}

/**
 * Bautagebücher eines Auftrags.
 *
 * Dieselbe Tabelle `daily_reports`, die die Handy-App schreibt. queryKey
 * beginnt mit dem Mandanten. Der Index `daily_reports_order_id_report_date_created_idx`
 * liegt auf `(order_id, report_date DESC, created_at DESC)` und trifft diese
 * Sortierung. _Stand 2026-10-08._
 *
 * Wer die Zeilen nicht lesen darf, bekommt eine leere Liste. Der Block darüber
 * bleibt dann zu.
 */
export function useOrderDailyReports(orderId: string | undefined, enabled: boolean) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['daily-reports', companyId, orderId],
    enabled: Boolean(companyId && orderId) && enabled,
    queryFn: async (): Promise<DailyReport[]> => {
      const [reports, times, materials, photos, issues] = await Promise.all([
        supabase
          .from('daily_reports')
          .select(
            'id, report_date, weather_morning, weather_afternoon, temperature_morning, temperature_afternoon, work_done, notes, user_id, created_at, profiles!daily_reports_user_id_fkey(first_name, last_name), daily_report_employees(employment_id), time_entries(id, employment_id, started_at, ended_at, billed_document_id)',
          )
          .eq('company_id', companyId!)
          .eq('order_id', orderId!)
          .order('report_date', { ascending: false })
          .order('created_at', { ascending: false }),
        countLinks('time_entries', companyId!, orderId!),
        countLinks('order_materials', companyId!, orderId!),
        countLinks('order_images', companyId!, orderId!),
        countLinks('order_issues', companyId!, orderId!),
      ]);

      if (reports.error) throw reports.error;

      return ((reports.data ?? []) as unknown as DailyReportQueryRow[]).map((row) =>
        mapReport(row, orderId!, {
          times: countOf(times, row.id),
          materials: countOf(materials, row.id),
          photos: countOf(photos, row.id),
          issues: countOf(issues, row.id),
        }),
      );
    },
  });
}

/**
 * Anstellungen für die Anwesenheit.
 *
 * ⚠️ `role` ist nullable. Eine Zeile ohne Rolle ist keine brauchbare
 * Anstellung und fällt raus. `user_id` bleibt nullable: ohne Konto darf nur
 * die Team-Zeiterfassung eine Zeit buchen.
 */
export function useReportStaff(enabled: boolean) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;

  return useQuery({
    queryKey: ['daily-report-staff', companyId],
    enabled: Boolean(companyId) && enabled,
    queryFn: async (): Promise<ReportStaff[]> => {
      const { data, error } = await supabase
        .from('employments')
        .select(
          'id, role, user_id, ended_at, display_first_name, display_last_name, profiles(first_name, last_name)',
        )
        .eq('company_id', companyId!);

      if (error) throw error;

      return ((data ?? []) as unknown as StaffQueryRow[])
        .filter((row) => row.role)
        .map((row) => ({
          id: row.id,
          name: employmentDisplayName({
            display_first_name: row.display_first_name,
            display_last_name: row.display_last_name,
            profiles: oneProfile(row.profiles),
          }),
          role: row.role!,
          userId: row.user_id,
          endedAt: row.ended_at,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'de'));
    },
  });
}

/** Bericht in den Formularzustand, Von/Bis aus den verknüpften Zeiten. */
export function draftFromDailyReport(report: DailyReport): DailyReportDraft {
  const byEmployment = new Map<string, DailyReportTime[]>();
  for (const time of report.times) {
    if (!time.employmentId) continue;
    const list = byEmployment.get(time.employmentId) ?? [];
    list.push(time);
    byEmployment.set(time.employmentId, list);
  }

  const attendance: DailyReportAttendance[] = report.employmentIds.map((employmentId) => {
    const times = byEmployment.get(employmentId) ?? [];
    const open = times.find((time) => !time.billed);
    const source = open ?? times[0];
    return {
      employmentId,
      startTime: source ? toTimeInput(source.startedAt) : '07:00',
      endTime: source?.endedAt ? toTimeInput(source.endedAt) : source ? '' : '16:00',
      billed: times.length > 0 && times.every((time) => time.billed),
    };
  });

  return {
    id: report.id,
    orderId: report.orderId,
    date: report.date,
    weatherMorning: report.weatherMorning,
    weatherAfternoon: report.weatherAfternoon,
    temperatureMorning: temperatureToInput(report.temperatureMorning),
    temperatureAfternoon: temperatureToInput(report.temperatureAfternoon),
    workDone: report.workDone,
    notes: report.notes,
    attendance,
    authorUserId: report.userId,
  };
}

export function formatReportDate(isoDate: string): string {
  return formatIsoDateDe(isoDate);
}

/**
 * Anderer Bericht am selben Tag, aus der schon geladenen Liste.
 *
 * Die eigene Zeile zählt nicht. Ein ungültiges Datum ist kein Treffer.
 * Die Liste kann noch leer sein — dann bleibt die Serverabfrage übrig.
 */
export function otherDailyReportId(
  reports: readonly { id: string; date: string }[],
  date: string,
  selfId?: string,
): string | null {
  if (!isDailyReportDate(date)) return null;
  const match = reports.find((report) => report.date === date && report.id !== selfId);
  return match?.id ?? null;
}

/**
 * Ob an diesem Auftrag und Tag schon ein Bericht liegt.
 *
 * Nur die `id`, gefiltert auf Mandant, Auftrag und Datum. Die Liste muss
 * dafür nicht fertig sein. Sichtbar ist die Zeile auch, wenn dieses Konto
 * sie nicht ändern darf — Select hängt an `canCreateAndViewReports`.
 * Den eigenen Bericht filtert der Aufrufer heraus.
 */
export function useDailyReportOnDate(orderId: string | undefined, date: string) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const ready = isDailyReportDate(date);

  return useQuery({
    queryKey: ['daily-report-on-date', companyId, orderId, date],
    enabled: Boolean(companyId && orderId) && ready,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('daily_reports')
        .select('id')
        .eq('company_id', companyId!)
        .eq('order_id', orderId!)
        .eq('report_date', date)
        .limit(2);
      if (error) throw error;
      return (data ?? []).map((row) => row.id);
    },
  });
}

/**
 * Anzahlen wie auf der Karte: nur Werte über 0, Singular und Plural aus dem Katalog.
 *
 * „1 Zeit“, „6 Zeiten“, „1 Material“, „2 Materialien“, „1 Foto“, „1 Mangel“.
 * Eine fehlende Zählung (`null`) wird ausgelassen, nicht als 0 behauptet.
 */
export function formatDailyReportLinkCounts(
  counts: DailyReportLinkCounts,
  translate: (key: string, options: { count: number }) => string,
): string {
  const parts: string[] = [];
  if (counts.times != null && counts.times > 0) {
    parts.push(translate('domain:orders.dailyReports.linkedTimes', { count: counts.times }));
  }
  if (counts.materials != null && counts.materials > 0) {
    parts.push(
      translate('domain:orders.dailyReports.linkedMaterials', { count: counts.materials }),
    );
  }
  if (counts.photos != null && counts.photos > 0) {
    parts.push(translate('domain:orders.dailyReports.linkedPhotos', { count: counts.photos }));
  }
  if (counts.issues != null && counts.issues > 0) {
    parts.push(translate('domain:orders.dailyReports.linkedIssues', { count: counts.issues }));
  }
  return parts.join(' · ');
}
