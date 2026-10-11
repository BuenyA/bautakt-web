import { type DataTableColumn, StatusBadge } from '@bautakt/ui';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { formatDateTime, formatNetDuration } from '@/lib/format';

import { formatBreakText } from './formatBreakLabel';
import { netMinutes } from './timeTotals';
import type { TimeEntryListRow } from './useTimeEntries';

/**
 * Spalten einer Zeitentabelle ohne Mitarbeiter-Spalte — die Mitarbeiterseite
 * zeigt ohnehin nur eine Person. „Abgerechnet“ steht am Auftrag.
 */
export function useTimeColumns(): DataTableColumn<TimeEntryListRow>[] {
  const { t } = useTranslation();
  return useMemo<DataTableColumn<TimeEntryListRow>[]>(
    () => [
      {
        accessorKey: 'order_name',
        header: t('domain:times.columns.order'),
        cell: ({ row }) => (
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-foreground font-medium">
              {row.original.order_name || t('domain:times.noOrder')}
            </span>
            {row.original.billed ? (
              <StatusBadge tone="neutral">{t('domain:times.billed')}</StatusBadge>
            ) : null}
          </span>
        ),
      },
      {
        accessorKey: 'started_at',
        header: t('domain:times.columns.start'),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {formatDateTime(row.original.started_at)}
          </span>
        ),
      },
      {
        accessorKey: 'ended_at',
        header: t('domain:times.columns.end'),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {row.original.ended_at
              ? formatDateTime(row.original.ended_at)
              : t('domain:times.noEnd')}
          </span>
        ),
      },
      {
        accessorKey: 'break_minutes',
        header: t('domain:times.columns.break'),
        cell: ({ row }) => {
          const pause = formatBreakText(row.original.break_minutes, t);
          if (!pause) return null;
          return <span className="text-muted-foreground whitespace-nowrap">{pause}</span>;
        },
      },
      {
        id: 'duration',
        // Sortiert nach der Nettodauer in Minuten, nicht nach dem Text: sonst
        // stünde „10:00 Std.“ vor „9:00 Std.“.
        accessorFn: (row) => netMinutes(row),
        header: t('domain:times.columns.duration'),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {formatNetDuration(
              row.original.started_at,
              row.original.ended_at,
              row.original.break_minutes,
            ) || t('domain:times.noEnd')}
          </span>
        ),
      },
      {
        accessorKey: 'note',
        header: t('domain:times.columns.note'),
        cell: ({ row }) => (
          <span className="text-muted-foreground block max-w-xs truncate">
            {row.original.note.trim() || t('domain:times.noNote')}
          </span>
        ),
      },
    ],
    [t],
  );
}
