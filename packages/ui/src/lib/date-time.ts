/**
 * Datum und Uhrzeit für Eingabefelder.
 *
 * Angezeigt wird deutsch: `TT.MM.JJJJ` und `HH:MM`. Gespeichert bleibt, was
 * die Datenbank und die Handy-App schon kennen: ein Kalendertag `YYYY-MM-DD`
 * und eine Uhrzeit `HH:MM`. Kein UTC-Umweg — `toISOString()` würde in
 * Deutschland den Vortag liefern.
 */

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const GERMAN_DAY = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
const CLOCK = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

/** Echter Kalendertag als `YYYY-MM-DD`, sonst `null`. `2026-02-31` ist keiner. */
export function parseIsoDay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const match = ISO_DAY.exec(iso.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
}

/** Lokales `Date` als `YYYY-MM-DD`. Nicht `toISOString()` — das wandert nach UTC. */
export function dateToIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** `YYYY-MM-DD` als lokales Datum, oder `undefined` wenn es keiner ist. */
export function isoToLocalDate(iso: string | null | undefined): Date | undefined {
  const day = parseIsoDay(iso);
  if (!day) return undefined;
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date);
}

/** `YYYY-MM-DD` als `TT.MM.JJJJ`. Leer, wenn es kein Kalendertag ist. */
export function formatGermanDate(iso: string | null | undefined): string {
  const day = parseIsoDay(iso);
  if (!day) return '';
  const [year, month, date] = day.split('-');
  return `${date}.${month}.${year}`;
}

/**
 * `TT.MM.JJJJ` als `YYYY-MM-DD`.
 *
 * Ein- und zweistellige Tage und Monate gelten (`9.10.2026`). `31.02.2026`
 * und der 29. Februar außerhalb eines Schaltjahres sind `null`.
 */
export function parseGermanDate(text: string): string | null {
  const match = GERMAN_DAY.exec(text.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return dateToIso(date);
}

/** Tippen und Einfügen auf `TT.MM.JJJJ` zuschneiden. Ein ISO-Tag wird übersetzt. */
export function maskGermanDate(raw: string): string {
  const trimmed = raw.trim();
  if (parseIsoDay(trimmed)) return formatGermanDate(trimmed);

  const cleaned = raw.replace(/[^\d.]/g, '');
  if (cleaned.includes('.')) {
    const parts = cleaned.split('.');
    const day = (parts[0] ?? '').slice(0, 2);
    const month = (parts[1] ?? '').slice(0, 2);
    const year = (parts[2] ?? '').slice(0, 4);
    const dots = parts.length - 1;
    if (dots === 1 && parts[1] === '' && cleaned.endsWith('.')) return `${day}.`;
    if (dots === 1) return month ? `${day}.${month}` : `${day}.`;
    if ((parts[2] ?? '') === '' && cleaned.endsWith('.')) return `${day}.${month}.`;
    return `${day}.${month}.${year}`;
  }

  const digits = cleaned.slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

/**
 * Uhrzeit als `HH:MM` (00–23, 00–59).
 *
 * `7:00` wird zu `07:00`. Sekunden (`07:00:00`) fallen weg. `25:00` ist `null`.
 */
export function parseTimeValue(input: string): string | null {
  const match = CLOCK.exec(input.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = match[3] == null ? 0 : Number(match[3]);
  if (hour > 23 || minute > 59 || second > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** Tippen auf `HH:MM` zuschneiden. Ungültige Stunden bleiben stehen, damit die Meldung sie zeigen kann. */
export function maskTimeInput(raw: string): string {
  const cleaned = raw.replace(/[^\d:]/g, '');
  if (cleaned.includes(':')) {
    const parts = cleaned.split(':');
    const hour = (parts[0] ?? '').slice(0, 2);
    const minute = (parts[1] ?? '').replace(/\D/g, '').slice(0, 2);
    if ((parts[1] ?? '') === '' && cleaned.endsWith(':')) return `${hour}:`;
    return minute ? `${hour}:${minute}` : hour;
  }
  const digits = cleaned.slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

/**
 * Ende liegt vor Beginn. Gleicher Tag zählt nicht.
 * Fehlt eine Seite oder ist sie kein Kalendertag, ist es kein Bereichsfehler.
 */
export function isEndBeforeStart(startIso: string, endIso: string): boolean {
  const start = parseIsoDay(startIso);
  const end = parseIsoDay(endIso);
  if (!start || !end) return false;
  return end < start;
}
