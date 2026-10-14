import type { MonthlyPoint } from '@bautakt/finance';
import { SkeletonBlock } from '@bautakt/ui';
import { Card, CardHeader, Tab, TabList, Text } from '@fluentui/react-components';
import { DataHistogramRegular } from '@fluentui/react-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { MonthlyBarChart } from '@/components/charts/MonthlyBarChart';
import { RouterLink } from '@/components/common/RouterLink';
import { routes } from '@/lib/routes';

type Series = 'revenue' | 'expenses';

/**
 * Die letzten zwölf Monate, netto, umschaltbar zwischen Umsatz und Ausgaben.
 *
 * Bewusst eine Reihe zur Zeit, wie in den Auswertungen: zwei Größenordnungen
 * auf einer Fläche legen einen Zusammenhang nahe, den die Daten nicht hergeben.
 */
export function TrendCard({
  revenue,
  expenses,
  isLoading,
}: {
  revenue: MonthlyPoint[];
  expenses: MonthlyPoint[];
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const [series, setSeries] = useState<Series>('revenue');

  return (
    <Card size="large">
      <CardHeader
        image={<DataHistogramRegular fontSize={20} aria-hidden />}
        header={
          <Text as="h2" weight="semibold" size={400}>
            {t('domain:invoiceDesk.trend.title')}
          </Text>
        }
        action={
          <TabList
            size="small"
            appearance="subtle-circular"
            selectedValue={series}
            onTabSelect={(_, data) => setSeries(data.value as Series)}
            aria-label={t('domain:invoiceDesk.trend.seriesLabel')}
          >
            <Tab value="revenue">{t('domain:invoiceDesk.trend.revenue')}</Tab>
            <Tab value="expenses">{t('domain:invoiceDesk.trend.expenses')}</Tab>
          </TabList>
        }
      />

      {isLoading ? (
        <SkeletonBlock className="h-56 w-full" />
      ) : (
        <MonthlyBarChart
          points={series === 'revenue' ? revenue : expenses}
          emptyLabel={t('domain:invoiceDesk.trend.empty')}
        />
      )}

      <div className="flex justify-end">
        <RouterLink to={routes.reports} className="text-xs">
          {t('domain:invoiceDesk.trend.toReports')}
        </RouterLink>
      </div>
    </Card>
  );
}
