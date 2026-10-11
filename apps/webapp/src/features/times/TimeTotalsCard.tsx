import { Card, CardHeader, Divider, Text } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';

import { formatMinutesAsHours, sumNetMinutes, totalsByEmployee } from './timeTotals';
import type { TimeEntryListRow } from './useTimeEntries';

/**
 * Wer hat wie viel gearbeitet: Nettostunden je Mitarbeiter und gesamt.
 * Steht im Auftrag über der Liste der einzelnen Einträge.
 */
export function TimeTotalsCard({ rows }: { rows: readonly TimeEntryListRow[] }) {
  const { t } = useTranslation();
  const totals = totalsByEmployee(rows);

  return (
    <Card size="large">
      <CardHeader
        header={
          <Text as="h3" weight="semibold" size={300}>
            {t('domain:orders.times.totalsTitle')}
          </Text>
        }
      />
      <ul className="flex flex-col gap-2">
        {totals.map((total) => (
          <li key={total.key} className="flex items-baseline justify-between gap-4 text-sm">
            <span className="text-foreground min-w-0 truncate">
              {total.name || t('domain:times.noEmployee')}
              <span className="text-muted-foreground ml-2 text-xs">
                {t('domain:orders.times.entries', { count: total.count })}
              </span>
            </span>
            <span className="text-foreground tabular-nums whitespace-nowrap">
              {formatMinutesAsHours(total.minutes)}
            </span>
          </li>
        ))}
      </ul>
      <Divider />
      <div className="flex items-baseline justify-between gap-4 text-sm font-semibold">
        <span>{t('domain:orders.times.totalAll')}</span>
        <span className="tabular-nums whitespace-nowrap">
          {formatMinutesAsHours(sumNetMinutes(rows))}
        </span>
      </div>
    </Card>
  );
}
