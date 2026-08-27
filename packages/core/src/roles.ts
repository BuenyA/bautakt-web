/**
 * Rollen von Bautakt.
 *
 * ⚠️ KOPIE aus bautakt-app (app/lib/employees/types.ts, permissions.ts,
 * roleHierarchy.ts, Stand 2026-08-26). Siehe Hinweis in permissions.ts.
 *
 * Nicht mitportiert: ROLE_OPTIONS und roleIcon (an AppIconName gebunden — das
 * Web braucht erst eine eigene Icon-Entscheidung) sowie die
 * assertCan*-Hierarchiepruefungen (an i18next und den AsyncStorage-Cache
 * gebunden, und erst noetig, wenn das Web Mitarbeiter bearbeiten kann).
 */

/** Die sieben per Trigger geseedeten Systemrollen (`system_role_templates`). */
export type SystemEmployeeRole =
  | 'Praktikant'
  | 'Azubi'
  | 'Mitarbeiter'
  | 'Polier'
  | 'Buchhaltung'
  | 'Bauleiter'
  | 'Geschäftsführer';

/** Stabiler Schluessel in `company_roles.system_key` / `system_role_templates.key`. */
export type SystemRoleKey =
  'intern' | 'apprentice' | 'employee' | 'foreman' | 'accounting' | 'site_manager' | 'owner';

/**
 * Rollenname aus `company_roles.name`. Betriebe koennen eigene Rollen anlegen,
 * daher offen — fuer Lookups auf Systemrollen `isSystemRole()` nutzen.
 */
export type EmployeeRole = string;

export type EmployeeStatus = 'active' | 'inactive' | 'pending';

export const SYSTEM_ROLE_KEY: Record<SystemEmployeeRole, SystemRoleKey> = {
  Praktikant: 'intern',
  Azubi: 'apprentice',
  Mitarbeiter: 'employee',
  Polier: 'foreman',
  Buchhaltung: 'accounting',
  Bauleiter: 'site_manager',
  Geschäftsführer: 'owner',
};

/** Rangfolge fuer Hierarchiepruefungen. Hoeher darf niedriger zuweisen. */
export const SYSTEM_ROLE_RANK: Record<SystemEmployeeRole, number> = {
  Praktikant: 1,
  Azubi: 2,
  Mitarbeiter: 3,
  Polier: 4,
  Buchhaltung: 5,
  Bauleiter: 6,
  Geschäftsführer: 7,
};

export const SYSTEM_ROLES = Object.keys(SYSTEM_ROLE_KEY) as SystemEmployeeRole[];

export function isSystemRole(role: EmployeeRole): role is SystemEmployeeRole {
  return role in SYSTEM_ROLE_KEY;
}

/**
 * Systemschluessel einer Rolle.
 *
 * ⚠️ Bevorzugt immer `company_roles.system_key` aus der Datenbank nutzen, wenn
 * er vorliegt. Diese Funktion geht ueber den Anzeigenamen und ist damit die
 * schwaechere Quelle — in bautakt-app gibt es genau daraus stammende Stellen,
 * die Besitzerrechte an der Zeichenkette "Geschaeftsfuehrer" festmachen.
 */
export function systemKeyForRole(role: EmployeeRole): SystemRoleKey | null {
  return isSystemRole(role) ? SYSTEM_ROLE_KEY[role] : null;
}

export function roleRank(role: EmployeeRole): number {
  return isSystemRole(role) ? SYSTEM_ROLE_RANK[role] : 0;
}
