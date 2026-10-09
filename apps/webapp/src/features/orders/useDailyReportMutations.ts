import { hasPermission } from '@bautakt/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/useAuth';
import { useMembership } from '@/features/company/useMembership';
import { type LaborRateCandidate, resolveLaborRate } from '@/features/times/resolveLaborRate';
import { entryRange } from '@/features/times/timeEntryDraft';
import { supabase } from '@/lib/supabase';

import { canBookReportTime, canDeleteDailyReport } from './dailyReportAccess';
import { DailyReportDeleteBlockedError, readDailyReportDeleteBlock } from './dailyReportDeleteGate';
import { type DailyReportDraft, parseTemperature } from './dailyReportDraft';

/**
 * Für diesen Tag gibt es an dem Auftrag schon einen Bericht.
 *
 * Unique-Index `daily_reports_order_id_report_date_uidx` auf
 * `(order_id, report_date)`, gemessen 2026-10-08. `existingId` ist gesetzt,
 * wenn die Zeile für dieses Konto lesbar ist.
 */
export class DailyReportDuplicateDateError extends Error {
  readonly existingId: string | null;

  constructor(existingId: string | null) {
    super('DAILY_REPORT_DUPLICATE_DATE');
    this.name = 'DailyReportDuplicateDateError';
    this.existingId = existingId;
  }
}

type EmploymentRow = {
  id: string;
  user_id: string | null;
  role: string | null;
};

type ExistingTime = {
  id: string;
  employment_id: string | null;
  billed_document_id: string | null;
  started_at: string;
  ended_at: string | null;
};

export type SaveDailyReportResult = {
  /** Anstellungen, deren abgerechnete Zeit stehen bleibt. */
  billedEmploymentIds: string[];
};

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  if (code === '23505') return true;
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  return message.includes('daily_reports_order_id_report_date_uidx');
}

function finiteRate(value: number | string | null): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sameInstant(left: string | null, right: string): boolean {
  if (!left) return false;
  return new Date(left).getTime() === new Date(right).getTime();
}

async function findOtherReport(
  companyId: string,
  orderId: string,
  date: string,
  selfId: string | undefined,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('daily_reports')
    .select('id')
    .eq('company_id', companyId)
    .eq('order_id', orderId)
    .eq('report_date', date);
  if (error) throw error;
  const other = (data ?? []).find((row) => row.id !== selfId);
  return other?.id ?? null;
}

/**
 * Anwesenheiten ersetzen.
 *
 * Die Handy-App macht dasselbe beim Sync: die Menge in
 * `daily_report_employees` ist danach genau die Auswahl. Erst einfügen, dann
 * entfernen, damit ein fehlgeschlagenes Insert die alte Menge stehen lässt.
 */
async function replaceEmployees(
  reportId: string,
  nextIds: string[],
): Promise<{ previousIds: string[] }> {
  const { data: current, error: readError } = await supabase
    .from('daily_report_employees')
    .select('employment_id')
    .eq('report_id', reportId);
  if (readError) throw readError;

  const previousIds = (current ?? []).map((row) => row.employment_id);
  const previous = new Set(previousIds);
  const next = new Set(nextIds);
  const toAdd = nextIds.filter((id) => !previous.has(id));
  const toRemove = previousIds.filter((id) => !next.has(id));

  if (toAdd.length > 0) {
    const { data, error } = await supabase
      .from('daily_report_employees')
      .insert(toAdd.map((employmentId) => ({ report_id: reportId, employment_id: employmentId })))
      .select('employment_id');
    if (error) throw error;
    if ((data ?? []).length !== toAdd.length) throw new Error('FORBIDDEN');
  }

  if (toRemove.length > 0) {
    const { data, error } = await supabase
      .from('daily_report_employees')
      .delete()
      .eq('report_id', reportId)
      .in('employment_id', toRemove)
      .select('employment_id');
    if (error) throw error;
    if ((data ?? []).length !== toRemove.length) throw new Error('FORBIDDEN');
  }

  return { previousIds };
}

/**
 * Bautagebuch anlegen oder die Kernfelder ändern.
 *
 * Geschrieben werden Datum, Wetter, beide Temperaturen, Leistungen, Notizen,
 * `modified_at` und die Anwesenheit. Nie: `materials`, `special_occurrences`,
 * `user_id`, `company_id`, `order_id`, `created_at`. `id` hat kein Default.
 *
 * Zeiten nur für Anstellungen, die `canBookReportTime` erlaubt, und nur wenn
 * sie nicht abgerechnet sind. Eine Zeit, die am Bericht hängt, aber nie in
 * der Anwesenheit stand, bleibt. Entfernte Personen verlieren ihre nicht
 * abgerechnete Berichtszeit.
 */
export function useSaveDailyReport() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const { user } = useAuth();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (draft: DailyReportDraft): Promise<SaveDailyReportResult> => {
      if (!companyId || !user?.id) throw new Error('NOT_AUTHENTICATED');
      const canCreate = hasPermission(membership?.permissions, 'canCreateAndViewReports');
      const canManage = hasPermission(membership?.permissions, 'canManageOrders');
      if (!draft.id && !canCreate) throw new Error('FORBIDDEN');
      if (draft.id && !canCreate && !canManage) throw new Error('FORBIDDEN');

      const morning = parseTemperature(draft.temperatureMorning);
      const afternoon = parseTemperature(draft.temperatureAfternoon);
      if (morning == null || afternoon == null || !draft.workDone.trim()) {
        throw new Error('INVALID_DAILY_REPORT');
      }

      const other = await findOtherReport(companyId, draft.orderId, draft.date, draft.id);
      if (other) throw new DailyReportDuplicateDateError(other);

      const now = new Date().toISOString();
      const fields = {
        report_date: draft.date,
        weather_morning: draft.weatherMorning.trim(),
        weather_afternoon: draft.weatherAfternoon.trim(),
        temperature_morning: morning,
        temperature_afternoon: afternoon,
        work_done: draft.workDone.trim(),
        notes: draft.notes.trim(),
        modified_at: now,
      };

      const attendanceIds = [...new Set(draft.attendance.map((person) => person.employmentId))];
      if (attendanceIds.length === 0) throw new Error('INVALID_DAILY_REPORT');
      const { data: staffRows, error: staffError } = await supabase
        .from('employments')
        .select('id')
        .eq('company_id', companyId)
        .in('id', attendanceIds);
      if (staffError) throw staffError;
      if ((staffRows ?? []).length !== attendanceIds.length)
        throw new Error('EMPLOYMENT_NOT_FOUND');

      let reportId = draft.id;
      let created = false;

      try {
        if (reportId) {
          const { data, error } = await supabase
            .from('daily_reports')
            .update(fields)
            .eq('company_id', companyId)
            .eq('id', reportId)
            .select('id');
          if (error) {
            if (!isUniqueViolation(error)) throw error;
            const existingId = await findOtherReport(
              companyId,
              draft.orderId,
              draft.date,
              reportId,
            );
            throw new DailyReportDuplicateDateError(existingId);
          }
          if (!data?.length) throw new Error('FORBIDDEN');
        } else {
          reportId = crypto.randomUUID();
          const { error } = await supabase.from('daily_reports').insert({
            id: reportId,
            company_id: companyId,
            order_id: draft.orderId,
            user_id: user.id,
            ...fields,
          });
          if (error) {
            if (!isUniqueViolation(error)) throw error;
            const existingId = await findOtherReport(
              companyId,
              draft.orderId,
              draft.date,
              undefined,
            );
            throw new DailyReportDuplicateDateError(existingId);
          }
          created = true;
        }

        const { previousIds } = await replaceEmployees(reportId, attendanceIds);
        const billedEmploymentIds = await syncTimes({
          companyId,
          userId: user.id,
          permissions: membership?.permissions,
          reportId,
          orderId: draft.orderId,
          date: draft.date,
          attendance: draft.attendance,
          previousIds,
          now,
        });

        return { billedEmploymentIds };
      } catch (caught) {
        if (created && reportId) {
          await supabase
            .from('daily_reports')
            .delete()
            .eq('company_id', companyId)
            .eq('id', reportId);
        }
        throw caught;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['daily-reports', companyId] });
      await queryClient.invalidateQueries({ queryKey: ['daily-report-on-date', companyId] });
      await queryClient.invalidateQueries({ queryKey: ['daily-report-links', companyId] });
      await queryClient.invalidateQueries({ queryKey: ['timeEntries', companyId] });
      await queryClient.invalidateQueries({ queryKey: ['sales-documents', companyId] });
      await queryClient.invalidateQueries({ queryKey: ['sales-document', companyId] });
    },
  });
}

/**
 * Bericht löschen.
 *
 * Die Zeile verschwindet aus dem Cache erst nach der Invalidierung, und die
 * läuft in `onSuccess` — nach der Antwort. Kein optimistisches Entfernen.
 * Kommt keine Zeile zurück, hat RLS die Löschung verschluckt.
 *
 * `time_entries`, `order_materials`, `order_images` und `order_issues`
 * verweisen mit ON DELETE CASCADE. RLS ist dort nicht FORCE (gemessen
 * 2026-10-08). Deshalb löscht das Web nur, wenn die frische Lesung keine
 * abgerechnete Zeit, kein abgerechnetes Material und keine sichtbare
 * Verknüpfung zeigt und das Konto Material vollständig sieht. Fehlt die
 * Materialsicht, bleibt der Knopf aus: fremdes Material kann abgerechnet
 * sein. Die Datenbank selbst sperrt das noch nicht; das kommt über
 * bautakt-app #104.
 */
export function useDeleteDailyReport() {
  const queryClient = useQueryClient();
  const { data: membership } = useMembership();
  const { user } = useAuth();
  const companyId = membership?.companyId;

  return useMutation({
    mutationFn: async (reportId: string) => {
      if (!companyId || !user?.id) throw new Error('NOT_AUTHENTICATED');

      const { data: report, error: reportError } = await supabase
        .from('daily_reports')
        .select('user_id')
        .eq('company_id', companyId)
        .eq('id', reportId)
        .maybeSingle();
      if (reportError) throw reportError;
      if (
        !report ||
        !canDeleteDailyReport(membership?.permissions, user.id, { userId: report.user_id })
      ) {
        throw new Error('FORBIDDEN');
      }

      const reading = await readDailyReportDeleteBlock(
        companyId,
        reportId,
        membership?.permissions,
      );
      if (reading.block) {
        throw new DailyReportDeleteBlockedError(
          reading.block,
          reading.counts,
          reading.attendance,
          reading.materialsComplete,
        );
      }

      const { data, error } = await supabase
        .from('daily_reports')
        .delete()
        .eq('company_id', companyId)
        .eq('id', reportId)
        .select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('FORBIDDEN');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['daily-reports', companyId] });
      await queryClient.invalidateQueries({ queryKey: ['daily-report-on-date', companyId] });
      await queryClient.invalidateQueries({ queryKey: ['daily-report-links', companyId] });
      await queryClient.invalidateQueries({ queryKey: ['timeEntries', companyId] });
      await queryClient.invalidateQueries({ queryKey: ['order-materials', companyId] });
      await queryClient.invalidateQueries({ queryKey: ['order-images', companyId] });
      await queryClient.invalidateQueries({ queryKey: ['sales-documents', companyId] });
      await queryClient.invalidateQueries({ queryKey: ['sales-document', companyId] });
    },
  });
}

async function syncTimes(input: {
  companyId: string;
  userId: string;
  permissions: Parameters<typeof canBookReportTime>[0];
  reportId: string;
  orderId: string;
  date: string;
  attendance: DailyReportDraft['attendance'];
  previousIds: string[];
  now: string;
}): Promise<string[]> {
  const canTeam = hasPermission(input.permissions, 'canTrackTimeForTeam');
  const canOwn = hasPermission(input.permissions, 'canTrackTime');
  if (!canTeam && !canOwn) return [];

  const wantedIds = [
    ...new Set([...input.attendance.map((person) => person.employmentId), ...input.previousIds]),
  ];
  if (wantedIds.length === 0) return [];

  const { data: employmentRows, error: employmentError } = await supabase
    .from('employments')
    .select('id, user_id, role')
    .eq('company_id', input.companyId)
    .in('id', wantedIds);
  if (employmentError) throw employmentError;

  const employments = new Map(
    ((employmentRows ?? []) as EmploymentRow[]).map((row) => [row.id, row]),
  );

  function bookable(employmentId: string): boolean {
    const employment = employments.get(employmentId);
    if (!employment) return false;
    return canBookReportTime(input.permissions, input.userId, { userId: employment.user_id });
  }

  const { data: timeRows, error: timeError } = await supabase
    .from('time_entries')
    .select('id, employment_id, billed_document_id, started_at, ended_at')
    .eq('company_id', input.companyId)
    .eq('daily_report_id', input.reportId);
  if (timeError) throw timeError;
  const existing = (timeRows ?? []) as ExistingTime[];

  const billed = new Set<string>();
  const inserted: string[] = [];

  const canManageRates = hasPermission(input.permissions, 'canManageRates');
  let rates: LaborRateCandidate[] | null = null;

  async function loadRates(): Promise<LaborRateCandidate[]> {
    if (rates) return rates;
    const { data: rateRows, error: rateError } = await supabase
      .from('labor_rates')
      .select(
        'scope, order_id, employment_id, role_name, valid_from, valid_to, cost_rate, billing_rate',
      )
      .eq('company_id', input.companyId);
    if (rateError) throw rateError;
    rates = (rateRows ?? []).map((row) => ({
      scope: row.scope,
      orderId: row.order_id,
      employmentId: row.employment_id,
      roleName: row.role_name,
      validFrom: row.valid_from,
      validTo: row.valid_to,
      costRate: finiteRate(row.cost_rate),
      billingRate: finiteRate(row.billing_rate),
    }));
    return rates;
  }

  try {
    for (const person of input.attendance) {
      if (!bookable(person.employmentId)) continue;
      const rows = existing.filter((row) => row.employment_id === person.employmentId);
      const open = rows.filter((row) => !row.billed_document_id);
      const closed = rows.filter((row) => row.billed_document_id);
      if (open.length === 0 && closed.length > 0) {
        billed.add(person.employmentId);
        continue;
      }

      const range = entryRange(input.date, person.startTime, person.endTime);
      if (!range) throw new Error('INVALID_TIME_ENTRY');

      if (open.length === 0) {
        const employment = employments.get(person.employmentId);
        if (!employment) throw new Error('EMPLOYMENT_NOT_FOUND');
        const id = crypto.randomUUID();
        const snapshot = canManageRates
          ? resolveLaborRate(await loadRates(), {
              orderId: input.orderId,
              employmentId: person.employmentId,
              roleName: employment.role,
              onDate: input.date,
            })
          : null;
        const { error } = await supabase.from('time_entries').insert({
          id,
          company_id: input.companyId,
          order_id: input.orderId,
          employment_id: employment.id,
          user_id: employment.user_id,
          started_at: range.startedAt,
          ended_at: range.endedAt,
          break_minutes: 0,
          note: '',
          modified_at: input.now,
          daily_report_id: input.reportId,
          is_billable: true,
          ...(snapshot ? { cost_rate: snapshot.costRate, billing_rate: snapshot.billingRate } : {}),
        });
        if (error) throw error;
        inserted.push(id);
        continue;
      }

      for (const row of open) {
        if (
          sameInstant(row.started_at, range.startedAt) &&
          sameInstant(row.ended_at, range.endedAt)
        ) {
          continue;
        }
        const { data: fresh, error: freshError } = await supabase
          .from('time_entries')
          .select('billed_document_id')
          .eq('company_id', input.companyId)
          .eq('id', row.id)
          .maybeSingle();
        if (freshError) throw freshError;
        if (!fresh) throw new Error('FORBIDDEN');
        if (fresh.billed_document_id) {
          billed.add(person.employmentId);
          continue;
        }
        const { data, error } = await supabase
          .from('time_entries')
          .update({
            started_at: range.startedAt,
            ended_at: range.endedAt,
            modified_at: input.now,
          })
          .eq('company_id', input.companyId)
          .eq('id', row.id)
          .select('id');
        if (error) throw error;
        if (!data?.length) throw new Error('FORBIDDEN');
      }
    }

    const staying = new Set(input.attendance.map((person) => person.employmentId));
    for (const employmentId of input.previousIds) {
      if (staying.has(employmentId) || !bookable(employmentId)) continue;
      const rows = existing.filter((row) => row.employment_id === employmentId);
      for (const row of rows) {
        const { data: fresh, error: freshError } = await supabase
          .from('time_entries')
          .select('billed_document_id')
          .eq('company_id', input.companyId)
          .eq('id', row.id)
          .maybeSingle();
        if (freshError) throw freshError;
        if (!fresh) continue;
        if (fresh.billed_document_id) {
          billed.add(employmentId);
          continue;
        }
        const { data, error } = await supabase
          .from('time_entries')
          .delete()
          .eq('company_id', input.companyId)
          .eq('id', row.id)
          .select('id');
        if (error) throw error;
        if (!data?.length) throw new Error('FORBIDDEN');
      }
    }
  } catch (caught) {
    if (inserted.length > 0) {
      await supabase
        .from('time_entries')
        .delete()
        .eq('company_id', input.companyId)
        .in('id', inserted);
    }
    throw caught;
  }

  return [...billed];
}
