import { Badge } from '@bautakt/ui';
import { useTranslation } from 'react-i18next';

const KNOWN_STATUSES = ['quote', 'active', 'finished', 'declined'] as const;

export type OrderStatus = (typeof KNOWN_STATUSES)[number] | string;

/** Farbe folgt der Bedeutung, nicht dem Geschmack — dieselben Toene wie in der App. */
function statusVariant(status: string) {
  switch (status) {
    case 'quote':
      return 'accent' as const;
    case 'active':
      return 'success' as const;
    case 'declined':
      return 'destructive' as const;
    default:
      return 'muted' as const;
  }
}

export function OrderStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const known = (KNOWN_STATUSES as readonly string[]).includes(status);
  const label = known ? t(`domain:orderStatus.${status}`) : status;

  return <Badge variant={statusVariant(status)}>{label}</Badge>;
}
