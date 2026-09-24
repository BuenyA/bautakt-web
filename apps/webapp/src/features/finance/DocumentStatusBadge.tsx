import { Badge } from '@bautakt/ui';
import { useTranslation } from 'react-i18next';

const KNOWN_STATUSES = [
  'draft',
  'issued',
  'sent',
  'partially_paid',
  'paid',
  'overdue',
  'cancelled',
] as const;

/**
 * Farbe folgt der Bedeutung: bezahlt gruen, ueberfaellig rot, Entwurf neutral.
 * „Versendet" bleibt bewusst blass — versendet heisst noch nicht bezahlt.
 */
function statusVariant(status: string) {
  switch (status) {
    case 'paid':
      return 'success' as const;
    case 'overdue':
      return 'destructive' as const;
    case 'partially_paid':
      return 'warning' as const;
    case 'sent':
    case 'issued':
      return 'accent' as const;
    case 'cancelled':
      return 'outline' as const;
    default:
      return 'muted' as const;
  }
}

export function DocumentStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const known = (KNOWN_STATUSES as readonly string[]).includes(status);

  return (
    <Badge variant={statusVariant(status)}>
      {known ? t(`domain:documentStatus.${status}`) : status}
    </Badge>
  );
}
