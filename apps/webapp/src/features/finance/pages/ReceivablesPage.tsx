import {
  AGING_BUCKET_ORDER,
  type AgingBucket,
  buildReceivables,
  formatMoney,
  type ReceivableItem,
  receivablesByBucket,
  totalOpenMinor,
  totalOverdueMinor,
} from '@bautakt/finance';
import {
  Card,
  CardContent,
  cn,
  DataTable,
  type DataTableColumn,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@bautakt/ui';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSpinner } from '@/components/common/PageSpinner';
import { useDataTableLabels } from '@/components/common/useDataTableLabels';
import { formatDate } from '@/lib/format';

import { INVOICE_TYPE_LIST, usePayments, useSalesDocuments } from '../useSalesDocuments';

/**
 * Ampelfarben der Altersklassen. Bewusst nur drei Stufen statt fuenf Farben:
 * „noch nicht faellig" ist neutral, alles Ueberfaellige wird mit dem Alter
 * dunkler. Fuenf Toene waeren ein Regenbogen, der nichts mehr ordnet.
 */
const BUCKET_TONE: Record<AgingBucket, string> = {
  not_due: 'text-muted-foreground',
  '1_30': 'text-warning',
  '31_60': 'text-warning',
  '61_90': 'text-destructive',
  '90_plus': 'text-destructive',
};

function bucketFromSearch(value: string | null): AgingBucket | 'all' {
  return AGING_BUCKET_ORDER.includes(value as AgingBucket) ? (value as AgingBucket) : 'all';
}

export function ReceivablesPage() {
  const { t } = useTranslation();
  const labels = useDataTableLabels();
  const [searchParams, setSearchParams] = useSearchParams();
  const bucket = bucketFromSearch(searchParams.get('klasse'));

  const documents = useSalesDocuments(INVOICE_TYPE_LIST);
  const payments = usePayments();

  const isLoading = documents.isLoading || payments.isLoading;
  const isError = documents.isError || payments.isError;

  const items = useMemo(
    () => buildReceivables(documents.data ?? [], payments.data ?? []),
    [documents.data, payments.data],
  );
  const summary = useMemo(() => receivablesByBucket(items), [items]);
  const rows = useMemo(
    () => (bucket === 'all' ? items : items.filter((item) => item.bucket === bucket)),
    [items, bucket],
  );

  function setBucket(next: string) {
    setSearchParams(next === 'all' ? {} : { klasse: next }, { replace: true });
  }

  const columns = useMemo<DataTableColumn<ReceivableItem>[]>(
    () => [
      {
        id: 'number',
        accessorFn: (item) => item.document.document_number ?? '',
        header: t('domain:receivables.columns.number'),
        cell: ({ row }) => (
          <span className="text-foreground font-medium whitespace-nowrap">
            {row.original.document.document_number || t('domain:invoices.noNumber')}
          </span>
        ),
      },
      {
        id: 'due',
        accessorFn: (item) => item.document.due_date ?? '',
        header: t('domain:receivables.columns.due'),
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {formatDate(row.original.document.due_date) || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'daysOverdue',
        header: t('domain:receivables.columns.daysOverdue'),
        cell: ({ row }) => (
          <span className={cn('tabular-nums', BUCKET_TONE[row.original.bucket])}>
            {row.original.daysOverdue > 0
              ? t('domain:receivables.days', { count: row.original.daysOverdue })
              : t('domain:receivables.notDue')}
          </span>
        ),
      },
      {
        accessorKey: 'paidMinor',
        header: t('domain:receivables.columns.paid'),
        cell: ({ row }) => (
          <span className="text-muted-foreground block text-right tabular-nums">
            {formatMoney(row.original.paidMinor)}
          </span>
        ),
      },
      {
        accessorKey: 'openMinor',
        header: t('domain:receivables.columns.open'),
        cell: ({ row }) => (
          <span className="text-foreground block text-right font-medium tabular-nums">
            {formatMoney(row.original.openMinor)}
          </span>
        ),
      },
    ],
    [t],
  );

  if (isError) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t('domain:receivables.title')} />
        <EmptyState
          title={t('domain:invoices.loadErrorTitle')}
          description={t('domain:invoices.loadErrorDescription')}
          action={
            <button
              type="button"
              className="text-primary cursor-pointer text-sm font-medium hover:underline"
              onClick={() => {
                void documents.refetch();
                void payments.refetch();
              }}
            >
              {t('common:action.retry')}
            </button>
          }
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t('domain:receivables.title')} />
        <PageSpinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('domain:receivables.title')}
        description={t('domain:receivables.description')}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard
          label={t('domain:receivables.totalOpen')}
          value={formatMoney(totalOpenMinor(items))}
          note={t('domain:receivables.documentCount', { count: items.length })}
        />
        <SummaryCard
          label={t('domain:receivables.totalOverdue')}
          value={formatMoney(totalOverdueMinor(items))}
          note={t('domain:receivables.documentCount', {
            count: items.filter((item) => item.daysOverdue > 0).length,
          })}
          tone="destructive"
        />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        labels={labels}
        exportFileName="offene-posten"
        toolbar={
          <Tabs value={bucket} onValueChange={setBucket}>
            <TabsList aria-label={t('domain:receivables.bucketsLabel')}>
              <TabsTrigger value="all">{t('domain:receivables.filterAll')}</TabsTrigger>
              {AGING_BUCKET_ORDER.map((key) => (
                <TabsTrigger key={key} value={key}>
                  {t(`domain:agingBucket.${key}`)}
                  <span className="text-text-subtle ml-1 tabular-nums">{summary[key].count}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
        empty={
          <EmptyState
            title={t('domain:receivables.emptyTitle')}
            description={t('domain:receivables.emptyDescription')}
          />
        }
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone?: 'destructive';
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <span className="text-muted-foreground text-sm">{label}</span>
        <span
          className={cn(
            'text-2xl font-semibold tabular-nums',
            tone === 'destructive' ? 'text-destructive' : 'text-foreground',
          )}
        >
          {value}
        </span>
        <span className="text-text-subtle text-xs">{note}</span>
      </CardContent>
    </Card>
  );
}
