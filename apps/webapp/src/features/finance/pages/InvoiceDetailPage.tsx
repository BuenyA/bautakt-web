import { eurosToMinor, formatMoney } from '@bautakt/finance';
import {
  Badge,
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
  Uicon,
} from '@bautakt/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { DetailCard, DetailRow } from '@/components/common/DetailCard';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSpinner } from '@/components/common/PageSpinner';
import { useCompanyListLoading } from '@/features/company/useCompanyListLoading';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';

import { DocumentStatusBadge } from '../DocumentStatusBadge';
import { FinalizeDocumentDialog } from '../FinalizeDocumentDialog';
import { PaymentSheet } from '../PaymentSheet';
import { type FinalizeBlocker, useFinalizeBlockers } from '../useFinalizeBlockers';
import { useFinanceAccess } from '../useFinanceAccess';
import { openMinorOf, overpaidMinorOf, paidMinorOf, useSalesDocument } from '../useSalesDocument';

export function InvoiceDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const access = useFinanceAccess();
  const document = useSalesDocument(id);
  const { data, isError, refetch } = document;
  const isLoading = useCompanyListLoading(document);
  const { blockers: dataBlockers } = useFinalizeBlockers(data);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);

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
  const overpaidMinor = overpaidMinorOf(data);
  // Ohne Positionen gibt es nichts festzuschreiben; die App sperrt den
  // Knopf ebenso. Der Grund steht sichtbar in der Hinweisbox, nicht nur in
  // einem Tooltip an einem deaktivierten Knopf, den die Tastatur nicht erreicht.
  const blockers: (FinalizeBlocker | 'lines')[] =
    data.lines.length === 0 ? ['lines', ...dataBlockers] : dataBlockers;

  return (
    <div className="flex flex-col gap-8">
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
              <Button asChild variant="outline" size="sm">
                <Link to={routes.invoiceEdit(data.id)}>
                  <Uicon name="pencil" size={16} />
                  {t('common:action.edit')}
                </Link>
              </Button>
            ) : null}

            {access.canWriteSalesDocuments && isDraft ? (
              <Button
                size="sm"
                disabled={blockers.length > 0}
                aria-describedby={blockers.length > 0 ? 'finalize-blockers' : undefined}
                onClick={() => setFinalizeOpen(true)}
              >
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

      {isDraft && blockers.length > 0 ? (
        <div
          id="finalize-blockers"
          className="border-warning-border bg-warning-bg text-text-secondary flex flex-col gap-1 rounded-xl border p-4 text-sm"
        >
          <span className="text-foreground font-medium">{t('domain:invoices.blockersTitle')}</span>
          <ul className="list-inside list-disc">
            {blockers.map((blocker) => (
              <li key={blocker}>{t(`domain:invoices.blockers.${blocker}`)}</li>
            ))}
          </ul>
          {blockers.includes('sellerTaxId') ? (
            <Link to={routes.settings} className="text-primary mt-1 font-medium hover:underline">
              {t('domain:invoices.toSettings')}
            </Link>
          ) : null}
        </div>
      ) : null}

      {overpaidMinor > 0 ? (
        <div className="border-warning-border bg-warning-bg text-text-secondary flex flex-col gap-1 rounded-xl border p-4 text-sm">
          <span className="text-foreground font-medium">{t('domain:invoices.overpaid')}</span>
          <p>{t('domain:invoices.overpaidWarning', { amount: formatMoney(overpaidMinor) })}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <DocumentStatusBadge status={data.status} />
        {overpaidMinor > 0 ? (
          <Badge variant="warning">{t('domain:invoices.overpaid')}</Badge>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold tracking-tight">
            {t('domain:invoices.lines')}
          </CardTitle>
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
            <CardTitle className="text-base font-semibold tracking-tight">
              {t('domain:payments.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>

      <PaymentSheet
        documentId={data.id}
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        openMinor={openMinor}
      />

      {access.canWriteSalesDocuments && isDraft ? (
        <FinalizeDocumentDialog
          documentId={data.id}
          open={finalizeOpen}
          onOpenChange={setFinalizeOpen}
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
