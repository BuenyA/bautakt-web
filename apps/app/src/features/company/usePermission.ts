import { hasPermission, type PermissionKey } from '@bautakt/core';

import { useMembership } from './useMembership';

/**
 * Ein einzelnes Recht des angemeldeten Nutzers.
 *
 * ⚠️ UI-Gating mit diesem Hook ist Fuehrung, keine Kontrolle. Die bindenden
 * Grenzen sind die RLS-Policies (has_company_permission(company_id, 'canX'))
 * und die enforce_*-Trigger in der Datenbank. Ein ausgeblendeter Menuepunkt
 * ist keine Zugriffskontrolle — wer die URL kennt, ruft sie auf, und dann muss
 * die Datenbank Nein sagen.
 *
 * Faellt bewusst auf false zurueck, solange die Mitgliedschaft laedt.
 */
export function usePermission(key: PermissionKey): boolean {
  const { data } = useMembership();
  return hasPermission(data?.permissions, key);
}
