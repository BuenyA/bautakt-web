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
 * Darf dieses Konto den Bericht im Web löschen?
 *
 * Zusätzlich zum Bearbeitungsrecht (`canManageOrders` oder eigener Bericht
 * mit `canCreateAndViewReports`) ist `canTrackTimeForTeam` Pflicht. Ohne das
 * Team-Recht sieht das Konto fremde Zeiten nicht, und die Kaskade würde sie
 * trotzdem entfernen. Der Knopf fehlt dann ganz.
 */
export function canDeleteDailyReport(
  permissions: Partial<EmployeePermissions> | null | undefined,
  userId: string | null | undefined,
  report: { userId: string },
): boolean {
  return (
    hasPermission(permissions, 'canTrackTimeForTeam') &&
    canEditDailyReport(permissions, userId, report)
  );
}

/**
 * Sieht dieses Konto jede Zeile, die ein Löschen per CASCADE mitnehmen würde?
 *
 * Gemessen 2026-10-08, SELECT-Policies. `canTrackTimeForTeam` reicht dafür
 * nicht. Material ist nur vollständig sichtbar mit Finanzrecht oder mit
 * `canRecordMaterials` zusammen mit `canManageOrders`. Sonst ist eine Zählung
 * von 0 kein Beweis, dass keine Zeile hängt.
 *
 * Fotos: `is_company_member(company_id)`, ohne weiteres Recht. Mängel:
 * Mitglied und `canCreateAndViewReports`. Zeiten: `canTrackTimeForTeam` oder
 * Finanz- bzw. Lohnrecht.
 */
export function seesEveryReportLink(
  permissions: Partial<EmployeePermissions> | null | undefined,
): boolean {
  const times =
    hasPermission(permissions, 'canTrackTimeForTeam') ||
    hasPermission(permissions, 'canViewCompanyFinance') ||
    hasPermission(permissions, 'canViewWageCosts');
  const issues = hasPermission(permissions, 'canCreateAndViewReports');
  const materials =
    hasPermission(permissions, 'canViewCompanyFinance') ||
    hasPermission(permissions, 'canViewOrderFinance') ||
    (hasPermission(permissions, 'canRecordMaterials') &&
      hasPermission(permissions, 'canManageOrders'));
  return times && issues && materials;
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
