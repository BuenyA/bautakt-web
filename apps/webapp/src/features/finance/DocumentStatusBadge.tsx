import { StatusBadge, type StatusTone } from '@bautakt/ui';
import { useTranslation } from 'react-i18next';

const KNOWN_STATUSES = [
  'draft',
  'issued',
  'sent',
  'partially_paid',
  'paid',
  'overdue',
  'cancelled',
];

/**
 * Farbe folgt der Bedeutung: bezahlt gruen, ueberfaellig rot, Entwurf neutral.
 * „Versendet" bleibt bewusst blass — versendet heisst noch nicht bezahlt.
 */
function statusTone(status: string): StatusTone {
  switch (status) {
    case 'paid':
      return 'success';
    case 'overdue':
      return 'danger';
    case 'partially_paid':
      return 'warning';
    case 'sent':
    case 'issued':
      return 'brand';
    case 'cancelled':
      return 'outline';
    default:
      return 'neutral';
  }
}

export function DocumentStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const known = (KNOWN_STATUSES as readonly string[]).includes(status);

  return (
    <StatusBadge tone={statusTone(status)}>
      {known ? t(`domain:documentStatus.${status}`) : status}
    </StatusBadge>
  );
}
