import { eurosToMinor, formatMoney } from '@bautakt/finance';
import { StatusBadge, toast } from '@bautakt/ui';
import {
  Button,
  Card,
  CardHeader,
  Link as FluentLink,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
} from '@fluentui/react-components';
import {
  CheckmarkCircleRegular,
  DocumentRegular,
  EditRegular,
  WalletRegular,
} from '@fluentui/react-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { DetailCard, DetailRow } from '@/components/common/DetailCard';
import { EmptyState } from '@/components/common/EmptyState';
import { LinkButton } from '@/components/common/LinkButton';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSpinner } from '@/components/common/PageSpinner';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { readableDbError } from '@/lib/dbErrors';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';

import { DocumentStatusBadge } from '../DocumentStatusBadge';
import { PaymentSheet } from '../PaymentSheet';
import { useFinalizeBlockers } from '../useFinalizeBlockers';
import { useFinanceAccess } from '../useFinanceAccess';
import {
  openMinorOf,
  overpaidMinorOf,
  paidMinorOf,
  useFinalizeDocument,
  useSalesDocument,
} from '../useSalesDocument';

/**
 * Zahlenspalten: Fluents Kopfzelle legt den Text in einen Flex-Knopf, `text-right`
 * an der Zelle wirkt darauf nicht. Ausgerichtet wird der Knopf selbst.
 */
const END_ALIGNED = { style: { justifyContent: 'flex-end' } } as const;

export function InvoiceDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const access = useFinanceAccess();
  const document = useSalesDocument(id);
  const { data, isError, refetch } = document;
  const isLoading = useCompanyListLoading(document);
  const finalize = useFinalizeDocument(id);
  const { blockers } = useFinalizeBlockers(data);
  const [paymentOpen, setPaymentOpen] = useState(false);

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
  const openMinor = openMinorOf(data);
  const paidMinor = paidMinorOf(data);
  const overpaidMinor = overpaidMinorOf(data);

  async function onFinalize() {
    try {
      await finalize.mutateAsync();
      toast.success(t('domain:invoices.finalizeSuccess'));
    } catch (error) {
      // Die Datenbank prueft Pflichtangaben (u. a. Steuernummer des Betriebs)
      // und lehnt sonst ab. Ihre Meldung ist praeziser als jeder Text hier.
      toast.error(t('domain:invoices.finalizeError'), {
        description: readableDbError(error) ?? undefined,
      });
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

            {!isDraft ? (
              <Button
                as="a"
                href={routes.invoicePrint(data.id)}
                target="_blank"
                rel="noreferrer"
                icon={<DocumentRegular />}
              >
                {t('domain:invoices.print')}
              </Button>
            ) : null}

            {access.canWriteSalesDocuments && isDraft ? (
              <LinkButton to={routes.invoiceEdit(data.id)} icon={<EditRegular />}>
                {t('common:action.edit')}
              </LinkButton>
            ) : null}

            {access.canWriteSalesDocuments && isDraft ? (
              <Button
                appearance="primary"
                disabled={finalize.isPending || blockers.length > 0}
                onClick={() => void onFinalize()}
                icon={<CheckmarkCircleRegular />}
              >
                {t('domain:invoices.finalize')}
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
            {blockers.includes('sellerTaxId') ? (
              <Link
                to={routes.settings}
                className="text-brand mt-1 inline-block font-medium hover:underline"
              >
                {t('domain:invoices.toSettings')}
              </Link>
            ) : null}
          </MessageBarBody>
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
        <DocumentStatusBadge status={data.status} />
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
          <DetailRow
            label={t('domain:invoices.columns.issueDate')}
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
