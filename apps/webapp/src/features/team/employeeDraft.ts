import type { EmployeeRow } from './useEmployees';

/**
 * Formularzustand eines Mitarbeiters.
 *
 * Eigene Datei, damit die Komponente nur Komponenten exportiert (Fast Refresh).
 */
export type EmployeeDraft = {
  id?: string;
  firstName: string;
  lastName: string;
  role: string;
  jobTitle: string;
  email: string;
  phone: string;
};

export function emptyEmployee(): EmployeeDraft {
  return { firstName: '', lastName: '', role: '', jobTitle: '', email: '', phone: '' };
}

/**
 * Aus einer Listenzeile einen Formularzustand machen.
 *
 * Der Anzeigename kommt aus einem Feld und wird hier am ersten Leerzeichen
 * geteilt — die Liste fuehrt Vor- und Nachnamen bereits zusammen. Bei
 * mehrteiligen Nachnamen („von der Heide") bleibt alles nach dem ersten Wort
 * zusammen, was haeufiger richtig ist als die Umkehrung.
 */
export function draftFromEmployee(row: EmployeeRow): EmployeeDraft {
  const [firstName = '', ...rest] = row.name.trim().split(' ');
  return {
    id: row.id,
    firstName,
    lastName: rest.join(' '),
    role: row.role,
    jobTitle: row.job_title,
    email: row.contact_email,
    phone: row.contact_phone,
  };
}
