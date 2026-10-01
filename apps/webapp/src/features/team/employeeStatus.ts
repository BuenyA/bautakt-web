import type { EmployeeStatus } from '@bautakt/core';

/** Chip-Werte der Mitarbeiterliste. Default ohne Query ist `active`. */
export type EmployeeListFilter = 'all' | EmployeeStatus;

/**
 * Listenstatus einer Beschäftigung, analog Mobile `EmployeeStatus`.
 *
 * `ended_at` ist inaktiv, alles andere aktiv. `pending` steht im Typ, weil
 * der Chip ihn anbietet — an `employments` hängt kein Einladungs-Flag
 * (Einladungen liegen in `employment_invitations`). Ohne Flag trifft der
 * Filter niemanden; der Chip bleibt.
 *
 * `user_id` null ist kein Pending: manuelle Beschäftigte ohne Konto sind
 * aktiv (`create_manual_employment`).
 */
export function employmentListStatus(row: { ended_at: string | null }): EmployeeStatus {
  if (row.ended_at) return 'inactive';
  return 'active';
}

export function employeeFilterFromSearch(value: string | null): EmployeeListFilter {
  if (value === 'all' || value === 'pending' || value === 'inactive' || value === 'active') {
    return value;
  }
  return 'active';
}
