import { parseIsoDay } from '@bautakt/ui';

/**
 * `validateBirthDate` aus `app/lib/utils/dateUtils.ts`.
 *
 * Tag 1–31, Monat 1–12, und der Tag muss im Kalender existieren (`31.02.`
 * nicht). Nicht in der Zukunft, nicht älter als 150 Jahre. Kein Mindestalter.
 */
export const MAX_BIRTH_AGE_YEARS = 150;

export type BirthDateIssue = 'empty' | 'invalid' | 'future' | 'age';

export function birthDateIssue(iso: string, today = new Date()): BirthDateIssue | null {
  if (!iso.trim()) return 'empty';

  const day = parseIsoDay(iso);
  if (!day) return 'invalid';

  const [year, month, date] = day.split('-').map(Number);
  if (month < 1 || month > 12 || date < 1 || date > 31) return 'invalid';

  const birth = new Date(year, month - 1, date);
  if (birth.getFullYear() !== year || birth.getMonth() !== month - 1 || birth.getDate() !== date) {
    return 'invalid';
  }

  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (birth > current) return 'future';

  const oldest = new Date(current);
  oldest.setFullYear(oldest.getFullYear() - MAX_BIRTH_AGE_YEARS);
  if (birth < oldest) return 'age';
  return null;
}
