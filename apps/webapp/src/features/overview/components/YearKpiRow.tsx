import {
  formatMoney,
  type MonthlyPoint,
  type OverviewKpis,
  type YearResult,
} from '@bautakt/finance';
import { cn, SkeletonBlock } from '@bautakt/ui';
import { Card, MessageBar, Text } from '@fluentui/react-components';
import {
  ArrowTrendingRegular,
  DataHistogramRegular,
  type FluentIcon,
  MoneyRegular,
  ReceiptMoneyRegular,
} from '@fluentui/react-icons';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { useRouterLink } from '@/components/common/useRouterLink';
import { routes } from '@/lib/routes';

/**
 * Die Zahlen des laufenden Jahres: Umsatz, Aufwände, Ergebnis, offene
 * Forderungen. Unten auf der Seite, weil sie sich über den Tag nicht ändern —
 * oben steht, was heute zu tun ist.
 */
export function YearKpiRow({
  result,
  kpis,
  revenueByMonth,
  expensesByMonth,
  laborIncluded,
  isLoading,
  isError,
}: {
  result: YearResult;
  kpis: OverviewKpis;
  revenueByMonth: readonly MonthlyPoint[];
  expensesByMonth: readonly MonthlyPoint[];
  laborIncluded: boolean;
  isLoading: boolean;
  isError: boolean;
}) {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  const delta = deltaPercent(result.revenueMinor, result.revenuePreviousYearMinor);

  return (
    <section aria-labelledby="zahlen-titel" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <Text as="h2" id="zahlen-titel" weight="semibold" size={400}>
          {t('domain:overview.year.title', { year })}
        </Text>
        <Text size={200} className="text-text-secondary">
          {t('domain:overview.year.subtitle')}
        </Text>
      </div>

      {isError ? (
        <MessageBar intent="error">{t('domain:overview.year.loadError')}</MessageBar>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={DataHistogramRegular}
            label={t('domain:overview.year.revenue')}
            value={formatMoney(result.revenueMinor)}
            note={
              delta === null
                ? t('domain:overview.year.noPreviousYear')
                : t('domain:overview.year.versusPreviousYear', {
                    value: `${delta > 0 ? '+' : ''}${delta} %`,
                  })
            }
            to={routes.reports}
            isLoading={isLoading}
          >
            <MiniBars
              points={revenueByMonth}
              tone="brand"
              label={t('domain:overview.year.chartA11y')}
            />
          </KpiCard>
          <KpiCard
            icon={ReceiptMoneyRegular}
            label={t('domain:overview.year.expenses')}
            value={formatMoney(result.expensesMinor)}
            note={
              laborIncluded && result.laborMinor !== null
                ? t('domain:overview.year.expensesSplit', {
                    material: formatMoney(result.materialAndOverheadMinor),
                    labor: formatMoney(result.laborMinor),
                  })
                : t('domain:overview.year.expensesWithoutLabor')
            }
            to={routes.expenses}
            isLoading={isLoading}
          >
            <MiniBars
              points={expensesByMonth}
              tone="neutral"
              label={t('domain:overview.year.chartA11y')}
            />
          </KpiCard>
          <KpiCard
            icon={ArrowTrendingRegular}
            label={t('domain:overview.year.result')}
            value={formatMoney(result.resultMinor)}
            tone={result.resultMinor < 0 ? 'destructive' : 'success'}
            note={
              result.marginPercent === null
                ? t('domain:overview.year.noMargin')
                : t('domain:overview.year.margin', { value: result.marginPercent })
            }
            to={routes.reports}
            isLoading={isLoading}
          />
          <KpiCard
            icon={MoneyRegular}
            label={t('domain:overview.year.receivables')}
            value={formatMoney(kpis.openReceivablesMinor)}
            note={
              kpis.overdueMinor > 0
                ? t('domain:overview.year.overdueShare', { amount: formatMoney(kpis.overdueMinor) })
                : t('domain:overview.year.noneOverdue')
            }
            noteTone={kpis.overdueMinor > 0 ? 'destructive' : undefined}
            to={routes.receivables}
            isLoading={isLoading}
          />
        </div>
      )}
    </section>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  note,
  to,
  tone,
  noteTone,
  isLoading,
  children,
}: {
  icon: FluentIcon;
  label: string;
  value: string;
  note: string;
  to: string;
  tone?: 'destructive' | 'success';
  noteTone?: 'destructive';
  isLoading: boolean;
  children?: ReactNode;
}) {
  const link = useRouterLink(to);
  return (
    <Card size="large" className="hover:border-border-strong transition-colors">
      <a href={link.href} onClick={link.onClick} className="flex h-full flex-col gap-1">
        <span className="text-muted-foreground flex items-center gap-2 text-sm">
          <Icon fontSize={16} aria-hidden />
          {label}
        </span>
        {isLoading ? (
          <SkeletonBlock className="my-1 h-8 w-32" />
        ) : (
          <span
            className={cn(
              'text-2xl font-semibold tabular-nums',
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
        <span
          className={cn(
            'text-xs',
            noteTone === 'destructive' ? 'text-destructive' : 'text-text-subtle',
          )}
        >
          {note}
        </span>
        {children && !isLoading ? <div className="mt-auto pt-3">{children}</div> : null}
      </a>
    </Card>
  );
}

/**
 * Monatsbalken seit Januar — ohne Achsen, nur die Form des Jahres. Der genaue
 * Wert steht im Tooltip (`title`) und in den Auswertungen.
 */
function MiniBars({
  points,
  tone,
  label,
}: {
  points: readonly MonthlyPoint[];
  tone: 'brand' | 'neutral';
  label: string;
}) {
  const max = Math.max(1, ...points.map((point) => point.minor));
  return (
    <div className="flex h-10 items-end gap-1" role="img" aria-label={label}>
      {points.map((point) => (
        <span
          key={point.month}
          title={`${point.month.slice(5)}/${point.month.slice(2, 4)}: ${formatMoney(point.minor)}`}
          className={cn(
            'min-h-0.5 flex-1 rounded-sm',
            tone === 'brand' ? 'bg-brand' : 'bg-border-strong',
          )}
          style={{ height: `${Math.max(4, (point.minor / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

/** Veränderung in ganzen Prozent; null, wenn es keinen Vergleich gibt. */
function deltaPercent(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
