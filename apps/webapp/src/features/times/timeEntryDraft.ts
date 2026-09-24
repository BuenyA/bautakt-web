import { todayIso } from '@bautakt/finance';

/**
 * Formularzustand eines Zeiteintrags.
 *
 * Datum und Uhrzeiten stehen getrennt, weil man sie so eingibt: „Dienstag, 7
 * bis 16 Uhr". Zusammengesetzt wird erst beim Speichern.
 *
 * Eigene Datei, damit die Komponente nur Komponenten exportiert (Fast Refresh).
 */
export type TimeEntryDraft = {
  id?: string;
  orderId: string;
  employmentId: string;
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes: string;
  note: string;
};

export function emptyTimeEntry(): TimeEntryDraft {
  return {
    orderId: '',
    employmentId: '',
    date: todayIso(),
    startTime: '07:00',
    endTime: '16:00',
    breakMinutes: '30',
    note: '',
  };
}

/**
 * Kalendertag plus Ortszeit als Zeitstempel.
 *
 * ⚠️ Bewusst über die lokalen Bestandteile und nicht über einen
 * zusammengebauten ISO-String: `new Date('2026-09-24T07:00')` ist zwar lokal,
 * `…T07:00Z` aber UTC — ein Buchstabe Unterschied und die Stunde stimmt nicht
 * mehr. So kann der Fehler gar nicht erst entstehen.
 */
export function toTimestamp(dateIso: string, time: string): string | null {
  if (!dateIso || !time) return null;
  const [year, month, day] = dateIso.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, hour || 0, minute || 0, 0, 0).toISOString();
}

/** Zeitstempel als `HH:MM` in Ortszeit — Gegenstück zu `toTimestamp`. */
export function toTimeInput(timestamp: string | null): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
