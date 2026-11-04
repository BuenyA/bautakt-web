import { eurosToMinor, formatMoney, type CurrencyCode } from '@bautakt/finance';
import { toast } from '@bautakt/ui';
import { Link as FluentLink } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { DetailRow } from '@/components/common/DetailCard';
import { EmptyState } from '@/components/common/EmptyState';
import { LinkButton } from '@/components/common/LinkButton';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSpinner } from '@/components/common/PageSpinner';
import { RouterLink } from '@/components/common/RouterLink';
import { SectionCard } from '@/features/contacts/SectionCard';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';

import { QuoteStatusBadge } from '../QuoteStatusBadge';
import { quoteAttachmentUrl, useQuoteDetail } from '../useQuotes';

const dateTime = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' });

export function QuoteWorkspaceDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useQuoteDetail(id);

  if (isLoading) return <PageSpinner />;

  if (isError || !data) {
    return (
      <EmptyState
        title={
          isError
            ? t('domain:quotes.workspace.loadErrorTitle')
            : t('domain:quotes.workspace.notFoundTitle')
        }
        description={
          isError
            ? t('domain:quotes.workspace.loadErrorDescription')
            : t('domain:quotes.workspace.notFoundDescription')
        }
        action={
          isError ? (
            <FluentLink as="button" onClick={() => void refetch()}>
              {t('common:action.retry')}
            </FluentLink>
          ) : (
            <LinkButton to={routes.quoteWorkspace}>{t('domain:quotes.workspace.back')}</LinkButton>
          )
        }
      />
    );
  }

  const { overview, customerLabel, order, site, versions, events, attachments } = data;
  const siteLine = [
    site.site_street,
    [site.site_postal_code, site.site_city].filter(Boolean).join(' '),
    site.site_country,
  ]
    .filter(Boolean)
    .join(', ');

  async function openAttachment(storagePath: string) {
    try {
      window.open(await quoteAttachmentUrl(storagePath), '_blank', 'noopener,noreferrer');
    } catch {
      toast.error(t('domain:quotes.workspace.attachmentError'));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={overview.document_number || t('domain:quotes.workspace.noNumber')}
        description={overview.subject ?? undefined}
        actions={
          <LinkButton to={routes.quoteWorkspace}>{t('domain:quotes.workspace.back')}</LinkButton>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title={t('domain:quotes.workspace.summary')}>
          <dl className="flex flex-col gap-2">
            <DetailRow
              label={t('domain:quotes.columns.status')}
              value={<QuoteStatusBadge status={overview.status} />}
            />
            <DetailRow
              label={t('domain:quotes.workspace.kindLabel')}
              value={t(`domain:quotes.workspace.kind.${overview.kind ?? 'main'}`)}
            />
            <DetailRow label={t('domain:quotes.columns.customer')} value={customerLabel} />
            <DetailRow
              label={t('domain:quotes.workspace.order')}
              value={order ? <RouterLink to={routes.order(order.id)}>{order.name}</RouterLink> : ''}
            />
            <DetailRow label={t('domain:quotes.workspace.site')} value={siteLine} />
            <DetailRow
              label={t('domain:quotes.workspace.validUntil')}
              value={formatDate(overview.valid_until)}
            />
            <DetailRow
              label={t('domain:quotes.workspace.followUp')}
              value={formatDate(overview.follow_up_on)}
            />
          </dl>
        </SectionCard>

        <SectionCard title={t('domain:quotes.workspace.versions')}>
          {versions.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t('domain:quotes.workspace.noVersions')}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {versions.map((version) => (
                <li key={version.id} className="flex items-baseline justify-between gap-4">
                  <span className="text-foreground">
                    {t('domain:quotes.workspace.versionLabel', { number: version.version_no })}
                    <span className="text-muted-foreground ml-2 text-sm">
                      {version.issued_at
                        ? t('domain:quotes.workspace.issuedOn', {
                            date: formatDate(version.issued_at),
                          })
                        : t('domain:quotes.workspace.status.draft')}
                    </span>
                  </span>
                  <span className="text-foreground font-medium tabular-nums">
                    {formatMoney(eurosToMinor(version.net_total), version.currency as CurrencyCode)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title={t('domain:quotes.workspace.history')}>
          {events.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t('domain:quotes.workspace.noHistory')}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {events.map((event) => (
                <li key={event.id} className="flex items-baseline justify-between gap-4">
                  <span className="text-foreground">
                    {t(`domain:quotes.workspace.event.${event.event_type}`, {
                      defaultValue: t('domain:quotes.workspace.event.other'),
                    })}
                  </span>
                  <span className="text-muted-foreground text-sm whitespace-nowrap">
                    {dateTime.format(new Date(event.occurred_at))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title={t('domain:quotes.workspace.attachments')}>
          {attachments.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t('domain:quotes.workspace.noAttachments')}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {attachments.map((attachment) => (
                <li key={attachment.id} className="flex items-baseline justify-between gap-4">
                  <FluentLink
                    as="button"
                    onClick={() => void openAttachment(attachment.storage_path)}
                  >
                    {attachment.file_name}
                  </FluentLink>
                  <span className="text-muted-foreground text-sm">
                    {t(`domain:quotes.workspace.attachmentKind.${attachment.kind}`)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
