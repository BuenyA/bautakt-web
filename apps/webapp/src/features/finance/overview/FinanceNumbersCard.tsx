import { formatMoney } from '@bautakt/finance';
import { cn, SkeletonBlock } from '@bautakt/ui';
import { Card, CardHeader, MessageBar, Text } from '@fluentui/react-components';
import { DataTrendingRegular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';

import { useRouterLink } from '@/components/common/useRouterLink';
import { routes } from '@/lib/routes';

import type { FinanceOverviewData } from '../useFinanceOverviewData';

const monthName = new Intl.DateTimeFormat('de-DE', { month: 'long' });

/**
 * Die Zahlen am rechten Rand: klein, untereinander, jede führt in ihre
 * Liste. Netto wie auf der Startseite — nur „Offene Forderungen“ und
 * „Offene Eingangsrechnungen“ sind brutto, denn das ist das Geld, das
 * tatsächlich fließt.
 */
export function FinanceNumbersCard({
  numbers,
}: {
  numbers: NonNullable<FinanceOverviewData['numbers']>;
}) {
  const { t } = useTranslation();
  const now = new Date();
  const year = now.getFullYear();
  const { month, year: result } = numbers;

  return (
    <Card size="large" className="h-full">
      <CardHeader
        image={<DataTrendingRegular fontSize={20} aria-hidden />}
        header={
          <Text as="h2" weight="semibold" size={400}>
            {t('domain:invoiceDesk.kpis.title')}
          </Text>
        }
        description={
          <Text size={200} className="text-text-secondary">
            {t('domain:invoiceDesk.kpis.subtitle')}
          </Text>
        }
      />

      {numbers.isError ? (
        <MessageBar intent="error">{t('domain:invoiceDesk.kpis.loadError')}</MessageBar>
      ) : (
        // Schmal (rechte Spalte ab 1280 px) untereinander; liegt die Karte
        // darunter über die volle Breite, nebeneinander.
        <ul className="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-1">
          <Figure
            label={t('domain:invoiceDesk.kpis.revenueMonth', { month: monthName.format(now) })}
            value={formatMoney(month.minor)}
            note={
              month.deltaPercent === null
                ? t('domain:invoiceDesk.kpis.noPreviousMonth')
                : t('domain:invoiceDesk.kpis.versusPreviousMonth', {
                    value: `${month.deltaPercent > 0 ? '+' : ''}${month.deltaPercent} %`,
                  })
            }
            to={routes.reports}
            isLoading={numbers.isLoading}
          />
          <Figure
            label={t('domain:invoiceDesk.kpis.revenueYear', { year })}
            value={formatMoney(result.revenueMinor)}
            to={routes.reports}
            isLoading={numbers.isLoading}
          />
          <Figure
            label={t('domain:invoiceDesk.kpis.resultYear', { year })}
            value={formatMoney(result.resultMinor)}
            tone={result.resultMinor < 0 ? 'destructive' : 'success'}
            note={[
              result.marginPercent === null
                ? t('domain:invoiceDesk.kpis.noMargin')
                : t('domain:invoiceDesk.kpis.margin', { value: result.marginPercent }),
              numbers.laborIncluded ? null : t('domain:invoiceDesk.kpis.withoutLabor'),
            ]
              .filter(Boolean)
              .join(' · ')}
            to={routes.reports}
            isLoading={numbers.isLoading}
          />
          <Figure
            label={t('domain:invoiceDesk.kpis.receivables')}
            value={formatMoney(numbers.receivablesMinor)}
            note={
              numbers.overdueMinor > 0
                ? t('domain:invoiceDesk.kpis.overdueShare', {
                    amount: formatMoney(numbers.overdueMinor),
                  })
                : t('domain:invoiceDesk.kpis.noneOverdue')
            }
            noteTone={numbers.overdueMinor > 0 ? 'destructive' : undefined}
            to={routes.receivables}
            isLoading={numbers.isLoading}
          />
          <Figure
            label={t('domain:invoiceDesk.kpis.payables')}
            value={formatMoney(numbers.payablesMinor)}
            note={t('domain:invoiceDesk.kpis.payablesNote')}
            to={routes.expenses}
            isLoading={numbers.isLoading}
          />
        </ul>
      )}
    </Card>
  );
}

function Figure({
  label,
  value,
  note,
  to,
  tone,
  noteTone,
  isLoading,
}: {
  label: string;
  value: string;
  note?: string;
  to: string;
  tone?: 'destructive' | 'success';
  noteTone?: 'destructive';
  isLoading: boolean;
}) {
  const link = useRouterLink(to);
  return (
    <li className="border-border border-b last:border-b-0 sm:max-xl:border-b-0">
      <a
        href={link.href}
        onClick={link.onClick}
        className="hover:bg-muted flex flex-col rounded-md px-1 py-2 transition-colors"
      >
        <span className="text-muted-foreground text-xs">{label}</span>
        {isLoading ? (
          <SkeletonBlock className="my-1 h-6 w-28" />
        ) : (
          <span
            className={cn(
              'text-lg font-semibold tabular-nums',
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
        {note ? (
          <span
            className={cn(
              'text-xs',
              noteTone === 'destructive' ? 'text-destructive' : 'text-text-subtle',
            )}
          >
            {note}
          </span>
        ) : null}
      </a>
    </li>
  );
}
