/**
 * Das Berechtigungsmodell von Bautakt.
 *
 * ⚠️ KOPIE. Die Quelle ist bautakt-app/app/lib/employees/types.ts und
 * .../permissions.ts (Stand 2026-08-26). Die beiden Repos sind getrennt, ein
 * echtes geteiltes Paket haette entweder ein npm-Release bei jeder
 * Schema-Aenderung oder ein Submodul gebraucht — beides teurer als das Problem.
 *
 * Massgeblich ist ohnehin keins der beiden Repos, sondern Postgres: die Keys
 * stehen in der JSONB-Spalte `company_roles.permissions`. Deshalb gibt es
 * `scripts/check-permission-drift.ts`, der genau dagegen prueft. Drift wird
 * gegen das Ergebnis festgestellt, nicht gegen die Konfiguration.
 *
 * ⚠️ UI-Gating mit diesen Flags ist Fuehrung, keine Kontrolle. Die bindenden
 * Grenzen sind die RLS-Policies (`has_company_permission(company_id, 'canX')`)
 * und die `enforce_*`-Trigger. Ein verstecktes Element ist keine
 * Zugriffskontrolle.
 */

export type EmployeePermissions = {
  canTrackTime: boolean;
  canTrackTimeForTeam: boolean;
  canCreateAndViewReports: boolean;
  canRecordMaterials: boolean;
  canManageCatalog: boolean;
  canViewChecklist: boolean;
  canEditChecklist: boolean;
  canViewNotes: boolean;
  canCreateNotes: boolean;
  canTakePhotos: boolean;
  canViewDocuments: boolean;
  canUploadAndEditDocuments: boolean;
  canCreateOrders: boolean;
  canManageOrders: boolean;
  canCompleteOrders: boolean;
  canManageAllCalendar: boolean;
  canManageWorkAssignments: boolean;
  canUseBillingModule: boolean;
  canViewManagementInvoices: boolean;
  canViewOrderFinance: boolean;
  canViewWageCosts: boolean;
  canManageRates: boolean;
  canManageOverheadCosts: boolean;
  canViewCompanyFinance: boolean;
  canManageCustomers: boolean;
  canManageCostCenters: boolean;
  canManageEmployees: boolean;
  canManageAbsences: boolean;
  canManageRoles: boolean;
  canSendNotifications: boolean;
  canEditCompanyMasterData: boolean;
  canManageCompanySettings: boolean;
  canManageLicenses: boolean;
};

export type PermissionKey = keyof EmployeePermissions;

/** Rechte einer Rolle ohne Template. Identisch zu bautakt-app. */
export const DEFAULT_PERMISSIONS: EmployeePermissions = {
  canTrackTime: true,
  canTrackTimeForTeam: false,
  canCreateAndViewReports: true,
  canRecordMaterials: true,
  canManageCatalog: false,
  canViewChecklist: true,
  canEditChecklist: true,
  canViewNotes: true,
  canCreateNotes: true,
  canTakePhotos: true,
  canViewDocuments: true,
  canUploadAndEditDocuments: false,
  canCreateOrders: false,
  canManageOrders: false,
  canCompleteOrders: false,
  canManageAllCalendar: false,
  canManageWorkAssignments: false,
  canUseBillingModule: false,
  canViewManagementInvoices: false,
  canViewOrderFinance: false,
  canViewWageCosts: false,
  canManageRates: false,
  canManageOverheadCosts: false,
  canViewCompanyFinance: false,
  canManageCustomers: false,
  canManageCostCenters: false,
  canManageEmployees: false,
  canManageAbsences: false,
  canManageRoles: false,
  canSendNotifications: false,
  canEditCompanyMasterData: false,
  canManageCompanySettings: false,
  canManageLicenses: false,
};

export const ALL_PERMISSION_KEYS = Object.keys(DEFAULT_PERMISSIONS) as PermissionKey[];

/**
 * Ein einzelnes Recht pruefen.
 *
 * Faellt bewusst auf `false` zurueck: ein unbekannter oder fehlender Key
 * bedeutet "nicht erlaubt", nie "erlaubt".
 */
export function hasPermission(
  permissions: Partial<EmployeePermissions> | null | undefined,
  key: PermissionKey,
): boolean {
  return permissions?.[key] === true;
}

/** DB-JSONB → App-Permissions. Unbekannte Keys und Nicht-Booleans fliegen raus. */
export function dbPermissionsToApp(
  dbPermissions: Record<string, unknown> | null | undefined,
): Partial<EmployeePermissions> {
  if (!dbPermissions) return {};
  const result: Partial<EmployeePermissions> = {};
  for (const [key, value] of Object.entries(dbPermissions)) {
    if (typeof value !== 'boolean') continue;
    if ((ALL_PERMISSION_KEYS as string[]).includes(key)) {
      result[key as PermissionKey] = value;
    }
  }
  return result;
}

/** App-Permissions → DB-JSONB. */
export function appPermissionsToDb(
  permissions: Partial<EmployeePermissions>,
): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(permissions)) {
    if (typeof value !== 'boolean') continue;
    if ((ALL_PERMISSION_KEYS as string[]).includes(key)) {
      result[key] = value;
    }
  }
  return result;
}
