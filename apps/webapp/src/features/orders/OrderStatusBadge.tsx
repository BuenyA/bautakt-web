import { cn } from '@bautakt/ui';
import { useTranslation } from 'react-i18next';

const KNOWN_STATUSES = ['quote', 'active', 'finished', 'declined'] as const;

export type OrderStatus = (typeof KNOWN_STATUSES)[number] | string;

function statusTone(status: string): string {
  switch (status) {
    case 'quote':
      return 'bg-accent text-accent-foreground';
    case 'active':
      return 'bg-success-bg text-success';
    case 'finished':
      return 'bg-surface text-muted-foreground';
    case 'declined':
      return 'bg-destructive-bg text-destructive';
    default:
      return 'bg-surface text-muted-foreground';
  }
}

export function OrderStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const known = (KNOWN_STATUSES as readonly string[]).includes(status);
  const label = known ? t(`domain:orderStatus.${status}`) : status;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        statusTone(status),
      )}
    >
      {label}
    </span>
  );
}
