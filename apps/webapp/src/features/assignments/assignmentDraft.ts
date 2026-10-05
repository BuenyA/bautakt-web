import { todayIso } from '@bautakt/finance';

/**
 * Formularzustand eines Einsatzes.
 *
 * Datum und Uhrzeit stehen getrennt, weil man sie so eingibt. Zusammengesetzt
 * wird erst beim Speichern, und ein Einsatz darf ueber Mitternacht oder ueber
 * mehrere Tage gehen — anders als der Zeiteintrag, der an einem Tag haengt.
 *
 * Eigene Datei, damit die Komponente nur Komponenten exportiert (Fast Refresh).
 */
export type AssignmentDraft = {
  orderId: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  employmentIds: string[];
  note: string;
};

export function emptyAssignment(): AssignmentDraft {
  const today = todayIso();
  return {
    orderId: '',
    startDate: today,
    startTime: '07:00',
    endDate: today,
    endTime: '16:00',
    employmentIds: [],
    note: '',
  };
}
