import { type EmployeePermissions, hasPermission } from '@bautakt/core';

/**
 * Darf dieses Konto Material anlegen?
 *
 * Insert verlangt `user_id = auth.uid()` und `canRecordMaterials`. Das blendet
 * den Knopf aus. Die Datenbank bleibt die Kontrolle.
 */
export function canCreateOrderMaterial(
  permissions: Partial<EmployeePermissions> | null | undefined,
): boolean {
  return hasPermission(permissions, 'canRecordMaterials');
}

/**
 * Darf dieses Konto die Zeile ändern oder löschen?
 *
 * Eigene Zeile mit `canRecordMaterials`, oder jede Zeile mit `canManageOrders`.
 * Das ist die Update- und Delete-Policy, gemessen 2026-10-08. Lesen ist eine
 * andere Grenze: Finanzrollen sehen Zeilen, die sie nicht ändern dürfen.
 */
export function canEditOrderMaterial(
  permissions: Partial<EmployeePermissions> | null | undefined,
  userId: string | null | undefined,
  row: { user_id: string },
): boolean {
  if (hasPermission(permissions, 'canManageOrders')) return true;
  return (
    hasPermission(permissions, 'canRecordMaterials') && Boolean(userId) && row.user_id === userId
  );
}
