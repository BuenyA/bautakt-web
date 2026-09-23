import { eurosToMinor, formatMoney } from '@bautakt/finance';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
  Uicon,
} from '@bautakt/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { DetailCard, DetailRow } from '@/components/common/DetailCard';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSpinner } from '@/components/common/PageSpinner';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';

import { DocumentStatusBadge } from '../DocumentStatusBadge';
import { PaymentSheet } from '../PaymentSheet';
import { useFinanceAccess } from '../useFinanceAccess';
import {
  openMinorOf,
  paidMinorOf,
  useFinalizeDocument,
  useSalesDocument,
} from '../useSalesDocument';

export function InvoiceDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const access = useFinanceAccess();
  const { data, isLoading, isError, refetch } = useSalesDocument(id);
  const finalize = useFinalizeDocument(id);
  const [paymentOpen, setPaymentOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t('domain:invoices.detailTitle')} />
        <PageSpinner />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col gap-6">
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
              <button
                type="button"
                className="text-primary cursor-pointer text-sm font-medium hover:underline"
                onClick={() => void refetch()}
              >
                {t('common:action.retry')}
              </button>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link to={routes.invoices}>{t('common:action.back')}</Link>
              </Button>
            )
          }
        />
      </div>
    );
  }

  const isDraft = data.status === 'draft';
  const openMinor = openMinorOf(data);
  const paidMinor = paidMinorOf(data);

  async function onFinalize() {
    try {
      await finalize.mutateAsync();
      toast.success(t('domain:invoices.finalizeSuccess'));
    } catch (error) {
      // Die Datenbank prueft Pflichtangaben (u. a. Steuernummer des Betriebs)
      // und lehnt sonst ab. Ihre Meldung ist praeziser als jeder Text hier.
      toast.error(t('domain:invoices.finalizeError'), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={data.document_number || t('domain:invoices.draftTitle')}
        description={data.customer_label || t('domain:invoices.noCustomer')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to={routes.invoices}>{t('common:action.back')}</Link>
            </Button>

            {!isDraft ? (
              <Button asChild variant="outline" size="sm">
                <Link to={routes.invoicePrint(data.id)} target="_blank" rel="noreferrer">
                  <Uicon name="file" size={16} />
                  {t('domain:invoices.print')}
                </Link>
              </Button>
            ) : null}

            {access.canWriteSalesDocuments && isDraft ? (
              <Button size="sm" disabled={finalize.isPending} onClick={() => void onFinalize()}>
                <Uicon name="badge-check" size={16} />
                {t('domain:invoices.finalize')}
              </Button>
            ) : null}

            {access.canWriteSalesDocuments && !isDraft && openMinor > 0 ? (
              <Button size="sm" onClick={() => setPaymentOpen(true)}>
                <Uicon name="wallet" size={16} />
                {t('domain:payments.add')}
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <DocumentStatusBadge status={data.status} />
        <span className="text-muted-foreground text-sm">
          {t('domain:invoices.openAmount', { amount: formatMoney(openMinor) })}
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('domain:invoices.lines')}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.lines.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('domain:invoices.noLines')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t('domain:invoices.lineColumns.title')}</TableHead>
                  <TableHead className="text-right">
                    {t('domain:invoices.lineColumns.quantity')}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('domain:invoices.lineColumns.unitPrice')}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('domain:invoices.lineColumns.tax')}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('domain:invoices.lineColumns.net')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.lines.map((line) => (
                  <TableRow key={line.id} className="hover:bg-transparent">
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
                <SumRow label={t('domain:invoices.open')} value={formatMoney(openMinor)} strong />
              </>
            ) : null}
          </dl>
        </CardContent>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('domain:payments.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.payments.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t('domain:payments.empty')}</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {data.payments.map((payment) => (
                  <li key={payment.id} className="flex items-baseline justify-between gap-3">
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
          </CardContent>
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

function SumRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={strong ? 'text-foreground font-medium' : 'text-muted-foreground'}>{label}</dt>
      <dd
        className={
          strong ? 'text-foreground font-semibold tabular-nums' : 'text-foreground tabular-nums'
        }
      >
        {value}
      </dd>
    </div>
  );
}
