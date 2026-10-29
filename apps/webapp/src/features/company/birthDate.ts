import { parseIsoDay } from '@bautakt/ui';

/**
 * Dieselben drei Regeln wie `validateBirthDate` in der App
 * (`app/lib/utils/validationUtils.ts`, vom Sign-up aufgerufen): echtes Datum,
 * nicht in der Zukunft, plausibles Alter.
 *
 * Die Zahlen 14 und 120 stehen nicht in den kopierten Mobile-Dateien. 14 ist
 * das juengste Alter, das ein Konto in der App noch durchlassen sollte
 * (Ausbildung), 120 wirft Jahreszahlen wie 01.01.1000 raus. Der Server selbst
 * prueft `birthday` nicht.
 */
export const MIN_BIRTH_AGE = 14;
export const MAX_BIRTH_AGE = 120;

export type BirthDateIssue = 'empty' | 'invalid' | 'future' | 'age';

export function birthDateIssue(iso: string, today = new Date()): BirthDateIssue | null {
  const day = parseIsoDay(iso);
  if (!iso.trim() || !day) return iso.trim() ? 'invalid' : 'empty';

  const [year, month, date] = day.split('-').map(Number);
  const birth = new Date(year, month - 1, date);
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (birth > current) return 'future';

  let age = current.getFullYear() - year;
  const monthDelta = current.getMonth() - (month - 1);
  if (monthDelta < 0 || (monthDelta === 0 && current.getDate() < date)) age -= 1;
  if (age < MIN_BIRTH_AGE || age > MAX_BIRTH_AGE) return 'age';
  return null;
}
