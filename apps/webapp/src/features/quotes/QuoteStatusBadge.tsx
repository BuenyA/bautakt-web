import { StatusBadge, type StatusTone } from '@bautakt/ui';
import { useTranslation } from 'react-i18next';

function statusTone(status: string | null): StatusTone {
  switch (status) {
    case 'accepted':
      return 'success';
    case 'open':
      return 'brand';
    case 'expired':
      return 'warning';
    case 'declined':
      return 'danger';
    case 'withdrawn':
      return 'outline';
    default:
      return 'neutral';
  }
}

export function QuoteStatusBadge({ status }: { status: string | null }) {
  const { t } = useTranslation();
  return (
    <StatusBadge tone={statusTone(status)}>
      {t(`domain:quotes.workspace.status.${status ?? 'draft'}`)}
    </StatusBadge>
  );
}
