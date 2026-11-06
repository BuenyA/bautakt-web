/**
 * Kündigung mit 7 Tagen Bedenkzeit (Löschkonzept WP6, bautakt-app Migration
 * 20261106233413_b_company_termination). Die Datenbank entscheidet; hier nur Anzeigezustand
 * und Fehlertexte, ohne React.
 */
import { dayBefore, type LifecycleRow } from '../company/lifecycle.ts';

export type TerminationState =
  | { kind: 'active' }
  /** Bedenkzeit läuft. Widerruf bis einschließlich `revocableUntil`. */
  | { kind: 'pending'; contractEnd: string; revocableUntil: string; canRevoke: boolean }
  /** Vertragsende erreicht: kein Widerruf mehr, nur noch Export (Seite zeigt den Hinweis). */
  | { kind: 'ended'; contractEnd: string | null };

/** Heute in Europe/Berlin als `YYYY-MM-DD`, wie die Datenbank rechnet. */
export function berlinToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function terminationState(row: LifecycleRow | undefined, today: string): TerminationState {
  if (!row || row.lifecycle_status === 'active') return { kind: 'active' };
  if (row.lifecycle_status === 'terminating' && row.contract_end_date) {
    const revocableUntil = dayBefore(row.contract_end_date);
    return {
      kind: 'pending',
      contractEnd: row.contract_end_date,
      revocableUntil,
      // Am Tag E lehnt die Datenbank ab, auch wenn der Job noch nicht umgestellt hat.
      canRevoke: today <= revocableUntil,
    };
  }
  return { kind: 'ended', contractEnd: row.contract_end_date };
}

const ERRORS: Record<string, string> = {
  COMPANY_TERMINATION_REAUTH_REQUIRED: 'companySettings:delete.errors.reauth',
  COMPANY_TERMINATION_NOT_OWNER: 'companySettings:delete.errors.notOwner',
  COMPANY_TERMINATION_EXPORT_NOTICE: 'companySettings:delete.errors.exportNotice',
  COMPANY_TERMINATION_NOT_ACTIVE: 'companySettings:delete.errors.notActive',
  COMPANY_TERMINATION_NOT_REVOCABLE: 'companySettings:delete.errors.notRevocable',
};

/** Übersetzungsschlüssel zur Meldung der RPC. Die Meldung beginnt mit dem Code. */
export function terminationErrorKey(message: string | null | undefined): string {
  const code = (message ?? '').split(':')[0]!.trim();
  return ERRORS[code] ?? 'companySettings:delete.errors.unknown';
}
