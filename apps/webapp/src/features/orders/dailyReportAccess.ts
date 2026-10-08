import { type EmployeePermissions, hasPermission } from '@bautakt/core';

/**
 * Darf dieses Konto Bautagebücher sehen und anlegen?
 *
 * Select und Insert verlangen `canCreateAndViewReports`. Insert zusätzlich
 * `user_id = auth.uid()`. Das blendet den Block und den Knopf aus. Die
 * Datenbank bleibt die Kontrolle.
 */
export function canCreateDailyReport(
  permissions: Partial<EmployeePermissions> | null | undefined,
): boolean {
  return hasPermission(permissions, 'canCreateAndViewReports');
}

/**
 * Darf dieses Konto den Bericht ändern oder löschen?
 *
 * Eigener Bericht mit `canCreateAndViewReports`, oder jeder Bericht mit
 * `canManageOrders`. Das ist die Update- und Delete-Policy, gemessen
 * 2026-10-08. Lesen ist enger: ohne `canCreateAndViewReports` liefert die
 * Liste nichts, auch mit `canManageOrders`.
 */
export function canEditDailyReport(
  permissions: Partial<EmployeePermissions> | null | undefined,
  userId: string | null | undefined,
  report: { userId: string },
): boolean {
  if (hasPermission(permissions, 'canManageOrders')) return true;
  return (
    hasPermission(permissions, 'canCreateAndViewReports') &&
    Boolean(userId) &&
    report.userId === userId
  );
}

/**
 * Darf aus diesem Bericht eine Zeit für diese Anstellung entstehen?
 *
 * `canTrackTimeForTeam` gilt für jede Anstellung, auch ohne Konto.
 * Nur `canTrackTime` gilt, wo `user_id` der angemeldete Nutzer ist — dieselbe
 * Grenze wie Insert und Update auf `time_entries`. Ohne eines von beiden
 * wird keine Zeit geschrieben.
 */
export function canBookReportTime(
  permissions: Partial<EmployeePermissions> | null | undefined,
  userId: string | null | undefined,
  employment: { userId: string | null },
): boolean {
  if (hasPermission(permissions, 'canTrackTimeForTeam')) return true;
  return (
    hasPermission(permissions, 'canTrackTime') && Boolean(userId) && employment.userId === userId
  );
}
