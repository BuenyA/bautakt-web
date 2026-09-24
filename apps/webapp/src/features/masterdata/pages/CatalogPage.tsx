import { eurosToMinor, formatMoney } from '@bautakt/finance';
import { Badge, DataTable, type DataTableColumn } from '@bautakt/ui';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { useDataTableLabels } from '@/components/common/useDataTableLabels';

import { type ArticleRow, useArticles } from '../useMasterData';

export function CatalogPage() {
  const { t } = useTranslation();
  const labels = useDataTableLabels();
  const { data, isLoading } = useArticles();

  const columns = useMemo<DataTableColumn<ArticleRow>[]>(
    () => [
      {
        accessorKey: 'title',
        header: t('domain:catalog.columns.title'),
        cell: ({ row }) => (
          <span className="flex items-center gap-2">
            <span className="text-foreground font-medium">{row.original.title}</span>
            {!row.original.is_active ? (
              <Badge variant="muted">{t('domain:catalog.inactive')}</Badge>
            ) : null}
          </span>
        ),
      },
      { accessorKey: 'unit', header: t('domain:catalog.columns.unit') },
      {
        accessorKey: 'purchase_price',
        header: t('domain:catalog.columns.purchase'),
        cell: ({ row }) => (
          <span className="text-muted-foreground block text-right tabular-nums">
            {row.original.purchase_price === null
              ? '—'
              : formatMoney(eurosToMinor(row.original.purchase_price))}
          </span>
        ),
      },
      {
        accessorKey: 'sale_price',
        header: t('domain:catalog.columns.sale'),
        cell: ({ row }) => (
          <span className="text-foreground block text-right font-medium tabular-nums">
            {row.original.sale_price === null
              ? '—'
              : formatMoney(eurosToMinor(row.original.sale_price))}
          </span>
        ),
      },
      {
        accessorKey: 'stock_quantity',
        header: t('domain:catalog.columns.stock'),
        // Unter dem Mindestbestand rot: das ist der einzige Grund, warum die
        // Spalte ueberhaupt in einer Buerooberflaeche steht.
        cell: ({ row }) => {
          const stock = row.original.stock_quantity;
          const min = row.original.min_stock;
          const low = stock !== null && min !== null && stock < min;
          return (
            <span
              className={`block text-right tabular-nums ${low ? 'text-destructive font-medium' : 'text-muted-foreground'}`}
            >
              {stock === null ? '—' : stock}
            </span>
          );
        },
      },
      {
        accessorKey: 'storage_location',
        header: t('domain:catalog.columns.location'),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.storage_location || '—'}</span>
        ),
      },
    ],
    [t],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('domain:catalog.title')} description={t('domain:catalog.description')} />

      <DataTable
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        labels={labels}
        exportFileName="katalog"
        empty={
          <EmptyState
            title={t('domain:catalog.emptyTitle')}
            description={t('domain:catalog.emptyDescription')}
          />
        }
      />
    </div>
  );
}
