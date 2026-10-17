import { formatMoney } from '@bautakt/finance';
import { cn, SkeletonBlock } from '@bautakt/ui';
import { Card, MessageBar } from '@fluentui/react-components';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { useRouterLink } from '@/components/common/useRouterLink';
import { routes } from '@/lib/routes';

import type { FinanceNumbers } from './useFinanceNumbers';

const monthName = new Intl.DateTimeFormat('de-DE', { month: 'long' });

/**
 * Fünf kleine Karten über den Diagrammen der Auswertungen, je Zahl eine.
 * Netto wie auf der Startseite — nur „Offene Forderungen“ und „Offene
 * Eingangsrechnungen“ sind brutto, denn das ist das Geld, das tatsächlich
 * fließt. Die beiden offenen Beträge führen in ihre Liste.
 */
export function FinanceKpiCards({ numbers }: { numbers: FinanceNumbers }) {
  const { t } = useTranslation();
  const now = new Date();
  const year = now.getFullYear();
  const { month, year: result } = numbers;

  if (numbers.isError) {
    return <MessageBar intent="error">{t('domain:invoiceDesk.kpis.loadError')}</MessageBar>;
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
        isLoading={numbers.isLoading}
      />
      <Figure
        label={t('domain:invoiceDesk.kpis.revenueYear', { year })}
        value={formatMoney(result.revenueMinor)}
        note={t('domain:invoiceDesk.kpis.subtitle')}
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
  /** Ohne Ziel kein Link: Umsatz und Ergebnis stehen schon auf dieser Seite. */
  to?: string;
  tone?: 'destructive' | 'success';
  noteTone?: 'destructive';
  isLoading: boolean;
}) {
  const body = (
    <>
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
    </>
  );
  return (
    <li className="min-w-0">
      <Card className="h-full">
        {to ? (
          <FigureLink to={to}>{body}</FigureLink>
        ) : (
          <div className="flex flex-col gap-0.5">{body}</div>
        )}
      </Card>
    </li>
  );
}

function FigureLink({ to, children }: { to: string; children: ReactNode }) {
  const link = useRouterLink(to);
  return (
    <a
      href={link.href}
      onClick={link.onClick}
      className="hover:bg-muted -m-1 flex flex-col gap-0.5 rounded-md p-1 transition-colors"
    >
      {children}
    </a>
  );
}
