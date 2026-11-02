import { StatusBadge } from '@bautakt/ui';
import {
  Button,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  Tooltip,
} from '@fluentui/react-components';
import { WarningRegular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { routes } from '@/lib/routes';

import { type DuplicateMatch, duplicateReason } from './incomingDuplicates';
import { useIncomingDuplicates } from './useIncomingDuplicates';

/** Kennzeichen in Listen. Ohne Treffer erscheint nichts. */
export function DuplicateBadge({ matches }: { matches: readonly DuplicateMatch[] }) {
  const { t } = useTranslation();
  const reason = duplicateReason(matches);
  if (!reason) return null;
  return (
    <Tooltip
      content={t(
        reason === 'file'
          ? 'domain:incomingDuplicates.tooltipFile'
          : 'domain:incomingDuplicates.tooltipNumber',
      )}
      relationship="description"
    >
      <span className="inline-flex whitespace-nowrap">
        <StatusBadge tone="warning" icon={<WarningRegular />}>
          {t('domain:incomingDuplicates.badge')}
        </StatusBadge>
      </span>
    </Tooltip>
  );
}

function MatchList({ title, matches }: { title: string; matches: readonly DuplicateMatch[] }) {
  const { t } = useTranslation();
  if (matches.length === 0) return null;
  return (
    <div className="mt-1">
      {title}
      <ul className="m-0 list-disc pl-5">
        {matches.map((match) => {
          const label = match.otherLabel || t('domain:incomingDuplicates.noLabel');
          return (
            <li key={match.otherId} className="break-words">
              {match.otherKind === 'invoice' ? (
                <Link to={routes.incomingInvoice(match.otherId)} className="underline">
                  {label}
                </Link>
              ) : (
                t('domain:incomingDuplicates.toReview', { label })
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Hinweis im Beleg mit Verweis auf die Treffer. Sperrt nichts. */
export function DuplicateNotice({ invoiceId }: { invoiceId: string }) {
  const { t } = useTranslation();
  const duplicates = useIncomingDuplicates();

  if (duplicates.isError) {
    return (
      <MessageBar intent="warning" layout="multiline">
        <MessageBarBody>{t('domain:incomingDuplicates.loadError')}</MessageBarBody>
        <MessageBarActions>
          <Button onClick={() => void duplicates.refetch()}>{t('common:action.retry')}</Button>
        </MessageBarActions>
      </MessageBar>
    );
  }

  const matches = duplicates.data?.invoices.get(invoiceId) ?? [];
  if (matches.length === 0) return null;
  return (
    <MessageBar intent="warning" layout="multiline">
      <MessageBarBody>
        <MessageBarTitle>{t('domain:incomingDuplicates.title')}</MessageBarTitle>
        <div>{t('domain:incomingDuplicates.description')}</div>
        <MatchList
          title={t('domain:incomingDuplicates.sameFile')}
          matches={matches.filter((match) => match.match === 'file')}
        />
        <MatchList
          title={t('domain:incomingDuplicates.sameNumber')}
          matches={matches.filter((match) => match.match === 'number')}
        />
      </MessageBarBody>
    </MessageBar>
  );
}
