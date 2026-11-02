import { StatusBadge, type StatusTone } from '@bautakt/ui';
import {
  Button,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  Text,
} from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';

import { formatDateTime } from '@/lib/format';

import { type DeliveryStatus, type MailDeliveryRow, openDeliveryProblems } from './mailDelivery';
import { type MailDeliveryTarget, useMailDeliveryStatus } from './useMailDeliveryStatus';

const STATUS_TONE: Record<DeliveryStatus, StatusTone> = {
  sent: 'neutral',
  deferred: 'warning',
  delivered: 'success',
  undeliverable: 'danger',
  complained: 'danger',
};

/**
 * Zustellstatus der Mails zu einem Beleg oder einer Eingangsrechnung
 * (bautakt-web#276). Probleme stehen als Warnung darüber. Ohne versendete Mail
 * oder ohne Leserecht (RLS liefert dann keine Zeilen) zeigt der Abschnitt nichts.
 */
export function MailDeliveryStatus({ target }: { target: MailDeliveryTarget }) {
  const { t } = useTranslation();
  const delivery = useMailDeliveryStatus(target);

  if (delivery.isPending) return null;
  if (delivery.isError) {
    return (
      <MessageBar intent="error">
        <MessageBarBody>{t('domain:mailDeliveryStatus.loadError')}</MessageBarBody>
        <MessageBarActions>
          <Button onClick={() => void delivery.refetch()}>{t('common:action.retry')}</Button>
        </MessageBarActions>
      </MessageBar>
    );
  }
  const { rows, recipients } = delivery.data;
  if (rows.length === 0) return null;

  const toOf = (row: MailDeliveryRow) => recipients[row.mailId]?.join(', ') ?? '';

  return (
    <div className="flex flex-col gap-2">
      {openDeliveryProblems(rows).map((row) => (
        <ProblemBar key={row.mailId} row={row} to={row.problemRecipient ?? toOf(row)} />
      ))}
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {rows.map((row) => {
          const to = toOf(row);
          const partial = row.recipientsTotal > 1 && row.status !== 'delivered';
          return (
            <li key={row.mailId} className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={STATUS_TONE[row.status]}>
                {t(`domain:mailDeliveryStatus.status.${row.status}`)}
              </StatusBadge>
              <Text size={200} className="text-muted-foreground">
                {to ? `${t('domain:mailDeliveryStatus.to', { to })} · ` : ''}
                {formatDateTime(row.at)}
                {partial
                  ? ` · ${t('domain:mailDeliveryStatus.partial', {
                      delivered: row.recipientsDelivered,
                      total: row.recipientsTotal,
                    })}`
                  : ''}
              </Text>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ProblemBar({ row, to }: { row: MailDeliveryRow; to: string }) {
  const { t } = useTranslation();
  const kind = row.status === 'complained' ? 'complained' : 'undeliverable';
  return (
    <MessageBar intent={kind === 'complained' ? 'warning' : 'error'} layout="multiline">
      <MessageBarBody>
        <MessageBarTitle>{t(`domain:mailDeliveryStatus.problem.${kind}.title`)}</MessageBarTitle>
        {t(`domain:mailDeliveryStatus.problem.${kind}.body`, { to })}
        {row.problemReason ? (
          <> {t('domain:mailDeliveryStatus.problem.reason', { reason: row.problemReason })}</>
        ) : null}
      </MessageBarBody>
    </MessageBar>
  );
}
