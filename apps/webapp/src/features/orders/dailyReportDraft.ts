import { todayIso } from '@bautakt/finance';

import { entryRange } from '@/features/times/timeEntryDraft';

/**
 * Formularzustand eines Bautagebuchs.
 *
 * Pflicht, wie in der Handy-App: Datum, Wetter und Temperatur morgens und
 * nachmittags, mindestens eine Anwesenheit, ausgeführte Leistungen nicht leer.
 * Notizen dürfen leer sein. Materialtext, besondere Vorkommnisse, Fotos und
 * Mängel gehören nicht in dieses Formular.
 *
 * Von/Bis gibt es nur für Personen, deren Zeit dieses Konto buchen darf.
 * Abgerechnete Zeiten bleiben stehen und werden hier nicht geprüft.
 *
 * Eigene Datei, damit die Komponente nur Komponenten exportiert (Fast Refresh).
 */

export type DailyReportAttendance = {
  employmentId: string;
  startTime: string;
  endTime: string;
  /** Jede Zeit dieser Person an diesem Bericht ist abgerechnet. */
  billed: boolean;
};

export type DailyReportDraft = {
  id?: string;
  orderId: string;
  /** `YYYY-MM-DD`. */
  date: string;
  weatherMorning: string;
  weatherAfternoon: string;
  temperatureMorning: string;
  temperatureAfternoon: string;
  workDone: string;
  notes: string;
  attendance: DailyReportAttendance[];
};

export type DailyReportIssue =
  | 'date'
  | 'weatherMorning'
  | 'weatherAfternoon'
  | 'temperatureMorning'
  | 'temperatureAfternoon'
  | 'attendance'
  | 'time'
  | 'workDone';

const DEFAULT_START = '07:00';
const DEFAULT_END = '16:00';

export function emptyDailyReport(orderId: string, ownEmploymentId?: string): DailyReportDraft {
  return {
    orderId,
    date: todayIso(),
    weatherMorning: '',
    weatherAfternoon: '',
    temperatureMorning: '',
    temperatureAfternoon: '',
    workDone: '',
    notes: '',
    attendance: ownEmploymentId
      ? [
          {
            employmentId: ownEmploymentId,
            startTime: DEFAULT_START,
            endTime: DEFAULT_END,
            billed: false,
          },
        ]
      : [],
  };
}

export function emptyAttendance(employmentId: string): DailyReportAttendance {
  return {
    employmentId,
    startTime: DEFAULT_START,
    endTime: DEFAULT_END,
    billed: false,
  };
}

/** Temperatur aus dem Feld. Leer und Unlesbares sind `null`, nie eine geratene 0. */
export function parseTemperature(value: string): number | null {
  const trimmed = value.trim().replace(',', '.');
  if (!trimmed) return null;
  if (!/^[+-]?\d+(\.\d+)?$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Gespeicherte Temperatur wieder ins Feld, mit deutschem Komma. */
export function temperatureToInput(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '';
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 4 }).format(value);
}

/** Anzeige, z. B. „26 °C“ oder „26,5 °C“. */
export function formatTemperature(value: number | null): string {
  const input = temperatureToInput(value);
  return input ? `${input} °C` : '';
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/**
 * Dieselben Pflichtfelder wie der Assistent in der Handy-App, ohne Material,
 * Fotos und Mängel.
 *
 * `bookable` entscheidet, für wen Von/Bis Pflicht sind. Abgerechnete Zeilen
 * zählen nicht: die werden nicht geschrieben.
 */
export function dailyReportIssue(
  draft: DailyReportDraft,
  bookable: (employmentId: string) => boolean,
): DailyReportIssue | null {
  if (!isIsoDate(draft.date)) return 'date';
  if (!draft.weatherMorning.trim()) return 'weatherMorning';
  if (!draft.weatherAfternoon.trim()) return 'weatherAfternoon';
  if (parseTemperature(draft.temperatureMorning) == null) return 'temperatureMorning';
  if (parseTemperature(draft.temperatureAfternoon) == null) return 'temperatureAfternoon';
  if (draft.attendance.length === 0) return 'attendance';

  for (const person of draft.attendance) {
    if (!bookable(person.employmentId) || person.billed) continue;
    if (!entryRange(draft.date, person.startTime, person.endTime)) return 'time';
  }

  if (!draft.workDone.trim()) return 'workDone';
  return null;
}
