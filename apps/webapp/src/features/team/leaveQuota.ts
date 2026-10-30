/**
 * Urlaubskontingent und Fehltage eines Mitarbeiters.
 *
 * ⚠️ KOPIE. Die Quelle ist bautakt-app `lib/leaveQuota.ts`,
 * `lib/utils/workingDaysUtils.ts` und `lib/utils/germanHolidays.ts`
 * (Stand 2026-10-30). Die App bleibt kanonisch; wer dort rechnet, rechnet
 * hier gleich, sonst zeigen Handy und Web verschiedene Resttage.
 *
 * Reine Anzeige, nirgends eine Sperre. Gegen das Kontingent zählt nur
 * `urlaub`, verbraucht ist nur `genehmigt`; `ausstehend` steht getrennt als
 * beantragt. Ein Antrag zählt ganz zum Jahr seines Starttags.
 */

export type CompanyAbsenceSettings = {
  annualLeaveDays: number;
  countsWeekendsAsLeave: boolean;
};

/** Wie `DEFAULT_COMPANY_ABSENCE_SETTINGS` der App, solange der Betrieb nichts gespeichert hat. */
export const DEFAULT_ABSENCE_SETTINGS: CompanyAbsenceSettings = {
  annualLeaveDays: 24,
  countsWeekendsAsLeave: false,
};

export type LeaveEmployment = {
  /** Kalendertag `YYYY-MM-DD`. */
  startedAt: string | null;
  endedAt: string | null;
  annualLeaveDaysOverride: number | null;
  annualLeaveDaysOverrideIsManual: boolean;
  weekendCountsAsLeaveOverride: boolean | null;
};

export type LeaveAbsence = {
  type: string;
  status: string;
  start_date: string;
  end_date: string;
};

export type LeaveQuota = {
  year: number;
  entitlement: number;
  used: number;
  pending: number;
  /** Kann negativ sein: überbucht ist ein Hinweis, kein Fehler. */
  remaining: number;
  countWeekends: boolean;
};

function utcDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/** Ostersonntag nach der Gaußschen Osterformel. */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

const holidayCache = new Map<number, Set<string>>();

/** Die neun bundesweiten Feiertage, bewusst ohne Landesfeiertage — wie in der App. */
function holidays(year: number): Set<string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;
  const easter = easterSunday(year);
  const set = new Set([
    `${year}-01-01`,
    isoDay(addDays(easter, -2)),
    isoDay(addDays(easter, 1)),
    `${year}-05-01`,
    isoDay(addDays(easter, 39)),
    isoDay(addDays(easter, 50)),
    `${year}-10-03`,
    `${year}-12-25`,
    `${year}-12-26`,
  ]);
  holidayCache.set(year, set);
  return set;
}

/** Tage in [start, end] ohne Feiertage; Wochenenden nur, wenn sie zählen. */
export function countWorkingDays(start: string, end: string, countWeekends: boolean): number {
  const from = utcDate(start);
  const to = utcDate(end);
  if (!from || !to || to < from) return 0;
  let count = 0;
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const weekday = day.getUTCDay();
    const weekend = weekday === 0 || weekday === 6;
    const iso = isoDay(day);
    if ((countWeekends || !weekend) && !holidays(day.getUTCFullYear()).has(iso)) count += 1;
  }
  return count;
}

function daysInclusive(start: string, end: string): number {
  const from = utcDate(start);
  const to = utcDate(end);
  if (!from || !to) return 0;
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1);
}

/** Anteiliger Anspruch bei Eintritt oder Austritt im Jahr, auf halbe Tage gerundet. */
export function proRataEntitlement(
  employment: Pick<LeaveEmployment, 'startedAt' | 'endedAt'>,
  settings: CompanyAbsenceSettings,
  year: number,
): number {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const started = employment.startedAt?.slice(0, 10) ?? null;
  const ended = employment.endedAt?.slice(0, 10) ?? null;
  if ((!started || started <= yearStart) && (!ended || ended >= yearEnd)) {
    return settings.annualLeaveDays;
  }
  const from = started && started > yearStart ? started : yearStart;
  const to = ended && ended < yearEnd ? ended : yearEnd;
  if (to < from) return 0;
  const ratio = daysInclusive(from, to) / daysInclusive(yearStart, yearEnd);
  return Math.round(settings.annualLeaveDays * ratio * 2) / 2;
}

export function computeLeaveQuota(
  employment: LeaveEmployment,
  settings: CompanyAbsenceSettings,
  absences: readonly LeaveAbsence[],
  year: number,
): LeaveQuota {
  const countWeekends = employment.weekendCountsAsLeaveOverride ?? settings.countsWeekendsAsLeave;
  const entitlement =
    employment.annualLeaveDaysOverrideIsManual && employment.annualLeaveDaysOverride != null
      ? employment.annualLeaveDaysOverride
      : proRataEntitlement(employment, settings, year);
  const ofYear = absences.filter(
    (absence) => absence.type === 'urlaub' && absence.start_date.slice(0, 4) === String(year),
  );
  const sum = (status: string) =>
    ofYear
      .filter((absence) => absence.status === status)
      .reduce(
        (total, absence) =>
          total + countWorkingDays(absence.start_date, absence.end_date, countWeekends),
        0,
      );
  const used = sum('genehmigt');
  return {
    year,
    entitlement,
    used,
    pending: sum('ausstehend'),
    remaining: entitlement - used,
    countWeekends,
  };
}

/** `24` oder `24,5`. */
export function formatDays(value: number): string {
  return value.toLocaleString('de-DE', { maximumFractionDigits: 1 });
}
