import { formatMoney, type OrderCostLevel, type OrderFinance } from '@bautakt/finance';
import { cn, SkeletonBlock } from '@bautakt/ui';
import {
  Card,
  CardHeader,
  Link as FluentLink,
  MessageBar,
  ProgressBar,
  Text,
} from '@fluentui/react-components';
import { MoneyRegular } from '@fluentui/react-icons';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { RouterLink } from '@/components/common/RouterLink';
import { DocumentStatusBadge } from '@/features/finance/DocumentStatusBadge';
import { formatDate } from '@/lib/format';
import { routes } from '@/lib/routes';

import { OrderPreviewCard, PreviewError, PreviewSkeleton } from './OrderPreviewCard';
import type { OrderDetail } from './useOrder';
import { type OrderFinanceAccess, useOrderFinance } from './useOrderFinance';

/** Ganze Euro für Leisten und Kennzahlen; Cent stehen in den Listen. */
const wholeEuro = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

function euro(minor: number): string {
  return wholeEuro.format(minor / 100);
}

function costBarColor(level: OrderCostLevel): 'brand' | 'warning' | 'error' {
  if (level === 'danger') return 'error';
  return level === 'warning' ? 'warning' : 'brand';
}

/**
 * Eine Leiste „Betrag von Auftragssumme“. Ohne Auftragssumme nur der Betrag:
 * eine Leiste ohne Ganzes wäre geraten.
 */
function FinanceMeter({
  label,
  amountMinor,
  totalMinor,
  percent,
  color,
  note,
  noteTone,
}: {
  label: string;
  amountMinor: number;
  totalMinor: number | null;
  percent: number | null;
  color: 'brand' | 'success' | 'warning' | 'error';
  note?: string;
  noteTone?: 'destructive';
}) {
  const { t } = useTranslation();
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
        <span className="text-foreground font-medium">{label}</span>
        <span className="text-foreground tabular-nums">
          {totalMinor === null || percent === null
            ? euro(amountMinor)
            : t('domain:orders.finance.ofTotal', {
                amount: euro(amountMinor),
                total: euro(totalMinor),
                percent,
              })}
        </span>
      </div>
      {totalMinor !== null && percent !== null ? (
        <ProgressBar
          value={Math.min(1, Math.max(0, percent / 100))}
          color={color}
          thickness="large"
          aria-label={label}
        />
      ) : null}
      {note ? (
        <span
          className={cn(
            'text-xs',
            noteTone === 'destructive' ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {note}
        </span>
      ) : null}
    </div>
  );
}

function costBreakdown(finance: OrderFinance, t: (key: string) => string): string {
  return [
    finance.laborMinor === null
      ? null
      : `${t('domain:orders.finance.labor')} ${euro(finance.laborMinor)}`,
    `${t('domain:orders.finance.material')} ${euro(finance.materialMinor)}`,
    `${t('domain:orders.finance.other')} ${euro(finance.otherMinor)}`,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Kostenleiste: gelb ab 90 %, rot über 100 % der Auftragssumme. */
function CostMeter({
  finance,
  access,
  breakdown = true,
}: {
  finance: OrderFinance;
  access: OrderFinanceAccess;
  /** Auf der Finanzseite steht die Aufteilung als Liste darunter. */
  breakdown?: boolean;
}) {
  const { t } = useTranslation();
  const overrun =
    finance.contractMinor !== null && finance.costMinor > finance.contractMinor
      ? finance.costMinor - finance.contractMinor
      : 0;
  return (
    <FinanceMeter
      label={t(access.labor ? 'domain:orders.finance.costs' : 'domain:orders.finance.costsNoLabor')}
      amountMinor={finance.costMinor}
      totalMinor={finance.contractMinor}
      percent={finance.costPercent}
      color={costBarColor(finance.costLevel)}
      note={
        overrun > 0
          ? t('domain:orders.finance.overrun', { amount: euro(overrun) })
          : breakdown
            ? costBreakdown(finance, t)
            : undefined
      }
      noteTone={overrun > 0 ? 'destructive' : undefined}
    />
  );
}

function BilledMeter({ finance }: { finance: OrderFinance }) {
  const { t } = useTranslation();
  return (
    <FinanceMeter
      label={t('domain:orders.finance.billed')}
      amountMinor={finance.billedMinor}
      totalMinor={finance.contractMinor}
      percent={finance.billedPercent}
      color={finance.billedPercent !== null && finance.billedPercent >= 100 ? 'success' : 'brand'}
      note={
        finance.openMinor === null
          ? undefined
          : t('domain:orders.finance.open', { amount: euro(finance.openMinor) })
      }
    />
  );
}

function NoContractHint() {
  const { t } = useTranslation();
  return <p className="text-muted-foreground text-xs">{t('domain:orders.finance.noContract')}</p>;
}

/**
 * Finanzkarte auf der Auftragsübersicht: zwei Leisten gegen die
 * Auftragssumme. Wer nur Belege oder nur Kosten sehen darf, bekommt nur die
 * eine Leiste.
 */
export function FinancePreview({ order }: { order: OrderDetail }) {
  const { t } = useTranslation();
  const { access, finance, isPending, isError, refetch } = useOrderFinance(
    order.id,
    order.contract_sum,
  );
  if (!access || !(access.billing || access.costs)) return null;

  return (
    <OrderPreviewCard
      icon={<MoneyRegular />}
      title={t('domain:orders.finance.title')}
      to={routes.orderSection(order.id, 'finance')}
    >
      {isPending ? (
        <PreviewSkeleton />
      ) : isError ? (
        <PreviewError onRetry={refetch} />
      ) : (
        <>
          <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
            {access.costs ? <CostMeter finance={finance} access={access} /> : null}
            {access.billing ? <BilledMeter finance={finance} /> : null}
          </div>
          {finance.contractMinor === null ? <NoContractHint /> : null}
        </>
      )}
    </OrderPreviewCard>
  );
}

function Figure({
  label,
  value,
  note,
  tone,
  isLoading,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: 'destructive' | 'success';
  isLoading: boolean;
}) {
  return (
    <li className="min-w-0">
      <Card className="h-full">
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground text-xs">{label}</span>
          {isLoading ? (
            <SkeletonBlock className="my-1 h-7 w-28" />
          ) : (
            <span
              className={cn(
                'text-xl font-semibold tabular-nums',
                tone === 'destructive'
                  ? 'text-destructive'
                  : tone === 'success'
                    ? 'text-success'
                    : 'text-foreground',
              )}
            >
              {value}
            </span>
          )}
          {note ? <span className="text-text-subtle text-xs">{note}</span> : null}
        </div>
      </Card>
    </li>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card size="large" className="h-full">
      <CardHeader
        header={
          <Text as="h2" size={400} weight="semibold">
            {title}
          </Text>
        }
      />
      <div className="flex flex-col gap-4">{children}</div>
    </Card>
  );
}

/** Zeile einer Betragsliste: links Text, rechts Betrag. */
function AmountRow({
  primary,
  secondary,
  amount,
  strong,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  amount: string;
  strong?: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={cn('text-foreground truncate', strong && 'font-semibold')}>{primary}</span>
        {secondary ? (
          <span className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
            {secondary}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          'text-foreground shrink-0 whitespace-nowrap tabular-nums',
          strong && 'font-semibold',
        )}
      >
        {amount}
      </span>
    </li>
  );
}

function share(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)} %` : '';
}

/**
 * Unterseite `/auftraege/:id/finanzen`: Kennzahlen, Kostenaufteilung mit den
 * Kostenbelegen und die Verkaufsbelege des Auftrags. Alles netto.
 */
export function OrderFinancePage({ order }: { order: OrderDetail }) {
  const { t } = useTranslation();
  const { access, finance, documents, expenses, incoming, isPending, isError, refetch } =
    useOrderFinance(order.id, order.contract_sum);
  if (!access) return null;

  if (isError) {
    return (
      <MessageBar intent="error">
        {t('domain:orders.preview.loadError')}{' '}
        <FluentLink as="button" inline onClick={refetch}>
          {t('common:action.retry')}
        </FluentLink>
      </MessageBar>
    );
  }

  const costLabel = t(
    access.labor ? 'domain:orders.finance.costs' : 'domain:orders.finance.costsNoLabor',
  );
  const realExpenses = expenses.filter((row) => !row.is_calculatory);

  return (
    <div className="flex flex-col gap-4">
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Figure
          label={t('domain:orders.fields.contractSum')}
          value={finance.contractMinor === null ? '–' : euro(finance.contractMinor)}
          note={finance.contractMinor === null ? t('domain:orders.finance.noContract') : undefined}
          isLoading={false}
        />
        {access.costs ? (
          <Figure
            label={costLabel}
            value={euro(finance.costMinor)}
            note={
              finance.costPercent === null
                ? undefined
                : t('domain:orders.finance.percentOfContract', { percent: finance.costPercent })
            }
            tone={finance.costLevel === 'danger' ? 'destructive' : undefined}
            isLoading={isPending}
          />
        ) : null}
        {access.billing ? (
          <Figure
            label={t('domain:orders.finance.billed')}
            value={euro(finance.billedMinor)}
            note={
              finance.openMinor === null
                ? undefined
                : t('domain:orders.finance.open', { amount: euro(finance.openMinor) })
            }
            isLoading={isPending}
          />
        ) : null}
        {access.costs && access.billing ? (
          <Figure
            label={t('domain:orders.finance.result')}
            value={euro(finance.resultMinor)}
            note={t('domain:orders.finance.resultNote')}
            tone={
              finance.resultMinor < 0
                ? 'destructive'
                : finance.resultMinor > 0
                  ? 'success'
                  : undefined
            }
            isLoading={isPending}
          />
        ) : null}
      </ul>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {access.costs ? (
          <SectionCard title={costLabel}>
            {isPending ? (
              <PreviewSkeleton />
            ) : (
              <>
                <CostMeter finance={finance} access={access} breakdown={false} />
                <ul className="divide-border flex flex-col divide-y">
                  {finance.laborMinor !== null ? (
                    <AmountRow
                      primary={t('domain:orders.finance.labor')}
                      secondary={share(finance.laborMinor, finance.costMinor)}
                      amount={formatMoney(finance.laborMinor)}
                    />
                  ) : null}
                  <AmountRow
                    primary={t('domain:orders.finance.material')}
                    secondary={share(finance.materialMinor, finance.costMinor)}
                    amount={formatMoney(finance.materialMinor)}
                  />
                  <AmountRow
                    primary={t('domain:orders.finance.other')}
                    secondary={share(finance.otherMinor, finance.costMinor)}
                    amount={formatMoney(finance.otherMinor)}
                  />
                  <AmountRow
                    primary={t('domain:orders.finance.total')}
                    amount={formatMoney(finance.costMinor)}
                    strong
                  />
                </ul>
                {!access.labor ? (
                  <p className="text-muted-foreground text-xs">
                    {t('domain:orders.finance.noLaborHint')}
                  </p>
                ) : null}

                <div className="flex flex-col gap-1">
                  <Text as="h3" size={300} weight="semibold">
                    {t('domain:orders.finance.costDocuments')}
                  </Text>
                  {incoming.length + realExpenses.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      {t('domain:orders.finance.noCostDocuments')}
                    </p>
                  ) : (
                    <ul className="divide-border flex flex-col divide-y">
                      {incoming.map((row) => (
                        <AmountRow
                          key={row.id}
                          primary={
                            <RouterLink to={routes.incomingInvoice(row.id)}>
                              {row.vendor_name ||
                                row.invoice_number ||
                                t('domain:orders.finance.incoming')}
                            </RouterLink>
                          }
                          secondary={[
                            t('domain:orders.finance.incoming'),
                            row.invoice_number,
                            formatDate(row.invoice_date),
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                          amount={formatMoney(Math.round(Number(row.net_total) * 100))}
                        />
                      ))}
                      {realExpenses.map((row) => (
                        <AmountRow
                          key={row.id}
                          primary={
                            <RouterLink to={routes.expenses}>
                              {row.title || row.vendor || t('domain:orders.finance.expense')}
                            </RouterLink>
                          }
                          secondary={[
                            t('domain:orders.finance.expense'),
                            row.vendor,
                            formatDate(row.invoice_date),
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                          amount={formatMoney(Math.round(Number(row.amount_net) * 100))}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </SectionCard>
        ) : null}

        {access.billing ? (
          <SectionCard title={t('domain:orders.finance.documents')}>
            {isPending ? (
              <PreviewSkeleton />
            ) : (
              <>
                <BilledMeter finance={finance} />
                {documents.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {t('domain:orders.finance.noDocuments')}
                  </p>
                ) : (
                  <ul className="divide-border flex flex-col divide-y">
                    {documents.map((doc) => (
                      <AmountRow
                        key={doc.id}
                        primary={
                          <RouterLink
                            to={
                              doc.type === 'quote' ? routes.quote(doc.id) : routes.invoice(doc.id)
                            }
                          >
                            {[t(`domain:documentType.${doc.type}`), doc.document_number]
                              .filter(Boolean)
                              .join(' ')}
                          </RouterLink>
                        }
                        secondary={
                          <>
                            <DocumentStatusBadge status={doc.status} />
                            {doc.issue_date ? <span>{formatDate(doc.issue_date)}</span> : null}
                          </>
                        }
                        amount={formatMoney(Math.round(Number(doc.net_total ?? 0) * 100))}
                      />
                    ))}
                  </ul>
                )}
              </>
            )}
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
}
