/**
 * Löschkonzept WP3: Was der Angemeldete im aktiven Betrieb nach Vertragsende noch darf, und
 * ab WP6 der Hinweis für Inhaber während der Bedenkzeit nach der Kündigung.
 * Quelle ist `my_company_lifecycle()` (bautakt-app, Migration 20261106134437). Die Datenbank
 * sperrt selbst; das hier entscheidet nur, welche Seite und welcher Hinweis erscheint.
 */

export type LifecycleRow = {
  company_id: string;
  company_name: string;
  lifecycle_status: string;
  contract_end_date: string | null;
  export_deadline: string | null;
  delete_after: string | null;
  is_owner: boolean;
  access: string;
};

export type LifecycleView =
  | { kind: 'normal' }
  /** Kündigung beantragt, Bedenkzeit läuft (WP6). Nur für Inhaber, alle arbeiten normal weiter. */
  | { kind: 'terminating'; contractEnd: string }
  | { kind: 'readOnly'; contractEnd: string; exportDeadline: string }
  | {
      kind: 'locked';
      companyName: string;
      isOwner: boolean;
      /** `export_only` (nur Mitarbeitende) oder `locked`. */
      status: string;
      contractEnd: string | null;
      deleteAfter: string | null;
      /** Andere Betriebe, in die der Nutzer wechseln kann. */
      alternatives: { companyId: string; name: string }[];
    };

export function lifecycleView(
  rows: LifecycleRow[] | undefined,
  companyId: string | undefined,
): LifecycleView {
  const row = rows?.find((r) => r.company_id === companyId);
  // Unbekannt heißt hier: noch nicht geladen oder kein Betrieb. Gesperrt wird dann nicht,
  // die Datenbank liefert ohnehin nichts.
  if (
    row?.access === 'write' &&
    row.is_owner &&
    row.lifecycle_status === 'terminating' &&
    row.contract_end_date
  ) {
    return { kind: 'terminating', contractEnd: row.contract_end_date };
  }
  if (!row || row.access === 'write') return { kind: 'normal' };
  if (row.access === 'read' && row.contract_end_date && row.export_deadline) {
    return {
      kind: 'readOnly',
      contractEnd: row.contract_end_date,
      exportDeadline: row.export_deadline,
    };
  }
  return {
    kind: 'locked',
    companyName: row.company_name,
    isOwner: row.is_owner,
    status: row.lifecycle_status,
    contractEnd: row.contract_end_date,
    deleteAfter: row.delete_after,
    alternatives: (rows ?? [])
      .filter((r) => r.company_id !== companyId && r.access !== 'none')
      .map((r) => ({ companyId: r.company_id, name: r.company_name })),
  };
}

/** Ein Tag nach dem Datum, für „ab dem …“. Datum als `YYYY-MM-DD`, ohne Zeitzone. */
export function dayAfter(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const next = new Date(Date.UTC(y!, m! - 1, d! + 1));
  return next.toISOString().slice(0, 10);
}

/** Ein Tag vor dem Datum, für „bis zum …“ (Widerruf bis zum Vortag von E). */
export function dayBefore(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const prev = new Date(Date.UTC(y!, m! - 1, d! - 1));
  return prev.toISOString().slice(0, 10);
}
