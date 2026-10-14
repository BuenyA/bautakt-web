import { StatusBadge, type StatusTone } from '@bautakt/ui';
import { useTranslation } from 'react-i18next';

import type { ContactRole } from './contactModel';

const TONES: Record<ContactRole, StatusTone> = {
  customer: 'brand',
  supplier: 'outline',
  subcontractor: 'warning',
  other: 'neutral',
};

/** Rollen eines Kontakts als kleine Abzeichen (Liste, Kopf der Detailseite). */
export function ContactRoleBadges({ roles }: { roles: readonly ContactRole[] }) {
  const { t } = useTranslation();
  if (roles.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {roles.map((role) => (
        <StatusBadge key={role} tone={TONES[role]}>
          {t(`domain:contactRoles.${role}`)}
        </StatusBadge>
      ))}
    </span>
  );
}
