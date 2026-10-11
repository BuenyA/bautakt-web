import type { LaborRateRow, LaborTimeEntry } from '@bautakt/finance';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/useAuth';
import { useMembership } from '@/features/company/useMembership';
import { employmentDisplayName } from '@/lib/employeeName';
import { supabase } from '@/lib/supabase';

import { localDayBounds, localIsoDate, recurrenceCoversDate } from './today';

export type CrewMember = {
  employmentId: string;
  name: string;
  /** Pfad im Bucket `profile-images` oder schon eine URL. */
  imagePath: string | null;
};

export type TodayAssignment = {
  id: string;
  orderId: string;
  orderName: string;
  location: string;
  startsAt: string;
  endsAt: string;
  note: string;
  crew: CrewMember[];
};

type EmploymentJoin = {
  display_first_name: string | null;
  display_last_name: string | null;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    profile_image_url: string | null;
  } | null;
} | null;

type AssignmentQueryRow = {
  id: string;
  order_id: string;
  starts_at: string;
  ends_at: string;
  note: string | null;
  orders: { name: string; street_address: string; postal_code: string; city: string } | null;
  work_assignment_employees: { employment_id: string; employments: EmploymentJoin }[] | null;
};

const EMPLOYMENT_SELECT =
  'display_first_name, display_last_name, profiles ( first_name, last_name, profile_image_url )';

export function crewMember(employmentId: string, employment: EmploymentJoin): CrewMember {
  return {
    employmentId,
    name: employment ? employmentDisplayName(employment) : '',
    imagePath: employment?.profiles?.profile_image_url ?? null,
  };
}

/** Vorname der angemeldeten Person für den Gruß; leer, wenn keiner gepflegt ist. */
export function useMyFirstName() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['my-profile-name', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', userId!)
        .maybeSingle();
      if (error) throw error;
      return data?.first_name?.trim() ?? '';
    },
  });
}

/**
 * Einsätze, die heute laufen — auch solche, die gestern begonnen haben oder
 * morgen enden. RLS liefert Mitarbeitenden nur die eigenen, Planern alle.
 */
export function useTodayAssignments() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const dayIso = localIsoDate(new Date());

  return useQuery({
    queryKey: ['assignments', companyId, 'day', dayIso],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<TodayAssignment[]> => {
      const { start, end } = localDayBounds();
      const { data, error } = await supabase
        .from('work_assignments')
        .select(
          `id, order_id, starts_at, ends_at, note,
           orders ( name, street_address, postal_code, city ),
           work_assignment_employees ( employment_id, employments ( ${EMPLOYMENT_SELECT} ) )`,
        )
        .eq('company_id', companyId!)
        .lte('starts_at', end.toISOString())
        .gte('ends_at', start.toISOString())
        .order('starts_at', { ascending: true });

      if (error) throw error;
      return ((data ?? []) as unknown as AssignmentQueryRow[]).map((row) => ({
        id: row.id,
        orderId: row.order_id,
        orderName: row.orders?.name ?? '',
        location: [
          row.orders?.street_address,
          [row.orders?.postal_code, row.orders?.city].filter(Boolean).join(' '),
        ]
          .filter(Boolean)
          .join(', '),
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        note: row.note?.trim() ?? '',
        crew: (row.work_assignment_employees ?? []).map((link) =>
          crewMember(link.employment_id, link.employments),
        ),
      }));
    },
  });
}

export type TodayEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  /** `all` = Firmentermin, sonst privat. */
  eventType: string;
};

type EventRow = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  event_type: string;
  is_cancelled: boolean;
  recurrence_rule: string | null;
  recurrence_id: string | null;
  parent_event_id: string | null;
};

/**
 * Kalendertermine von heute: Firmentermine und die eigenen (so filtert auch
 * die RLS). Serientermine werden wie im Morning Briefing der App auf heute
 * gelegt; eine geänderte oder abgesagte Einzelinstanz ersetzt die Serie.
 */
export function useTodayEvents() {
  const { data: membership } = useMembership();
  const { user } = useAuth();
  const companyId = membership?.companyId;
  const dayIso = localIsoDate(new Date());

  return useQuery({
    queryKey: ['calendar-events', companyId, user?.id, 'day', dayIso],
    enabled: Boolean(companyId && user?.id),
    queryFn: async (): Promise<TodayEvent[]> => {
      const { start, end } = localDayBounds();
      const columns =
        'id, title, starts_at, ends_at, all_day, event_type, is_cancelled, recurrence_rule, recurrence_id, parent_event_id';

      const [single, series] = await Promise.all([
        supabase
          .from('calendar_events')
          .select(columns)
          .eq('company_id', companyId!)
          .is('recurrence_rule', null)
          .lte('starts_at', end.toISOString())
          .gte('ends_at', start.toISOString()),
        supabase
          .from('calendar_events')
          .select(columns)
          .eq('company_id', companyId!)
          .not('recurrence_rule', 'is', null)
          .eq('is_cancelled', false)
          .lte('starts_at', end.toISOString()),
      ]);
      if (single.error) throw single.error;
      if (series.error) throw series.error;

      const singles = (single.data ?? []) as EventRow[];
      // Einzelinstanzen, die heute eine Serie ersetzen (auch abgesagte).
      const replaced = new Set(
        singles
          .filter((row) => row.parent_event_id && row.recurrence_id)
          .filter((row) => localIsoDate(new Date(row.recurrence_id!)) === dayIso)
          .map((row) => row.parent_event_id!),
      );

      const occurrences = ((series.data ?? []) as EventRow[])
        .filter((row) => !replaced.has(row.id))
        .filter((row) =>
          recurrenceCoversDate(row.recurrence_rule!, localIsoDate(new Date(row.starts_at)), dayIso),
        )
        .map((row) => {
          const startsAt = new Date(row.starts_at);
          const duration = new Date(row.ends_at).getTime() - startsAt.getTime();
          const today = new Date(start);
          today.setHours(startsAt.getHours(), startsAt.getMinutes(), 0, 0);
          return {
            ...row,
            starts_at: today.toISOString(),
            ends_at: new Date(today.getTime() + duration).toISOString(),
          };
        });

      return [...singles.filter((row) => !row.is_cancelled), ...occurrences]
        .map((row) => ({
          id: row.id,
          title: row.title,
          startsAt: row.starts_at,
          endsAt: row.ends_at,
          allDay: row.all_day,
          eventType: row.event_type,
        }))
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    },
  });
}

export type OverviewAbsence = {
  id: string;
  employmentId: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  member: CrewMember;
};

/**
 * Abwesenheiten, die die Übersicht braucht: offene Anträge und alles, was
 * heute gilt. Eigene schmale Abfrage statt `useAbsences`, weil hier die
 * Profilbilder mitkommen müssen. RLS entscheidet, wessen Zeilen sichtbar sind.
 */
export function useOverviewAbsences() {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const dayIso = localIsoDate(new Date());

  return useQuery({
    queryKey: ['absences', companyId, 'overview', dayIso],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<OverviewAbsence[]> => {
      const { data, error } = await supabase
        .from('absences')
        .select(
          `id, employment_id, type, status, start_date, end_date, employments ( ${EMPLOYMENT_SELECT} )`,
        )
        .eq('company_id', companyId!)
        .or(`status.eq.ausstehend,and(start_date.lte.${dayIso},end_date.gte.${dayIso})`)
        .order('start_date', { ascending: true });

      if (error) throw error;
      return (
        (data ?? []) as unknown as {
          id: string;
          employment_id: string;
          type: string;
          status: string;
          start_date: string;
          end_date: string;
          employments: EmploymentJoin;
        }[]
      ).map((row) => ({
        id: row.id,
        employmentId: row.employment_id,
        type: row.type,
        status: row.status,
        startDate: row.start_date,
        endDate: row.end_date,
        member: crewMember(row.employment_id, row.employments),
      }));
    },
  });
}

/** Aufträge mit Enddatum im Fenster — für die Fristenliste. */
export function useOrderEndDates(enabled: boolean, untilIso: string) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const dayIso = localIsoDate(new Date());

  return useQuery({
    queryKey: ['orders', companyId, 'end-dates', dayIso, untilIso],
    enabled: enabled && Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, name, end_date')
        .eq('company_id', companyId!)
        .not('status', 'in', '(finished,quote,declined)')
        .gte('end_date', dayIso)
        .lte('end_date', untilIso);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Zeiteinträge und Lohnsätze ab dem 01.01. des Vorjahres — für die
 * Lohnkosten im Jahresergebnis. Nur mit `canViewWageCosts`: wer keine
 * Lohnkosten sehen darf, soll sie auch nicht als Summe herausrechnen können.
 */
export function useLaborInputs(enabled: boolean) {
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const year = new Date().getFullYear();

  return useQuery({
    queryKey: ['labor-inputs', companyId, year],
    enabled: enabled && Boolean(companyId),
    queryFn: async (): Promise<{ entries: LaborTimeEntry[]; rates: LaborRateRow[] }> => {
      const from = new Date(year, 0, 1).toISOString();
      const [entries, rates] = await Promise.all([
        fetchAllTimeEntries(companyId!, from),
        supabase
          .from('labor_rates')
          .select('scope, cost_rate, order_id, employment_id, valid_from, valid_to')
          .eq('company_id', companyId!),
      ]);
      if (rates.error) throw rates.error;
      return { entries, rates: rates.data ?? [] };
    },
  });
}

const PAGE_SIZE = 1000;

/**
 * Ein Jahr Zeiteinträge übersteigt schnell die 1000 Zeilen, die PostgREST pro
 * Antwort liefert. Ohne Blättern fehlten die Stunden ab Zeile 1001 stillschweigend
 * in den Lohnkosten.
 */
async function fetchAllTimeEntries(companyId: string, fromIso: string): Promise<LaborTimeEntry[]> {
  const rows: LaborTimeEntry[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('time_entries')
      .select('started_at, ended_at, break_minutes, cost_rate, employment_id, order_id')
      .eq('company_id', companyId)
      .gte('started_at', fromIso)
      .order('started_at', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}
