import { type EmployeePermissions, hasPermission } from '@bautakt/core';

/**
 * Darf dieses Konto den Eintrag ändern oder löschen?
 *
 * Team-Erfassung gilt für jede Zeile des Betriebs. Nur `canTrackTime` gilt für
 * Zeilen, deren `user_id` der angemeldete Nutzer ist — das ist dieselbe Grenze
 * wie Insert, Update und Delete. Ein leeres `user_id` ist keine eigene Zeile.
 *
 * Das blendet Knöpfe aus. Die Datenbank bleibt die Kontrolle.
 */
export function canEditTimeEntry(
  permissions: Partial<EmployeePermissions> | null | undefined,
  userId: string | null | undefined,
  entry: { user_id: string | null },
): boolean {
  if (hasPermission(permissions, 'canTrackTimeForTeam')) return true;
  return hasPermission(permissions, 'canTrackTime') && Boolean(userId) && entry.user_id === userId;
}

/** Anlegen: eigene Zeit oder Zeit fürs Team. */
export function canCreateTimeEntry(
  permissions: Partial<EmployeePermissions> | null | undefined,
): boolean {
  return (
    hasPermission(permissions, 'canTrackTime') || hasPermission(permissions, 'canTrackTimeForTeam')
  );
}
