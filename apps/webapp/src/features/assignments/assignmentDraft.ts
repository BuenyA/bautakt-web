/**
 * Formularzustand eines Einsatzes.
 *
 * Datum und Uhrzeit stehen getrennt, weil man sie so eingibt. Zusammengesetzt
 * wird erst beim Speichern, und ein Einsatz darf ueber Mitternacht oder ueber
 * mehrere Tage gehen — anders als der Zeiteintrag, der an einem Tag haengt.
 *
 * Eigene Datei, damit die Komponente nur Komponenten exportiert (Fast Refresh).
 * Ohne Importe, damit `node --test` sie direkt laden kann.
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

const pad = (value: number) => String(value).padStart(2, '0');

/** Lokaler Kalendertag als `YYYY-MM-DD`. */
function localDay(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Lokale Uhrzeit als `HH:MM`. */
function localClock(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Leerer Einsatz. Ohne Angabe heute 07:00–16:00 (ein Arbeitstag). Aus einem
 * Klick in den Wochenplan: dieser Tag, diese Stunde, eine Stunde lang.
 */
export function emptyAssignment(at?: { dayIso: string; hour: number }): AssignmentDraft {
  if (!at) {
    const today = localDay(new Date());
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
  const [year, month, day] = at.dayIso.split('-').map(Number);
  const start = new Date(year, month - 1, day, at.hour, 0);
  const end = new Date(year, month - 1, day, at.hour + 1, 0);
  return {
    orderId: '',
    startDate: localDay(start),
    startTime: localClock(start),
    endDate: localDay(end),
    endTime: localClock(end),
    employmentIds: [],
    note: '',
  };
}

/** Bestehender Einsatz als Formular, Zeiten in Ortszeit zerlegt. */
export function draftFromAssignment(assignment: {
  order_id: string;
  starts_at: string;
  ends_at: string;
  note: string;
  employmentIds: readonly string[];
}): AssignmentDraft {
  const start = new Date(assignment.starts_at);
  const end = new Date(assignment.ends_at);
  return {
    orderId: assignment.order_id,
    startDate: localDay(start),
    startTime: localClock(start),
    endDate: localDay(end),
    endTime: localClock(end),
    employmentIds: [...assignment.employmentIds],
    note: assignment.note,
  };
}

/**
 * Welche Zuweisungen beim Speichern wegfallen und welche dazukommen.
 *
 * Bewusst als Differenz statt „alle löschen, alle neu“: jeder Insert in
 * `work_assignment_employees` löst eine Push-Nachricht aus. Wer schon
 * eingeteilt war, soll beim Ändern der Notiz nicht erneut benachrichtigt werden.
 */
export function diffEmployees(
  before: readonly string[],
  after: readonly string[],
): { added: string[]; removed: string[] } {
  const previous = new Set(before);
  const next = new Set(after.filter(Boolean));
  return {
    added: [...next].filter((id) => !previous.has(id)),
    removed: [...previous].filter((id) => !next.has(id)),
  };
}
