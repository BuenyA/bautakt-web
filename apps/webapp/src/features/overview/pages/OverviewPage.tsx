import { formatMoney } from '@bautakt/finance';
import { Card, CardContent, cn, Skeleton, Uicon, type UiconName } from '@bautakt/ui';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { useFinanceAccess } from '@/features/finance/useFinanceAccess';
import { routes } from '@/lib/routes';

import { useOverviewData } from '../useOverviewData';

/**
 * Die Startseite der Geschaeftsfuehrung.
 *
 * Vier Kacheln und eine Liste dessen, was zu tun ist — mehr nicht. Wer morgens
 * die Anwendung oeffnet, will wissen, wer ihm Geld schuldet und was liegen
 * geblieben ist; Jahresverlaeufe gehoeren in die Auswertungen.
 *
 * ⚠️ Ohne Finanzrecht erscheinen die Geldkacheln gar nicht — nicht mit einer
 * Null darin. Eine Null saehe aus wie „keine Forderungen" und waere eine
 * Falschaussage.
 */
export function OverviewPage() {
  const { t } = useTranslation();
  const access = useFinanceAccess();
  const { kpis, tasks, isLoading, isError } = useOverviewData(access.canViewCompanyFinance);

  const revenueDelta = deltaPercent(kpis.revenueMonthMinor, kpis.revenuePreviousMonthMinor);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('domain:overview.title')}
        description={t('domain:overview.description')}
      />

      {!access.canViewCompanyFinance ? (
        <EmptyState
          title={t('domain:overview.noFinanceTitle')}
          description={t('domain:overview.noFinanceDescription')}
        />
      ) : isError ? (
        <EmptyState
          title={t('domain:invoices.loadErrorTitle')}
          description={t('domain:invoices.loadErrorDescription')}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              icon="money-bill-wave"
              label={t('domain:overview.openReceivables')}
              value={formatMoney(kpis.openReceivablesMinor)}
              note={t('domain:receivables.documentCount', { count: kpis.openReceivablesCount })}
              to={routes.receivables}
              isLoading={isLoading}
            />
            <KpiCard
              icon="exclamation"
              label={t('domain:overview.overdue')}
              value={formatMoney(kpis.overdueMinor)}
              note={t('domain:receivables.documentCount', { count: kpis.overdueCount })}
              to={`${routes.receivables}?klasse=1_30`}
              tone={kpis.overdueMinor > 0 ? 'destructive' : undefined}
              isLoading={isLoading}
            />
            <KpiCard
              icon="chart-histogram"
              label={t('domain:overview.revenueMonth')}
              value={formatMoney(kpis.revenueMonthMinor)}
              note={
                revenueDelta === null
                  ? t('domain:overview.noPreviousMonth')
                  : t('domain:overview.versusPreviousMonth', {
                      value: `${revenueDelta > 0 ? '+' : ''}${revenueDelta} %`,
                    })
              }
              to={routes.invoices}
              isLoading={isLoading}
            />
            <KpiCard
              icon="file-edit"
              label={t('domain:overview.drafts')}
              value={String(tasks.draftDocuments)}
              note={t('domain:overview.draftsNote')}
              to={`${routes.invoices}?status=entwurf`}
              isLoading={isLoading}
            />
          </div>

          <Card>
            <CardContent className="flex flex-col gap-1">
              <h2 className="text-foreground mb-2 text-base font-semibold">
                {t('domain:overview.tasksTitle')}
              </h2>

              {isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <ul className="flex flex-col">
                  <TaskRow
                    count={tasks.dunnable}
                    label={t('domain:overview.taskDunnable', { count: tasks.dunnable })}
                    to={routes.dunning}
                  />
                  <TaskRow
                    count={tasks.draftDocuments}
                    label={t('domain:overview.taskDrafts', { count: tasks.draftDocuments })}
                    to={`${routes.invoices}?status=entwurf`}
                  />
                  <TaskRow
                    count={tasks.incomingDueSoon}
                    label={t('domain:overview.taskIncoming', { count: tasks.incomingDueSoon })}
                    to={routes.expenses}
                  />
                  {tasks.dunnable + tasks.draftDocuments + tasks.incomingDueSoon === 0 ? (
                    <li className="text-muted-foreground py-3 text-sm">
                      {t('domain:overview.tasksEmpty')}
                    </li>
                  ) : null}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  note,
  to,
  tone,
  isLoading,
}: {
  icon: UiconName;
  label: string;
  value: string;
  note: string;
  to: string;
  tone?: 'destructive';
  isLoading?: boolean;
}) {
  return (
    <Card className="hover:border-border-strong transition-colors">
      <CardContent>
        <Link to={to} className="flex flex-col gap-1">
          <span className="text-muted-foreground flex items-center gap-2 text-sm">
            <Uicon name={icon} size={16} />
            {label}
          </span>
          {isLoading ? (
            <Skeleton className="my-1 h-8 w-32" />
          ) : (
            <span
              className={cn(
                'text-2xl font-semibold tabular-nums',
                tone === 'destructive' ? 'text-destructive' : 'text-foreground',
              )}
            >
              {value}
            </span>
          )}
          <span className="text-text-subtle text-xs">{note}</span>
        </Link>
      </CardContent>
    </Card>
  );
}

/**
 * Eine Zeile der Aufgabenliste. Zeigt sich nur, wenn es etwas zu tun gibt —
 * „0 Belege mahnfaehig" ist keine Aufgabe, sondern Rauschen.
 */
function TaskRow({ count, label, to }: { count: number; label: string; to: string }) {
  if (count === 0) return null;

  return (
    <li className="border-border border-b last:border-b-0">
      <Link
        to={to}
        className="group hover:text-foreground text-text-secondary flex items-center gap-3 py-3 text-sm transition-colors"
      >
        <span className="bg-primary size-1.5 shrink-0 rounded-full" aria-hidden="true" />
        <span className="min-w-0 flex-1">{label}</span>
        <Uicon
          name="angle-right"
          size={14}
          className="text-text-subtle group-hover:text-foreground"
        />
      </Link>
    </li>
  );
}

/** Veraenderung zum Vormonat in ganzen Prozent; null, wenn es keinen Vergleich gibt. */
function deltaPercent(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
