import { type CurrencyCode, eurosToMinor, formatMoney } from '@bautakt/finance';
import { toast } from '@bautakt/ui';
import { Button, Link as FluentLink } from '@fluentui/react-components';
import {
  DeleteRegular,
  DocumentCopyRegular,
  DocumentPdfRegular,
  EditRegular,
  MailRegular,
} from '@fluentui/react-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';

import { DetailRow } from '@/components/common/DetailCard';
import { DiscardChangesDialog } from '@/components/common/DiscardChangesDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { LinkButton } from '@/components/common/LinkButton';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSpinner } from '@/components/common/PageSpinner';
import { RouterLink } from '@/components/common/RouterLink';
import { useMembership } from '@/features/company/useMembership';
import { usePermission } from '@/features/company/usePermission';
import { SectionCard } from '@/features/contacts/SectionCard';
import { documentFileBaseName } from '@/features/finance/archiveFiles';
import { MailDeliveryStatus } from '@/features/finance/MailDeliveryStatus';
import { type SendableDocument, SendDialog } from '@/features/finance/SendDialog';
import { readableDbError } from '@/lib/dbErrors';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';

import { isConsumer, quoteEventDetail, quoteEventKey } from '../quoteDecision';
import { QuoteDecisionActions } from '../QuoteDecisionActions';
import { ensureQuoteOriginal, openQuotePdf, quoteMailChannel } from '../quoteOutput';
import { QuoteStatusBadge } from '../QuoteStatusBadge';
import { evidenceUrl, useQuoteDecisionDetail } from '../useQuoteDecision';
import { useCreateQuoteVersion, useDeleteQuoteDraft } from '../useQuoteEditor';
import { quoteAttachmentUrl, useQuoteDetail } from '../useQuotes';

const dateTime = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' });

export function QuoteDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useQuoteDetail(id);
  const { data: decision } = useQuoteDecisionDetail(id);

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
            <LinkButton to={routes.quotes}>{t('domain:quotes.workspace.back')}</LinkButton>
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

  async function openPdf(version: (typeof versions)[number]) {
    try {
      await openQuotePdf(version);
    } catch {
      toast.error(t('domain:quotes.output.pdfError'));
    }
  }

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
          <div className="flex flex-wrap items-center justify-end gap-2">
            <LinkButton to={routes.quotes}>{t('domain:quotes.workspace.back')}</LinkButton>
            <QuoteOutputActions
              documentNumber={overview.document_number}
              customerLabel={customerLabel}
              latestIssued={versions.find((version) => version.issued_at) ?? null}
              draft={versions.find((version) => !version.issued_at) ?? null}
              decided={Boolean(overview.decision)}
            />
            <QuoteDecisionActions
              quoteId={overview.id!}
              decided={Boolean(overview.decision)}
              issuedVersions={versions.filter((version) => version.issued_at)}
              consumer={isConsumer(decision?.contact)}
              consumerAcceptanceEnabled={decision?.consumerAcceptanceEnabled ?? false}
              customerId={overview.customer_id ?? null}
              linkedOrder={order ? { id: order.id, name: order.name } : null}
            />
            <QuoteActions
              quoteId={overview.id!}
              hasDraft={Boolean(overview.draft_version_id)}
              hasIssued={Boolean(overview.issued_at)}
              decided={Boolean(overview.decision)}
            />
          </div>
        }
      />

      <MailDeliveryStatus
        target={{
          quoteVersionIds: versions
            .filter((version) => version.issued_at)
            .map((version) => version.id),
        }}
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

        {decision?.quote.decision ? (
          <DecisionCard
            detail={decision}
            versionNo={
              versions.find((version) => version.id === decision.quote.accepted_version_id)
                ?.version_no ?? null
            }
          />
        ) : null}

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
                  {version.issued_at ? (
                    <span className="flex items-baseline gap-3">
                      <span className="text-foreground font-medium tabular-nums">
                        {formatMoney(
                          eurosToMinor(version.net_total),
                          version.currency as CurrencyCode,
                        )}
                      </span>
                      <FluentLink as="button" onClick={() => void openPdf(version)}>
                        {t('domain:quotes.output.pdf')}
                      </FluentLink>
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      {t('domain:quotes.workspace.notCalculated')}
                    </span>
                  )}
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
                    {t(`domain:quotes.workspace.event.${quoteEventKey(event)}`, {
                      defaultValue: t('domain:quotes.workspace.event.other'),
                    })}
                    {quoteEventDetail(event) ? (
                      <span className="text-muted-foreground block text-sm">
                        {quoteEventDetail(event)}
                      </span>
                    ) : null}
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

/**
 * Bearbeiten heißt immer: den Entwurf bearbeiten. Ist alles festgeschrieben,
 * entsteht vorher eine neue Version als Kopie der letzten. Nach einer
 * Entscheidung gibt es nichts mehr zu bearbeiten.
 */
function QuoteActions({
  quoteId,
  hasDraft,
  hasIssued,
  decided,
}: {
  quoteId: string;
  hasDraft: boolean;
  hasIssued: boolean;
  decided: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canEdit = usePermission('canEditQuotes');
  const createVersion = useCreateQuoteVersion();
  const deleteDraft = useDeleteQuoteDraft();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!canEdit || decided) return null;

  function onNewVersion() {
    createVersion.mutate(quoteId, {
      onSuccess: () => void navigate(routes.quoteEdit(quoteId)),
      onError: (cause) =>
        toast.error(t('domain:quotes.editor.newVersionError'), {
          description: readableDbError(cause) ?? undefined,
        }),
    });
  }

  function onDelete() {
    deleteDraft.mutate(quoteId, {
      onSuccess: () => {
        setConfirmDelete(false);
        toast.success(
          hasIssued
            ? t('domain:quotes.detail.draftDiscarded')
            : t('domain:quotes.detail.quoteDeleted'),
        );
        // Ohne festgeschriebene Version ist der ganze Vorgang weg.
        if (!hasIssued) void navigate(routes.quotes);
      },
      onError: (cause) =>
        toast.error(t('domain:quotes.detail.deleteError'), {
          description: readableDbError(cause) ?? undefined,
        }),
    });
  }

  return (
    <>
      {hasDraft ? (
        <>
          <Button icon={<DeleteRegular />} onClick={() => setConfirmDelete(true)}>
            {hasIssued ? t('domain:quotes.detail.discardDraft') : t('domain:quotes.detail.delete')}
          </Button>
          <LinkButton appearance="primary" icon={<EditRegular />} to={routes.quoteEdit(quoteId)}>
            {t('domain:quotes.detail.editDraft')}
          </LinkButton>
        </>
      ) : (
        <Button
          appearance="primary"
          icon={<DocumentCopyRegular />}
          disabled={createVersion.isPending}
          onClick={onNewVersion}
        >
          {t('domain:quotes.editor.newVersion')}
        </Button>
      )}
      <DiscardChangesDialog
        open={confirmDelete}
        onDismiss={() => setConfirmDelete(false)}
        title={
          hasIssued
            ? t('domain:quotes.detail.discardDraftTitle')
            : t('domain:quotes.detail.deleteTitle')
        }
        description={
          hasIssued
            ? t('domain:quotes.detail.discardDraftDescription')
            : t('domain:quotes.detail.deleteDescription')
        }
        keepLabel={t('common:action.cancel')}
        discardLabel={
          hasIssued ? t('domain:quotes.detail.discardDraft') : t('domain:quotes.detail.delete')
        }
        onKeep={() => setConfirmDelete(false)}
        onDiscard={onDelete}
      />
    </>
  );
}

type OutputVersion = {
  id: string;
  version_no: number;
  issued_at: string | null;
  storage_path: string | null;
  buyer_email: string;
  gross_total: number;
};

/**
 * PDF und Versand (bautakt-app#183). Festgeschrieben: das Original öffnen und
 * per E-Mail versenden. Mit offenem Entwurf zusätzlich dessen Vorschau. Fehlt
 * das Original noch (Archiv nach dem Festschreiben gescheitert), entsteht es
 * beim ersten Öffnen oder Versenden.
 */
function QuoteOutputActions({
  documentNumber,
  customerLabel,
  latestIssued,
  draft,
  decided,
}: {
  documentNumber: string | null;
  customerLabel: string;
  latestIssued: OutputVersion | null;
  draft: OutputVersion | null;
  decided: boolean;
}) {
  const { t } = useTranslation();
  const { data: membership } = useMembership();
  const companyId = membership?.companyId;
  const canIssue = usePermission('canIssueQuotes');
  const [busy, setBusy] = useState<'pdf' | 'preview' | 'send' | null>(null);
  const [sendPath, setSendPath] = useState<string | null>(null);

  async function open(version: OutputVersion, kind: 'pdf' | 'preview') {
    setBusy(kind);
    try {
      await openQuotePdf(version);
    } catch {
      toast.error(t('domain:quotes.output.pdfError'));
    } finally {
      setBusy(null);
    }
  }

  async function startSend(version: OutputVersion) {
    setBusy('send');
    try {
      setSendPath(version.storage_path ?? (await ensureQuoteOriginal(version.id)));
    } catch {
      toast.error(t('domain:quotes.output.pdfError'));
    } finally {
      setBusy(null);
    }
  }

  const fileName = `${documentFileBaseName(documentNumber, customerLabel)}.pdf`;
  const sendable: SendableDocument | null = latestIssued
    ? {
        id: latestIssued.id,
        type: 'quote',
        document_number: documentNumber,
        customer_label: customerLabel,
        buyer_email: latestIssued.buyer_email || null,
        due_date: null,
        gross_total: latestIssued.gross_total,
        credited_total: 0,
        e_invoice: false,
        einvoice_format: 'zugferd',
      }
    : null;

  return (
    <>
      {draft ? (
        <Button
          icon={<DocumentPdfRegular />}
          disabled={busy !== null}
          onClick={() => void open(draft, 'preview')}
        >
          {t('domain:quotes.output.draftPreview')}
        </Button>
      ) : null}
      {latestIssued ? (
        <Button
          icon={<DocumentPdfRegular />}
          disabled={busy !== null}
          onClick={() => void open(latestIssued, 'pdf')}
        >
          {t('domain:quotes.output.pdf')}
        </Button>
      ) : null}
      {latestIssued && canIssue && !decided ? (
        <Button
          icon={<MailRegular />}
          disabled={busy !== null}
          onClick={() => void startSend(latestIssued)}
        >
          {t('domain:quotes.output.send')}
        </Button>
      ) : null}
      {sendable && sendPath && companyId ? (
        <SendDialog
          open
          document={sendable}
          onClose={() => setSendPath(null)}
          channel={quoteMailChannel({
            companyId,
            versionId: sendable.id,
            storagePath: sendPath,
            fileName,
            invalidateKeys: [[companyId, 'quotes']],
          })}
        />
      ) : null}
    </>
  );
}

type DecisionDetail = NonNullable<ReturnType<typeof useQuoteDecisionDetail>['data']>;

/** Wer wann wie entschieden hat. Gerätezeit und Erfassung stehen beide da (A8). */
function DecisionCard({ detail, versionNo }: { detail: DecisionDetail; versionNo: number | null }) {
  const { t } = useTranslation();
  const { quote, selected, evidence } = detail;

  async function openEvidence(path: string) {
    try {
      window.open(await evidenceUrl(path), '_blank', 'noopener,noreferrer');
    } catch {
      toast.error(t('domain:quotes.workspace.attachmentError'));
    }
  }

  return (
    <SectionCard title={t('domain:quotes.decision.cardTitle')}>
      <dl className="flex flex-col gap-2">
        <DetailRow
          label={t('domain:quotes.decision.result')}
          value={t(`domain:quotes.workspace.status.${quote.decision}`)}
        />
        {versionNo ? (
          <DetailRow
            label={t('domain:quotes.decision.version')}
            value={t('domain:quotes.workspace.versionLabel', { number: versionNo })}
          />
        ) : null}
        <DetailRow
          label={t('domain:quotes.decision.decidedAt')}
          value={quote.decided_at ? dateTime.format(new Date(quote.decided_at)) : ''}
        />
        <DetailRow
          label={t('domain:quotes.decision.recordedAt')}
          value={
            quote.decision_recorded_at ? dateTime.format(new Date(quote.decision_recorded_at)) : ''
          }
        />
        <DetailRow
          label={t('domain:quotes.decision.kindLabel')}
          value={quote.decision_kind ? t(`domain:quotes.decision.kind.${quote.decision_kind}`) : ''}
        />
        {quote.decline_reason ? (
          <DetailRow label={t('domain:quotes.decision.reason')} value={quote.decline_reason} />
        ) : null}
        {quote.decision_note ? (
          <DetailRow label={t('domain:quotes.decision.note')} value={quote.decision_note} />
        ) : null}
        {selected.length > 0 ? (
          <DetailRow
            label={t('domain:quotes.decision.selection')}
            value={selected
              .map((item) => [item.oz, item.short_text].filter(Boolean).join(' '))
              .join(', ')}
          />
        ) : null}
        {evidence.length > 0 ? (
          <DetailRow
            label={t('domain:quotes.decision.evidence')}
            value={
              <span className="flex flex-col items-start gap-1">
                {evidence.map((file) => (
                  <FluentLink
                    key={file.id}
                    as="button"
                    onClick={() => void openEvidence(file.storage_path)}
                  >
                    {t('domain:quotes.decision.evidenceOpen', {
                      date: dateTime.format(new Date(file.created_at)),
                    })}
                  </FluentLink>
                ))}
              </span>
            }
          />
        ) : null}
      </dl>
    </SectionCard>
  );
}
