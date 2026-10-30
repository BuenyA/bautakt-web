import type { TFunction } from 'i18next';

import { netMinutes } from '@/features/times/timeTotals';
import type { TimeEntryListRow } from '@/features/times/useTimeEntries';

import { countWorkingDays, formatDays, type LeaveQuota } from './leaveQuota';
import type { AbsenceRow } from './useAbsences';

/** Zahlen der Mitarbeiterseite, getrennt von den Karten (Fast Refresh). */

export function leaveFigureNote(t: TFunction, quota: LeaveQuota) {
  if (quota.remaining < 0) {
    return t('domain:employeeProfile.stats.leaveOverbooked', {
      days: formatDays(-quota.remaining),
    });
  }
  const values = {
    total: formatDays(quota.entitlement),
    used: formatDays(quota.used),
    pending: formatDays(quota.pending),
  };
  return quota.pending > 0
    ? t('domain:employeeProfile.stats.leaveNotePending', values)
    : t('domain:employeeProfile.stats.leaveNote', values);
}

/** Fehltage einer Abwesenheit, so gezählt wie der Urlaub. */
export function absenceDays(absence: AbsenceRow, countWeekends: boolean): number {
  return countWorkingDays(absence.start_date, absence.end_date, countWeekends);
}

export type EmployeeOrder = {
  orderId: string;
  name: string;
  /** Letzter Einsatz oder letzte gebuchte Zeit. */
  lastAt: string;
  minutes: number;
};

/** Aufträge aus Einsätzen und gebuchten Zeiten, zuletzt besuchte zuerst. */
export function collectOrders(
  assignments: readonly { orderId: string; orderName: string; startsAt: string }[],
  entries: readonly TimeEntryListRow[],
): EmployeeOrder[] {
  const byId = new Map<string, EmployeeOrder>();
  const touch = (orderId: string, name: string, at: string, minutes: number) => {
    const current = byId.get(orderId) ?? { orderId, name, lastAt: at, minutes: 0 };
    if (at > current.lastAt) current.lastAt = at;
    if (!current.name) current.name = name;
    current.minutes += minutes;
    byId.set(orderId, current);
  };
  for (const assignment of assignments) {
    touch(assignment.orderId, assignment.orderName, assignment.startsAt, 0);
  }
  for (const entry of entries)
    touch(entry.order_id, entry.order_name, entry.started_at, netMinutes(entry));
  return [...byId.values()].sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}
