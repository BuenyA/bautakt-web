import { StatusBadge, type StatusTone } from '@bautakt/ui';
import { useTranslation } from 'react-i18next';

const KNOWN_STATUSES = ['quote', 'active', 'finished', 'declined'];

export type OrderStatus = (typeof KNOWN_STATUSES)[number] | string;

/** Farbe folgt der Bedeutung, nicht dem Geschmack — dieselben Toene wie in der App. */
function statusTone(status: string): StatusTone {
  switch (status) {
    case 'quote':
      return 'brand';
    case 'active':
      return 'success';
    case 'declined':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function OrderStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const known = (KNOWN_STATUSES as readonly string[]).includes(status);
  const label = known ? t(`domain:orderStatus.${status}`) : status;

  return <StatusBadge tone={statusTone(status)}>{label}</StatusBadge>;
}
