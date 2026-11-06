import { StatusBadge, type StatusTone } from '@bautakt/ui';
import { useTranslation } from 'react-i18next';

import { type OrderStatus, toOrderStatus } from './orderList';

/** Farbe folgt der Bedeutung, nicht dem Geschmack — dieselben Toene wie in der App. */
const TONE: Record<OrderStatus, StatusTone> = {
  active: 'success',
  finished: 'neutral',
};

export function OrderStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const normalized = toOrderStatus(status);

  return <StatusBadge tone={TONE[normalized]}>{t(`domain:orderStatus.${normalized}`)}</StatusBadge>;
}
