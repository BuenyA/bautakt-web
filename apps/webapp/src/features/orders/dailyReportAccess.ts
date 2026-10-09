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
 * Sieht dieses Konto jede Zeit?
 *
 * SELECT auf `time_entries`: eigene Zeile, oder `canTrackTimeForTeam`, oder
 * `canViewCompanyFinance`, oder `canViewWageCosts`. Der Löschen-Knopf verlangt
 * das Team-Recht, deshalb ist die Zählung dort vollständig. Gemessen
 * 2026-10-08.
 */
export function seesAllReportTimes(
  permissions: Partial<EmployeePermissions> | null | undefined,
): boolean {
  return (
    hasPermission(permissions, 'canTrackTimeForTeam') ||
    hasPermission(permissions, 'canViewCompanyFinance') ||
    hasPermission(permissions, 'canViewWageCosts')
  );
}

/**
 * Sieht dieses Konto jeden Mangel und jede Anwesenheit am Bericht?
 *
 * SELECT auf `order_issues` und `daily_report_employees` verlangt
 * `canCreateAndViewReports`. Dieselbe Berechtigung braucht die Liste der
 * Berichte. Gemessen 2026-10-08.
 */
export function seesAllReportIssues(
  permissions: Partial<EmployeePermissions> | null | undefined,
): boolean {
  return hasPermission(permissions, 'canCreateAndViewReports');
}

/**
 * Sieht dieses Konto jede Materialzeile, nicht nur die eigene?
 *
 * SELECT auf `order_materials`, gemessen 2026-10-08: vollständig nur mit
 * `canViewCompanyFinance`, `canViewOrderFinance`, oder `canRecordMaterials`
 * zusammen mit `canManageOrders`. Sonst fehlen fremde Zeilen, und eine
 * Zählung von 0 beweist nicht, dass keine Zeile hängt. Fotos sieht jedes
 * Mitglied (`is_company_member`), ohne weiteres Recht.
 */
export function seesAllOrderMaterials(
  permissions: Partial<EmployeePermissions> | null | undefined,
): boolean {
  return (
    hasPermission(permissions, 'canViewCompanyFinance') ||
    hasPermission(permissions, 'canViewOrderFinance') ||
    (hasPermission(permissions, 'canRecordMaterials') &&
      hasPermission(permissions, 'canManageOrders'))
  );
}

/**
 * Sieht dieses Konto jede Zeile, die ein Löschen per CASCADE mitnehmen würde?
 *
 * Zeiten, Mängel und Material wie oben. Fotos sieht jedes Mitglied. Eine
 * fehlende Materialsicht sperrt das Löschen nicht mehr: der Dialog warnt
 * dann, dass unsichtbares Material mitfällt. Zeiten oder Mängel, die das
 * Konto nicht vollständig sieht, bleiben eine Sperre.
 */
export function seesEveryReportLink(
  permissions: Partial<EmployeePermissions> | null | undefined,
): boolean {
  return (
    seesAllReportTimes(permissions) &&
    seesAllReportIssues(permissions) &&
    seesAllOrderMaterials(permissions)
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
