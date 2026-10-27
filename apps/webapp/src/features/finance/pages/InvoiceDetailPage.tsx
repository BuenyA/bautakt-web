import { eurosToMinor, formatMoney } from '@bautakt/finance';
import { DeleteButton, StatusBadge, toast } from '@bautakt/ui';
import {
  Button,
  Card,
  CardHeader,
  Link as FluentLink,
  Menu,
  MenuDivider,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  Tooltip,
} from '@fluentui/react-components';
import {
  ArrowDownloadRegular,
  ArrowUndoRegular,
  CheckmarkCircleRegular,
  CodeRegular,
  DismissCircleRegular,
  DocumentPdfRegular,
  EditRegular,
  MailCheckmarkRegular,
  MailRegular,
  PrintRegular,
  WalletRegular,
} from '@fluentui/react-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router';

import { DetailCard, DetailRow } from '@/components/common/DetailCard';
import { EmptyState } from '@/components/common/EmptyState';
import { LinkButton } from '@/components/common/LinkButton';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSpinner } from '@/components/common/PageSpinner';
import { RouterLink } from '@/components/common/RouterLink';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { readableDbError } from '@/lib/dbErrors';
import { formatDate } from '@/lib/format';
import { routes, sendParam } from '@/lib/routes';

import {
  documentFileBaseName,
  downloadBytes,
  extractFacturX,
  isEInvoiceDocument,
} from '../archiveFiles';
import { CancelDialog } from '../CancelDialog';
import { DocumentStatusBadge } from '../DocumentStatusBadge';
import { DraftDeleteDialog } from '../DraftDeleteDialog';
import { EInvoiceBadge } from '../EInvoiceBadge';
import { PaymentSheet } from '../PaymentSheet';
import { PdfViewer } from '../PdfViewer';
import { ReleaseDialog } from '../ReleaseDialog';
import { SendDialog } from '../SendDialog';
import { useFinalizeBlockers } from '../useFinalizeBlockers';
import { useFinanceAccess } from '../useFinanceAccess';
import {
  archivedPdfUrl,
  chargeableMinorOf,
  type LinkedDocument,
  openMinorOf,
  overpaidMinorOf,
  paidMinorOf,
  PreviewMismatchError,
  useArchiveDocument,
  useArchivedPdf,
  useDraftPreview,
  useFinalizeDocument,
  useMarkSent,
  useSalesDocument,
} from '../useSalesDocument';

/**
 * Zahlenspalten: Fluents Kopfzelle legt den Text in einen Flex-Knopf, `text-right`
 * an der Zelle wirkt darauf nicht. Ausgerichtet wird der Knopf selbst.
 */
const END_ALIGNED = { style: { justifyContent: 'flex-end' } } as const;

/** Belegarten, die `cancel_sales_document` storniert. */
const CANCELLABLE_TYPES = new Set(['invoice', 'partial_invoice', 'final_invoice']);

export function InvoiceDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const access = useFinanceAccess();
  const document = useSalesDocument(id);
  const { data, isError, refetch } = document;
  const isLoading = useCompanyListLoading(document);
  const finalize = useFinalizeDocument(id);
  const archive = useArchiveDocument(id);
  const markSent = useMarkSent(id);
  const { blockers } = useFinalizeBlockers(data);
  // Nur für festgeschriebene Belege mit Original; Entwürfe zeigt der Editor.
  const archivedPdf = useArchivedPdf(
    data && data.status !== 'draft' && data.content_hash ? data.storage_path : null,
  );
  // Entwürfe: dasselbe PDF wie beim Festschreiben, nur mit Wasserzeichen,
  // samt Hinweisen auf fehlende Pflichtangaben.
  const draftPreview = useDraftPreview(data?.status === 'draft' ? data.id : null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const sendRequested = searchParams.get(sendParam) === '1';
  const sendReady = Boolean(
    data &&
    access.canWriteSalesDocuments &&
    data.status !== 'cancelled' &&
    data.status !== 'draft' &&
    data.storage_path &&
    data.content_hash,
  );

  // `?versenden=1` (nach „Festschreiben und danach versenden“): Der Dialog
  // ist offen, sobald das Archiv-Original geladen ist; Schließen entfernt den Query.
  const sendDialogOpen = sendOpen || (sendRequested && sendReady);
  const closeSend = () => {
    setSendOpen(false);
    if (sendRequested) setSearchParams({}, { replace: true });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title={t('domain:invoices.detailTitle')} />
        <PageSpinner />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title={t('domain:invoices.detailTitle')} />
        <EmptyState
          title={isError ? t('domain:invoices.loadErrorTitle') : t('domain:invoices.notFoundTitle')}
          description={
            isError
              ? t('domain:invoices.loadErrorDescription')
              : t('domain:invoices.notFoundDescription')
          }
          action={
            isError ? (
              <FluentLink as="button" onClick={() => void refetch()}>
                {t('common:action.retry')}
              </FluentLink>
            ) : (
              <LinkButton to={routes.invoices}>{t('common:action.back')}</LinkButton>
            )
          }
        />
      </div>
    );
  }

  const isDraft = data.status === 'draft';
  const storagePath = data.storage_path;
  const isArchived = !isDraft && Boolean(storagePath && data.content_hash);
  const openMinor = openMinorOf(data);
  const paidMinor = paidMinorOf(data);
  const overpaidMinor = overpaidMinorOf(data);

  // Ohne Positionen gibt es nichts freizugeben; die Datenbank prüft das nicht.
  const hasLines = data.lines.length > 0;
  const releaseHint = !hasLines
    ? t('domain:invoices.noLines')
    : blockers.length > 0
      ? t('domain:invoices.blockersTitle')
      : null;

  // Freigeben nur mit geladener Vorschau dieses Stands (#217).
  const previewFingerprint = draftPreview.isFetching
    ? null
    : (draftPreview.data?.fingerprint ?? null);

  const releasePreview = previewFingerprint
    ? 'ready'
    : draftPreview.isError || (draftPreview.isSuccess && !draftPreview.isFetching)
      ? 'failed'
      : 'pending';

  async function onFinalize(sendAfter: boolean) {
    if (!previewFingerprint) {
      toast.error(t('domain:editor.release.previewFailed'));
      return;
    }
    try {
      const { archived, documentNumber, archiveError, matchesPreview } = await finalize.mutateAsync(
        { expectedFingerprint: previewFingerprint },
      );
      if (!archived)
        toast.warning(
          t('domain:invoices.archive.finalizedWithoutArchive', { number: documentNumber }),
          { description: archiveError ?? undefined },
        );
      else if (matchesPreview === false)
        toast.warning(t('domain:editor.release.originalDiffersTitle', { number: documentNumber }), {
          description: t('domain:editor.release.originalDiffersDescription'),
        });
      else toast.success(t('domain:invoices.finalizeSuccess', { number: documentNumber }));
      if (sendAfter && archived) setSearchParams({ [sendParam]: '1' }, { replace: true });
    } catch (error) {
      if (error instanceof PreviewMismatchError) {
        // Etwa in der App geändert, während die Seite offen war.
        void draftPreview.refetch();
        toast.warning(t('domain:editor.release.mismatchTitle'), {
          description: t('domain:editor.release.mismatchDescription'),
        });
        return;
      }
      // Die Datenbank prueft Pflichtangaben (u. a. Steuernummer des Betriebs)
      // und lehnt sonst ab. Ihre Meldung ist praeziser als jeder Text hier.
      toast.error(t('domain:invoices.finalizeError'), {
        description: readableDbError(error) ?? undefined,
      });
    } finally {
      setReleaseOpen(false);
    }
  }

  async function onCreateArchive() {
    try {
      await archive.mutateAsync();
      toast.success(t('domain:invoices.archive.created'));
    } catch (error) {
      toast.error(t('domain:invoices.archive.createError'), {
        description: readableDbError(error) ?? undefined,
      });
    }
  }

  const fileBaseName = documentFileBaseName(data.document_number, data.customer_label);
  const archivedBytes = archivedPdf.data ?? null;
  // Per Mail geht nur das Archiv-Original hinaus (#186), also nur mit Original.
  const canSendMail = access.canWriteSalesDocuments && isArchived && data.status !== 'cancelled';
  const canMarkSent =
    access.canWriteSalesDocuments && !isDraft && data.status !== 'cancelled' && !data.sent_at;
  // Wie `cancel_sales_document`: nur freigegebene, nicht stornierte Rechnungen.
  const canCancel =
    access.canWriteSalesDocuments &&
    !isDraft &&
    data.status !== 'cancelled' &&
    CANCELLABLE_TYPES.has(data.type) &&
    eurosToMinor(data.credited_total) === 0;
  // Eine teilweise gutgeschriebene Rechnung storniert die Datenbank nicht
  // (CANCEL_HAS_CREDIT_NOTES); den Rest schreibt eine weitere Gutschrift gut.
  const creditedMinor = eurosToMinor(data.credited_total);
  const canCreditNote =
    access.canWriteSalesDocuments &&
    !isDraft &&
    data.status !== 'cancelled' &&
    CANCELLABLE_TYPES.has(data.type) &&
    chargeableMinorOf(data) > 0;
  const isXRechnung = isEInvoiceDocument(data) && data.einvoice_format === 'xrechnung';
  const cancellations = data.children.filter((child) => child.type === 'cancellation');
  const creditNotes = data.children.filter((child) => child.type === 'credit_note');

  function onDownloadPdf() {
    if (archivedBytes) downloadBytes(archivedBytes, `${fileBaseName}.pdf`, 'application/pdf');
  }

  async function onDownloadXml() {
    if (!archivedBytes) return;
    try {
      const xml = await extractFacturX(archivedBytes);
      if (!xml) {
        toast.warning(t('domain:invoices.download.noXml'));
        return;
      }
      downloadBytes(xml, `${fileBaseName}.xml`, 'application/xml');
    } catch {
      toast.error(t('domain:invoices.download.xmlError'));
    }
  }

  async function onMarkSent() {
    try {
      await markSent.mutateAsync(data!);
      toast.success(t('domain:invoices.markSent.success'));
    } catch (error) {
      toast.error(t('domain:invoices.markSent.error'), {
        description: readableDbError(error) ?? undefined,
      });
    }
  }

  async function onOpenArchive(path: string) {
    try {
      window.open(await archivedPdfUrl(path), '_blank', 'noopener');
    } catch {
      toast.error(t('domain:invoices.archive.openError'));
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={data.document_number || t('domain:invoices.draftTitle')}
        description={data.customer_label || t('domain:invoices.noCustomer')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <LinkButton to={routes.invoices}>{t('common:action.back')}</LinkButton>

            {isArchived && storagePath ? (
              <Button icon={<DocumentPdfRegular />} onClick={() => void onOpenArchive(storagePath)}>
                {t('domain:invoices.archive.open')}
              </Button>
            ) : null}

            {!isDraft ? (
              <Menu positioning="below-end">
                <MenuTrigger disableButtonEnhancement>
                  <Button icon={<ArrowDownloadRegular />}>
                    {t('domain:invoices.download.action')}
                  </Button>
                </MenuTrigger>
                <MenuPopover>
                  <MenuList>
                    {/* XRechnung: das XML ist das Original, das PDF nur Sichtbeleg (#184). */}
                    {isXRechnung ? (
                      <MenuItem
                        icon={<CodeRegular />}
                        disabled={!archivedBytes}
                        onClick={() => void onDownloadXml()}
                      >
                        {t('domain:invoices.download.xrechnung')}
                      </MenuItem>
                    ) : null}
                    <MenuItem
                      icon={<DocumentPdfRegular />}
                      disabled={!archivedBytes}
                      onClick={onDownloadPdf}
                    >
                      {isXRechnung
                        ? t('domain:invoices.download.visualPdf')
                        : t('domain:invoices.download.pdf')}
                    </MenuItem>
                    {isEInvoiceDocument(data) && !isXRechnung ? (
                      <MenuItem
                        icon={<CodeRegular />}
                        disabled={!archivedBytes}
                        onClick={() => void onDownloadXml()}
                      >
                        {t('domain:invoices.download.xml')}
                      </MenuItem>
                    ) : null}
                    <MenuDivider />
                    {/* Nur Fallback: kein Original, keine E-Rechnung. */}
                    <MenuItem
                      icon={<PrintRegular />}
                      onClick={() =>
                        window.open(routes.invoicePrint(data.id), '_blank', 'noopener')
                      }
                    >
                      {t('domain:invoices.print')}
                    </MenuItem>
                  </MenuList>
                </MenuPopover>
              </Menu>
            ) : null}

            {canSendMail ? (
              <Button icon={<MailRegular />} onClick={() => setSendOpen(true)}>
                {t('domain:send.action')}
              </Button>
            ) : null}

            {canMarkSent ? (
              <Button
                icon={<MailCheckmarkRegular />}
                disabled={markSent.isPending}
                onClick={() => void onMarkSent()}
              >
                {t('domain:invoices.markSent.action')}
              </Button>
            ) : null}

            {access.canWriteSalesDocuments && isDraft ? (
              <LinkButton to={routes.invoiceEdit(data.id)} icon={<EditRegular />}>
                {t('common:action.edit')}
              </LinkButton>
            ) : null}

            {access.canWriteSalesDocuments && isDraft ? (
              releaseHint ? (
                <Tooltip content={releaseHint} relationship="description">
                  <Button appearance="primary" disabledFocusable icon={<CheckmarkCircleRegular />}>
                    {t('domain:editor.actions.release')}
                  </Button>
                </Tooltip>
              ) : (
                <Button
                  appearance="primary"
                  disabled={finalize.isPending}
                  onClick={() => setReleaseOpen(true)}
                  icon={<CheckmarkCircleRegular />}
                >
                  {t('domain:editor.actions.release')}
                </Button>
              )
            ) : null}

            {access.canWriteSalesDocuments && isDraft ? (
              <DeleteButton
                label={t('domain:invoices.deleteDraft.action')}
                onClick={() => setDeleteOpen(true)}
              />
            ) : null}

            {canCreditNote ? (
              <LinkButton to={routes.invoiceNewCreditNote(data.id)} icon={<ArrowUndoRegular />}>
                {t('domain:invoices.creditNote.action')}
              </LinkButton>
            ) : null}

            {canCancel ? (
              <Button icon={<DismissCircleRegular />} onClick={() => setCancelOpen(true)}>
                {t('domain:invoices.cancel.action')}
              </Button>
            ) : null}

            {access.canWriteSalesDocuments && !isDraft && openMinor > 0 ? (
              <Button
                appearance="primary"
                onClick={() => setPaymentOpen(true)}
                icon={<WalletRegular />}
              >
                {t('domain:payments.add')}
              </Button>
            ) : null}
          </div>
        }
      />

      {isDraft && blockers.length > 0 ? (
        <MessageBar intent="warning" layout="multiline">
          <MessageBarBody>
            <MessageBarTitle>{t('domain:invoices.blockersTitle')}</MessageBarTitle>
            <ul className="mt-1 list-inside list-disc">
              {blockers.map((blocker) => (
                <li key={blocker}>{t(`domain:invoices.blockers.${blocker}`)}</li>
              ))}
            </ul>
            {blockers.includes('sellerTaxId') || blockers.includes('sellerContact') ? (
              <RouterLink to={routes.settings} className="mt-1 inline-block">
                <span className="font-medium">{t('domain:invoices.toSettings')}</span>
              </RouterLink>
            ) : null}
          </MessageBarBody>
        </MessageBar>
      ) : null}

      {!isDraft && !isArchived ? (
        <MessageBar intent="warning" layout="multiline">
          <MessageBarBody>
            <MessageBarTitle>{t('domain:invoices.archive.missingTitle')}</MessageBarTitle>
            {t('domain:invoices.archive.missingDescription')}
          </MessageBarBody>
          {access.canWriteSalesDocuments ? (
            <MessageBarActions>
              <Button
                disabled={archive.isPending}
                aria-busy={archive.isPending}
                onClick={() => void onCreateArchive()}
              >
                {archive.isPending
                  ? t('domain:invoices.archive.creating')
                  : t('domain:invoices.archive.create')}
              </Button>
            </MessageBarActions>
          ) : null}
        </MessageBar>
      ) : null}

      {overpaidMinor > 0 ? (
        <MessageBar intent="warning" layout="multiline">
          <MessageBarBody>
            <MessageBarTitle>{t('domain:invoices.overpaid')}</MessageBarTitle>
            {t('domain:invoices.overpaidWarning', { amount: formatMoney(overpaidMinor) })}
          </MessageBarBody>
        </MessageBar>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {isEInvoiceDocument(data) ? <EInvoiceBadge format={data.einvoice_format} /> : null}
        <DocumentStatusBadge status={data.status} />
        {data.sent_at ? (
          <StatusBadge tone="outline">
            {t('domain:invoices.markSent.badge', { date: formatDate(data.sent_at) })}
          </StatusBadge>
        ) : null}
        {overpaidMinor > 0 ? (
          <StatusBadge tone="warning">{t('domain:invoices.overpaid')}</StatusBadge>
        ) : null}
        <span
          className={
            overpaidMinor > 0 ? 'text-warning text-sm font-medium' : 'text-muted-foreground text-sm'
          }
        >
          {overpaidMinor > 0
            ? t('domain:invoices.overpaidAmount', { amount: formatMoney(overpaidMinor) })
            : t('domain:invoices.openAmount', { amount: formatMoney(openMinor) })}
        </span>
      </div>

      {isDraft ? (
        <Card size="large">
          <CardHeader
            header={
              <Text as="h2" size={400} weight="semibold">
                {t('domain:editor.preview.title')}
              </Text>
            }
          />
          {draftPreview.data && draftPreview.data.warnings.length > 0 ? (
            <MessageBar intent="warning" layout="multiline">
              <MessageBarBody>
                <MessageBarTitle>{t('domain:editor.preview.warningsTitle')}</MessageBarTitle>
                <ul className="mt-1 list-inside list-disc">
                  {draftPreview.data.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </MessageBarBody>
            </MessageBar>
          ) : null}
          <div className="h-[80vh]">
            <PdfViewer
              data={draftPreview.data?.pdf ?? null}
              loading={draftPreview.isLoading}
              error={draftPreview.isError ? t('domain:editor.preview.error') : null}
            />
          </div>
        </Card>
      ) : null}

      {isArchived ? (
        // Das Original, schreibgeschützt: genau die Datei aus dem Archiv, nicht
        // neu gerendert (Leitplanke L2).
        <Card size="large">
          <CardHeader
            header={
              <Text as="h2" size={400} weight="semibold">
                {t('domain:invoices.archive.viewerTitle')}
              </Text>
            }
          />
          <div className="h-[80vh]">
            <PdfViewer
              data={archivedPdf.data ?? null}
              loading={archivedPdf.isLoading}
              error={archivedPdf.isError ? t('domain:invoices.archive.openError') : null}
            />
          </div>
        </Card>
      ) : null}

      <Card size="large">
        <CardHeader
          header={
            <Text as="h2" size={400} weight="semibold">
              {t('domain:invoices.lines')}
            </Text>
          }
        />
        <div>
          {data.lines.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('domain:invoices.noLines')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>{t('domain:invoices.lineColumns.title')}</TableHeaderCell>
                  <TableHeaderCell button={END_ALIGNED}>
                    {t('domain:invoices.lineColumns.quantity')}
                  </TableHeaderCell>
                  <TableHeaderCell button={END_ALIGNED}>
                    {t('domain:invoices.lineColumns.unitPrice')}
                  </TableHeaderCell>
                  <TableHeaderCell button={END_ALIGNED}>
                    {t('domain:invoices.lineColumns.tax')}
                  </TableHeaderCell>
                  <TableHeaderCell button={END_ALIGNED}>
                    {t('domain:invoices.lineColumns.net')}
                  </TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <span className="text-foreground font-medium">{line.title}</span>
                      {line.description ? (
                        <span className="text-muted-foreground block text-xs">
                          {line.description}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {line.quantity} {line.unit}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(eurosToMinor(line.unit_price))}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right tabular-nums">
                      {line.tax_rate_percent} %
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatMoney(eurosToMinor(line.net_amount))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <dl className="border-border ml-auto mt-4 flex w-full max-w-xs flex-col gap-1 border-t pt-4 text-sm">
            <SumRow
              label={t('domain:invoices.net')}
              value={formatMoney(eurosToMinor(data.net_total))}
            />
            <SumRow
              label={t('domain:invoices.vat')}
              value={formatMoney(eurosToMinor(data.vat_total))}
            />
            <SumRow
              label={t('domain:invoices.gross')}
              value={formatMoney(eurosToMinor(data.gross_total))}
              strong
            />
            {creditedMinor > 0 ? (
              <SumRow
                label={t('domain:invoices.creditNote.credited')}
                value={`− ${formatMoney(creditedMinor)}`}
              />
            ) : null}
            {paidMinor > 0 ? (
              <>
                <SumRow label={t('domain:invoices.paid')} value={`− ${formatMoney(paidMinor)}`} />
                {overpaidMinor > 0 ? (
                  <SumRow
                    label={t('domain:invoices.overpaid')}
                    value={formatMoney(overpaidMinor)}
                    warning
                  />
                ) : (
                  <SumRow label={t('domain:invoices.open')} value={formatMoney(openMinor)} strong />
                )}
              </>
            ) : null}
          </dl>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <DetailCard title={t('domain:invoices.details')}>
          {data.parent ? (
            <DetailRow
              label={
                data.type === 'credit_note'
                  ? t('domain:invoices.cancel.creditNoteOf')
                  : t('domain:invoices.cancel.cancellationOf')
              }
              value={<DocumentLinks documents={[data.parent]} />}
            />
          ) : null}
          {cancellations.length > 0 ? (
            <DetailRow
              label={t('domain:invoices.cancel.cancelledBy')}
              value={<DocumentLinks documents={cancellations} />}
            />
          ) : null}
          {creditNotes.length > 0 ? (
            <DetailRow
              label={t('domain:invoices.cancel.creditNotes')}
              value={<DocumentLinks documents={creditNotes} />}
            />
          ) : null}
          <DetailRow
            label={
              data.type === 'quote'
                ? t('domain:quotes.issueDate')
                : t('domain:invoices.columns.issueDate')
            }
            value={formatDate(data.issue_date)}
          />
          <DetailRow
            label={t('domain:invoices.columns.dueDate')}
            value={formatDate(data.due_date)}
          />
          <DetailRow
            label={t('domain:invoices.serviceDate')}
            value={formatDate(data.service_date)}
          />
          <DetailRow
            label={t('domain:invoices.paymentTerm')}
            value={
              data.payment_term_days
                ? t('domain:invoices.days', { count: data.payment_term_days })
                : ''
            }
          />
          <DetailRow label={t('domain:invoices.buyerReference')} value={data.buyer_reference} />
          <DetailRow label={t('domain:invoices.notes')} value={data.notes} />
        </DetailCard>

        {data.datev_debtor_account || data.datev_accounts.length > 0 ? (
          <DetailCard title={t('domain:invoices.datev.title')}>
            <DetailRow
              label={t('domain:invoices.datev.chart')}
              value={data.datev_chart_of_accounts}
            />
            <DetailRow
              label={t('domain:invoices.datev.debtor')}
              value={
                data.datev_debtor_account
                  ? data.datev_debtor_source === 'collective' ||
                    data.datev_debtor_source === 'parent'
                    ? t(`domain:invoices.datev.debtorSource.${data.datev_debtor_source}`, {
                        account: data.datev_debtor_account,
                      })
                    : data.datev_debtor_account
                  : t('domain:invoices.datev.missing')
              }
            />
            <DetailRow
              label={t('domain:invoices.datev.revenue')}
              value={
                data.datev_accounts.length === 0 ? null : (
                  <ul className="flex flex-col gap-1">
                    {data.datev_accounts.map((entry) => (
                      <li key={`${entry.tax_mode}|${entry.tax_rate_percent}`}>
                        {[
                          entry.revenue_account || t('domain:invoices.datev.missing'),
                          entry.tax_mode === 'standard'
                            ? t('domain:datev.rate', { rate: Number(entry.tax_rate_percent) })
                            : t(`domain:datev.taxModes.${entry.tax_mode}`),
                          formatMoney(eurosToMinor(entry.net_amount)),
                          entry.tax_key
                            ? t('domain:invoices.datev.taxKey', { key: entry.tax_key })
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </li>
                    ))}
                  </ul>
                )
              }
            />
          </DetailCard>
        ) : null}

        <Card size="large">
          <CardHeader
            header={
              <Text as="h2" size={400} weight="semibold">
                {t('domain:payments.title')}
              </Text>
            }
          />
          <div>
            {data.payments.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t('domain:payments.empty')}</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {data.payments.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex items-baseline justify-between gap-3 rounded-lg bg-surface/60 px-3 py-2"
                  >
                    <span className="text-muted-foreground">{formatDate(payment.paid_at)}</span>
                    <span className="text-foreground font-medium tabular-nums">
                      {formatMoney(eurosToMinor(payment.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {data.dunning.length > 0 ? (
              <p className="text-warning mt-4 text-sm">
                {t('domain:payments.dunningLevel', {
                  level: data.dunning[data.dunning.length - 1].level,
                })}
              </p>
            ) : null}
          </div>
        </Card>
      </div>

      <PaymentSheet
        documentId={data.id}
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        openMinor={openMinor}
      />

      {canCancel ? (
        <CancelDialog documentId={data.id} open={cancelOpen} onOpenChange={setCancelOpen} />
      ) : null}

      {canSendMail ? (
        <SendDialog open={sendDialogOpen} document={data} onClose={closeSend} />
      ) : null}

      {isDraft ? (
        <ReleaseDialog
          open={releaseOpen}
          kind={data.type === 'quote' ? 'quote' : 'invoice'}
          pending={finalize.isPending}
          preview={releasePreview}
          datevDocumentId={data.id}
          onConfirm={(sendAfter) => void onFinalize(sendAfter)}
          onClose={() => setReleaseOpen(false)}
        />
      ) : null}

      {isDraft ? (
        <DraftDeleteDialog
          documentId={data.id}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onDeleted={() => void navigate(routes.invoices, { replace: true })}
        />
      ) : null}
    </div>
  );
}

function SumRow({
  label,
  value,
  strong,
  warning,
}: {
  label: string;
  value: string;
  strong?: boolean;
  warning?: boolean;
}) {
  const labelClass = warning
    ? 'text-warning font-medium'
    : strong
      ? 'text-foreground font-medium'
      : 'text-muted-foreground';
  const valueClass = warning
    ? 'text-warning font-semibold tabular-nums'
    : strong
      ? 'text-foreground font-semibold tabular-nums'
      : 'text-foreground tabular-nums';

  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={labelClass}>{label}</dt>
      <dd className={valueClass}>{value}</dd>
    </div>
  );
}

/** Verweise auf verknüpfte Belege (Original, Storno, Gutschrift). */
function DocumentLinks({ documents }: { documents: LinkedDocument[] }) {
  const { t } = useTranslation();
  return (
    <span className="flex flex-wrap gap-x-3">
      {documents.map((document) => (
        <RouterLink key={document.id} to={routes.invoice(document.id)}>
          {document.document_number || t('domain:invoices.noNumber')}
        </RouterLink>
      ))}
    </span>
  );
}
