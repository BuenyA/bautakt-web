/**
 * Summen über Zeiteinträge — für den Auftrag (wer hat wie viel gearbeitet)
 * und die Mitarbeiterseite (wie viel im Zeitraum).
 *
 * Rein und ohne `@/`-Importe, damit `node --test` die Datei direkt lädt.
 * Gezählt wird netto (Ende − Beginn − Pause). Laufende Einträge ohne Ende
 * zählen mit 0 Minuten, aber als Eintrag.
 */
export type TotalsRow = {
  employment_id: string | null;
  employee_name: string;
  started_at: string;
  ended_at: string | null;
  break_minutes: number | null;
};

export type EmployeeTotal = {
  /** `employment_id`, sonst der Name — alte Einträge haben keine Beschäftigung. */
  key: string;
  name: string;
  minutes: number;
  count: number;
};

export function netMinutes(
  row: Pick<TotalsRow, 'started_at' | 'ended_at' | 'break_minutes'>,
): number {
  if (!row.ended_at) return 0;
  const start = new Date(row.started_at).getTime();
  const end = new Date(row.ended_at).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.round((end - start) / 60_000) - Math.max(0, row.break_minutes ?? 0));
}

export function sumNetMinutes(rows: readonly TotalsRow[]): number {
  return rows.reduce((sum, row) => sum + netMinutes(row), 0);
}

/** Eine Zeile je Mitarbeiter, die meisten Stunden zuerst, bei Gleichstand nach Name. */
export function totalsByEmployee(rows: readonly TotalsRow[]): EmployeeTotal[] {
  const byKey = new Map<string, EmployeeTotal>();
  for (const row of rows) {
    const key = row.employment_id ?? `name:${row.employee_name}`;
    const current = byKey.get(key) ?? { key, name: row.employee_name, minutes: 0, count: 0 };
    current.minutes += netMinutes(row);
    current.count += 1;
    if (!current.name && row.employee_name) current.name = row.employee_name;
    byKey.set(key, current);
  }
  return [...byKey.values()].sort(
    (a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name, 'de'),
  );
}

/** „8:00 Std.“ — dieselbe Schreibweise wie `formatNetDuration`. */
export function formatMinutesAsHours(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')} Std.`;
}
