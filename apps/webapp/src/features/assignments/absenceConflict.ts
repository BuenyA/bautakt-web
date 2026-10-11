/**
 * Wer im Zeitraum eines Einsatzes abwesend ist.
 *
 * Genehmigte Abwesenheiten sperrt die Datenbank
 * (`WORK_ASSIGNMENT_ABSENCE_CONFLICT`, Migration
 * `20261011211438_work_assignment_absence_conflict` in bautakt-app); offene
 * Anträge sind nur ein Hinweis. Verglichen werden Kalendertage in Ortszeit,
 * wie im Trigger.
 *
 * Ohne Importe, damit `node --test` die Datei direkt laden kann.
 */
export type AbsenceLike = {
  employment_id: string;
  type: string;
  status: string;
  start_date: string;
  end_date: string;
};

export type AbsenceConflict<T extends AbsenceLike> = {
  /** Genehmigt: Einteilen ist gesperrt. */
  approved: T | null;
  /** Beantragt, noch nicht entschieden: nur ein Hinweis. */
  pending: T | null;
};

/** Überschneidung zweier Tagesbereiche `YYYY-MM-DD`, Grenzen eingeschlossen. */
function overlaps(start: string, end: string, absence: AbsenceLike): boolean {
  return absence.start_date <= end && absence.end_date >= start;
}

export function absenceConflict<T extends AbsenceLike>(
  absences: readonly T[],
  employmentId: string,
  startDay: string,
  endDay: string,
): AbsenceConflict<T> {
  let approved: T | null = null;
  let pending: T | null = null;
  if (!startDay || !endDay) return { approved, pending };
  for (const absence of absences) {
    if (absence.employment_id !== employmentId) continue;
    if (!overlaps(startDay, endDay, absence)) continue;
    if (absence.status === 'genehmigt') approved ??= absence;
    else if (absence.status === 'ausstehend') pending ??= absence;
  }
  return { approved, pending };
}
